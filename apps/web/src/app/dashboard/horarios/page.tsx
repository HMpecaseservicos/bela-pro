'use client';

import { useEffect, useState } from 'react';

interface ScheduleRule {
  id: string;
  dayOfWeek: number;
  startTimeMinutes: number;
  endTimeMinutes: number;
  isActive: boolean;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

interface TimeOff {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_SHORTS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function HorariosPage() {
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({ startAt: '', endAt: '', reason: '' });
  const [isMobile, setIsMobile] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    try {
      const [rulesRes, timeOffsRes] = await Promise.all([
        fetch(`${API_URL}/schedule-rules`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/time-off`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      // Se receber 401, redirecionar para login
      if (rulesRes.status === 401 || timeOffsRes.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      
      if (rulesRes.ok) setRules(await rulesRes.json());
      if (timeOffsRes.ok) setTimeOffs(await timeOffsRes.json());
    } catch {
      // Handle error
    }
    setLoading(false);
  }

  async function updateRule(id: string, data: Partial<ScheduleRule>) {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/schedule-rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  async function createRule(dayOfWeek: number) {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/schedule-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dayOfWeek, startTimeMinutes: 9 * 60, endTimeMinutes: 18 * 60 }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  async function createTimeOff() {
    const token = localStorage.getItem('token');
    try {
      // Converter datetime-local para formato ISO
      const payload = {
        ...timeOffForm,
        startAt: timeOffForm.startAt ? new Date(timeOffForm.startAt).toISOString() : '',
        endAt: timeOffForm.endAt ? new Date(timeOffForm.endAt).toISOString() : '',
      };
      await fetch(`${API_URL}/time-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      setShowTimeOffForm(false);
      setTimeOffForm({ startAt: '', endAt: '', reason: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteTimeOff(id: string) {
    if (!confirm('Remover esta folga?')) return;
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/time-off/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 32 }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>Horários de Funcionamento</h1>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: isMobile ? 13 : 15 }}>Configure quando você está disponível</p>
      </div>

      {/* Week Schedule */}
      <div style={{ 
        background: 'white', 
        borderRadius: isMobile ? 12 : 16, 
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        marginBottom: isMobile ? 20 : 32,
        overflow: 'hidden',
      }}>
        <div style={{ padding: isMobile ? '16px' : '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 600, color: '#1e293b' }}>📅 Horário Semanal</h2>
        </div>
        
        <div>
          {(isMobile ? DAY_SHORTS : DAYS).map((day, i) => {
            const rule = rules.find(r => r.dayOfWeek === i);
            return (
              <div 
                key={i}
                style={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center', 
                  gap: isMobile ? 12 : 0,
                  padding: isMobile ? 16 : '16px 24px',
                  borderBottom: i < 6 ? '1px solid #f8fafc' : 'none',
                  background: rule?.isActive ? 'transparent' : '#fafafa',
                }}
              >
                {/* Day Name & Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 0 }}>
                  <div style={{ width: isMobile ? 60 : 120, fontWeight: 500, color: '#1e293b', fontSize: isMobile ? 14 : 16 }}>{isMobile ? DAY_SHORTS[i] : day}</div>

                  {/* Toggle */}
                  <button
                    onClick={() => rule ? updateRule(rule.id, { isActive: !rule.isActive }) : createRule(i)}
                    style={{
                      width: 50,
                      height: 28,
                      borderRadius: 14,
                      border: 'none',
                      background: rule?.isActive ? '#667eea' : '#e5e7eb',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                      marginRight: isMobile ? 0 : 24,
                    }}
                  >
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: 3,
                      left: rule?.isActive ? 25 : 3,
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>

                {/* Time Inputs */}
                {rule?.isActive ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, flex: 1 }}>
                    <input
                      type="time"
                      value={minutesToTime(rule.startTimeMinutes)}
                      onChange={e => updateRule(rule.id, { startTimeMinutes: timeToMinutes(e.target.value) })}
                      style={{
                        padding: isMobile ? '10px' : '8px 12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: 8,
                        fontSize: 14,
                        color: '#1e293b',
                        flex: isMobile ? 1 : 'none',
                      }}
                    />
                    <span style={{ color: '#94a3b8', fontSize: isMobile ? 12 : 14 }}>até</span>
                    <input
                      type="time"
                      value={minutesToTime(rule.endTimeMinutes)}
                      onChange={e => updateRule(rule.id, { endTimeMinutes: timeToMinutes(e.target.value) })}
                      style={{
                        padding: '8px 12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: 8,
                        fontSize: 14,
                        color: '#1e293b',
                      }}
                    />
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: 14 }}>Fechado</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Off */}
      <div style={{ 
        background: 'white', 
        borderRadius: 16, 
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>🏖️ Folgas e Feriados</h2>
          <button
            onClick={() => setShowTimeOffForm(true)}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            + Adicionar Folga
          </button>
        </div>
        
        <div style={{ padding: timeOffs.length ? 0 : 40 }}>
          {timeOffs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📆</div>
              <p style={{ margin: 0 }}>Nenhuma folga programada</p>
            </div>
          ) : (
            timeOffs.map((t, i) => (
              <div 
                key={t.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '16px 24px',
                  borderBottom: i < timeOffs.length - 1 ? '1px solid #f8fafc' : 'none',
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  background: '#fef3c7',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  marginRight: 16,
                }}>
                  🏖️
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>
                    {t.reason || 'Folga'}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {new Date(t.startAt).toLocaleDateString('pt-BR')} até {new Date(t.endAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <button
                  onClick={() => deleteTimeOff(t.id)}
                  style={{
                    background: '#fee2e2',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: 8,
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Remover
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Time Off Modal */}
      {showTimeOffForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: 32,
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>Nova Folga</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>Data Início</label>
                <input
                  type="datetime-local"
                  value={timeOffForm.startAt}
                  onChange={e => setTimeOffForm({ ...timeOffForm, startAt: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>Data Fim</label>
                <input
                  type="datetime-local"
                  value={timeOffForm.endAt}
                  onChange={e => setTimeOffForm({ ...timeOffForm, endAt: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>Motivo (opcional)</label>
                <input
                  type="text"
                  value={timeOffForm.reason}
                  onChange={e => setTimeOffForm({ ...timeOffForm, reason: e.target.value })}
                  placeholder="Ex: Férias, Feriado..."
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowTimeOffForm(false)} style={{ flex: 1, padding: '12px', border: '2px solid #e5e7eb', borderRadius: 10, background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={createTimeOff} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 10, background: '#667eea', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
