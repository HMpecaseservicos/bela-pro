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

const THEME = {
  gold: '#a07a45',
  goldSoft: '#c9a66b',
  page: '#f4f1ec',
  surface: '#fbf8f3',
  surface2: '#f7f2ea',
  textPrimary: '#2f2a24',
  textSecondary: '#6e6256',
  textMuted: '#9b8e81',
  border: '#e4dbcf',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: '#f8efdf', text: '#9f7a44', label: 'Pendente' },
  CONFIRMED: { bg: '#e9f3eb', text: '#5f8f67', label: 'Confirmado' },
  COMPLETED: { bg: '#e8f0f3', text: '#5f8492', label: 'Concluido' },
  CANCELLED: { bg: '#f8e9e7', text: '#b86a5f', label: 'Cancelado' },
  NO_SHOW: { bg: '#eee7dc', text: '#8f8376', label: 'Nao compareceu' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, confirmed: 0, completed: 0, todayRevenue: 0, todayCount: 0 });
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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
          const revenue = a.services.reduce((sum, item) => sum + (item.service?.priceCents || 0), 0);
          if (new Date(a.startAt).toDateString() === today) s.todayRevenue += revenue;
        }
        if (new Date(a.startAt).toDateString() === today) s.todayCount++;
      });
      setStats(s);
    } catch {
      // keep empty state
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: THEME.page }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${THEME.border}`, borderTopColor: THEME.gold, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 30, maxWidth: 1280, margin: '0 auto' }}>
      <section
        style={{
          borderRadius: 18,
          border: `1px solid ${THEME.border}`,
          background: 'linear-gradient(180deg, #fbf8f3 0%, #f7f2ea 100%)',
          padding: isMobile ? 18 : 26,
          marginBottom: 22,
        }}
      >
        <h1 className="font-display" style={{ margin: 0, fontSize: isMobile ? 29 : 38, color: THEME.textPrimary, fontWeight: 600 }}>
          Visao do Negocio
        </h1>
        <p style={{ margin: '10px 0 0', color: THEME.textSecondary, fontSize: isMobile ? 13 : 14 }}>
          Panorama do dia {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <MetricCard label="Atendimentos Hoje" value={stats.todayCount} note="agenda" />
        <MetricCard label="Pendencias" value={stats.pending} note="aguardando" />
        <MetricCard label="Confirmados" value={stats.confirmed} note="preparados" />
        <MetricCard label="Receita do Dia" value={formatPrice(stats.todayRevenue)} note="faturamento" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.15fr 0.85fr', gap: 16 }}>
        <section style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 6px 20px rgba(72, 52, 26, 0.08)' }}>
          <header style={{ padding: '16px 18px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="font-display" style={{ margin: 0, fontSize: 24, color: THEME.textPrimary, fontWeight: 600 }}>Agenda de Hoje</h2>
            <a href="/dashboard/agenda" style={{ fontSize: 13, color: THEME.gold, textDecoration: 'none', fontWeight: 600 }}>Abrir agenda</a>
          </header>

          <div style={{ padding: todayAppointments.length ? 0 : 26 }}>
            {todayAppointments.length === 0 ? (
              <p style={{ margin: 0, textAlign: 'center', color: THEME.textMuted }}>Nenhum horario reservado para hoje.</p>
            ) : (
              todayAppointments.map((apt, idx) => {
                const statusInfo = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING;
                return (
                  <div key={apt.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: idx < todayAppointments.length - 1 ? `1px solid ${THEME.border}` : 'none' }}>
                    <div style={{ minWidth: 56, textAlign: 'center', padding: '10px 8px', borderRadius: 10, background: '#f3ebe0', color: THEME.textPrimary, fontWeight: 700, fontSize: 13 }}>
                      {formatTime(apt.startAt)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: THEME.textPrimary, fontWeight: 700, fontSize: 14 }}>{apt.client.name}</div>
                      <div style={{ color: THEME.textSecondary, fontSize: 12 }}>{apt.services[0]?.service?.name || 'Servico'}</div>
                    </div>
                    <span style={{ background: statusInfo.bg, color: statusInfo.text, borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 700 }}>
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 6px 20px rgba(72, 52, 26, 0.08)' }}>
          <header style={{ padding: '16px 18px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="font-display" style={{ margin: 0, fontSize: 24, color: THEME.textPrimary, fontWeight: 600 }}>Pendencias</h2>
            <span style={{ fontSize: 12, color: THEME.textMuted }}>{stats.pending} abertas</span>
          </header>

          <div style={{ padding: pendingAppointments.length ? 0 : 26 }}>
            {pendingAppointments.length === 0 ? (
              <p style={{ margin: 0, textAlign: 'center', color: THEME.textMuted }}>Nenhuma acao pendente no momento.</p>
            ) : (
              pendingAppointments.map((apt, idx) => (
                <div key={apt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: idx < pendingAppointments.length - 1 ? `1px solid ${THEME.border}` : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: THEME.gold }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: THEME.textPrimary, fontWeight: 600, fontSize: 14 }}>{apt.client.name}</div>
                    <div style={{ color: THEME.textMuted, fontSize: 12 }}>{new Date(apt.startAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} as {formatTime(apt.startAt)}</div>
                  </div>
                  <button style={{ border: 'none', borderRadius: 10, padding: '8px 12px', background: 'linear-gradient(135deg, #c9a66b 0%, #a07a45 100%)', color: '#241c13', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    Confirmar
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10 }}>
        <QuickAction href="/dashboard/agenda" label="Abrir Agenda" />
        <QuickAction href="/dashboard/servicos" label="Gerenciar Servicos" />
        <QuickAction href="/dashboard/horarios" label="Configurar Horarios" />
        <QuickAction href="/dashboard/clientes" label="Base de Clientes" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <div style={{ background: '#fbf8f3', border: '1px solid #e4dbcf', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: '#9b8e81', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ marginTop: 6, color: '#2f2a24', fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
      <div style={{ marginTop: 2, color: '#6e6256', fontSize: 12 }}>{note}</div>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} style={{
      textDecoration: 'none',
      background: '#fbf8f3',
      border: '1px solid #e4dbcf',
      borderRadius: 12,
      padding: '12px 14px',
      color: '#2f2a24',
      fontSize: 13,
      fontWeight: 700,
      textAlign: 'center',
    }}>
      {label}
    </a>
  );
}
