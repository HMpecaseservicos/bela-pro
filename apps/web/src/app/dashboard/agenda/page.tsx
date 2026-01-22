'use client';

import { useEffect, useState } from 'react';

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  client: { name: string; phoneE164: string };
  services: Array<{ service: { name: string; durationMinutes: number; priceCents: number } }>;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: '#fef3c7', text: '#d97706', label: 'Pendente' },
  CONFIRMED: { bg: '#dbeafe', text: '#2563eb', label: 'Confirmado' },
  COMPLETED: { bg: '#d1fae5', text: '#059669', label: 'Concluído' },
  CANCELLED: { bg: '#fee2e2', text: '#dc2626', label: 'Cancelado' },
  NO_SHOW: { bg: '#f3f4f6', text: '#6b7280', label: 'Não compareceu' },
};

// Mapeamento de status para tipo de evento de mensagem
const STATUS_TO_EVENT: Record<string, string> = {
  PENDING: 'APPOINTMENT_CREATED',
  CONFIRMED: 'APPOINTMENT_CONFIRMED',
  CANCELLED: 'APPOINTMENT_CANCELLED',
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8h to 19h

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');
  const [isMobile, setIsMobile] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);

  const API_URL = 'http://localhost:3001/api/v1';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchAppointments();
    // Carrega nome do workspace do localStorage
    setWorkspaceName(localStorage.getItem('workspaceName') || 'Meu Negócio');
  }, []);

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
      
      // Se 401, redireciona para login
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      
      if (!res.ok) throw new Error();
      const data = await res.json();
      console.log('Appointments loaded:', data); // Debug
      setAppointments(data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  // Envia mensagem via WhatsApp (abre link)
  async function sendWhatsAppMessage(apt: Appointment, eventType?: string) {
    setSendingMessage(apt.id);
    
    try {
      const token = localStorage.getItem('token');
      const service = apt.services[0]?.service;
      const startDate = new Date(apt.startAt);
      
      // Determina tipo de evento baseado no status
      const messageEventType = eventType || STATUS_TO_EVENT[apt.status] || 'APPOINTMENT_CONFIRMED';
      
      // Contexto para renderização do template
      const context = {
        clientName: apt.client.name,
        serviceName: service?.name || 'Serviço',
        date: startDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        workspaceName: workspaceName,
      };

      // Busca template e gera link
      const res = await fetch(`${API_URL}/message-templates/generate-link`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventType: messageEventType,
          phone: apt.client.phoneE164,
          context,
        }),
      });

      if (!res.ok) {
        throw new Error('Erro ao gerar mensagem');
      }

      const { whatsappLink } = await res.json();
      
      // Abre WhatsApp em nova aba
      window.open(whatsappLink, '_blank');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      alert('Erro ao gerar link do WhatsApp');
    } finally {
      setSendingMessage(null);
    }
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
        
        {!isMobile && (
          <div style={{ display: 'flex', gap: 12 }}>
            {/* View Toggle */}
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
          </div>
        )}
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
            width: 36,
            height: 36,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
        >
          ←
        </button>
        
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 600, color: '#1e293b' }}>
            {selectedDate.toLocaleDateString('pt-BR', { weekday: isMobile ? 'short' : 'long', day: 'numeric', month: isMobile ? 'short' : 'long', year: 'numeric' })}
          </div>
        </div>

        <button 
          onClick={() => navigateDate(1)}
          style={{
            width: 36,
            height: 36,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
        >
          →
        </button>

        <button 
          onClick={() => setSelectedDate(new Date())}
          style={{
            padding: '8px 16px',
            border: '1px solid #667eea',
            borderRadius: 8,
            background: 'white',
            color: '#667eea',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Hoje
        </button>
      </div>

      {/* Calendar View */}
      {view === 'day' ? (
        <div style={{ 
          flex: 1, 
          background: 'white', 
          borderRadius: 16, 
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          overflow: 'auto',
        }}>
          {/* Time Slots */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {HOURS.map(hour => {
              const hourAppointments = dayAppointments.filter(a => {
                const h = new Date(a.startAt).getHours();
                return h === hour;
              });

              return (
                <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', minHeight: 80 }}>
                  {/* Time Label */}
                  <div style={{ 
                    width: 80, 
                    padding: '12px 16px', 
                    borderRight: '1px solid #f1f5f9',
                    color: '#94a3b8',
                    fontSize: 13,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}>
                    {`${hour.toString().padStart(2, '0')}:00`}
                  </div>

                  {/* Appointments */}
                  <div style={{ flex: 1, padding: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {hourAppointments.map(apt => {
                      const statusInfo = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING;
                      const service = apt.services[0]?.service;
                      return (
                        <div 
                          key={apt.id}
                          style={{
                            background: statusInfo.bg,
                            borderLeft: `4px solid ${statusInfo.text}`,
                            borderRadius: 8,
                            padding: 12,
                            minWidth: 200,
                            flex: '1 1 250px',
                            maxWidth: 350,
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
                              background: 'rgba(255,255,255,0.8)',
                              color: statusInfo.text,
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 600,
                            }}>
                              {statusInfo.label}
                            </span>
                          </div>
                          
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                            {service?.name} • {service && formatPrice(service.priceCents)}
                          </div>

                          {/* Actions */}
                          {apt.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => updateStatus(apt.id, 'CONFIRMED')}
                                style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', minWidth: 80 }}
                              >
                                ✓ Confirmar
                              </button>
                              <button
                                onClick={() => updateStatus(apt.id, 'CANCELLED')}
                                style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', minWidth: 80 }}
                              >
                                ✗ Cancelar
                              </button>
                              <button
                                onClick={() => sendWhatsAppMessage(apt)}
                                disabled={sendingMessage === apt.id}
                                style={{ flex: 1, background: '#25D366', color: 'white', border: 'none', padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: sendingMessage === apt.id ? 'wait' : 'pointer', minWidth: 80, opacity: sendingMessage === apt.id ? 0.7 : 1 }}
                              >
                                💬 WhatsApp
                              </button>
                            </div>
                          )}
                          {apt.status === 'CONFIRMED' && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => updateStatus(apt.id, 'COMPLETED')}
                                style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', minWidth: 100 }}
                              >
                                ✓ Concluir
                              </button>
                              <button
                                onClick={() => sendWhatsAppMessage(apt)}
                                disabled={sendingMessage === apt.id}
                                style={{ flex: 1, background: '#25D366', color: 'white', border: 'none', padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: sendingMessage === apt.id ? 'wait' : 'pointer', minWidth: 80, opacity: sendingMessage === apt.id ? 0.7 : 1 }}
                              >
                                💬 WhatsApp
                              </button>
                            </div>
                          )}
                          {(apt.status === 'COMPLETED' || apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') && (
                            <button
                              onClick={() => sendWhatsAppMessage(apt)}
                              disabled={sendingMessage === apt.id}
                              style={{ width: '100%', background: '#25D366', color: 'white', border: 'none', padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: sendingMessage === apt.id ? 'wait' : 'pointer', opacity: sendingMessage === apt.id ? 0.7 : 1 }}
                            >
                              💬 Enviar WhatsApp
                            </button>
                          )}
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
        <div style={{ 
          flex: 1, 
          background: 'white', 
          borderRadius: 16, 
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          overflow: 'auto',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', minWidth: 900 }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #f1f5f9', padding: 12 }} />
            {getWeekDays().map((day, i) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const isSelected = day.toDateString() === selectedDate.toDateString();
              return (
                <div 
                  key={i}
                  onClick={() => { setSelectedDate(day); setView('day'); }}
                  style={{ 
                    borderBottom: '2px solid #f1f5f9', 
                    padding: 12, 
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isSelected ? '#f8fafc' : 'transparent',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
                    {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </div>
                  <div style={{ 
                    fontSize: 18, 
                    fontWeight: 600, 
                    background: isToday ? '#667eea' : 'transparent',
                    color: isToday ? 'white' : '#1e293b',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                  }}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}

            {/* Time Rows */}
            {HOURS.map(hour => (
              <>
                <div key={`time-${hour}`} style={{ 
                  borderBottom: '1px solid #f1f5f9',
                  padding: '8px 12px',
                  color: '#94a3b8',
                  fontSize: 12,
                }}>
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
                {getWeekDays().map((day, i) => {
                  const dayApts = appointments.filter(a => {
                    const d = new Date(a.startAt);
                    return d.toDateString() === day.toDateString() && d.getHours() === hour;
                  });
                  return (
                    <div 
                      key={`${hour}-${i}`}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        borderLeft: '1px solid #f1f5f9',
                        padding: 4,
                        minHeight: 60,
                      }}
                    >
                      {dayApts.map(apt => {
                        const statusInfo = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING;
                        return (
                          <div 
                            key={apt.id}
                            style={{
                              background: statusInfo.bg,
                              borderRadius: 4,
                              padding: '4px 6px',
                              fontSize: 10,
                              marginBottom: 2,
                              borderLeft: `3px solid ${statusInfo.text}`,
                            }}
                          >
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
    </div>
  );
}
