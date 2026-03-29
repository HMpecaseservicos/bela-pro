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

interface SponsorPost {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  sponsor: { id: string; name: string; logoLightUrl?: string; };
}

interface AdminMessage {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'UPDATE' | 'MAINTENANCE' | 'FEATURE' | 'WARNING' | 'PROMOTION';
  icon: string | null;
  actionLabel: string | null;
  actionUrl: string | null;
  dismissible: boolean;
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
  
  // Sponsor posts banner
  const [sponsorPosts, setSponsorPosts] = useState<SponsorPost[]>([]);
  const [currentPostIdx, setCurrentPostIdx] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  
  // Admin messages
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [dismissedMsgIds, setDismissedMsgIds] = useState<Set<string>>(new Set());
  
  // Trial banner
  const [subscription, setSubscription] = useState<{
    status: string;
    trialEndsAt: string | null;
    plan?: { name: string };
  } | null>(null);

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
    
    // Fetch sponsor posts (apenas 1x por sessão)
    const dismissed = sessionStorage.getItem('sponsor_banner_dismissed');
    if (!dismissed) {
      fetch(`${API_URL}/public/sponsors/posts?limit=3`)
        .then(r => r.ok ? r.json() : [])
        .then(d => setSponsorPosts(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
    
    // Fetch admin messages
    fetch(`${API_URL}/workspace/admin-messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(d => setAdminMessages(Array.isArray(d) ? d : []))
      .catch(() => {});
    
    // Fetch subscription (para banner de trial)
    fetch(`${API_URL}/billing/my-subscription`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(setSubscription)
      .catch(() => {});
  }, []);

  // Auto-rotate sponsor posts
  useEffect(() => {
    if (sponsorPosts.length <= 1 || bannerDismissed) return;
    const interval = setInterval(() => {
      setCurrentPostIdx(i => (i + 1) % sponsorPosts.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [sponsorPosts.length, bannerDismissed]);

  const dismissBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem('sponsor_banner_dismissed', '1');
  };

  const dismissAdminMessage = async (id: string) => {
    const token = localStorage.getItem('token');
    setDismissedMsgIds(prev => new Set([...prev, id]));
    try {
      await fetch(`${API_URL}/workspace/admin-messages/${id}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignorar erros de dismiss
    }
  };

  async function fetchAppointments() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid response');
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

      {/* ============ BANNER DE TRIAL ============ */}
      {subscription?.status === 'TRIAL' && subscription.trialEndsAt && (() => {
        const trialEnd = new Date(subscription.trialEndsAt);
        const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        const isExpiring = daysLeft <= 3;
        
        return (
          <div style={{
            marginBottom: 20,
            background: isExpiring 
              ? 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(249,115,22,0.04) 100%)'
              : 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.04) 100%)',
            border: `1px solid ${isExpiring ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: isExpiring ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>
              {isExpiring ? '⏰' : '🎁'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: THEME.textPrimary, fontSize: 15, marginBottom: 2 }}>
                {isExpiring 
                  ? `⚠️ Seu trial termina em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}!`
                  : `🎉 Você está no período gratuito!`}
              </div>
              <div style={{ color: THEME.textSecondary, fontSize: 13 }}>
                {isExpiring 
                  ? 'Escolha um plano para continuar usando o Bela Pro'
                  : `Restam ${daysLeft} dias para explorar todas as funcionalidades`}
              </div>
            </div>
            <a
              href="/dashboard/plano"
              style={{
                padding: '10px 18px',
                background: isExpiring 
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {isExpiring ? 'Escolher plano' : 'Ver planos'}
            </a>
          </div>
        );
      })()}

      {/* ============ MENSAGENS DO ADMIN ============ */}
      {adminMessages.filter(m => !dismissedMsgIds.has(m.id)).map(msg => {
        const typeColors: Record<string, { bg: string; border: string; icon: string }> = {
          INFO: { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.2)', icon: '#3b82f6' },
          UPDATE: { bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.2)', icon: '#8b5cf6' },
          MAINTENANCE: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)', icon: '#f59e0b' },
          FEATURE: { bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)', icon: '#22c55e' },
          WARNING: { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)', icon: '#ef4444' },
          PROMOTION: { bg: 'rgba(236,72,153,0.06)', border: 'rgba(236,72,153,0.2)', icon: '#ec4899' },
        };
        const colors = typeColors[msg.type] || typeColors.INFO;
        const icon = msg.icon || { INFO: '📢', UPDATE: '🚀', MAINTENANCE: '🔧', FEATURE: '✨', WARNING: '⚠️', PROMOTION: '🎁' }[msg.type] || '📢';

        return (
          <div
            key={msg.id}
            style={{
              marginBottom: 16,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 20, lineHeight: 1 }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: THEME.textPrimary, fontSize: 14, marginBottom: 4 }}>
                {msg.title}
              </div>
              <div style={{ color: THEME.textSecondary, fontSize: 13, lineHeight: 1.5 }}>
                {msg.content}
              </div>
              {msg.actionUrl && msg.actionLabel && (
                <a
                  href={msg.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: 10,
                    padding: '6px 14px',
                    background: colors.icon,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                    textDecoration: 'none',
                  }}
                >
                  {msg.actionLabel}
                </a>
              )}
            </div>
            {msg.dismissible && (
              <button
                onClick={() => dismissAdminMessage(msg.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#9ca3af', fontSize: 18, lineHeight: 1, padding: 4,
                }}
                title="Fechar"
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {/* ============ BANNER OFERTAS PARCEIROS DIAMOND ============ */}
      {sponsorPosts.length > 0 && !bannerDismissed && (() => {
        const post = sponsorPosts[currentPostIdx];
        if (!post) return null;
        
        return (
          <div style={{
            marginBottom: 24,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.04) 0%, rgba(168,85,247,0.02) 100%)',
            border: '1px solid rgba(139,92,246,0.15)',
            borderRadius: 16,
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: '1px solid rgba(139,92,246,0.1)',
              background: 'rgba(139,92,246,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>💎</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#8b5cf6', letterSpacing: 0.5 }}>
                  Oferta do Parceiro
                </span>
                {post.sponsor.logoLightUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.sponsor.logoLightUrl} alt={post.sponsor.name}
                    style={{ height: 18, maxWidth: 70, objectFit: 'contain', marginLeft: 8, opacity: 0.8 }} />
                )}
              </div>
              <button
                onClick={dismissBanner}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#9ca3af', fontSize: 18, lineHeight: 1, padding: 4,
                }}
                title="Fechar"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{
              display: 'flex', gap: 16, padding: 16,
              alignItems: 'center',
              flexDirection: isMobile ? 'column' : 'row',
            }}>
              {post.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  style={{
                    width: isMobile ? '100%' : 160,
                    height: isMobile ? 140 : 100,
                    objectFit: 'cover',
                    borderRadius: 10,
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{
                  margin: 0, fontSize: 16, fontWeight: 700, color: THEME.textPrimary,
                  lineHeight: 1.3, marginBottom: 6,
                }}>
                  {post.title}
                </h4>
                {post.description && (
                  <p style={{
                    margin: 0, fontSize: 13, color: THEME.textSecondary, lineHeight: 1.5,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {post.description}
                  </p>
                )}
              </div>
              {post.ctaUrl && (
                <a
                  href={post.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { fetch(`${API_URL}/public/sponsors/posts/${post.id}/click`, { method: 'POST' }).catch(() => {}); }}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 10,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 14px rgba(139,92,246,0.25)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(139,92,246,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(139,92,246,0.25)'; }}
                >
                  {post.ctaLabel || 'Ver Oferta'} →
                </a>
              )}
            </div>

            {/* Indicators */}
            {sponsorPosts.length > 1 && (
              <div style={{
                display: 'flex', justifyContent: 'center', gap: 6,
                paddingBottom: 10,
              }}>
                {sponsorPosts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPostIdx(i)}
                    style={{
                      width: i === currentPostIdx ? 20 : 8,
                      height: 8,
                      borderRadius: 4,
                      background: i === currentPostIdx ? '#8b5cf6' : '#d1d5db',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

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
