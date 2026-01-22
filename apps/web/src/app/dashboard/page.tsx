'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  client: { name: string; phoneE164: string };
  services: Array<{ service: { name: string; priceCents: number } }>;
}

interface Stats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  todayRevenue: number;
  todayCount: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: '#fef3c7', text: '#d97706', label: 'Pendente' },
  CONFIRMED: { bg: '#dbeafe', text: '#2563eb', label: 'Confirmado' },
  COMPLETED: { bg: '#d1fae5', text: '#059669', label: 'Concluído' },
  CANCELLED: { bg: '#fee2e2', text: '#dc2626', label: 'Cancelado' },
  NO_SHOW: { bg: '#f3f4f6', text: '#6b7280', label: 'Não compareceu' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, confirmed: 0, completed: 0, todayRevenue: 0, todayCount: 0 });
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const API_URL = 'http://localhost:3001/api/v1';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAppointments(data);
      
      const today = new Date().toDateString();
      const s: Stats = { total: data.length, pending: 0, confirmed: 0, completed: 0, todayRevenue: 0, todayCount: 0 };
      data.forEach((a: Appointment) => {
        if (a.status === 'PENDING') s.pending++;
        if (a.status === 'CONFIRMED') s.confirmed++;
        if (a.status === 'COMPLETED') {
          s.completed++;
          const revenue = a.services.reduce((sum, s) => sum + (s.service?.priceCents || 0), 0);
          if (new Date(a.startAt).toDateString() === today) {
            s.todayRevenue += revenue;
          }
        }
        if (new Date(a.startAt).toDateString() === today) s.todayCount++;
      });
      setStats(s);
    } catch {
      // Keep empty state
    }
    setLoading(false);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  const today = new Date().toDateString();
  const todayAppointments = appointments
    .filter(a => new Date(a.startAt).toDateString() === today && a.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const pendingAppointments = appointments
    .filter(a => a.status === 'PENDING')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 5);

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
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>Dashboard</h1>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: isMobile ? 13 : 15 }}>
          Visão geral do seu negócio • {new Date().toLocaleDateString('pt-BR', { weekday: isMobile ? 'short' : 'long', day: 'numeric', month: isMobile ? 'short' : 'long' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: isMobile ? 12 : 20, marginBottom: isMobile ? 20 : 32 }}>
        <StatCard icon="📅" label="Hoje" value={stats.todayCount} subtitle="agendamentos" color="#667eea" isMobile={isMobile} />
        <StatCard icon="⏳" label="Pendentes" value={stats.pending} subtitle="aguardando" color="#f59e0b" isMobile={isMobile} />
        <StatCard icon="✅" label="Confirmados" value={stats.confirmed} subtitle="prontos" color="#3b82f6" isMobile={isMobile} />
        <StatCard icon="💰" label="Faturamento" value={formatPrice(stats.todayRevenue)} subtitle="hoje" color="#10b981" isPrice isMobile={isMobile} />
      </div>

      {/* Two Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))', gap: isMobile ? 16 : 24 }}>
        {/* Today's Agenda */}
        <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>📅 Agenda de Hoje</h2>
            <a href="/dashboard/agenda" style={{ fontSize: 13, color: '#667eea', textDecoration: 'none', fontWeight: 500 }}>Ver completa →</a>
          </div>
          <div style={{ padding: todayAppointments.length ? 0 : 40 }}>
            {todayAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌟</div>
                <p style={{ margin: 0 }}>Nenhum agendamento para hoje</p>
              </div>
            ) : (
              todayAppointments.map((apt, i) => {
                const statusInfo = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING;
                return (
                  <div key={apt.id} style={{ 
                    padding: '16px 24px', 
                    borderBottom: i < todayAppointments.length - 1 ? '1px solid #f8fafc' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}>
                    <div style={{
                      width: 50,
                      height: 50,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 13,
                    }}>
                      {formatTime(apt.startAt)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{apt.client.name}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{apt.services[0]?.service?.name || 'Serviço'}</div>
                    </div>
                    <span style={{
                      background: statusInfo.bg,
                      color: statusInfo.text,
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                    }}>
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pending Actions */}
        <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>⚡ Ações Pendentes</h2>
            <span style={{ 
              background: stats.pending > 0 ? '#fef3c7' : '#d1fae5', 
              color: stats.pending > 0 ? '#d97706' : '#059669',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
            }}>
              {stats.pending} pendente{stats.pending !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ padding: pendingAppointments.length ? 0 : 40 }}>
            {pendingAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
                <p style={{ margin: 0 }}>Tudo em dia! Nenhuma ação pendente</p>
              </div>
            ) : (
              pendingAppointments.map((apt, i) => (
                <div key={apt.id} style={{ 
                  padding: '16px 24px', 
                  borderBottom: i < pendingAppointments.length - 1 ? '1px solid #f8fafc' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    background: '#f59e0b',
                    borderRadius: '50%',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: '#1e293b', fontSize: 14 }}>{apt.client.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      {new Date(apt.startAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {formatTime(apt.startAt)}
                    </div>
                  </div>
                  <button style={{
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}>
                    Confirmar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <QuickAction href="/dashboard/agenda" icon="📅" label="Ver Agenda" />
        <QuickAction href="/dashboard/servicos" icon="💇" label="Gerenciar Serviços" />
        <QuickAction href="/dashboard/horarios" icon="⏰" label="Configurar Horários" />
        <QuickAction href="/dashboard/clientes" icon="👥" label="Ver Clientes" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtitle, color, isPrice, isMobile }: { icon: string; label: string; value: string | number; subtitle: string; color: string; isPrice?: boolean; isMobile?: boolean }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: isMobile ? 12 : 16,
      padding: isMobile ? 14 : 24,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isMobile ? 8 : 12 }}>
        <span style={{ fontSize: isMobile ? 16 : 20 }}>{icon}</span>
        <span style={{ color: '#64748b', fontSize: isMobile ? 11 : 13, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: isMobile ? (isPrice ? 16 : 22) : (isPrice ? 24 : 32), fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: isMobile ? 10 : 12, color: '#94a3b8' }}>{subtitle}</div>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a href={href} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: 'white',
      padding: '16px 20px',
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      textDecoration: 'none',
      color: '#1e293b',
      transition: 'all 0.2s',
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
    </a>
  );
}
