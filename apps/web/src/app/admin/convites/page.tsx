'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface BusinessInvite {
  id: string;
  inviteType: 'PERSONAL' | 'PUBLIC';
  businessName?: string;
  contactName?: string;
  campaignName?: string;
  slug?: string;
  phone?: string;
  email?: string;
  city?: string;
  focusType: 'YOUTH_BEAUTY' | 'INCOME_GROWTH' | 'RECOGNITION';
  personalMessage?: string;
  notes?: string;
  status: 'PENDING' | 'VIEWED' | 'CLICKED_CTA' | 'REGISTERED' | 'ACTIVATED' | 'EXPIRED' | 'CANCELLED';
  viewCount: number;
  totalClicks?: number;
  totalRegistrations?: number;
  lastViewedAt?: string;
  ctaClickedAt?: string;
  registeredAt?: string;
  activatedAt?: string;
  expiresAt: string;
  sentViaWhatsApp: boolean;
  sentViaEmail: boolean;
  whatsappSentAt?: string;
  emailSentAt?: string;
  createdAt: string;
  token: string;
  sentBy?: { id: string; name: string };
  convertedWorkspace?: { id: string; name: string; slug?: string };
}

interface DashboardMetrics {
  totals: {
    total: number;
    pending: number;
    viewed: number;
    clicked: number;
    registered: number;
    activated: number;
    expired: number;
  };
  last30Days: { sent: number; registered: number };
  rates: { conversionRate: number; viewToClickRate: number };
  byFocusType: { focusType: string; count: number }[];
}

// =============================================================================
// STYLE V2 PREMIUM THEME
// =============================================================================

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
  success: '#5a9e6f',
  successBg: '#e8f4ec',
  danger: '#c9756c',
  dangerBg: '#fceaea',
  info: '#5a8fa8',
  infoBg: '#e6f0f5',
  warning: '#b8944e',
  warningBg: '#fef7e6',
};

const FOCUS_TYPES: Record<string, { label: string; color: string; description: string }> = {
  YOUTH_BEAUTY: { label: '✨ Juventude & Beleza', color: '#c97092', description: 'Foco em autoestima' },
  INCOME_GROWTH: { label: '💰 Aumento de Renda', color: T.success, description: 'Foco em crescimento' },
  RECOGNITION: { label: '🏆 Reconhecimento', color: T.gold, description: 'Foco profissional' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pendente', color: T.textMuted, bg: T.surface2 },
  VIEWED: { label: 'Visualizado', color: T.info, bg: T.infoBg },
  CLICKED_CTA: { label: 'Clicou CTA', color: '#8b6cc9', bg: '#f0ebf7' },
  REGISTERED: { label: 'Cadastrado', color: T.success, bg: T.successBg },
  ACTIVATED: { label: 'Ativo', color: '#3d8b55', bg: '#d4f0dc' },
  EXPIRED: { label: 'Expirado', color: T.warning, bg: T.warningBg },
  CANCELLED: { label: 'Cancelado', color: T.danger, bg: T.dangerBg },
};

const FUNNEL_STEPS = [
  { key: 'total', label: 'Enviados', icon: '📤' },
  { key: 'viewed', label: 'Visualizados', icon: '👁️' },
  { key: 'clicked', label: 'Clicaram CTA', icon: '🖱️' },
  { key: 'registered', label: 'Cadastrados', icon: '📝' },
  { key: 'activated', label: 'Ativos', icon: '✅' },
];

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// =============================================================================
// TOAST COMPONENT
// =============================================================================

type ToastType = 'success' | 'error' | 'info';

function useToast() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: ToastType }[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const ToastContainer = () => (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          padding: '14px 20px',
          borderRadius: T.radius,
          background: t.type === 'success' ? T.successBg : t.type === 'error' ? T.dangerBg : T.infoBg,
          color: t.type === 'success' ? T.success : t.type === 'error' ? T.danger : T.info,
          border: `1px solid ${t.type === 'success' ? '#c5e3cc' : t.type === 'error' ? '#f0cbcb' : '#c5d9e3'}`,
          fontWeight: 500,
          fontSize: 14,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          animation: 'fadeInRight 0.3s ease',
          maxWidth: 380,
        }}>
          {t.type === 'success' ? '✓ ' : t.type === 'error' ? '✗ ' : 'ℹ '}{t.message}
        </div>
      ))}
    </div>
  );

  return { show, ToastContainer };
}

// =============================================================================
// MODAL WRAPPER
// =============================================================================

function Modal({ onClose, children, width = 560 }: { onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(47,42,36,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.white, borderRadius: T.radius + 4, padding: 32,
          width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(47,42,36,0.15)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// METRIC CARD
// =============================================================================

function MetricCard({ title, value, subtitle, icon }: { title: string; value: string | number; subtitle?: string; icon: string }) {
  return (
    <div style={{
      background: T.white, borderRadius: T.radius, padding: '20px 24px',
      border: `1px solid ${T.borderLight}`, display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: T.surface2,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, letterSpacing: 0.3 }}>{title}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, fontFamily: 'Playfair Display, serif' }}>{value}</div>
        {subtitle && <div style={{ fontSize: 12, color: T.textSecondary }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// =============================================================================
// FUNNEL CHART
// =============================================================================

function FunnelChart({ metrics }: { metrics: DashboardMetrics }) {
  const totals = metrics.totals;
  const values = FUNNEL_STEPS.map((s) => (totals as any)[s.key] as number);
  const max = Math.max(...values, 1);

  return (
    <div style={{
      background: T.white, borderRadius: T.radius, padding: 24,
      border: `1px solid ${T.borderLight}`,
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, margin: '0 0 20px', fontFamily: 'Playfair Display, serif' }}>
        Funil de Conversão
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FUNNEL_STEPS.map((step, i) => {
          const pct = max > 0 ? (values[i] / max) * 100 : 0;
          const rate = i > 0 && values[0] > 0 ? ((values[i] / values[0]) * 100).toFixed(1) : null;
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 100, fontSize: 12, color: T.textSecondary, flexShrink: 0 }}>
                {step.icon} {step.label}
              </div>
              <div style={{ flex: 1, height: 28, background: T.surface2, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  height: '100%', width: `${Math.max(pct, 2)}%`,
                  background: `linear-gradient(90deg, ${T.gold} 0%, ${T.goldSoft} 100%)`,
                  borderRadius: 8, transition: 'width 0.6s ease',
                }} />
                <span style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 12, fontWeight: 600, color: pct > 15 ? T.white : T.textPrimary,
                }}>
                  {values[i]}
                </span>
              </div>
              {rate && (
                <span style={{ fontSize: 11, color: T.textMuted, width: 45, textAlign: 'right', flexShrink: 0 }}>
                  {rate}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// TIMELINE CHART (últimos 30 dias)
// =============================================================================

function TimelineChart({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div style={{
      background: T.white, borderRadius: T.radius, padding: 24,
      border: `1px solid ${T.borderLight}`,
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, margin: '0 0 16px', fontFamily: 'Playfair Display, serif' }}>
        Últimos 30 dias
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ padding: 16, background: T.surface2, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.gold, fontFamily: 'Playfair Display, serif' }}>
            {metrics.last30Days.sent}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>Enviados</div>
        </div>
        <div style={{ padding: 16, background: T.successBg, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.success, fontFamily: 'Playfair Display, serif' }}>
            {metrics.last30Days.registered}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>Convertidos</div>
        </div>
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: T.textMuted }}>Taxa de conversão geral</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: T.gold, fontFamily: 'Playfair Display, serif' }}>
          {metrics.rates.conversionRate}%
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 12, color: T.textMuted }}>Visualização → Clique</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.textSecondary }}>
          {metrics.rates.viewToClickRate}%
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// DETAILS MODAL (Timeline visual)
// =============================================================================

function DetailsModal({ invite, onClose }: { invite: BusinessInvite; onClose: () => void }) {
  const timelineEvents: { label: string; date: string | undefined; icon: string; color: string }[] = [
    { label: 'Criado', date: invite.createdAt, icon: '📤', color: T.gold },
    { label: 'WhatsApp enviado', date: invite.whatsappSentAt, icon: '💬', color: '#25d366' },
    { label: 'Email enviado', date: invite.emailSentAt, icon: '📧', color: T.info },
    { label: 'Visualizado', date: invite.lastViewedAt, icon: '👁️', color: '#5a8fa8' },
    { label: 'Clicou CTA', date: invite.ctaClickedAt, icon: '🖱️', color: '#8b6cc9' },
    { label: 'Cadastrado', date: invite.registeredAt, icon: '📝', color: T.success },
    { label: 'Ativado', date: invite.activatedAt, icon: '✅', color: '#3d8b55' },
  ].filter((e) => e.date);

  const sc = STATUS_CONFIG[invite.status];

  return (
    <Modal onClose={onClose} width={520}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, margin: 0, fontFamily: 'Playfair Display, serif' }}>
            {invite.inviteType === 'PUBLIC' ? invite.campaignName : invite.businessName}
          </h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: invite.inviteType === 'PUBLIC' ? T.infoBg : '#f0ebf7',
              color: invite.inviteType === 'PUBLIC' ? T.info : '#8b6cc9',
            }}>
              {invite.inviteType === 'PUBLIC' ? '📢 Campanha' : '👤 Pessoal'}
            </span>
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: sc.bg, color: sc.color,
            }}>
              {sc.label}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', fontSize: 20, color: T.textMuted, cursor: 'pointer',
        }}>✕</button>
      </div>

      {/* Info grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px',
        padding: 20, background: T.surface, borderRadius: 12, marginBottom: 24,
      }}>
        {invite.contactName && (
          <div>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Contato</div>
            <div style={{ fontSize: 14, color: T.textPrimary, fontWeight: 500 }}>{invite.contactName}</div>
          </div>
        )}
        {invite.phone && (
          <div>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Telefone</div>
            <div style={{ fontSize: 14, color: T.textPrimary, fontWeight: 500 }}>{invite.phone}</div>
          </div>
        )}
        {invite.email && (
          <div>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Email</div>
            <div style={{ fontSize: 14, color: T.textPrimary, fontWeight: 500 }}>{invite.email}</div>
          </div>
        )}
        {invite.city && (
          <div>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Cidade</div>
            <div style={{ fontSize: 14, color: T.textPrimary, fontWeight: 500 }}>{invite.city}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Foco</div>
          <div style={{ fontSize: 13, color: FOCUS_TYPES[invite.focusType]?.color, fontWeight: 500 }}>
            {FOCUS_TYPES[invite.focusType]?.label}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Visualizações</div>
          <div style={{ fontSize: 14, color: T.textPrimary, fontWeight: 500 }}>{invite.viewCount}</div>
        </div>
        {invite.inviteType === 'PUBLIC' && (
          <div>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Cliques totais</div>
            <div style={{ fontSize: 14, color: T.textPrimary, fontWeight: 500 }}>{invite.totalClicks ?? 0}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Expira em</div>
          <div style={{ fontSize: 14, color: new Date(invite.expiresAt) < new Date() ? T.danger : T.textPrimary, fontWeight: 500 }}>
            {formatDateShort(invite.expiresAt)}
          </div>
        </div>
        {invite.convertedWorkspace && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Workspace convertido</div>
            <a
              href="/admin/workspaces"
              style={{ fontSize: 14, color: T.gold, fontWeight: 600, textDecoration: 'none' }}
            >
              {invite.convertedWorkspace.name} →
            </a>
          </div>
        )}
        {invite.notes && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Notas</div>
            <div style={{ fontSize: 13, color: T.textSecondary }}>{invite.notes}</div>
          </div>
        )}
        {invite.personalMessage && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Mensagem personalizada</div>
            <div style={{ fontSize: 13, color: T.textSecondary, fontStyle: 'italic' }}>"{invite.personalMessage}"</div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, marginBottom: 16 }}>
        Linha do Tempo
      </h3>
      <div style={{ position: 'relative', paddingLeft: 28 }}>
        <div style={{
          position: 'absolute', left: 9, top: 4, bottom: 4,
          width: 2, background: T.borderLight,
        }} />
        {timelineEvents.map((ev, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, position: 'relative' }}>
            <div style={{
              position: 'absolute', left: -28, width: 20, height: 20,
              borderRadius: '50%', background: T.white, border: `2px solid ${ev.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
            }}>
              {ev.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.textPrimary }}>{ev.label}</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>{formatDate(ev.date!)}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onClose} style={{
          padding: '10px 24px', border: `1px solid ${T.border}`, borderRadius: T.radius,
          background: T.surface, color: T.textSecondary, fontWeight: 500, cursor: 'pointer', fontSize: 14,
        }}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function AdminConvitesPage() {
  const [invites, setInvites] = useState<BusinessInvite[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [inviteType, setInviteType] = useState<'PERSONAL' | 'PUBLIC'>('PERSONAL');
  const [selectedInvite, setSelectedInvite] = useState<BusinessInvite | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const [whatsappData, setWhatsappData] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({ status: '', focusType: '', inviteType: '', search: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { show: toast, ToastContainer } = useToast();

  const [form, setForm] = useState({
    businessName: '', contactName: '', phone: '', email: '', city: '',
    focusType: 'RECOGNITION' as 'YOUTH_BEAUTY' | 'INCOME_GROWTH' | 'RECOGNITION',
    personalMessage: '', notes: '', expiresInDays: 7,
  });

  const [publicForm, setPublicForm] = useState({
    campaignName: '', slug: '',
    focusType: 'RECOGNITION' as 'YOUTH_BEAUTY' | 'INCOME_GROWTH' | 'RECOGNITION',
    personalMessage: '', notes: '', expiresInDays: 30,
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => { fetchMetrics(); fetchInvites(); }, []);
  useEffect(() => { fetchInvites(); }, [page, filters]);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  async function fetchMetrics() {
    try {
      const res = await fetch(`${API_URL}/business-invites/dashboard`, { headers: authHeaders() });
      if (res.ok) setMetrics(await res.json());
    } catch { /* silencioso */ }
  }

  async function fetchInvites() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (filters.status) params.set('status', filters.status);
      if (filters.focusType) params.set('focusType', filters.focusType);
      if (filters.inviteType) params.set('inviteType', filters.inviteType);
      if (filters.search) params.set('search', filters.search);

      const res = await fetch(`${API_URL}/business-invites?${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInvites(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch { /* silencioso */ } finally { setLoading(false); }
  }

  // ---- CRUD handlers ----

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/business-invites`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      const data = await res.json();
      setShowModal(false);
      resetForm();
      fetchInvites();
      fetchMetrics();
      setWhatsappData({
        phone: data.phone, message: data.whatsappMessage, inviteLink: data.inviteLink,
        whatsappLink: `https://wa.me/55${data.phone}?text=${encodeURIComponent(data.whatsappMessage)}`,
      });
      setShowWhatsAppModal(true);
      toast('Convite criado com sucesso!', 'success');
    } catch (err: any) { toast(err.message || 'Erro ao criar convite', 'error'); }
  }

  async function handleCreatePublicInvite(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/business-invites/public-campaign`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(publicForm),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      const data = await res.json();
      setShowModal(false);
      resetPublicForm();
      fetchInvites();
      fetchMetrics();
      setShareData({ campaignName: data.campaignName, inviteLink: data.inviteLink, shareLinks: data.shareLinks });
      setShowShareModal(true);
      toast('Campanha criada com sucesso!', 'success');
    } catch (err: any) { toast(err.message || 'Erro ao criar campanha', 'error'); }
  }

  async function handleUpdateInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvite) return;
    try {
      const isPublic = selectedInvite.inviteType === 'PUBLIC';
      const body = isPublic
        ? { campaignName: publicForm.campaignName, slug: publicForm.slug, focusType: publicForm.focusType, personalMessage: publicForm.personalMessage, notes: publicForm.notes }
        : { businessName: form.businessName, contactName: form.contactName, phone: form.phone, email: form.email, city: form.city, focusType: form.focusType, personalMessage: form.personalMessage, notes: form.notes };

      const res = await fetch(`${API_URL}/business-invites/${selectedInvite.id}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      setShowEditModal(false);
      setSelectedInvite(null);
      resetForm();
      resetPublicForm();
      fetchInvites();
      toast('Convite atualizado!', 'success');
    } catch (err: any) { toast(err.message || 'Erro ao atualizar', 'error'); }
  }

  async function handleSendWhatsApp(inviteId: string) {
    try {
      const res = await fetch(`${API_URL}/business-invites/${inviteId}/whatsapp-link`, { headers: authHeaders() });
      if (res.ok) { setWhatsappData(await res.json()); setShowWhatsAppModal(true); }
    } catch { toast('Erro ao gerar link WhatsApp', 'error'); }
  }

  async function handleMarkWhatsAppSent(inviteId: string) {
    try {
      await fetch(`${API_URL}/business-invites/${inviteId}/mark-whatsapp-sent`, { method: 'POST', headers: authHeaders() });
      fetchInvites();
      toast('Marcado como enviado via WhatsApp', 'success');
    } catch { toast('Erro', 'error'); }
  }

  async function handleCancel(invite: BusinessInvite) {
    if (!confirm(`Deseja cancelar o convite para "${invite.inviteType === 'PUBLIC' ? invite.campaignName : invite.businessName}"?`)) return;
    try {
      await fetch(`${API_URL}/business-invites/${invite.id}`, { method: 'DELETE', headers: authHeaders() });
      fetchInvites();
      fetchMetrics();
      toast('Convite cancelado', 'info');
    } catch (err: any) { toast(err.message || 'Erro ao cancelar', 'error'); }
  }

  async function handleReactivate(invite: BusinessInvite) {
    if (!confirm(`Deseja reativar o convite para "${invite.inviteType === 'PUBLIC' ? invite.campaignName : invite.businessName}"?`)) return;
    try {
      await fetch(`${API_URL}/business-invites/${invite.id}/reactivate`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ expiresInDays: 7 }),
      });
      fetchInvites();
      fetchMetrics();
      toast('Convite reativado!', 'success');
    } catch (err: any) { toast(err.message || 'Erro ao reativar', 'error'); }
  }

  function handleEdit(invite: BusinessInvite) {
    setSelectedInvite(invite);
    if (invite.inviteType === 'PUBLIC') {
      setPublicForm({
        campaignName: invite.campaignName || '',
        slug: invite.slug || '',
        focusType: invite.focusType,
        personalMessage: invite.personalMessage || '',
        notes: invite.notes || '',
        expiresInDays: 30,
      });
    } else {
      setForm({
        businessName: invite.businessName || '',
        contactName: invite.contactName || '',
        phone: invite.phone || '',
        email: invite.email || '',
        city: invite.city || '',
        focusType: invite.focusType,
        personalMessage: invite.personalMessage || '',
        notes: invite.notes || '',
        expiresInDays: 7,
      });
    }
    setShowEditModal(true);
  }

  function handleDetails(invite: BusinessInvite) {
    setSelectedInvite(invite);
    setShowDetailsModal(true);
  }

  // ---- Bulk actions ----

  function toggleSelectAll() {
    if (selectedIds.size === invites.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invites.map((i) => i.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function bulkCancel() {
    if (!confirm(`Cancelar ${selectedIds.size} convite(s)?`)) return;
    const ids = [...selectedIds];
    for (const id of ids) {
      try {
        await fetch(`${API_URL}/business-invites/${id}`, { method: 'DELETE', headers: authHeaders() });
      } catch { /* continue */ }
    }
    setSelectedIds(new Set());
    fetchInvites();
    fetchMetrics();
    toast(`${ids.length} convite(s) cancelado(s)`, 'info');
  }

  async function bulkReactivate() {
    if (!confirm(`Reativar ${selectedIds.size} convite(s)?`)) return;
    const ids = [...selectedIds];
    for (const id of ids) {
      try {
        await fetch(`${API_URL}/business-invites/${id}/reactivate`, {
          method: 'POST', headers: authHeaders(), body: JSON.stringify({ expiresInDays: 7 }),
        });
      } catch { /* continue */ }
    }
    setSelectedIds(new Set());
    fetchInvites();
    fetchMetrics();
    toast(`${ids.length} convite(s) reativado(s)`, 'success');
  }

  // ---- CSV Export ----

  async function handleExportCsv() {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.focusType) params.set('focusType', filters.focusType);
      if (filters.inviteType) params.set('inviteType', filters.inviteType);
      if (filters.search) params.set('search', filters.search);

      const res = await fetch(`${API_URL}/business-invites/export/csv?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Erro ao exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `convites-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast('CSV exportado com sucesso!', 'success');
    } catch { toast('Erro ao exportar CSV', 'error'); }
  }

  function resetForm() {
    setForm({ businessName: '', contactName: '', phone: '', email: '', city: '', focusType: 'RECOGNITION', personalMessage: '', notes: '', expiresInDays: 7 });
  }

  function resetPublicForm() {
    setPublicForm({ campaignName: '', slug: '', focusType: 'RECOGNITION', personalMessage: '', notes: '', expiresInDays: 30 });
  }

  // ---- Styles ----

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 10, color: T.textPrimary, fontSize: 14, outline: 'none',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '10px 20px', background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldSoft} 100%)`,
    border: 'none', borderRadius: T.radius, color: T.white, fontWeight: 600, cursor: 'pointer', fontSize: 14,
  };

  const btnSecondary: React.CSSProperties = {
    padding: '10px 20px', background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: T.radius, color: T.textSecondary, fontWeight: 500, cursor: 'pointer', fontSize: 14,
  };

  const btnSmall = (color: string, bg: string): React.CSSProperties => ({
    padding: '5px 10px', background: bg, border: 'none', borderRadius: 8,
    color, cursor: 'pointer', fontSize: 12, fontWeight: 500,
  });

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      <ToastContainer />

      <style>{`
        @keyframes fadeInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @media (max-width: 768px) {
          .grid-metrics { grid-template-columns: 1fr 1fr !important; }
          .grid-charts { grid-template-columns: 1fr !important; }
          .header-actions { flex-direction: column; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: T.textPrimary, margin: 0, fontFamily: 'Playfair Display, serif' }}>
            Convites de Empresas
          </h1>
          <p style={{ color: T.textMuted, marginTop: 4, fontSize: 14 }}>
            Gerencie convites para profissionais de beleza
          </p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExportCsv} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
            📥 Exportar CSV
          </button>
          <button onClick={() => { setInviteType('PUBLIC'); setShowModal(true); }}
            style={{ ...btnSecondary, background: T.infoBg, color: T.info, borderColor: '#c5d9e3' }}>
            📢 Nova Campanha
          </button>
          <button onClick={() => { setInviteType('PERSONAL'); setShowModal(true); }} style={btnPrimary}>
            ✉️ Convite Pessoal
          </button>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <>
          <div className="grid-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14, marginBottom: 20 }}>
            <MetricCard title="Total Enviados" value={metrics.totals.total} icon="📤" />
            <MetricCard title="Pendentes" value={metrics.totals.pending} icon="⏳" />
            <MetricCard title="Visualizados" value={metrics.totals.viewed} icon="👁️" />
            <MetricCard title="Convertidos" value={metrics.totals.registered + metrics.totals.activated} icon="🎉" />
            <MetricCard title="Taxa Conversão" value={`${metrics.rates.conversionRate}%`} icon="📈" />
          </div>

          <div className="grid-charts" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            <FunnelChart metrics={metrics} />
            <TimelineChart metrics={metrics} />
          </div>
        </>
      )}

      {/* Filters */}
      <div style={{ background: T.white, borderRadius: T.radius, padding: '18px 20px', border: `1px solid ${T.borderLight}`, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div>
            <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block', fontWeight: 500 }}>Buscar</label>
            <input type="text" placeholder="Nome, telefone, cidade..." value={filters.search}
              onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
              style={inputStyle} />
          </div>
          <div>
            <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block', fontWeight: 500 }}>Status</label>
            <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }} style={inputStyle}>
              <option value="">Todos</option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block', fontWeight: 500 }}>Tipo</label>
            <select value={filters.inviteType} onChange={(e) => { setFilters({ ...filters, inviteType: e.target.value }); setPage(1); }} style={inputStyle}>
              <option value="">Todos</option>
              <option value="PERSONAL">👤 Personalizados</option>
              <option value="PUBLIC">📢 Campanhas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div style={{
          background: T.warningBg, borderRadius: T.radius, padding: '12px 20px',
          border: `1px solid ${T.goldLight}`, marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: T.textPrimary }}>
            {selectedIds.size} selecionado(s)
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={bulkReactivate} style={btnSmall(T.info, T.infoBg)}>🔄 Reativar</button>
            <button onClick={bulkCancel} style={btnSmall(T.danger, T.dangerBg)}>✖ Cancelar</button>
            <button onClick={() => setSelectedIds(new Set())} style={btnSmall(T.textMuted, T.surface2)}>Limpar</button>
          </div>
        </div>
      )}

      {/* Invites Table */}
      <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.borderLight}`, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, color: T.textMuted }}>Carregando...</div>
        ) : invites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📭</div>
            <h3 style={{ color: T.textPrimary, fontWeight: 600, marginBottom: 4, fontFamily: 'Playfair Display, serif' }}>Nenhum convite encontrado</h3>
            <p style={{ color: T.textMuted, fontSize: 14 }}>Crie seu primeiro convite para começar</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <th style={{ padding: '12px 14px', textAlign: 'center', width: 40 }}>
                      <input type="checkbox" checked={selectedIds.size === invites.length && invites.length > 0}
                        onChange={toggleSelectAll} style={{ cursor: 'pointer', accentColor: T.gold }} />
                    </th>
                    <th style={{ padding: 12, textAlign: 'left', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Tipo</th>
                    <th style={{ padding: 12, textAlign: 'left', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Nome</th>

                    <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Status</th>
                    <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Métricas</th>
                    <th style={{ padding: 12, textAlign: 'right', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => {
                    const sc = STATUS_CONFIG[invite.status];
                    return (
                      <tr key={invite.id} style={{ borderBottom: `1px solid ${T.borderLight}`, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = T.surface)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <input type="checkbox" checked={selectedIds.has(invite.id)}
                            onChange={() => toggleSelect(invite.id)} style={{ cursor: 'pointer', accentColor: T.gold }} />
                        </td>
                        <td style={{ padding: 10 }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                            background: invite.inviteType === 'PUBLIC' ? T.infoBg : '#f0ebf7',
                            color: invite.inviteType === 'PUBLIC' ? T.info : '#8b6cc9',
                          }}>
                            {invite.inviteType === 'PUBLIC' ? '📢 Campanha' : '👤 Pessoal'}
                          </span>
                        </td>
                        <td style={{ padding: 10, cursor: 'pointer' }} onClick={() => handleDetails(invite)}>
                          {invite.inviteType === 'PUBLIC' ? (
                            <>
                              <div style={{ fontWeight: 600, color: T.textPrimary, fontSize: 14 }}>{invite.campaignName}</div>
                              <div style={{ fontSize: 11, color: T.textMuted }}>/{invite.slug || invite.token.slice(0, 8)}</div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontWeight: 600, color: T.textPrimary, fontSize: 14 }}>{invite.businessName}</div>
                              <div style={{ fontSize: 11, color: T.textMuted }}>{invite.contactName} • {invite.phone}</div>
                            </>
                          )}
                        </td>

                        <td style={{ padding: 10, textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            color: sc.color, background: sc.bg,
                          }}>
                            {sc.label}
                          </span>
                        </td>
                        <td style={{ padding: 10, textAlign: 'center' }}>
                          {invite.inviteType === 'PUBLIC' ? (
                            <span style={{ fontSize: 12, color: T.textSecondary }}>
                              👁️ {invite.viewCount} • 🖱️ {invite.totalClicks || 0}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: T.textSecondary }}>
                              👁️ {invite.viewCount} {invite.sentViaWhatsApp && <span style={{ marginLeft: 4 }}>💬</span>}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: 10, textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5 }}>
                            <button onClick={() => handleDetails(invite)} title="Detalhes"
                              style={btnSmall(T.textSecondary, T.surface2)}>🔍</button>

                            {!['CANCELLED', 'REGISTERED', 'ACTIVATED'].includes(invite.status) && (
                              <button onClick={() => handleEdit(invite)} title="Editar"
                                style={btnSmall(T.warning, T.warningBg)}>✏️</button>
                            )}

                            {invite.inviteType === 'PUBLIC' && (
                              <button onClick={() => {
                                const link = `${window.location.origin}/convite-empresa/${invite.slug || invite.token}`;
                                setShareData({
                                  campaignName: invite.campaignName, inviteLink: link,
                                  shareLinks: {
                                    whatsapp: `https://wa.me/?text=${encodeURIComponent(`Transforme seu salão! Acesse: ${link}`)}`,
                                    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
                                  },
                                });
                                setShowShareModal(true);
                              }} title="Compartilhar" style={btnSmall(T.info, T.infoBg)}>🔗</button>
                            )}

                            {invite.inviteType === 'PERSONAL' && !['CANCELLED', 'REGISTERED', 'ACTIVATED'].includes(invite.status) && (
                              <button onClick={() => handleSendWhatsApp(invite.id)} title="WhatsApp"
                                style={btnSmall('#25d366', '#e8f8ee')}>📱</button>
                            )}

                            {['EXPIRED', 'CANCELLED'].includes(invite.status) && (
                              <button onClick={() => handleReactivate(invite)} title="Reativar"
                                style={btnSmall(T.info, T.infoBg)}>🔄</button>
                            )}

                            {!['CANCELLED', 'REGISTERED', 'ACTIVATED'].includes(invite.status) && (
                              <button onClick={() => handleCancel(invite)} title="Cancelar"
                                style={btnSmall(T.danger, T.dangerBg)}>✖</button>
                            )}

                            {invite.convertedWorkspace && (
                              <a href="/admin/workspaces" style={{ fontSize: 11, color: T.success, padding: '5px 6px', textDecoration: 'none', fontWeight: 500 }}>
                                → {invite.convertedWorkspace.name}
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '18px 0' }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ ...btnSecondary, opacity: page === 1 ? 0.4 : 1 }}>
                  ← Anterior
                </button>
                <span style={{ padding: '10px 16px', color: T.textMuted, fontSize: 13 }}>
                  {page} de {totalPages}
                </span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ ...btnSecondary, opacity: page === totalPages ? 0.4 : 1 }}>
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ============= MODALS ============= */}

      {/* Details Modal */}
      {showDetailsModal && selectedInvite && (
        <DetailsModal invite={selectedInvite} onClose={() => { setShowDetailsModal(false); setSelectedInvite(null); }} />
      )}

      {/* Create Invite Modal */}
      {showModal && (
        <Modal onClose={() => { setShowModal(false); setInviteType('PERSONAL'); }}>
          {inviteType === 'PUBLIC' ? (
            <>
              <h2 style={{ color: T.textPrimary, marginBottom: 4, fontFamily: 'Playfair Display, serif', fontSize: 20 }}>📢 Nova Campanha</h2>
              <p style={{ color: T.textMuted, marginBottom: 24, fontSize: 13 }}>Crie um link para compartilhar nas redes sociais</p>
              <form onSubmit={handleCreatePublicInvite}>
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Nome da Campanha *</label>
                      <input type="text" required value={publicForm.campaignName}
                        onChange={(e) => setPublicForm({ ...publicForm, campaignName: e.target.value })}
                        placeholder="Ex: Instagram Março 2026" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Slug (opcional)</label>
                      <input type="text" value={publicForm.slug}
                        onChange={(e) => setPublicForm({ ...publicForm, slug: e.target.value })}
                        placeholder="Ex: instagram-marco" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Válido por</label>
                      <select value={publicForm.expiresInDays}
                        onChange={(e) => setPublicForm({ ...publicForm, expiresInDays: Number(e.target.value) })} style={inputStyle}>
                        <option value={7}>7 dias</option><option value={14}>14 dias</option>
                        <option value={30}>30 dias</option><option value={60}>60 dias</option><option value={90}>90 dias</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Notas internas</label>
                      <input type="text" value={publicForm.notes}
                        onChange={(e) => setPublicForm({ ...publicForm, notes: e.target.value })}
                        placeholder="Ex: Campanha do Instagram" style={inputStyle} />
                    </div>
                  </div>

                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={btnSecondary}>Cancelar</button>
                  <button type="submit" style={{ ...btnPrimary, background: `linear-gradient(135deg, ${T.info} 0%, #4a7f98 100%)` }}>Criar Campanha</button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 style={{ color: T.textPrimary, marginBottom: 4, fontFamily: 'Playfair Display, serif', fontSize: 20 }}>✉️ Convite Pessoal</h2>
              <p style={{ color: T.textMuted, marginBottom: 24, fontSize: 13 }}>Convite exclusivo para um profissional de beleza</p>
              <form onSubmit={handleCreateInvite}>
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Salão/Profissional *</label>
                      <input type="text" required value={form.businessName}
                        onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                        placeholder="Ex: Studio Maria" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Contato *</label>
                      <input type="text" required value={form.contactName}
                        onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                        placeholder="Ex: Maria" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>WhatsApp *</label>
                      <input type="tel" required value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="11999999999" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Email (opcional)</label>
                      <input type="email" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="email@exemplo.com" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Cidade</label>
                      <input type="text" value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        placeholder="Ex: São Paulo" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Válido por</label>
                      <select value={form.expiresInDays}
                        onChange={(e) => setForm({ ...form, expiresInDays: Number(e.target.value) })} style={inputStyle}>
                        <option value={3}>3 dias</option><option value={7}>7 dias</option>
                        <option value={14}>14 dias</option><option value={30}>30 dias</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Mensagem pessoal</label>
                    <textarea value={form.personalMessage}
                      onChange={(e) => setForm({ ...form, personalMessage: e.target.value })}
                      placeholder="Mensagem personalizada (aparece no convite)"
                      rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Notas internas</label>
                    <input type="text" value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Notas para uso interno" style={inputStyle} />
                  </div>

                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={btnSecondary}>Cancelar</button>
                  <button type="submit" style={btnPrimary}>Criar Convite</button>
                </div>
              </form>
            </>
          )}
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedInvite && (
        <Modal onClose={() => { setShowEditModal(false); setSelectedInvite(null); }}>
          <h2 style={{ color: T.textPrimary, marginBottom: 4, fontFamily: 'Playfair Display, serif', fontSize: 20 }}>
            ✏️ Editar {selectedInvite.inviteType === 'PUBLIC' ? 'Campanha' : 'Convite'}
          </h2>
          <p style={{ color: T.textMuted, marginBottom: 24, fontSize: 13 }}>
            {selectedInvite.inviteType === 'PUBLIC' ? selectedInvite.campaignName : selectedInvite.businessName}
          </p>
          <form onSubmit={handleUpdateInvite}>
            {selectedInvite.inviteType === 'PUBLIC' ? (
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Nome da Campanha</label>
                    <input type="text" value={publicForm.campaignName}
                      onChange={(e) => setPublicForm({ ...publicForm, campaignName: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Slug</label>
                    <input type="text" value={publicForm.slug}
                      onChange={(e) => setPublicForm({ ...publicForm, slug: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Notas</label>
                  <input type="text" value={publicForm.notes}
                    onChange={(e) => setPublicForm({ ...publicForm, notes: e.target.value })} style={inputStyle} />
                </div>

              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Salão/Profissional</label>
                    <input type="text" value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Contato</label>
                    <input type="text" value={form.contactName}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>WhatsApp</label>
                    <input type="tel" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Email</label>
                    <input type="email" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Cidade</label>
                    <input type="text" value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Mensagem pessoal</label>
                    <input type="text" value={form.personalMessage}
                      onChange={(e) => setForm({ ...form, personalMessage: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Notas</label>
                  <input type="text" value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inputStyle} />
                </div>

              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button type="button" onClick={() => { setShowEditModal(false); setSelectedInvite(null); }} style={btnSecondary}>Cancelar</button>
              <button type="submit" style={btnPrimary}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && whatsappData && (
        <Modal onClose={() => setShowWhatsAppModal(false)}>
          <h2 style={{ color: T.textPrimary, marginBottom: 16, fontFamily: 'Playfair Display, serif', fontSize: 20 }}>💬 Enviar via WhatsApp</h2>
          <div style={{ background: T.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Mensagem:</div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: T.textPrimary, margin: 0, lineHeight: 1.5 }}>
              {whatsappData.message}
            </pre>
          </div>
          {whatsappData.inviteLink && (
            <div style={{ background: T.warningBg, borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: T.textSecondary, flex: 1, wordBreak: 'break-all' }}>
                🔗 {whatsappData.inviteLink}
              </span>
              <button onClick={() => { navigator.clipboard.writeText(whatsappData.inviteLink); toast('Link copiado!', 'success'); }}
                style={btnSmall(T.gold, T.warningBg)}>Copiar</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowWhatsAppModal(false)} style={btnSecondary}>Fechar</button>
            <a href={whatsappData.whatsappLink} target="_blank" rel="noopener noreferrer"
              style={{
                ...btnPrimary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#25d366',
              }}>
              Abrir WhatsApp
            </a>
          </div>
        </Modal>
      )}

      {/* Share Modal (for public campaigns) */}
      {showShareModal && shareData && (
        <Modal onClose={() => setShowShareModal(false)}>
          <h2 style={{ color: T.textPrimary, marginBottom: 16, fontFamily: 'Playfair Display, serif', fontSize: 20 }}>🔗 Compartilhar Campanha</h2>
          <p style={{ color: T.textMuted, marginBottom: 16, fontSize: 13 }}>{shareData.campaignName}</p>
          <div style={{ background: T.surface, borderRadius: 10, padding: '12px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: T.textPrimary, flex: 1, wordBreak: 'break-all' }}>{shareData.inviteLink}</span>
            <button onClick={() => { navigator.clipboard.writeText(shareData.inviteLink); toast('Link copiado!', 'success'); }}
              style={btnSmall(T.gold, T.warningBg)}>Copiar</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <a href={shareData.shareLinks?.whatsapp} target="_blank" rel="noopener noreferrer"
              style={{
                padding: '12px 16px', background: '#e8f8ee', borderRadius: 10, textDecoration: 'none',
                color: '#25d366', fontWeight: 600, fontSize: 14, textAlign: 'center',
              }}>
              💬 WhatsApp
            </a>
            <a href={shareData.shareLinks?.facebook} target="_blank" rel="noopener noreferrer"
              style={{
                padding: '12px 16px', background: '#e8f0fb', borderRadius: 10, textDecoration: 'none',
                color: '#1877f2', fontWeight: 600, fontSize: 14, textAlign: 'center',
              }}>
              📘 Facebook
            </a>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setShowShareModal(false)} style={btnSecondary}>Fechar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
