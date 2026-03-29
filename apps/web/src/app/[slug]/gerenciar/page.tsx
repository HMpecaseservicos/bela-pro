'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Types
interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

interface AppointmentService {
  service: Service;
  durationMinutes: number;
  priceCents: number;
}

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  totalPriceCents: number;
  workspace: {
    id: string;
    name: string;
    brandName: string | null;
    slug: string;
  };
  client: {
    name: string;
    phoneE164: string;
  };
  services: AppointmentService[];
}

interface TimeSlot {
  startAt: string;
  available: boolean;
}

// Colors
const COLORS = {
  primary: '#6366f1',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  background: '#f9fafb',
  surface: '#ffffff',
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
};

// Helpers
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const formatPrice = (cents: number) => {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
};

const cleanPhone = (phone: string) => phone.replace(/\D/g, '');

const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length >= 2) {
    let formatted = `(${cleaned.slice(0, 2)}) `;
    if (cleaned.length >= 7) {
      formatted += `${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    } else {
      formatted += cleaned.slice(2);
    }
    return formatted;
  }
  return cleaned;
};

// Status badge
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
    PENDING: { label: 'Aguardando', bg: '#fef3c7', color: '#92400e' },
    PENDING_PAYMENT: { label: 'Aguardando pagamento', bg: '#fef3c7', color: '#92400e' },
    CONFIRMED: { label: 'Confirmado', bg: '#d1fae5', color: '#065f46' },
    COMPLETED: { label: 'Concluído', bg: '#e0e7ff', color: '#3730a3' },
    CANCELLED: { label: 'Cancelado', bg: '#fee2e2', color: '#991b1b' },
    NO_SHOW: { label: 'Não compareceu', bg: '#f3f4f6', color: '#374151' },
  };
  
  const config = statusConfig[status] || statusConfig.PENDING;
  
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: config.bg,
      color: config.color,
    }}>
      {config.label}
    </span>
  );
};

export default function ManageBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  
  // State
  const [step, setStep] = useState<'lookup' | 'view' | 'reschedule' | 'success' | 'cancelled'>('lookup');
  const [phone, setPhone] = useState('');
  const [appointmentId, setAppointmentId] = useState(searchParams.get('id') || '');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reschedule state
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  // Cancel state
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Lookup appointment
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanedPhone = cleanPhone(phone);
    if (cleanedPhone.length < 10) {
      setError('Digite um telefone válido');
      return;
    }
    
    if (!appointmentId.trim()) {
      setError('Digite o código do agendamento');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(
        `${API_URL}/public-booking/${appointmentId}?phone=${cleanedPhone}`
      );
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Agendamento não encontrado');
      }
      
      const data = await res.json();
      setAppointment(data);
      setStep('view');
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar agendamento');
    } finally {
      setLoading(false);
    }
  };

  // Start reschedule flow
  const startReschedule = async () => {
    if (!appointment) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch available days
      const today = new Date().toISOString().split('T')[0];
      const firstServiceId = appointment.services[0]?.service.id;
      
      const res = await fetch(
        `${API_URL}/availability/days?workspaceId=${appointment.workspace.id}&serviceId=${firstServiceId}&from=${today}&limit=14`
      );
      
      const days = await res.json();
      setAvailableDays(days);
      setStep('reschedule');
    } catch (err: any) {
      setError('Erro ao buscar disponibilidade');
    } finally {
      setLoading(false);
    }
  };

  // Select date and fetch slots
  const handleSelectDate = async (date: string) => {
    if (!appointment) return;
    
    setSelectedDate(date);
    setSelectedSlot(null);
    setLoading(true);
    
    try {
      const firstServiceId = appointment.services[0]?.service.id;
      const res = await fetch(
        `${API_URL}/availability/slots?workspaceId=${appointment.workspace.id}&serviceId=${firstServiceId}&date=${date}`
      );
      
      const slots = await res.json();
      setAvailableSlots(slots.filter((s: TimeSlot) => s.available));
    } catch (err) {
      setError('Erro ao buscar horários');
    } finally {
      setLoading(false);
    }
  };

  // Confirm reschedule
  const confirmReschedule = async () => {
    if (!appointment || !selectedSlot) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_URL}/public-booking/${appointment.id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone(phone),
          newStartAt: selectedSlot,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao reagendar');
      }
      
      const updated = await res.json();
      setAppointment(updated);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Erro ao reagendar');
    } finally {
      setLoading(false);
    }
  };

  // Cancel appointment
  const handleCancel = async () => {
    if (!appointment) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_URL}/public-booking/${appointment.id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone(phone),
          reason: cancelReason || undefined,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao cancelar');
      }
      
      setStep('cancelled');
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar');
    } finally {
      setLoading(false);
      setShowCancelConfirm(false);
    }
  };

  // Check if can modify
  const canModify = appointment && ['PENDING', 'CONFIRMED', 'PENDING_PAYMENT'].includes(appointment.status);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: COLORS.background,
      padding: 20,
    }}>
      <div style={{ 
        maxWidth: 480, 
        margin: '0 auto',
        paddingTop: 40,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ 
            fontSize: 24, 
            fontWeight: 700, 
            color: COLORS.textPrimary,
            margin: '0 0 8px',
          }}>
            Gerenciar Agendamento
          </h1>
          <p style={{ 
            fontSize: 14, 
            color: COLORS.textSecondary,
            margin: 0,
          }}>
            Reagende ou cancele seu horário
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: COLORS.error,
            padding: 14,
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* STEP: LOOKUP */}
        {step === 'lookup' && (
          <div style={{
            background: COLORS.surface,
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <form onSubmit={handleLookup}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 14, 
                  fontWeight: 500, 
                  color: COLORS.textPrimary,
                  marginBottom: 6,
                }}>
                  Código do agendamento
                </label>
                <input
                  type="text"
                  value={appointmentId}
                  onChange={(e) => setAppointmentId(e.target.value)}
                  placeholder="Ex: clz1234..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
                <p style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>
                  Enviado por WhatsApp na confirmação
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 14, 
                  fontWeight: 500, 
                  color: COLORS.textPrimary,
                  marginBottom: 6,
                }}>
                  Telefone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: COLORS.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Buscando...' : 'Buscar agendamento'}
              </button>
            </form>
          </div>
        )}

        {/* STEP: VIEW */}
        {step === 'view' && appointment && (
          <div style={{
            background: COLORS.surface,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            {/* Appointment details */}
            <div style={{ padding: 24 }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: COLORS.textPrimary }}>
                  {appointment.workspace.brandName || appointment.workspace.name}
                </h2>
                <StatusBadge status={appointment.status} />
              </div>

              {/* Services */}
              <div style={{ marginBottom: 16 }}>
                {appointment.services.map((as, i) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: i < appointment.services.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                  }}>
                    <span style={{ color: COLORS.textPrimary }}>{as.service.name}</span>
                    <span style={{ color: COLORS.textSecondary }}>{as.durationMinutes} min</span>
                  </div>
                ))}
              </div>

              {/* Date/time */}
              <div style={{
                background: COLORS.background,
                padding: 16,
                borderRadius: 12,
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>📅</span>
                  <span style={{ color: COLORS.textPrimary, fontWeight: 500 }}>
                    {formatDate(appointment.startAt)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🕐</span>
                  <span style={{ color: COLORS.textPrimary, fontWeight: 500 }}>
                    {formatTime(appointment.startAt)}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 16,
                borderTop: `1px solid ${COLORS.border}`,
              }}>
                <span style={{ color: COLORS.textSecondary }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.primary }}>
                  {formatPrice(appointment.totalPriceCents)}
                </span>
              </div>
            </div>

            {/* Actions */}
            {canModify && (
              <div style={{
                background: COLORS.background,
                padding: 16,
                display: 'flex',
                gap: 12,
              }}>
                <button
                  onClick={startReschedule}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: COLORS.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Reagendar
                </button>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'transparent',
                    color: COLORS.error,
                    border: `1px solid ${COLORS.error}`,
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}

            {!canModify && (
              <div style={{
                background: COLORS.background,
                padding: 16,
                textAlign: 'center',
                color: COLORS.textSecondary,
                fontSize: 14,
              }}>
                Este agendamento não pode mais ser modificado.
              </div>
            )}
          </div>
        )}

        {/* STEP: RESCHEDULE */}
        {step === 'reschedule' && appointment && (
          <div style={{
            background: COLORS.surface,
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <button
              onClick={() => setStep('view')}
              style={{
                background: 'none',
                border: 'none',
                color: COLORS.primary,
                fontSize: 14,
                cursor: 'pointer',
                marginBottom: 16,
                padding: 0,
              }}
            >
              ← Voltar
            </button>

            <h2 style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              margin: '0 0 20px', 
              color: COLORS.textPrimary 
            }}>
              Escolha um novo horário
            </h2>

            {/* Date selection */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: COLORS.textPrimary, marginBottom: 12 }}>
                Data
              </p>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 8,
              }}>
                {availableDays.map((day) => {
                  const date = new Date(day + 'T12:00:00');
                  const isSelected = selectedDate === day;
                  return (
                    <button
                      key={day}
                      onClick={() => handleSelectDate(day)}
                      style={{
                        padding: '10px 14px',
                        background: isSelected ? COLORS.primary : COLORS.background,
                        color: isSelected ? 'white' : COLORS.textPrimary,
                        border: isSelected ? 'none' : `1px solid ${COLORS.border}`,
                        borderRadius: 10,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: 70,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{date.getDate()}</span>
                      <span style={{ fontSize: 11, opacity: 0.8 }}>
                        {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: COLORS.textPrimary, marginBottom: 12 }}>
                  Horário
                </p>
                {loading ? (
                  <p style={{ color: COLORS.textSecondary }}>Carregando...</p>
                ) : availableSlots.length === 0 ? (
                  <p style={{ color: COLORS.textSecondary }}>Nenhum horário disponível</p>
                ) : (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gap: 8,
                  }}>
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.startAt;
                      return (
                        <button
                          key={slot.startAt}
                          onClick={() => setSelectedSlot(slot.startAt)}
                          style={{
                            padding: '10px 0',
                            background: isSelected ? COLORS.primary : COLORS.background,
                            color: isSelected ? 'white' : COLORS.textPrimary,
                            border: isSelected ? 'none' : `1px solid ${COLORS.border}`,
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          {formatTime(slot.startAt)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Confirm button */}
            <button
              onClick={confirmReschedule}
              disabled={!selectedSlot || loading}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: selectedSlot ? COLORS.primary : COLORS.border,
                color: selectedSlot ? 'white' : COLORS.textSecondary,
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: selectedSlot && !loading ? 'pointer' : 'default',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Reagendando...' : 'Confirmar reagendamento'}
            </button>
          </div>
        )}

        {/* STEP: SUCCESS */}
        {step === 'success' && appointment && (
          <div style={{
            background: COLORS.surface,
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{
              width: 64,
              height: 64,
              background: '#d1fae5',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <span style={{ fontSize: 32 }}>✓</span>
            </div>
            
            <h2 style={{ 
              fontSize: 20, 
              fontWeight: 700, 
              margin: '0 0 8px',
              color: COLORS.textPrimary,
            }}>
              Reagendado!
            </h2>
            
            <p style={{ 
              color: COLORS.textSecondary, 
              marginBottom: 24,
              fontSize: 14,
            }}>
              Seu novo horário foi confirmado
            </p>

            <div style={{
              background: COLORS.background,
              padding: 16,
              borderRadius: 12,
              marginBottom: 24,
            }}>
              <p style={{ fontWeight: 600, color: COLORS.textPrimary, margin: '0 0 4px' }}>
                {formatDate(appointment.startAt)}
              </p>
              <p style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary, margin: 0 }}>
                {formatTime(appointment.startAt)}
              </p>
            </div>

            <button
              onClick={() => window.location.href = `/${slug}/booking`}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: COLORS.primary,
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Voltar ao início
            </button>
          </div>
        )}

        {/* STEP: CANCELLED */}
        {step === 'cancelled' && (
          <div style={{
            background: COLORS.surface,
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{
              width: 64,
              height: 64,
              background: '#fee2e2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <span style={{ fontSize: 32 }}>✕</span>
            </div>
            
            <h2 style={{ 
              fontSize: 20, 
              fontWeight: 700, 
              margin: '0 0 8px',
              color: COLORS.textPrimary,
            }}>
              Agendamento cancelado
            </h2>
            
            <p style={{ 
              color: COLORS.textSecondary, 
              marginBottom: 24,
              fontSize: 14,
            }}>
              Esperamos vê-lo em breve!
            </p>

            <button
              onClick={() => window.location.href = `/${slug}/booking`}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: COLORS.primary,
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Agendar novo horário
            </button>
          </div>
        )}

        {/* Cancel confirmation modal */}
        {showCancelConfirm && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 100,
          }}>
            <div style={{
              background: COLORS.surface,
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              width: '100%',
            }}>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                margin: '0 0 8px',
                color: COLORS.textPrimary,
              }}>
                Cancelar agendamento?
              </h3>
              <p style={{ 
                color: COLORS.textSecondary, 
                marginBottom: 16,
                fontSize: 14,
              }}>
                Esta ação não pode ser desfeita.
              </p>

              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Motivo do cancelamento (opcional)"
                style={{
                  width: '100%',
                  padding: 12,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  fontSize: 14,
                  minHeight: 80,
                  resize: 'vertical',
                  marginBottom: 16,
                }}
              />

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: COLORS.background,
                    color: COLORS.textPrimary,
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Voltar
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: COLORS.error,
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Cancelando...' : 'Confirmar cancelamento'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
