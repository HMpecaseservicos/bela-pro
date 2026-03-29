'use client';

import { useEffect, useState, useMemo } from 'react';

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

interface Payment {
  id: string;
  amountCents: number;
  status: string;
  pixCode?: string;
  expiresAt?: string;
  paidAt?: string;
}

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  notes?: string;
  totalPriceCents?: number;
  client: { id: string; name: string; phoneE164: string };
  services: Array<{ service: Service }>;
  payment?: Payment;
}

interface MessageEvent {
  type: string;
  label: string;
  description: string;
}

/* ─── Style V2 Premium ─── */
const T = {
  gold: '#a07a45',
  goldSoft: '#c9a66b',
  goldLight: '#d4b98a',
  page: '#f4f1ec',
  surface: '#fbf8f3',
  surface2: '#f7f2ea',
  textPrimary: '#2f2a24',
  textSecondary: '#6e6256',
  textMuted: '#9b8e81',
  border: '#e4dbcf',
  borderLight: '#ede7dd',
  white: '#ffffff',
  radius: 14,
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string; icon: string; gradient?: string }> = {
  PENDING: { bg: '#fef7e6', text: '#b8944e', label: 'Pendente', icon: '⏳', gradient: 'linear-gradient(135deg, #fef7e6 0%, #faecd0 100%)' },
  PENDING_PAYMENT: { bg: '#fef7e6', text: '#9a7b4f', label: 'Aguardando Pix', icon: '💳', gradient: 'linear-gradient(135deg, #fef7e6 0%, #f5e6c4 100%)' },
  CONFIRMED: { bg: '#e8f4ec', text: '#5a9e6f', label: 'Confirmado', icon: '✓', gradient: 'linear-gradient(135deg, #e8f4ec 0%, #d0ebda 100%)' },
  COMPLETED: { bg: '#e6f0f5', text: '#5a8fa8', label: 'Concluído', icon: '✔', gradient: 'linear-gradient(135deg, #e6f0f5 0%, #d0e4ef 100%)' },
  CANCELLED: { bg: '#fceaea', text: '#c9756c', label: 'Cancelado', icon: '✗', gradient: 'linear-gradient(135deg, #fceaea 0%, #f8d4d1 100%)' },
  NO_SHOW: { bg: '#f5f0e8', text: '#9a8b7a', label: 'Não compareceu', icon: '○', gradient: 'linear-gradient(135deg, #f5f0e8 0%, #ebe3d6 100%)' },
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00
const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');
  const [isMobile, setIsMobile] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  
  // Modal state
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [messageEvents, setMessageEvents] = useState<MessageEvent[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<{
    date: string;
    time: string;
    serviceId: string;
    notes: string;
  }>({ date: '', time: '', serviceId: '', notes: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);

  // Novo Agendamento Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newStep, setNewStep] = useState<1 | 2 | 3 | 4>(1);
  const [newAppointment, setNewAppointment] = useState({
    clientName: '',
    clientPhone: '',
    serviceId: '',
    date: '',
    startAt: '',
    notes: '',
  });
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<{ startAt: string; endAt: string; available: boolean }[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [newError, setNewError] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  
  const [existingClients, setExistingClients] = useState<{ id: string; name: string; phoneE164: string }[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<{ id: string; name: string; phoneE164: string }[]>([]);
  
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showLegend, setShowLegend] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  /* ─── Helpers de calendário ─── */
  function getWeekDaysFromDate(baseDate: Date): Date[] {
    const days: Date[] = [];
    const start = new Date(baseDate);
    start.setDate(start.getDate() - start.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }

  function getMonthDays(year: number, month: number): (Date | null)[] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
    return cells;
  }

  function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function appointmentsForDay(date: Date) {
    return appointments.filter(a => isSameDay(new Date(a.startAt), date));
  }

  const weekDays = useMemo(() => getWeekDaysFromDate(selectedDate), [selectedDate.toDateString()]);
  const today = useMemo(() => new Date(), []);

  /* ─── Effects ─── */
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchMessageEvents();
    fetchServices();
    fetchWorkspaceId();
    fetchExistingClients();
    setWorkspaceName(localStorage.getItem('workspaceName') || 'Meu Negócio');
  }, []);

  // Re-fetch ao navegar para outra semana
  useEffect(() => {
    if (!loading) fetchAppointments();
  }, [selectedDate.toDateString()]);

  /* ─── API calls ─── */
  async function fetchWorkspaceId() {
    const wsId = localStorage.getItem('workspaceId');
    if (wsId) setWorkspaceId(wsId);
  }

  async function fetchExistingClients() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExistingClients(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  }

  async function fetchAppointments() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; return; }
    try {
      // Busca janela de 6 semanas centrada na data selecionada
      const from = new Date(selectedDate);
      from.setDate(from.getDate() - 21);
      const to = new Date(selectedDate);
      to.setDate(to.getDate() + 21);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const res = await fetch(`${API_URL}/appointments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
    setLoading(false);
  }

  async function fetchMessageEvents() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/message-templates/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessageEvents(data.events || []);
      }
    } catch (err) {
      console.error('Error fetching message events:', err);
    }
  }

  async function fetchServices() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableServices(Array.isArray(data) ? data.filter((s: any) => s.isActive) : []);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const apt = appointments.find(a => a.id === id);
      if (apt) {
        apt.status = newStatus;
        setAppointments([...appointments]);
        if (selectedAppointment?.id === id) setSelectedAppointment({ ...apt, status: newStatus });
      }
      if (apt && (newStatus === 'CONFIRMED' || newStatus === 'COMPLETED' || newStatus === 'CANCELLED')) {
        const eventType = newStatus === 'CONFIRMED' ? 'APPOINTMENT_CONFIRMED' 
          : newStatus === 'COMPLETED' ? 'APPOINTMENT_COMPLETED' 
          : 'APPOINTMENT_CANCELLED';
        await sendWhatsAppMessage(apt, eventType);
      }
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  }

  async function confirmPayment(appointmentId: string, paymentId: string) {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); alert(data.message || 'Erro ao confirmar pagamento'); return; }
      const apt = appointments.find(a => a.id === appointmentId);
      if (apt) {
        apt.status = 'CONFIRMED';
        if (apt.payment) { apt.payment.status = 'PAID'; apt.payment.paidAt = new Date().toISOString(); }
        setAppointments([...appointments]);
        if (selectedAppointment?.id === appointmentId) setSelectedAppointment({ ...apt });
      }
      if (apt) await sendWhatsAppMessage(apt, 'APPOINTMENT_CONFIRMED');
      fetchAppointments();
    } catch (err) {
      console.error('Erro ao confirmar pagamento:', err);
      alert('Erro ao confirmar pagamento');
    }
  }

  async function cancelPayment(appointmentId: string, paymentId: string) {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/payments/${paymentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); alert(data.message || 'Erro ao cancelar pagamento'); return; }
      const apt = appointments.find(a => a.id === appointmentId);
      if (apt) {
        apt.status = 'CANCELLED';
        if (apt.payment) apt.payment.status = 'CANCELLED';
        setAppointments([...appointments]);
        if (selectedAppointment?.id === appointmentId) setSelectedAppointment({ ...apt });
      }
      fetchAppointments();
      setSelectedAppointment(null);
    } catch (err) {
      console.error('Erro ao cancelar pagamento:', err);
      alert('Erro ao cancelar pagamento');
    }
  }

  async function sendWhatsAppMessage(apt: Appointment, eventType: string) {
    setSendingMessage(eventType);
    try {
      const token = localStorage.getItem('token');
      const service = apt.services[0]?.service;
      const startDate = new Date(apt.startAt);
      const context = {
        clientName: apt.client.name,
        serviceName: service?.name || 'Serviço',
        date: startDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        workspaceName: workspaceName,
      };
      const res = await fetch(`${API_URL}/message-templates/generate-link`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventType, phone: apt.client.phoneE164, context }),
      });
      if (!res.ok) throw new Error('Erro ao gerar mensagem');
      const { whatsappLink } = await res.json();
      window.open(whatsappLink, '_blank');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      alert('Erro ao gerar link do WhatsApp');
    } finally {
      setSendingMessage(null);
    }
  }

  function openAppointmentModal(apt: Appointment) {
    setSelectedAppointment(apt);
    setEditMode(false);
    const startDate = new Date(apt.startAt);
    setEditData({
      date: startDate.toISOString().split('T')[0],
      time: startDate.toTimeString().slice(0, 5),
      serviceId: apt.services[0]?.service?.id || '',
      notes: apt.notes || '',
    });
  }

  function closeModal() { setSelectedAppointment(null); setEditMode(false); }

  async function saveEdit() {
    if (!selectedAppointment) return;
    setSavingEdit(true);
    try {
      const token = localStorage.getItem('token');
      const [year, month, day] = editData.date.split('-').map(Number);
      const [hour, minute] = editData.time.split(':').map(Number);
      const newStartAt = new Date(year, month - 1, day, hour, minute);
      const res = await fetch(`${API_URL}/appointments/${selectedAppointment.id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          startAt: newStartAt.toISOString(),
          serviceId: editData.serviceId || undefined,
          notes: editData.notes || undefined,
        }),
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message || 'Erro ao salvar'); }
      setEditMode(false);
      fetchAppointments();
      closeModal();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações');
    } finally {
      setSavingEdit(false);
    }
  }

  function openNewAppointmentModal() {
    setNewAppointment({ clientName: '', clientPhone: '', serviceId: '', date: '', startAt: '', notes: '' });
    setNewStep(1); setAvailableDays([]); setAvailableSlots([]); setNewError(''); setShowClientSuggestions(false); setShowNewModal(true);
  }

  async function selectNewService(serviceId: string) {
    if (!workspaceId) return;
    setNewAppointment(prev => ({ ...prev, serviceId, date: '', startAt: '' }));
    setLoadingAvailability(true); setNewError('');
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_URL}/availability/days?workspaceId=${workspaceId}&serviceId=${serviceId}&from=${todayStr}&limit=30`);
      if (!res.ok) throw new Error('Erro ao buscar dias disponíveis');
      const days: string[] = await res.json();
      setAvailableDays(days); setNewStep(2);
    } catch (err: any) {
      setNewError(err.message || 'Erro ao buscar disponibilidade');
    } finally {
      setLoadingAvailability(false);
    }
  }

  async function selectNewDate(date: string) {
    if (!workspaceId || !newAppointment.serviceId) return;
    setNewAppointment(prev => ({ ...prev, date, startAt: '' }));
    setLoadingAvailability(true); setNewError('');
    try {
      const res = await fetch(`${API_URL}/availability/slots?workspaceId=${workspaceId}&serviceId=${newAppointment.serviceId}&date=${date}`);
      if (!res.ok) throw new Error('Erro ao buscar horários');
      const slots = await res.json();
      setAvailableSlots(slots.filter((s: any) => s.available)); setNewStep(3);
    } catch (err: any) {
      setNewError(err.message || 'Erro ao buscar horários');
    } finally {
      setLoadingAvailability(false);
    }
  }

  function selectNewTime(startAt: string) {
    setNewAppointment(prev => ({ ...prev, startAt })); setNewStep(4);
  }

  function handleClientNameChange(value: string) {
    setNewAppointment(prev => ({ ...prev, clientName: value }));
    if (value.length >= 2) {
      const filtered = existingClients.filter(c => c.name.toLowerCase().includes(value.toLowerCase()));
      setFilteredClients(filtered);
      setShowClientSuggestions(filtered.length > 0);
    } else {
      setShowClientSuggestions(false);
    }
  }

  function selectExistingClient(client: { id: string; name: string; phoneE164: string }) {
    const phone = client.phoneE164.replace('+55', '');
    setNewAppointment(prev => ({ ...prev, clientName: client.name, clientPhone: formatPhoneInput(phone) }));
    setShowClientSuggestions(false);
  }

  function goBackNewStep() {
    if (newStep === 2) { setNewStep(1); setNewAppointment(prev => ({ ...prev, serviceId: '', date: '', startAt: '' })); }
    else if (newStep === 3) { setNewStep(2); setNewAppointment(prev => ({ ...prev, date: '', startAt: '' })); }
    else if (newStep === 4) { setNewStep(3); setNewAppointment(prev => ({ ...prev, startAt: '' })); }
  }

  function formatPhoneInput(value: string) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }

  function phoneToE164(phone: string) {
    const numbers = phone.replace(/\D/g, '');
    return `+55${numbers}`;
  }

  async function createNewAppointment() {
    setNewError('');
    if (!newAppointment.clientName.trim()) { setNewError('Informe o nome do cliente'); return; }
    if (newAppointment.clientPhone.replace(/\D/g, '').length < 10) { setNewError('Informe um telefone válido'); return; }
    if (!newAppointment.serviceId || !newAppointment.startAt) { setNewError('Selecione serviço, data e horário'); return; }
    setSavingNew(true);
    try {
      const token = localStorage.getItem('token');
      const startAt = newAppointment.startAt;
      const res = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clientName: newAppointment.clientName.trim(),
          clientPhone: phoneToE164(newAppointment.clientPhone),
          serviceIds: [newAppointment.serviceId],
          startAt,
          notes: newAppointment.notes || undefined,
        }),
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message || 'Erro ao criar agendamento'); }
      setShowNewModal(false);
      fetchAppointments();
      setSelectedDate(new Date(startAt));
      const service = availableServices.find(s => s.id === newAppointment.serviceId);
      const startDate = new Date(startAt);
      const context = {
        clientName: newAppointment.clientName.trim(),
        serviceName: service?.name || 'Serviço',
        date: startDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        workspaceName: workspaceName,
      };
      const whatsappRes = await fetch(`${API_URL}/message-templates/generate-link`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventType: 'APPOINTMENT_CONFIRMED', phone: phoneToE164(newAppointment.clientPhone), context }),
      });
      if (whatsappRes.ok) { const { whatsappLink } = await whatsappRes.json(); window.open(whatsappLink, '_blank'); }
    } catch (err: any) {
      setNewError(err.message || 'Erro ao criar agendamento');
    } finally {
      setSavingNew(false);
    }
  }

  function navigateWeek(dir: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir * 7);
    setSelectedDate(d);
  }

  function navigateMonth(dir: number) {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + dir);
    setSelectedDate(d);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  /* ─── Computed ─── */
  const allDayAppointments = appointments.filter(a => isSameDay(new Date(a.startAt), selectedDate));
  const dayAppointments = statusFilter === 'ALL' ? allDayAppointments : allDayAppointments.filter(a => a.status === statusFilter);

  const todayStats = {
    total: allDayAppointments.length,
    confirmed: allDayAppointments.filter(a => a.status === 'CONFIRMED').length,
    pending: allDayAppointments.filter(a => a.status === 'PENDING' || a.status === 'PENDING_PAYMENT').length,
    completed: allDayAppointments.filter(a => a.status === 'COMPLETED').length,
    cancelled: allDayAppointments.filter(a => a.status === 'CANCELLED' || a.status === 'NO_SHOW').length,
    revenue: allDayAppointments.filter(a => a.status === 'COMPLETED' || a.status === 'CONFIRMED').reduce((s, a) => s + (a.services[0]?.service?.priceCents || 0), 0),
  };

  const now = new Date();
  const nextAppointment = appointments
    .filter(a => new Date(a.startAt) > now && (a.status === 'CONFIRMED' || a.status === 'PENDING'))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
  const currentHour = now.getHours();
  const isToday = isSameDay(selectedDate, now);

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.page }}>
        <div style={{ width: 40, height: 40, border: `4px solid ${T.border}`, borderTopColor: T.gold, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 32, minHeight: '100vh', display: 'flex', flexDirection: 'column', maxWidth: 1360, margin: '0 auto', width: '100%' }}>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 12, marginBottom: 28 }}>
        <div>
          <h1 className="font-display" style={{ margin: 0, fontSize: isMobile ? 24 : 30, fontWeight: 700, color: T.textPrimary, letterSpacing: '-0.3px' }}>
            Agenda
          </h1>
          <p style={{ margin: '6px 0 0', color: T.textMuted, fontSize: 14 }}>Gerencie seus atendimentos</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={openNewAppointmentModal} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 22px',
            background: `linear-gradient(135deg, ${T.goldSoft} 0%, ${T.gold} 100%)`,
            color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14,
            boxShadow: '0 2px 10px rgba(160,122,69,0.35)', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(160,122,69,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 10px rgba(160,122,69,0.35)'; }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            {isMobile ? 'Novo' : 'Novo Agendamento'}
          </button>

          {!isMobile && (
            <div style={{ display: 'flex', background: T.surface2, borderRadius: 10, padding: 3, border: `1px solid ${T.borderLight}` }}>
              {(['day', 'week'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '8px 18px', border: 'none', borderRadius: 8,
                  background: view === v ? T.white : 'transparent',
                  color: view === v ? T.gold : T.textMuted,
                  fontWeight: view === v ? 600 : 500, cursor: 'pointer', fontSize: 13,
                  boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.15s',
                }}>
                  {v === 'day' ? 'Dia' : 'Semana'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Dashboard Stats ─── */}
      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ background: `linear-gradient(135deg, ${T.gold} 0%, #8b6935 100%)`, borderRadius: T.radius, padding: '20px 22px', color: '#fff', boxShadow: '0 4px 14px rgba(160,122,69,0.25)' }}>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8, fontWeight: 500 }}>Agendamentos Hoje</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700 }}>{todayStats.total}</span>
              <span style={{ fontSize: 13, opacity: 0.75 }}>{todayStats.confirmed} confirmados</span>
            </div>
          </div>
          <div style={{ background: T.white, borderRadius: T.radius, padding: '20px 22px', border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8, fontWeight: 500 }}>Próximo Atendimento</div>
            {nextAppointment ? (
              <>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary }}>
                  {new Date(nextAppointment.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>
                  {nextAppointment.client.name} · {nextAppointment.services[0]?.service?.name}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 15, color: T.textMuted }}>Nenhum agendado</div>
            )}
          </div>
          <div style={{ background: todayStats.pending > 0 ? '#fef7e6' : T.white, borderRadius: T.radius, padding: '20px 22px', border: `1px solid ${todayStats.pending > 0 ? '#f5e6c4' : T.border}` }}>
            <div style={{ fontSize: 12, color: '#9a7b4f', marginBottom: 8, fontWeight: 500 }}>Pendentes</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#b8944e' }}>{todayStats.pending}</div>
            <div style={{ fontSize: 11, color: '#9a7b4f', marginTop: 4 }}>
              {todayStats.pending > 0 ? 'Aguardando confirmação' : 'Tudo em dia!'}
            </div>
          </div>
          <div style={{ background: '#e8f4ec', borderRadius: T.radius, padding: '20px 22px', border: '1px solid #d0ebda' }}>
            <div style={{ fontSize: 12, color: '#5a9e6f', marginBottom: 8, fontWeight: 500 }}>Faturamento do Dia</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#3d8a52' }}>{formatPrice(todayStats.revenue)}</div>
            <div style={{ fontSize: 11, color: '#5a9e6f', marginTop: 4 }}>{todayStats.completed} concluídos + {todayStats.confirmed} confirmados</div>
          </div>
        </div>
      )}

      {/* ─── Filtros ─── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        {[
          { value: 'ALL', label: 'Todos', count: allDayAppointments.length },
          { value: 'PENDING', label: 'Pendentes', count: allDayAppointments.filter(a => a.status === 'PENDING').length },
          { value: 'PENDING_PAYMENT', label: 'Aguardando Pix', count: allDayAppointments.filter(a => a.status === 'PENDING_PAYMENT').length },
          { value: 'CONFIRMED', label: 'Confirmados', count: allDayAppointments.filter(a => a.status === 'CONFIRMED').length },
          { value: 'COMPLETED', label: 'Concluídos', count: allDayAppointments.filter(a => a.status === 'COMPLETED').length },
        ].filter(f => f.count > 0 || f.value === 'ALL').map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)} style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
            border: statusFilter === f.value ? 'none' : `1px solid ${T.border}`,
            background: statusFilter === f.value ? (f.value === 'ALL' ? T.gold : STATUS_COLORS[f.value]?.text || T.gold) : T.white,
            color: statusFilter === f.value ? '#fff' : T.textSecondary,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {f.label}
            <span style={{ background: statusFilter === f.value ? 'rgba(255,255,255,0.25)' : T.surface2, padding: '1px 6px', borderRadius: 10, fontSize: 11 }}>
              {f.count}
            </span>
          </button>
        ))}
        <button onClick={() => setShowLegend(!showLegend)} style={{
          marginLeft: 'auto', padding: '5px 12px', border: `1px solid ${T.border}`, borderRadius: 8,
          background: showLegend ? T.surface2 : T.white, color: T.textMuted, fontSize: 12, cursor: 'pointer',
        }}>
          Legenda
        </button>
      </div>

      {showLegend && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, padding: '10px 16px', background: T.surface2, borderRadius: 10, marginBottom: 16, border: `1px solid ${T.borderLight}` }}>
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: val.text }} />
              <span style={{ color: T.textSecondary }}>{val.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          CALENDÁRIO PROFISSIONAL — FAIXA SEMANAL + MINI MÊS
         ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`,
        marginBottom: 20, overflow: 'visible', position: 'relative',
      }}>
        {/* Header: Mês + Navegação */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '14px 16px' : '16px 24px', borderBottom: `1px solid ${T.borderLight}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigateWeek(-1)} style={{
              width: 34, height: 34, border: `1px solid ${T.border}`, borderRadius: 8,
              background: T.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: T.textSecondary, transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.white; }}
            >←</button>

            <button onClick={() => setShowMonthPicker(!showMonthPicker)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8,
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span className="font-display" style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: T.textPrimary }}>
                {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </span>
              <span style={{ marginLeft: 6, fontSize: 10, color: T.textMuted }}>{showMonthPicker ? '▲' : '▼'}</span>
            </button>

            <button onClick={() => navigateWeek(1)} style={{
              width: 34, height: 34, border: `1px solid ${T.border}`, borderRadius: 8,
              background: T.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: T.textSecondary, transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.white; }}
            >→</button>
          </div>

          <button onClick={() => setSelectedDate(new Date())} style={{
            padding: '7px 18px', border: `1px solid ${T.gold}`, borderRadius: 8,
            background: T.white, color: T.gold, fontWeight: 600, cursor: 'pointer', fontSize: 13, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = T.gold; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.white; e.currentTarget.style.color = T.gold; }}
          >
            Hoje
          </button>
        </div>

        {/* Faixa Semanal — 7 dias */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          padding: isMobile ? '12px 8px 16px' : '16px 20px 20px', gap: isMobile ? 4 : 8,
        }}>
          {weekDays.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isDayToday = isSameDay(day, today);
            const dayApts = appointmentsForDay(day);
            const confirmedCount = dayApts.filter(a => a.status === 'CONFIRMED' || a.status === 'COMPLETED').length;
            const pendingCount = dayApts.filter(a => a.status === 'PENDING' || a.status === 'PENDING_PAYMENT').length;

            return (
              <button key={i} onClick={() => { setSelectedDate(day); setView('day'); }} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: isMobile ? '10px 4px 8px' : '12px 8px 10px',
                border: isSelected ? `2px solid ${T.gold}` : isDayToday ? `2px solid ${T.goldLight}` : '2px solid transparent',
                borderRadius: 12,
                background: isSelected ? 'rgba(160,122,69,0.06)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.surface2; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                  color: isSelected ? T.gold : isDayToday ? T.gold : T.textMuted,
                }}>
                  {WEEKDAY_NAMES[i]}
                </span>
                <span style={{
                  width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMobile ? 16 : 18, fontWeight: 700,
                  background: isSelected ? T.gold : isDayToday ? 'rgba(160,122,69,0.12)' : 'transparent',
                  color: isSelected ? '#fff' : isDayToday ? T.gold : T.textPrimary, transition: 'all 0.15s',
                }}>
                  {day.getDate()}
                </span>
                <div style={{ display: 'flex', gap: 3, minHeight: 8, alignItems: 'center' }}>
                  {confirmedCount > 0 && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5a9e6f' }} />}
                  {pendingCount > 0 && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#b8944e' }} />}
                  {dayApts.length > 0 && <span style={{ fontSize: 9, fontWeight: 600, color: T.textMuted, marginLeft: 1 }}>{dayApts.length}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Mini Calendário Mensal */}
        {showMonthPicker && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: isMobile ? 0 : 'auto',
            zIndex: 50, background: T.white, border: `1px solid ${T.border}`, borderRadius: T.radius,
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)', padding: 20, minWidth: isMobile ? undefined : 340, marginTop: 4,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <button onClick={() => navigateMonth(-1)} style={{
                width: 30, height: 30, border: `1px solid ${T.border}`, borderRadius: 6,
                background: T.white, cursor: 'pointer', fontSize: 12, color: T.textSecondary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>←</button>
              <span style={{ fontWeight: 700, color: T.textPrimary, fontSize: 15 }}>
                {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </span>
              <button onClick={() => navigateMonth(1)} style={{
                width: 30, height: 30, border: `1px solid ${T.border}`, borderRadius: 6,
                background: T.white, cursor: 'pointer', fontSize: 12, color: T.textSecondary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>→</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
              {WEEKDAY_NAMES.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {getMonthDays(selectedDate.getFullYear(), selectedDate.getMonth()).map((day, i) => {
                if (!day) return <div key={`pad-${i}`} />;
                const isSelected = isSameDay(day, selectedDate);
                const isDayToday = isSameDay(day, today);
                const dayApts = appointmentsForDay(day);
                return (
                  <button key={i} onClick={() => { setSelectedDate(day); setShowMonthPicker(false); }} style={{
                    width: '100%', aspectRatio: '1', border: 'none', borderRadius: 8,
                    background: isSelected ? T.gold : isDayToday ? 'rgba(160,122,69,0.1)' : 'transparent',
                    color: isSelected ? '#fff' : isDayToday ? T.gold : T.textPrimary,
                    fontWeight: isSelected || isDayToday ? 700 : 400, fontSize: 13, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, transition: 'all 0.1s',
                  }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.surface2; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isDayToday ? 'rgba(160,122,69,0.1)' : 'transparent'; }}
                  >
                    {day.getDate()}
                    {dayApts.length > 0 && <span style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.7)' : T.gold }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showMonthPicker && <div onClick={() => setShowMonthPicker(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} />}

      {/* ═══════════════ VISTA DIÁRIA / SEMANAL ═══════════════ */}
      {view === 'day' ? (
        <div style={{ flex: 1, background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, overflow: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {HOURS.map(hour => {
              const hourAppointments = dayAppointments.filter(a => new Date(a.startAt).getHours() === hour);
              const isCurrentHour = isToday && currentHour === hour;
              const isPastHour = isToday && currentHour > hour;
              return (
                <div key={hour} style={{
                  display: 'flex', borderBottom: `1px solid ${T.borderLight}`, minHeight: 80,
                  position: 'relative',
                  background: isCurrentHour ? 'rgba(160,122,69,0.04)' : isPastHour ? '#fafaf8' : T.white,
                }}>
                  {isCurrentHour && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${T.gold} 0%, ${T.goldSoft} 100%)`, borderRadius: '0 3px 3px 0' }} />}
                  <div style={{
                    width: 72, padding: '12px 14px', borderRight: `1px solid ${T.borderLight}`,
                    color: isCurrentHour ? T.gold : T.textMuted, fontSize: 13,
                    fontWeight: isCurrentHour ? 700 : 500, flexShrink: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  }}>
                    <span>{`${hour.toString().padStart(2, '0')}:00`}</span>
                    {isCurrentHour && <span style={{ fontSize: 9, color: T.gold, marginTop: 2, fontWeight: 600 }}>Agora</span>}
                  </div>
                  <div style={{ flex: 1, padding: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                    {hourAppointments.map(apt => {
                      const si = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING;
                      const service = apt.services[0]?.service;
                      const isPendingPayment = apt.status === 'PENDING_PAYMENT';
                      const initial = apt.client.name.charAt(0).toUpperCase();
                      return (
                        <div key={apt.id} onClick={() => openAppointmentModal(apt)} style={{
                          background: si.gradient || si.bg, borderRadius: 12, padding: '12px 14px',
                          minWidth: 200, flex: '1 1 260px', maxWidth: 400,
                          cursor: 'pointer', transition: 'all 0.2s',
                          border: `1px solid ${si.text}18`, position: 'relative', overflow: 'hidden',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 16px ${si.text}25`; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: si.text }} />
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: si.text, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{initial}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                                <div style={{ fontWeight: 700, color: T.textPrimary, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.client.name}</div>
                                <span style={{ background: si.text, color: '#fff', padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 600, flexShrink: 0, marginLeft: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
                                  {si.icon} {si.label}
                                </span>
                              </div>
                              <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 4 }}>{formatTime(apt.startAt)} – {formatTime(apt.endAt)}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: T.textSecondary }}>{service?.name}</span>
                                <span style={{ fontWeight: 700, color: si.text, fontSize: 13 }}>{service && formatPrice(service.priceCents)}</span>
                              </div>
                              {isPendingPayment && <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(234,88,12,0.08)', borderRadius: 5, fontSize: 10, color: '#ea580c' }}>Aguardando pagamento PIX</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ═══ Visão Semanal ════ */
        <div style={{ flex: 1, background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '68px repeat(7, 1fr)', minWidth: 800 }}>
            <div style={{ borderBottom: `2px solid ${T.border}`, padding: 10 }} />
            {weekDays.map((day, i) => {
              const isDayToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);
              return (
                <div key={i} onClick={() => { setSelectedDate(day); setView('day'); }}
                  style={{ borderBottom: `2px solid ${T.border}`, padding: '10px 8px', textAlign: 'center', cursor: 'pointer', background: isSelected ? T.surface2 : 'transparent', transition: 'background 0.15s' }}>
                  <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', marginBottom: 4, fontWeight: 600, letterSpacing: '0.5px' }}>
                    {WEEKDAY_NAMES[i]}
                  </div>
                  <div style={{
                    fontSize: 16, fontWeight: 700,
                    background: isDayToday ? T.gold : 'transparent', color: isDayToday ? '#fff' : T.textPrimary,
                    width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                  }}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}

            {HOURS.map(hour => (
              <div key={`row-${hour}`} style={{ display: 'contents' }}>
                <div style={{ borderBottom: `1px solid ${T.borderLight}`, padding: '8px 10px', color: T.textMuted, fontSize: 11, fontWeight: 500 }}>
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
                {weekDays.map((day, i) => {
                  const dayApts = appointments.filter(a => {
                    const d = new Date(a.startAt);
                    return isSameDay(d, day) && d.getHours() === hour;
                  });
                  return (
                    <div key={`${hour}-${i}`} style={{ borderBottom: `1px solid ${T.borderLight}`, borderLeft: `1px solid ${T.borderLight}`, padding: 3, minHeight: 56 }}>
                      {dayApts.map(apt => {
                        const si = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING;
                        return (
                          <div key={apt.id} onClick={() => openAppointmentModal(apt)}
                            style={{ background: si.bg, borderRadius: 5, padding: '3px 6px', fontSize: 10, marginBottom: 2, borderLeft: `3px solid ${si.text}`, cursor: 'pointer', transition: 'opacity 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                          >
                            <div style={{ fontWeight: 600, color: T.textPrimary }}>{apt.client.name}</div>
                            <div style={{ color: T.textMuted }}>{formatTime(apt.startAt)}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL DETALHES ═══════════════ */}
      {selectedAppointment && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={closeModal}>
          <div style={{ background: T.white, borderRadius: T.radius, width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="font-display" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.textPrimary }}>
                {editMode ? 'Editar Agendamento' : 'Detalhes do Agendamento'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: T.textMuted, padding: 4 }}>×</button>
            </div>

            <div style={{ padding: 22 }}>
              {!editMode ? (
                <>
                  {/* Client */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: T.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 17, flexShrink: 0 }}>
                      {selectedAppointment.client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: T.textPrimary }}>{selectedAppointment.client.name}</div>
                      <div style={{ fontSize: 13, color: T.textSecondary }}>{selectedAppointment.client.phoneE164}</div>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div style={{ background: T.surface2, borderRadius: 10, padding: 14, marginBottom: 18, border: `1px solid ${T.borderLight}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {[
                        { lbl: 'Data', val: new Date(selectedAppointment.startAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) },
                        { lbl: 'Horário', val: `${formatTime(selectedAppointment.startAt)} – ${formatTime(selectedAppointment.endAt)}` },
                        { lbl: 'Serviço', val: selectedAppointment.services[0]?.service?.name || '-' },
                        { lbl: 'Valor', val: selectedAppointment.services[0]?.service ? formatPrice(selectedAppointment.services[0].service.priceCents) : '-' },
                      ].map((item, i) => (
                        <div key={i}>
                          <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{item.lbl}</div>
                          <div style={{ fontWeight: 500, color: T.textPrimary, fontSize: 13 }}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Status</div>
                      <span style={{ background: STATUS_COLORS[selectedAppointment.status]?.bg, color: STATUS_COLORS[selectedAppointment.status]?.text, padding: '3px 10px', borderRadius: 5, fontWeight: 600, fontSize: 12 }}>
                        {STATUS_COLORS[selectedAppointment.status]?.icon} {STATUS_COLORS[selectedAppointment.status]?.label}
                      </span>
                    </div>
                  </div>

                  {/* Payment PIX */}
                  {selectedAppointment.status === 'PENDING_PAYMENT' && selectedAppointment.payment && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                      <div style={{ fontWeight: 600, color: '#d97706', marginBottom: 8, fontSize: 13 }}>Aguardando Pagamento PIX</div>
                      <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: T.textSecondary }}>Valor:</span>
                          <span style={{ fontWeight: 600, color: T.textPrimary }}>{formatPrice(selectedAppointment.payment.amountCents)}</span>
                        </div>
                        {selectedAppointment.payment.expiresAt && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: T.textSecondary }}>Expira:</span>
                            <span style={{ fontWeight: 500, color: new Date(selectedAppointment.payment.expiresAt) < new Date() ? '#dc2626' : T.textPrimary }}>
                              {new Date(selectedAppointment.payment.expiresAt).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 10 }}>Ações</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {selectedAppointment.status === 'PENDING_PAYMENT' && selectedAppointment.payment && (
                        <>
                          <button onClick={() => confirmPayment(selectedAppointment.id, selectedAppointment.payment!.id)}
                            style={{ flex: 1, padding: '9px 14px', background: '#5a9e6f', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12, minWidth: 130 }}>
                            Confirmar Pagamento
                          </button>
                          <button onClick={() => cancelPayment(selectedAppointment.id, selectedAppointment.payment!.id)}
                            style={{ flex: 1, padding: '9px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12, minWidth: 100 }}>
                            Cancelar
                          </button>
                        </>
                      )}
                      {selectedAppointment.status === 'PENDING' && (
                        <>
                          <button onClick={() => updateStatus(selectedAppointment.id, 'CONFIRMED')}
                            style={{ flex: 1, padding: '9px 14px', background: T.gold, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12, minWidth: 100 }}>
                            Confirmar
                          </button>
                          <button onClick={() => updateStatus(selectedAppointment.id, 'CANCELLED')}
                            style={{ flex: 1, padding: '9px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12, minWidth: 100 }}>
                            Cancelar
                          </button>
                        </>
                      )}
                      {selectedAppointment.status === 'CONFIRMED' && (
                        <>
                          <button onClick={() => updateStatus(selectedAppointment.id, 'COMPLETED')}
                            style={{ flex: 1, padding: '9px 14px', background: '#5a9e6f', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12, minWidth: 100 }}>
                            Concluir
                          </button>
                          <button onClick={() => updateStatus(selectedAppointment.id, 'NO_SHOW')}
                            style={{ flex: 1, padding: '9px 14px', background: '#78716c', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12, minWidth: 100 }}>
                            Não Compareceu
                          </button>
                        </>
                      )}
                      <button onClick={() => setEditMode(true)}
                        style={{ padding: '9px 14px', background: T.white, color: T.textSecondary, border: `1px solid ${T.border}`, borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                        Editar
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 10 }}>Enviar Mensagem WhatsApp</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {messageEvents.map(event => (
                        <button key={event.type} onClick={() => sendWhatsAppMessage(selectedAppointment, event.type)} disabled={sendingMessage === event.type}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', background: sendingMessage === event.type ? '#dcfce7' : T.surface2,
                            border: `1px solid ${T.borderLight}`, borderRadius: 8, cursor: sendingMessage === event.type ? 'wait' : 'pointer', transition: 'all 0.15s',
                          }}>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, color: T.textPrimary, fontSize: 13 }}>{event.label}</div>
                            <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 1 }}>{event.description}</div>
                          </div>
                          <div style={{ background: '#25D366', color: '#fff', padding: '5px 10px', borderRadius: 5, fontWeight: 600, fontSize: 11 }}>
                            {sendingMessage === event.type ? '...' : 'Enviar'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Edit Mode */
                <>
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 6 }}>Data</label>
                    <input type="date" value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14 }} />
                  </div>
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 6 }}>Horário</label>
                    <input type="time" value={editData.time} onChange={e => setEditData({ ...editData, time: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14 }} />
                  </div>
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 6 }}>Serviço</label>
                    <select value={editData.serviceId} onChange={e => setEditData({ ...editData, serviceId: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, background: T.white }}>
                      <option value="">Selecione um serviço</option>
                      {availableServices.map(s => (<option key={s.id} value={s.id}>{s.name} - {formatPrice(s.priceCents)} ({s.durationMinutes}min)</option>))}
                    </select>
                  </div>
                  <div style={{ marginBottom: 22 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 6 }}>Observações</label>
                    <textarea value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} rows={3}
                      style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, resize: 'vertical' }}
                      placeholder="Observações sobre o agendamento..." />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setEditMode(false)}
                      style={{ flex: 1, padding: '11px', background: T.white, color: T.textSecondary, border: `1px solid ${T.border}`, borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                      Cancelar
                    </button>
                    <button onClick={saveEdit} disabled={savingEdit}
                      style={{ flex: 1, padding: '11px', background: savingEdit ? T.textMuted : T.gold, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: savingEdit ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                      {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL NOVO AGENDAMENTO ═══════════════ */}
      {showNewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={() => setShowNewModal(false)}>
          <div style={{ background: T.white, borderRadius: T.radius, width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '18px 24px', borderBottom: `1px solid ${T.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldSoft} 100%)`,
              borderRadius: `${T.radius}px ${T.radius}px 0 0`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {newStep > 1 && (
                  <button onClick={goBackNewStep} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', fontSize: 14, cursor: 'pointer', color: '#fff', padding: '5px 9px', borderRadius: 6 }}>←</button>
                )}
                <h2 className="font-display" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>
                  {newStep === 1 && 'Escolha o Serviço'}
                  {newStep === 2 && 'Escolha a Data'}
                  {newStep === 3 && 'Escolha o Horário'}
                  {newStep === 4 && 'Dados do Cliente'}
                </h2>
              </div>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', fontSize: 18, cursor: 'pointer', color: '#fff', padding: '3px 7px', borderRadius: 6 }}>×</button>
            </div>

            {/* Progress */}
            <div style={{ display: 'flex', gap: 3, padding: '14px 24px 0' }}>
              {[1, 2, 3, 4].map(step => (
                <div key={step} style={{ flex: 1, height: 3, borderRadius: 2, background: step <= newStep ? T.gold : T.borderLight, transition: 'background 0.3s' }} />
              ))}
            </div>

            <div style={{ padding: 22 }}>
              {newError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
                  {newError}
                </div>
              )}

              {loadingAvailability && (
                <div style={{ textAlign: 'center', padding: 36 }}>
                  <div style={{ width: 36, height: 36, border: `3px solid ${T.borderLight}`, borderTopColor: T.gold, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 14px' }} />
                  <p style={{ color: T.textMuted, fontSize: 13 }}>Buscando disponibilidade...</p>
                </div>
              )}

              {/* Step 1: Serviço */}
              {newStep === 1 && !loadingAvailability && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {availableServices.map(service => (
                    <button key={service.id} onClick={() => selectNewService(service.id)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: 14, background: T.surface2, border: `2px solid ${T.borderLight}`,
                        borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.background = 'rgba(160,122,69,0.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderLight; e.currentTarget.style.background = T.surface2; }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: T.textPrimary, fontSize: 14 }}>{service.name}</div>
                        <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 3 }}>{service.durationMinutes} min</div>
                      </div>
                      <div style={{ fontWeight: 700, color: T.gold, fontSize: 15 }}>{formatPrice(service.priceCents)}</div>
                    </button>
                  ))}
                  {availableServices.length === 0 && (
                    <p style={{ textAlign: 'center', color: T.textMuted, padding: 20, fontSize: 13 }}>Nenhum serviço cadastrado. Adicione serviços primeiro.</p>
                  )}
                </div>
              )}

              {/* Step 2: Data */}
              {newStep === 2 && !loadingAvailability && (
                <div>
                  <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 14, textAlign: 'center' }}>Dias com horários disponíveis</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {availableDays.map(day => {
                      const date = new Date(day + 'T12:00:00');
                      const isDayToday = new Date().toDateString() === date.toDateString();
                      return (
                        <button key={day} onClick={() => selectNewDate(day)}
                          style={{
                            padding: 12, background: isDayToday ? 'rgba(160,122,69,0.06)' : T.surface2,
                            border: `2px solid ${isDayToday ? T.gold : T.borderLight}`,
                            borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = isDayToday ? T.gold : T.borderLight; }}
                        >
                          <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>{date.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary }}>{date.getDate()}</div>
                          <div style={{ fontSize: 11, color: T.textSecondary }}>{date.toLocaleDateString('pt-BR', { month: 'short' })}</div>
                          {isDayToday && <div style={{ fontSize: 9, color: T.gold, marginTop: 2, fontWeight: 700 }}>Hoje</div>}
                        </button>
                      );
                    })}
                  </div>
                  {availableDays.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#dc2626', padding: 20, fontSize: 13 }}>Nenhum dia disponível nos próximos 30 dias.</p>
                  )}
                </div>
              )}

              {/* Step 3: Horário */}
              {newStep === 3 && !loadingAvailability && (
                <div>
                  <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 14, textAlign: 'center' }}>
                    {new Date(newAppointment.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {availableSlots.map(slot => {
                      const time = new Date(slot.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <button key={slot.startAt} onClick={() => selectNewTime(slot.startAt)}
                          style={{
                            padding: '10px 6px', background: T.surface2, border: `2px solid ${T.borderLight}`,
                            borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                            fontWeight: 600, fontSize: 13, color: T.textPrimary,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.background = T.gold; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderLight; e.currentTarget.style.background = T.surface2; e.currentTarget.style.color = T.textPrimary; }}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                  {availableSlots.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#dc2626', padding: 20, fontSize: 13 }}>Nenhum horário disponível neste dia.</p>
                  )}
                </div>
              )}

              {/* Step 4: Cliente */}
              {newStep === 4 && !loadingAvailability && (
                <>
                  {/* Resumo */}
                  <div style={{ background: T.surface2, borderRadius: 10, padding: 14, marginBottom: 18, border: `1px solid ${T.borderLight}` }}>
                    <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Resumo</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: T.textPrimary, fontSize: 14 }}>{availableServices.find(s => s.id === newAppointment.serviceId)?.name}</div>
                        <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 3 }}>
                          {new Date(newAppointment.startAt).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {new Date(newAppointment.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: T.gold, fontSize: 15 }}>{formatPrice(availableServices.find(s => s.id === newAppointment.serviceId)?.priceCents || 0)}</div>
                    </div>
                  </div>

                  {/* Nome */}
                  <div style={{ marginBottom: 14, position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 6 }}>Nome do Cliente *</label>
                    <input type="text" value={newAppointment.clientName}
                      onChange={e => handleClientNameChange(e.target.value)}
                      onFocus={() => {
                        if (newAppointment.clientName.length >= 2) {
                          const filtered = existingClients.filter(c => c.name.toLowerCase().includes(newAppointment.clientName.toLowerCase()));
                          setFilteredClients(filtered);
                          setShowClientSuggestions(filtered.length > 0);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                      placeholder="Buscar ou criar novo..."
                      style={{ width: '100%', padding: '10px 12px', border: `2px solid ${T.borderLight}`, borderRadius: 8, fontSize: 14, transition: 'border-color 0.15s' }}
                    />
                    {showClientSuggestions && filteredClients.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: T.white, border: `2px solid ${T.gold}`, borderRadius: 8, marginTop: 3, maxHeight: 180, overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                        <div style={{ padding: '6px 10px', fontSize: 10, color: T.textMuted, borderBottom: `1px solid ${T.borderLight}`, background: T.surface2, fontWeight: 600 }}>Clientes existentes</div>
                        {filteredClients.map(client => (
                          <button key={client.id} onClick={() => selectExistingClient(client)}
                            style={{ width: '100%', padding: '10px 12px', border: 'none', background: T.white, textAlign: 'left', cursor: 'pointer', borderBottom: `1px solid ${T.borderLight}`, transition: 'background 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
                            onMouseLeave={e => { e.currentTarget.style.background = T.white; }}
                          >
                            <div style={{ fontWeight: 600, color: T.textPrimary, fontSize: 13 }}>{client.name}</div>
                            <div style={{ fontSize: 11, color: T.textSecondary }}>{client.phoneE164.replace('+55', '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Telefone */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 6 }}>WhatsApp *</label>
                    <input type="tel" value={newAppointment.clientPhone}
                      onChange={e => setNewAppointment({ ...newAppointment, clientPhone: formatPhoneInput(e.target.value) })}
                      placeholder="(11) 99999-9999"
                      style={{ width: '100%', padding: '10px 12px', border: `2px solid ${T.borderLight}`, borderRadius: 8, fontSize: 14, transition: 'border-color 0.15s' }}
                      onFocus={e => { e.currentTarget.style.borderColor = T.gold; }}
                      onBlur={e => { e.currentTarget.style.borderColor = T.borderLight; }}
                    />
                  </div>

                  {/* Notas */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 6 }}>Observações (opcional)</label>
                    <textarea value={newAppointment.notes} onChange={e => setNewAppointment({ ...newAppointment, notes: e.target.value })} rows={2}
                      placeholder="Alguma observação..."
                      style={{ width: '100%', padding: '10px 12px', border: `2px solid ${T.borderLight}`, borderRadius: 8, fontSize: 13, resize: 'none' }} />
                  </div>

                  {/* Confirmar */}
                  <button onClick={createNewAppointment}
                    disabled={savingNew || !newAppointment.clientName.trim() || newAppointment.clientPhone.replace(/\D/g, '').length < 10}
                    style={{
                      width: '100%', padding: '14px',
                      background: savingNew ? T.textMuted : `linear-gradient(135deg, #5a9e6f 0%, #4a8b5f 100%)`,
                      color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700,
                      cursor: savingNew ? 'not-allowed' : 'pointer', fontSize: 15,
                      boxShadow: savingNew ? 'none' : '0 4px 12px rgba(90,158,111,0.35)',
                      opacity: (!newAppointment.clientName.trim() || newAppointment.clientPhone.replace(/\D/g, '').length < 10) ? 0.5 : 1,
                    }}>
                    {savingNew ? 'Criando...' : 'Confirmar e Enviar WhatsApp'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
