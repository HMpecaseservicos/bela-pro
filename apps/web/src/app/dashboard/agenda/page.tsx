'use client';

import { useEffect, useState } from 'react';

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  notes?: string;
  client: { id: string; name: string; phoneE164: string };
  services: Array<{ service: Service }>;
}

interface MessageEvent {
  type: string;
  label: string;
  description: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: '#fef3c7', text: '#d97706', label: 'Pendente' },
  CONFIRMED: { bg: '#dbeafe', text: '#2563eb', label: 'Confirmado' },
  COMPLETED: { bg: '#d1fae5', text: '#059669', label: 'Concluído' },
  CANCELLED: { bg: '#fee2e2', text: '#dc2626', label: 'Cancelado' },
  NO_SHOW: { bg: '#f3f4f6', text: '#6b7280', label: 'Não compareceu' },
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');
  const [isMobile, setIsMobile] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  
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

  // Novo Agendamento Modal - Estados
  const [showNewModal, setShowNewModal] = useState(false);
  const [newStep, setNewStep] = useState<1 | 2 | 3 | 4>(1); // 1=serviço, 2=data, 3=horário, 4=cliente
  const [newAppointment, setNewAppointment] = useState({
    clientName: '',
    clientPhone: '',
    serviceId: '',
    date: '',
    startAt: '', // ISO string do horário selecionado
    notes: '',
  });
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<{ startAt: string; endAt: string; available: boolean }[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [newError, setNewError] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  
  // Clientes existentes (para autocomplete)
  const [existingClients, setExistingClients] = useState<{ id: string; name: string; phoneE164: string }[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<{ id: string; name: string; phoneE164: string }[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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

  async function fetchWorkspaceId() {
    const wsId = localStorage.getItem('workspaceId');
    if (wsId) {
      setWorkspaceId(wsId);
    }
  }

  async function fetchExistingClients() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExistingClients(data);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  }

  async function fetchAppointments() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    try {
      const res = await fetch(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAppointments(data);
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
        setAvailableServices(data.filter((s: any) => s.isActive));
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
      
      // Atualiza appointment local
      const apt = appointments.find(a => a.id === id);
      if (apt) {
        apt.status = newStatus;
        setAppointments([...appointments]);
        if (selectedAppointment?.id === id) {
          setSelectedAppointment({ ...apt, status: newStatus });
        }
      }

      // Abre WhatsApp com mensagem apropriada
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventType,
          phone: apt.client.phoneE164,
          context,
        }),
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

  function closeModal() {
    setSelectedAppointment(null);
    setEditMode(false);
  }

  async function saveEdit() {
    if (!selectedAppointment) return;
    setSavingEdit(true);

    try {
      const token = localStorage.getItem('token');
      const [year, month, day] = editData.date.split('-').map(Number);
      const [hour, minute] = editData.time.split(':').map(Number);
      const newStartAt = new Date(year, month - 1, day, hour, minute);

      const res = await fetch(`${API_URL}/appointments/${selectedAppointment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          startAt: newStartAt.toISOString(),
          serviceId: editData.serviceId,
          notes: editData.notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao salvar');
      }

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
    setNewAppointment({
      clientName: '',
      clientPhone: '',
      serviceId: '',
      date: '',
      startAt: '',
      notes: '',
    });
    setNewStep(1);
    setAvailableDays([]);
    setAvailableSlots([]);
    setNewError('');
    setShowClientSuggestions(false);
    setShowNewModal(true);
  }

  async function selectNewService(serviceId: string) {
    if (!workspaceId) return;
    
    setNewAppointment(prev => ({ ...prev, serviceId, date: '', startAt: '' }));
    setLoadingAvailability(true);
    setNewError('');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(
        `${API_URL}/availability/days?workspaceId=${workspaceId}&serviceId=${serviceId}&from=${today}&limit=30`
      );
      
      if (!res.ok) throw new Error('Erro ao buscar dias disponíveis');
      
      const days: string[] = await res.json();
      setAvailableDays(days);
      setNewStep(2);
    } catch (err: any) {
      setNewError(err.message || 'Erro ao buscar disponibilidade');
    } finally {
      setLoadingAvailability(false);
    }
  }

  async function selectNewDate(date: string) {
    if (!workspaceId || !newAppointment.serviceId) return;
    
    setNewAppointment(prev => ({ ...prev, date, startAt: '' }));
    setLoadingAvailability(true);
    setNewError('');
    
    try {
      const res = await fetch(
        `${API_URL}/availability/slots?workspaceId=${workspaceId}&serviceId=${newAppointment.serviceId}&date=${date}`
      );
      
      if (!res.ok) throw new Error('Erro ao buscar horários');
      
      const slots = await res.json();
      const available = slots.filter((s: any) => s.available);
      setAvailableSlots(available);
      setNewStep(3);
    } catch (err: any) {
      setNewError(err.message || 'Erro ao buscar horários');
    } finally {
      setLoadingAvailability(false);
    }
  }

  function selectNewTime(startAt: string) {
    setNewAppointment(prev => ({ ...prev, startAt }));
    setNewStep(4);
  }

  function handleClientNameChange(value: string) {
    setNewAppointment(prev => ({ ...prev, clientName: value }));
    
    // Filtrar clientes existentes
    if (value.length >= 2) {
      const filtered = existingClients.filter(c => 
        c.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredClients(filtered);
      setShowClientSuggestions(filtered.length > 0);
    } else {
      setShowClientSuggestions(false);
    }
  }

  function selectExistingClient(client: { id: string; name: string; phoneE164: string }) {
    // Formata o telefone E164 para exibição
    const phone = client.phoneE164.replace('+55', '');
    const formattedPhone = formatPhoneInput(phone);
    
    setNewAppointment(prev => ({
      ...prev,
      clientName: client.name,
      clientPhone: formattedPhone,
    }));
    setShowClientSuggestions(false);
  }

  function goBackNewStep() {
    if (newStep === 2) {
      setNewStep(1);
      setNewAppointment(prev => ({ ...prev, serviceId: '', date: '', startAt: '' }));
    } else if (newStep === 3) {
      setNewStep(2);
      setNewAppointment(prev => ({ ...prev, date: '', startAt: '' }));
    } else if (newStep === 4) {
      setNewStep(3);
      setNewAppointment(prev => ({ ...prev, startAt: '' }));
    }
  }

  function formatPhoneInput(value: string) {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Formata como (XX) XXXXX-XXXX
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }

  function phoneToE164(phone: string) {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) return `+55${numbers}`;
    if (numbers.length === 10) return `+55${numbers}`;
    return `+55${numbers}`;
  }

  async function createNewAppointment() {
    setNewError('');
    
    // Validações
    if (!newAppointment.clientName.trim()) {
      setNewError('Informe o nome do cliente');
      return;
    }
    if (newAppointment.clientPhone.replace(/\D/g, '').length < 10) {
      setNewError('Informe um telefone válido');
      return;
    }
    if (!newAppointment.serviceId || !newAppointment.startAt) {
      setNewError('Selecione serviço, data e horário');
      return;
    }

    setSavingNew(true);

    try {
      const token = localStorage.getItem('token');
      
      // O startAt já é o ISO string do slot
      const startAt = newAppointment.startAt;

      const res = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientName: newAppointment.clientName.trim(),
          clientPhone: phoneToE164(newAppointment.clientPhone),
          serviceIds: [newAppointment.serviceId],
          startAt: startAt,
          notes: newAppointment.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao criar agendamento');
      }

      const createdAppointment = await res.json();
      
      // Fecha o modal
      setShowNewModal(false);
      fetchAppointments();
      
      // Navega para a data do agendamento
      setSelectedDate(new Date(startAt));

      // Abre WhatsApp com mensagem de confirmação
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventType: 'APPOINTMENT_CONFIRMED',
          phone: phoneToE164(newAppointment.clientPhone),
          context,
        }),
      });

      if (whatsappRes.ok) {
        const { whatsappLink } = await whatsappRes.json();
        window.open(whatsappLink, '_blank');
      }

    } catch (err: any) {
      setNewError(err.message || 'Erro ao criar agendamento');
    } finally {
      setSavingNew(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  function navigateDate(days: number) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  }

  function getWeekDays() {
    const days = [];
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }

  const dayAppointments = appointments.filter(
    a => new Date(a.startAt).toDateString() === selectedDate.toDateString()
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 32, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 12 : 0, marginBottom: isMobile ? 16 : 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>Agenda</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: isMobile ? 13 : 15 }}>Gerencie seus atendimentos</p>
        </div>
        
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Botão Novo Agendamento */}
          <button
            onClick={openNewAppointmentModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #5a67d8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.35)';
            }}
          >
            <span style={{ fontSize: 18 }}>+</span>
            {isMobile ? 'Novo' : 'Novo Agendamento'}
          </button>

          {!isMobile && (
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
              <button 
                onClick={() => setView('day')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 8,
                  background: view === 'day' ? 'white' : 'transparent',
                  color: view === 'day' ? '#667eea' : '#64748b',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: 13,
                  boxShadow: view === 'day' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Dia
              </button>
              <button 
                onClick={() => setView('week')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 8,
                  background: view === 'week' ? 'white' : 'transparent',
                  color: view === 'week' ? '#667eea' : '#64748b',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: 13,
                  boxShadow: view === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Semana
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Date Navigation */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: isMobile ? 8 : 16, 
        marginBottom: isMobile ? 16 : 24,
        background: 'white',
        padding: isMobile ? '12px 16px' : '16px 24px',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <button 
          onClick={() => navigateDate(-1)}
          style={{
            width: 36, height: 36, border: '1px solid #e2e8f0', borderRadius: 8,
            background: 'white', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}
        >←</button>
        
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 600, color: '#1e293b' }}>
            {selectedDate.toLocaleDateString('pt-BR', { weekday: isMobile ? 'short' : 'long', day: 'numeric', month: isMobile ? 'short' : 'long', year: 'numeric' })}
          </div>
        </div>

        <button 
          onClick={() => navigateDate(1)}
          style={{
            width: 36, height: 36, border: '1px solid #e2e8f0', borderRadius: 8,
            background: 'white', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}
        >→</button>

        <button 
          onClick={() => setSelectedDate(new Date())}
          style={{
            padding: '8px 16px', border: '1px solid #667eea', borderRadius: 8,
            background: 'white', color: '#667eea', fontWeight: 500, cursor: 'pointer', fontSize: 13,
          }}
        >Hoje</button>
      </div>

      {/* Calendar View */}
      {view === 'day' ? (
        <div style={{ flex: 1, background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {HOURS.map(hour => {
              const hourAppointments = dayAppointments.filter(a => new Date(a.startAt).getHours() === hour);

              return (
                <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', minHeight: 80 }}>
                  <div style={{ width: 80, padding: '12px 16px', borderRight: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
                    {`${hour.toString().padStart(2, '0')}:00`}
                  </div>

                  <div style={{ flex: 1, padding: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {hourAppointments.map(apt => {
                      const statusInfo = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING;
                      const service = apt.services[0]?.service;
                      return (
                        <div 
                          key={apt.id}
                          onClick={() => openAppointmentModal(apt)}
                          style={{
                            background: statusInfo.bg,
                            borderLeft: `4px solid ${statusInfo.text}`,
                            borderRadius: 8,
                            padding: 12,
                            minWidth: 200,
                            flex: '1 1 250px',
                            maxWidth: 350,
                            cursor: 'pointer',
                            transition: 'transform 0.1s, box-shadow 0.1s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{apt.client.name}</div>
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                {formatTime(apt.startAt)} - {formatTime(apt.endAt)}
                              </div>
                            </div>
                            <span style={{
                              background: 'rgba(255,255,255,0.8)', color: statusInfo.text,
                              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                            }}>
                              {statusInfo.label}
                            </span>
                          </div>
                          
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {service?.name} • {service && formatPrice(service.priceCents)}
                          </div>
                          
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                            📱 Clique para ver opções
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
        /* Week View */
        <div style={{ flex: 1, background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', minWidth: 900 }}>
            <div style={{ borderBottom: '2px solid #f1f5f9', padding: 12 }} />
            {getWeekDays().map((day, i) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const isSelected = day.toDateString() === selectedDate.toDateString();
              return (
                <div key={i} onClick={() => { setSelectedDate(day); setView('day'); }}
                  style={{ borderBottom: '2px solid #f1f5f9', padding: 12, textAlign: 'center', cursor: 'pointer', background: isSelected ? '#f8fafc' : 'transparent' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
                    {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, background: isToday ? '#667eea' : 'transparent', color: isToday ? 'white' : '#1e293b', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}

            {HOURS.map(hour => (
              <>
                <div key={`time-${hour}`} style={{ borderBottom: '1px solid #f1f5f9', padding: '8px 12px', color: '#94a3b8', fontSize: 12 }}>
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
                {getWeekDays().map((day, i) => {
                  const dayApts = appointments.filter(a => {
                    const d = new Date(a.startAt);
                    return d.toDateString() === day.toDateString() && d.getHours() === hour;
                  });
                  return (
                    <div key={`${hour}-${i}`} style={{ borderBottom: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9', padding: 4, minHeight: 60 }}>
                      {dayApts.map(apt => {
                        const statusInfo = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING;
                        return (
                          <div key={apt.id} onClick={() => openAppointmentModal(apt)}
                            style={{ background: statusInfo.bg, borderRadius: 4, padding: '4px 6px', fontSize: 10, marginBottom: 2, borderLeft: `3px solid ${statusInfo.text}`, cursor: 'pointer' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{apt.client.name}</div>
                            <div style={{ color: '#64748b' }}>{formatTime(apt.startAt)}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }} onClick={closeModal}>
          <div style={{
            background: 'white', borderRadius: 16, width: '100%', maxWidth: 500,
            maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1e293b' }}>
                {editMode ? 'Editar Agendamento' : 'Detalhes do Agendamento'}
              </h2>
              <button onClick={closeModal} style={{
                background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b', padding: 4,
              }}>×</button>
            </div>

            <div style={{ padding: 24 }}>
              {!editMode ? (
                <>
                  {/* Client Info */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%', background: '#667eea',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 600, fontSize: 18,
                      }}>
                        {selectedAppointment.client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b' }}>
                          {selectedAppointment.client.name}
                        </div>
                        <div style={{ fontSize: 14, color: '#64748b' }}>
                          {selectedAppointment.client.phoneE164}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Appointment Info */}
                  <div style={{
                    background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 20,
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Data</div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>
                          {new Date(selectedAppointment.startAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Horário</div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>
                          {formatTime(selectedAppointment.startAt)} - {formatTime(selectedAppointment.endAt)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Serviço</div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>
                          {selectedAppointment.services[0]?.service?.name || '-'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Valor</div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>
                          {selectedAppointment.services[0]?.service && formatPrice(selectedAppointment.services[0].service.priceCents)}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Status</div>
                      <span style={{
                        background: STATUS_COLORS[selectedAppointment.status]?.bg,
                        color: STATUS_COLORS[selectedAppointment.status]?.text,
                        padding: '4px 12px', borderRadius: 6, fontWeight: 500, fontSize: 13,
                      }}>
                        {STATUS_COLORS[selectedAppointment.status]?.label}
                      </span>
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>
                      Ações
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {selectedAppointment.status === 'PENDING' && (
                        <>
                          <button onClick={() => updateStatus(selectedAppointment.id, 'CONFIRMED')}
                            style={{ flex: 1, padding: '10px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', minWidth: 120 }}>
                            ✓ Confirmar
                          </button>
                          <button onClick={() => updateStatus(selectedAppointment.id, 'CANCELLED')}
                            style={{ flex: 1, padding: '10px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', minWidth: 120 }}>
                            ✗ Cancelar
                          </button>
                        </>
                      )}
                      {selectedAppointment.status === 'CONFIRMED' && (
                        <>
                          <button onClick={() => updateStatus(selectedAppointment.id, 'COMPLETED')}
                            style={{ flex: 1, padding: '10px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', minWidth: 120 }}>
                            ✓ Concluir
                          </button>
                          <button onClick={() => updateStatus(selectedAppointment.id, 'NO_SHOW')}
                            style={{ flex: 1, padding: '10px 16px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', minWidth: 120 }}>
                            Não Compareceu
                          </button>
                        </>
                      )}
                      <button onClick={() => setEditMode(true)}
                        style={{ padding: '10px 16px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>
                        ✏️ Editar
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Messages */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>💬</span> Enviar Mensagem WhatsApp
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {messageEvents.map((event) => (
                        <button
                          key={event.type}
                          onClick={() => sendWhatsAppMessage(selectedAppointment, event.type)}
                          disabled={sendingMessage === event.type}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 16px', background: sendingMessage === event.type ? '#dcfce7' : '#f0fdf4',
                            border: '1px solid #bbf7d0', borderRadius: 10, cursor: sendingMessage === event.type ? 'wait' : 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 500, color: '#166534', fontSize: 14 }}>
                              {event.label}
                            </div>
                            <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>
                              {event.description}
                            </div>
                          </div>
                          <div style={{
                            background: '#25D366', color: 'white', padding: '6px 12px',
                            borderRadius: 6, fontWeight: 500, fontSize: 12,
                          }}>
                            {sendingMessage === event.type ? '...' : '📲 Enviar'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Edit Mode */
                <>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
                      Data
                    </label>
                    <input
                      type="date"
                      value={editData.date}
                      onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                        borderRadius: 8, fontSize: 14,
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
                      Horário
                    </label>
                    <input
                      type="time"
                      value={editData.time}
                      onChange={(e) => setEditData({ ...editData, time: e.target.value })}
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                        borderRadius: 8, fontSize: 14,
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
                      Serviço
                    </label>
                    <select
                      value={editData.serviceId}
                      onChange={(e) => setEditData({ ...editData, serviceId: e.target.value })}
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                        borderRadius: 8, fontSize: 14, background: 'white',
                      }}
                    >
                      <option value="">Selecione um serviço</option>
                      {availableServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} - {formatPrice(s.priceCents)} ({s.durationMinutes}min)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
                      Observações
                    </label>
                    <textarea
                      value={editData.notes}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      rows={3}
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                        borderRadius: 8, fontSize: 14, resize: 'vertical',
                      }}
                      placeholder="Observações sobre o agendamento..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => setEditMode(false)}
                      style={{ flex: 1, padding: '12px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>
                      Cancelar
                    </button>
                    <button onClick={saveEdit} disabled={savingEdit}
                      style={{ flex: 1, padding: '12px', background: savingEdit ? '#94a3b8' : '#667eea', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, cursor: savingEdit ? 'not-allowed' : 'pointer' }}>
                      {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Appointment Modal - Step by Step */}
      {showNewModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }} onClick={() => setShowNewModal(false)}>
          <div style={{
            background: 'white', borderRadius: 16, width: '100%', maxWidth: 500,
            maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #5a67d8 100%)',
              borderRadius: '16px 16px 0 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {newStep > 1 && (
                  <button onClick={goBackNewStep} style={{
                    background: 'rgba(255,255,255,0.2)', border: 'none', fontSize: 16, cursor: 'pointer', 
                    color: 'white', padding: '6px 10px', borderRadius: 6,
                  }}>←</button>
                )}
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'white' }}>
                  {newStep === 1 && '💅 Escolha o Serviço'}
                  {newStep === 2 && '📅 Escolha a Data'}
                  {newStep === 3 && '⏰ Escolha o Horário'}
                  {newStep === 4 && '👤 Dados do Cliente'}
                </h2>
              </div>
              <button onClick={() => setShowNewModal(false)} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', fontSize: 20, cursor: 'pointer', 
                color: 'white', padding: '4px 8px', borderRadius: 6,
              }}>×</button>
            </div>

            {/* Progress Bar */}
            <div style={{ display: 'flex', gap: 4, padding: '16px 24px 0' }}>
              {[1, 2, 3, 4].map(step => (
                <div key={step} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: step <= newStep ? '#667eea' : '#e2e8f0',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>

            <div style={{ padding: 24 }}>
              {/* Erro */}
              {newError && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                  padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 14,
                }}>
                  {newError}
                </div>
              )}

              {/* Loading */}
              {loadingAvailability && (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                  <p style={{ color: '#64748b' }}>Buscando disponibilidade...</p>
                </div>
              )}

              {/* STEP 1: Serviço */}
              {newStep === 1 && !loadingAvailability && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {availableServices.map(service => (
                    <button
                      key={service.id}
                      onClick={() => selectNewService(service.id)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: 16, background: '#f8fafc', border: '2px solid #e2e8f0',
                        borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#667eea';
                        e.currentTarget.style.background = '#f0f4ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#f8fafc';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 15 }}>{service.name}</div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                          {service.durationMinutes} min
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#667eea', fontSize: 16 }}>
                        {formatPrice(service.priceCents)}
                      </div>
                    </button>
                  ))}
                  {availableServices.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>
                      Nenhum serviço cadastrado. Adicione serviços primeiro.
                    </p>
                  )}
                </div>
              )}

              {/* STEP 2: Data */}
              {newStep === 2 && !loadingAvailability && (
                <div>
                  <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
                    Mostrando apenas dias com horários disponíveis
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {availableDays.map(day => {
                      const date = new Date(day + 'T12:00:00');
                      const isToday = new Date().toDateString() === date.toDateString();
                      return (
                        <button
                          key={day}
                          onClick={() => selectNewDate(day)}
                          style={{
                            padding: 14, background: isToday ? '#f0f4ff' : '#f8fafc',
                            border: `2px solid ${isToday ? '#667eea' : '#e2e8f0'}`,
                            borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#667eea';
                            e.currentTarget.style.background = '#f0f4ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = isToday ? '#667eea' : '#e2e8f0';
                            e.currentTarget.style.background = isToday ? '#f0f4ff' : '#f8fafc';
                          }}
                        >
                          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>
                            {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
                            {date.getDate()}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {date.toLocaleDateString('pt-BR', { month: 'short' })}
                          </div>
                          {isToday && <div style={{ fontSize: 10, color: '#667eea', marginTop: 4 }}>Hoje</div>}
                        </button>
                      );
                    })}
                  </div>
                  {availableDays.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#dc2626', padding: 20 }}>
                      😔 Nenhum dia disponível nos próximos 30 dias. Verifique seus horários de trabalho.
                    </p>
                  )}
                </div>
              )}

              {/* STEP 3: Horário */}
              {newStep === 3 && !loadingAvailability && (
                <div>
                  <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
                    📅 {new Date(newAppointment.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {availableSlots.map(slot => {
                      const time = new Date(slot.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <button
                          key={slot.startAt}
                          onClick={() => selectNewTime(slot.startAt)}
                          style={{
                            padding: '12px 8px', background: '#f8fafc', border: '2px solid #e2e8f0',
                            borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                            fontWeight: 600, fontSize: 14, color: '#1e293b',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#667eea';
                            e.currentTarget.style.background = '#667eea';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.color = '#1e293b';
                          }}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                  {availableSlots.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#dc2626', padding: 20 }}>
                      😔 Nenhum horário disponível neste dia.
                    </p>
                  )}
                </div>
              )}

              {/* STEP 4: Dados do Cliente */}
              {newStep === 4 && !loadingAvailability && (
                <>
                  {/* Resumo */}
                  <div style={{
                    background: '#f0f4ff', borderRadius: 10, padding: 16, marginBottom: 20,
                    border: '1px solid #dbeafe',
                  }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Resumo do agendamento</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {availableServices.find(s => s.id === newAppointment.serviceId)?.name}
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                          {new Date(newAppointment.startAt).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {new Date(newAppointment.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#667eea' }}>
                        {formatPrice(availableServices.find(s => s.id === newAppointment.serviceId)?.priceCents || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Nome com Autocomplete */}
                  <div style={{ marginBottom: 16, position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      👤 Nome do Cliente *
                    </label>
                    <input
                      type="text"
                      value={newAppointment.clientName}
                      onChange={(e) => handleClientNameChange(e.target.value)}
                      onFocus={() => {
                        if (newAppointment.clientName.length >= 2) {
                          const filtered = existingClients.filter(c => 
                            c.name.toLowerCase().includes(newAppointment.clientName.toLowerCase())
                          );
                          setFilteredClients(filtered);
                          setShowClientSuggestions(filtered.length > 0);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                      placeholder="Digite para buscar ou criar novo..."
                      style={{
                        width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0',
                        borderRadius: 10, fontSize: 15, transition: 'border-color 0.2s',
                      }}
                    />
                    
                    {/* Lista de sugestões de clientes */}
                    {showClientSuggestions && filteredClients.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                        background: 'white', border: '2px solid #667eea', borderRadius: 10,
                        marginTop: 4, maxHeight: 200, overflow: 'auto',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}>
                        <div style={{ padding: '8px 12px', fontSize: 11, color: '#64748b', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          📋 Clientes existentes
                        </div>
                        {filteredClients.map(client => (
                          <button
                            key={client.id}
                            onClick={() => selectExistingClient(client)}
                            style={{
                              width: '100%', padding: '12px 14px', border: 'none', background: 'white',
                              textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f0f4ff'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{client.name}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{client.phoneE164.replace('+55', '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Telefone */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      📱 WhatsApp *
                    </label>
                    <input
                      type="tel"
                      value={newAppointment.clientPhone}
                      onChange={(e) => setNewAppointment({ ...newAppointment, clientPhone: formatPhoneInput(e.target.value) })}
                      placeholder="(11) 99999-9999"
                      style={{
                        width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0',
                        borderRadius: 10, fontSize: 15, transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                    />
                  </div>

                  {/* Observações */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      📝 Observações (opcional)
                    </label>
                    <textarea
                      value={newAppointment.notes}
                      onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                      rows={2}
                      placeholder="Alguma observação..."
                      style={{
                        width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0',
                        borderRadius: 10, fontSize: 14, resize: 'none',
                      }}
                    />
                  </div>

                  {/* Botão Confirmar */}
                  <button 
                    onClick={createNewAppointment} 
                    disabled={savingNew || !newAppointment.clientName.trim() || newAppointment.clientPhone.replace(/\D/g, '').length < 10}
                    style={{ 
                      width: '100%', padding: '16px', 
                      background: savingNew ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                      color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, 
                      cursor: savingNew ? 'not-allowed' : 'pointer', fontSize: 16,
                      boxShadow: savingNew ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.35)',
                      opacity: (!newAppointment.clientName.trim() || newAppointment.clientPhone.replace(/\D/g, '').length < 10) ? 0.5 : 1,
                    }}
                  >
                    {savingNew ? '⏳ Criando...' : '✓ Confirmar e Enviar WhatsApp'}
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
