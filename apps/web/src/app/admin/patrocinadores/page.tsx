'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface Sponsor {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoLightUrl?: string;
  logoDarkUrl?: string;
  coverImageUrl?: string;
  websiteUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  tier: 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE';
  sponsorType: 'BRAND' | 'SUPPLIER' | 'OFFICIAL_PARTNER' | 'EDUCATIONAL_PARTNER' | 'TECH_PARTNER' | 'CAMPAIGN_PARTNER';
  placementScopes: string[];
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  contractStartsAt?: string;
  contractEndsAt?: string;
  trackingEnabled: boolean;
  viewCount: number;
  clickCount: number;
  lastViewedAt?: string;
  lastClickedAt?: string;
  notes?: string;
  createdAt: string;
}

interface SponsorInvite {
  id: string;
  token: string;
  isUniversal?: boolean;
  universalTitle?: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  personalMessage?: string;
  proposedTier: string;
  proposedType: string;
  proposedBenefits: string[];
  status: 'PENDING' | 'VIEWED' | 'CLICKED_CTA' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  viewCount: number;
  usageCount?: number;
  expiresAt: string;
  createdAt: string;
}

interface SponsorContract {
  id: string;
  contractNumber: string;
  tier: string;
  sponsorType: string;
  contractedParty: string;
  contactName: string;
  contactEmail: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'RENEWED';
  durationMonths: number;
  startsAt: string;
  endsAt: string;
  signedAt?: string;
  signedByName?: string;
  sponsor: { id: string; name: string; tier: string };
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

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  DIAMOND: { label: 'Diamond', color: '#7c3aed', bg: '#ede9fe', icon: '💎' },
  GOLD: { label: 'Gold', color: '#d97706', bg: '#fef3c7', icon: '🥇' },
  SILVER: { label: 'Silver', color: '#6b7280', bg: '#f3f4f6', icon: '🥈' },
  BRONZE: { label: 'Bronze', color: '#92400e', bg: '#fef3c7', icon: '🥉' },
};

const TYPE_CONFIG: Record<string, { label: string }> = {
  BRAND: { label: 'Marca' },
  SUPPLIER: { label: 'Fornecedor' },
  OFFICIAL_PARTNER: { label: 'Parceiro Oficial' },
  EDUCATIONAL_PARTNER: { label: 'Parceiro Educacional' },
  TECH_PARTNER: { label: 'Parceiro Tech' },
  CAMPAIGN_PARTNER: { label: 'Parceiro de Campanha' },
};

const PLACEMENT_CONFIG: Record<string, string> = {
  INVITE_LANDING: 'Landing Convite',
  PUBLIC_BOOKING: 'Booking Público',
  DASHBOARD: 'Dashboard',
  MARKETING_PAGE: 'Marketing',
  ALL: 'Todos',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PatrocinadoresPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [filters, setFilters] = useState({ tier: '', sponsorType: '', isActive: '', search: '' });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const emptyForm = {
    name: '', slug: '', description: '', logoLightUrl: '', logoDarkUrl: '', coverImageUrl: '',
    websiteUrl: '', ctaLabel: '', ctaUrl: '',
    tier: 'SILVER' as Sponsor['tier'], sponsorType: 'BRAND' as Sponsor['sponsorType'],
    placementScopes: ['ALL'] as string[],
    displayOrder: 0, isActive: true, isFeatured: false,
    contractStartsAt: '', contractEndsAt: '',
    trackingEnabled: true, notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  // Invite & contracts state
  const [activeTab, setActiveTab] = useState<'sponsors' | 'invites' | 'contracts'>('sponsors');
  const [invites, setInvites] = useState<SponsorInvite[]>([]);
  const [contracts, setContracts] = useState<SponsorContract[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUniversalModal, setShowUniversalModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    companyName: '', contactName: '', contactEmail: '', contactPhone: '',
    personalMessage: '', proposedTier: 'GOLD' as Sponsor['tier'],
    proposedType: 'BRAND' as Sponsor['sponsorType'],
    proposedBenefits: ['Logo na landing page premium', 'Destaque na página de agendamento', 'Relatório de impressões e cliques', 'Badge exclusiva de parceiro verificado'],
    expiresInDays: 30, notes: '',
  });
  const [universalForm, setUniversalForm] = useState({
    universalTitle: 'Seja nosso parceiro!',
    personalMessage: '',
    proposedTier: 'GOLD' as Sponsor['tier'],
    proposedBenefits: ['Logo na landing page premium', 'Destaque na página de agendamento', 'Relatório de impressões e cliques', 'Badge exclusiva de parceiro verificado'],
    expiresInDays: 90,
    notes: '',
  });

  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessForm, setAccessForm] = useState({ sponsorId: '', sponsorName: '', email: '', password: '' });
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const logoLightRef = useRef<HTMLInputElement>(null);
  const logoDarkRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getToken = () => localStorage.getItem('token') || '';

  const handleImageUpload = async (file: File, category: string, field: 'logoLightUrl' | 'logoDarkUrl' | 'coverImageUrl') => {
    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/upload/sponsor-image?category=${category}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const baseUrl = API_URL.replace('/api/v1', '');
        const fullUrl = `${baseUrl}${data.url}`;
        setForm(prev => ({ ...prev, [field]: fullUrl }));
        showToast('Imagem enviada!');
      } else {
        showToast('Erro ao enviar imagem', 'error');
      }
    } catch { showToast('Erro de conexão', 'error'); }
    finally { setUploadingField(null); }
  };

  const handleSetupAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/sponsor-access/${accessForm.sponsorId}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ email: accessForm.email, password: accessForm.password }),
      });
      if (res.ok) {
        showToast('Acesso Diamond configurado! O patrocinador já pode fazer login.');
        setShowAccessModal(false);
        setAccessForm({ sponsorId: '', sponsorName: '', email: '', password: '' });
        fetchSponsors();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Erro ao configurar acesso', 'error');
      }
    } catch { showToast('Erro de conexão', 'error'); }
  };

  const openAccessModal = (s: Sponsor) => {
    setAccessForm({ sponsorId: s.id, sponsorName: s.name, email: '', password: '' });
    setShowAccessModal(true);
  };

  const fetchSponsors = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.tier) params.set('tier', filters.tier);
      if (filters.sponsorType) params.set('sponsorType', filters.sponsorType);
      if (filters.isActive) params.set('isActive', filters.isActive);
      if (filters.search) params.set('search', filters.search);

      const res = await fetch(`${API_URL}/admin/sponsors?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setSponsors(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchSponsors(); }, [fetchSponsors]);

  // Fetch invites
  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/sponsor-invites`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setInvites(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (activeTab === 'invites') fetchInvites(); }, [activeTab, fetchInvites]);

  // Fetch contracts
  const fetchContracts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/sponsor-contracts`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setContracts(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (activeTab === 'contracts') fetchContracts(); }, [activeTab, fetchContracts]);

  const handleCancelContract = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este contrato?')) return;
    try {
      const res = await fetch(`${API_URL}/admin/sponsor-contracts/${id}/cancel`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelado pelo administrador' }),
      });
      if (res.ok) { showToast('Contrato cancelado'); fetchContracts(); }
      else showToast('Erro ao cancelar contrato', 'error');
    } catch { showToast('Erro de conexão', 'error'); }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/sponsor-invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ...inviteForm,
          contactEmail: inviteForm.contactEmail || null,
          contactPhone: inviteForm.contactPhone || null,
          personalMessage: inviteForm.personalMessage || null,
          notes: inviteForm.notes || null,
        }),
      });
      if (res.ok) {
        const invite = await res.json();
        const inviteUrl = `${window.location.origin}/convite-parceiro/${invite.token}`;
        navigator.clipboard.writeText(inviteUrl).catch(() => {});
        showToast('Convite criado! Link copiado para a área de transferência.');
        setShowInviteModal(false);
        setInviteForm({
          companyName: '', contactName: '', contactEmail: '', contactPhone: '',
          personalMessage: '', proposedTier: 'GOLD', proposedType: 'BRAND',
          proposedBenefits: ['Logo na landing page premium', 'Destaque na página de agendamento', 'Relatório de impressões e cliques', 'Badge exclusiva de parceiro verificado'],
          expiresInDays: 30, notes: '',
        });
        fetchInvites();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Erro ao criar convite', 'error');
      }
    } catch { showToast('Erro de conexão', 'error'); }
  };

  const handleCreateUniversal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/sponsor-invites/universal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ...universalForm,
          personalMessage: universalForm.personalMessage || null,
          notes: universalForm.notes || null,
        }),
      });
      if (res.ok) {
        const invite = await res.json();
        const inviteUrl = `${window.location.origin}/convite-parceiro/${invite.token}`;
        navigator.clipboard.writeText(inviteUrl).catch(() => {});
        showToast('Convite universal criado! Link copiado para a área de transferência.');
        setShowUniversalModal(false);
        setUniversalForm({
          universalTitle: 'Seja nosso parceiro!', personalMessage: '', proposedTier: 'GOLD',
          proposedBenefits: ['Logo na landing page premium', 'Destaque na página de agendamento', 'Relatório de impressões e cliques', 'Badge exclusiva de parceiro verificado'],
          expiresInDays: 90, notes: '',
        });
        fetchInvites();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Erro ao criar convite universal', 'error');
      }
    } catch { showToast('Erro de conexão', 'error'); }
  };

  const handleCancelInvite = async (id: string) => {
    if (!confirm('Cancelar este convite?')) return;
    try {
      const res = await fetch(`${API_URL}/admin/sponsor-invites/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) { showToast('Convite cancelado'); fetchInvites(); }
    } catch { showToast('Erro', 'error'); }
  };

  const handleResendInvite = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/sponsor-invites/${id}/resend`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) { showToast('Convite reenviado!'); fetchInvites(); }
    } catch { showToast('Erro', 'error'); }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/convite-parceiro/${token}`;
    navigator.clipboard.writeText(url).then(() => showToast('Link copiado!')).catch(() => showToast('Erro ao copiar', 'error'));
  };

  const INVITE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: 'Enviado', color: T.warning, bg: T.warningBg },
    VIEWED: { label: 'Visualizado', color: T.info, bg: T.infoBg },
    CLICKED_CTA: { label: 'Clicou CTA', color: '#7c3aed', bg: '#ede9fe' },
    ACCEPTED: { label: 'Aceito ✓', color: T.success, bg: T.successBg },
    DECLINED: { label: 'Recusado', color: T.danger, bg: T.dangerBg },
    EXPIRED: { label: 'Expirado', color: T.textMuted, bg: T.surface2 },
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingSponsor
        ? `${API_URL}/admin/sponsors/${editingSponsor.id}`
        : `${API_URL}/admin/sponsors`;
      const method = editingSponsor ? 'PUT' : 'POST';

      const payload = {
        ...form,
        logoLightUrl: form.logoLightUrl || null,
        logoDarkUrl: form.logoDarkUrl || null,
        coverImageUrl: form.coverImageUrl || null,
        websiteUrl: form.websiteUrl || null,
        ctaLabel: form.ctaLabel || null,
        ctaUrl: form.ctaUrl || null,
        contractStartsAt: form.contractStartsAt ? new Date(form.contractStartsAt).toISOString() : null,
        contractEndsAt: form.contractEndsAt ? new Date(form.contractEndsAt).toISOString() : null,
        notes: form.notes || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingSponsor ? 'Patrocinador atualizado!' : 'Patrocinador criado!');
        setShowModal(false);
        setEditingSponsor(null);
        setForm(emptyForm);
        fetchSponsors();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Erro ao salvar', 'error');
      }
    } catch { showToast('Erro de conexão', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este patrocinador?')) return;
    try {
      const res = await fetch(`${API_URL}/admin/sponsors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) { showToast('Excluído!'); fetchSponsors(); }
    } catch { showToast('Erro ao excluir', 'error'); }
  };

  const toggleActive = async (sponsor: Sponsor) => {
    const endpoint = sponsor.isActive ? 'deactivate' : 'activate';
    try {
      const res = await fetch(`${API_URL}/admin/sponsors/${sponsor.id}/${endpoint}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) { showToast(sponsor.isActive ? 'Desativado' : 'Ativado'); fetchSponsors(); }
    } catch { showToast('Erro', 'error'); }
  };

  const openEdit = (s: Sponsor) => {
    setEditingSponsor(s);
    setForm({
      name: s.name, slug: s.slug, description: s.description || '',
      logoLightUrl: s.logoLightUrl || '', logoDarkUrl: s.logoDarkUrl || '',
      coverImageUrl: s.coverImageUrl || '',
      websiteUrl: s.websiteUrl || '', ctaLabel: s.ctaLabel || '', ctaUrl: s.ctaUrl || '',
      tier: s.tier, sponsorType: s.sponsorType,
      placementScopes: s.placementScopes,
      displayOrder: s.displayOrder, isActive: s.isActive, isFeatured: s.isFeatured,
      contractStartsAt: s.contractStartsAt ? s.contractStartsAt.split('T')[0] : '',
      contractEndsAt: s.contractEndsAt ? s.contractEndsAt.split('T')[0] : '',
      trackingEnabled: s.trackingEnabled, notes: s.notes || '',
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingSponsor(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  // Metrics
  const totalSponsors = sponsors.length;
  const activeSponsors = sponsors.filter(s => s.isActive).length;
  const totalViews = sponsors.reduce((sum, s) => sum + s.viewCount, 0);
  const totalClicks = sponsors.reduce((sum, s) => sum + s.clickCount, 0);
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0';

  // Styles
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: `1.5px solid ${T.borderLight}`,
    borderRadius: 10, fontSize: 14, outline: 'none', background: T.white,
    color: T.textPrimary, boxSizing: 'border-box',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '10px 24px', background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldSoft} 100%)`,
    color: T.white, border: 'none', borderRadius: 10, fontWeight: 600,
    cursor: 'pointer', fontSize: 14,
  };

  const btnSecondary: React.CSSProperties = {
    padding: '10px 20px', background: T.surface, color: T.textSecondary,
    border: `1px solid ${T.border}`, borderRadius: 10, fontWeight: 500,
    cursor: 'pointer', fontSize: 13,
  };

  if (loading) {
    return (
      <div style={{ padding: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <p style={{ color: T.textMuted }}>Carregando patrocinadores...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '14px 24px',
          background: toast.type === 'success' ? T.successBg : T.dangerBg,
          color: toast.type === 'success' ? T.success : T.danger,
          borderRadius: 12, fontSize: 14, fontWeight: 600,
          border: `1px solid ${toast.type === 'success' ? T.success : T.danger}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: T.textPrimary, margin: 0, fontFamily: 'Playfair Display, serif' }}>
            Patrocinadores & Parceiros
          </h1>
          <p style={{ color: T.textMuted, marginTop: 4, fontSize: 14 }}>
            Gerencie patrocinadores e convites de parceria
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/admin/patrocinadores/financeiro" style={{ ...btnPrimary, background: 'linear-gradient(135deg, #e3a008 0%, #ca8a04 100%)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            💰 Financeiro
          </a>
          <button onClick={() => setShowUniversalModal(true)} style={{ ...btnPrimary, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
            🌐 Convite Universal
          </button>
          <button onClick={() => setShowInviteModal(true)} style={{ ...btnPrimary, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
            ✉️ Enviar Convite
          </button>
          <button onClick={openCreate} style={btnPrimary}>
            + Novo Patrocinador
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: T.surface2, borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'sponsors' as const, label: '🤝 Patrocinadores', count: totalSponsors },
          { key: 'invites' as const, label: '✉️ Convites', count: invites.length },
          { key: 'contracts' as const, label: '📄 Contratos', count: contracts.length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none', cursor: 'pointer',
            background: activeTab === tab.key ? T.white : 'transparent',
            color: activeTab === tab.key ? T.gold : T.textMuted,
            boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
          }}>
            {tab.label} {tab.count > 0 && <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Metrics Cards */}
      {activeTab === 'sponsors' && (<>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', value: totalSponsors, icon: '🤝', color: T.gold },
          { label: 'Ativos', value: activeSponsors, icon: '✅', color: T.success },
          { label: 'Views', value: totalViews.toLocaleString(), icon: '👁️', color: T.info },
          { label: 'Cliques', value: totalClicks.toLocaleString(), icon: '🖱️', color: T.warning },
          { label: 'CTR', value: `${ctr}%`, icon: '📊', color: '#7c3aed' },
        ].map((m, i) => (
          <div key={i} style={{
            background: T.white, borderRadius: T.radius, padding: '20px 18px',
            border: `1px solid ${T.borderLight}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: m.color, fontFamily: 'Playfair Display, serif' }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center',
        background: T.surface, padding: '14px 18px', borderRadius: T.radius,
        border: `1px solid ${T.borderLight}`,
      }}>
        <input
          placeholder="🔍 Buscar..."
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          style={{ ...inputStyle, maxWidth: 220 }}
        />
        <select value={filters.tier} onChange={e => setFilters({ ...filters, tier: e.target.value })} style={inputStyle}>
          <option value="">Todos os Tiers</option>
          {Object.entries(TIER_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select value={filters.sponsorType} onChange={e => setFilters({ ...filters, sponsorType: e.target.value })} style={inputStyle}>
          <option value="">Todos os Tipos</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filters.isActive} onChange={e => setFilters({ ...filters, isActive: e.target.value })} style={inputStyle}>
          <option value="">Status</option>
          <option value="true">Ativo</option>
          <option value="false">Inativo</option>
        </select>
      </div>

      {/* Table */}
      <div style={{
        background: T.white, borderRadius: T.radius, border: `1px solid ${T.borderLight}`,
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: T.surface2, borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: 12, textAlign: 'left', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Patrocinador</th>
                <th style={{ padding: 12, textAlign: 'left', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Tipo</th>
                <th style={{ padding: 12, textAlign: 'left', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Tier</th>
                <th style={{ padding: 12, textAlign: 'left', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Placement</th>
                <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Status</th>
                <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Views</th>
                <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Cliques</th>
                <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Vigência</th>
                <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 48, textAlign: 'center', color: T.textMuted }}>
                    Nenhum patrocinador cadastrado
                  </td>
                </tr>
              ) : sponsors.map(s => {
                const tier = TIER_CONFIG[s.tier];
                const isExpired = s.contractEndsAt && new Date(s.contractEndsAt) < new Date();
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${T.borderLight}`, opacity: s.isActive ? 1 : 0.5 }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {s.logoLightUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.logoLightUrl} alt={s.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain', background: T.surface, padding: 4 }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: T.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                            {tier?.icon}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: T.textPrimary }}>
                            {s.name}
                            {s.isFeatured && <span style={{ marginLeft: 6, fontSize: 11, color: T.gold }}>⭐ Destaque</span>}
                          </div>
                          <div style={{ fontSize: 11, color: T.textMuted }}>{s.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: 12, fontSize: 12, color: T.textSecondary }}>
                      {TYPE_CONFIG[s.sponsorType]?.label}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: tier?.bg, color: tier?.color,
                      }}>
                        {tier?.icon} {tier?.label}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {s.placementScopes.map(p => (
                          <span key={p} style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 10,
                            background: T.surface2, color: T.textMuted,
                          }}>
                            {PLACEMENT_CONFIG[p] || p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: s.isActive ? T.successBg : T.dangerBg,
                        color: s.isActive ? T.success : T.danger,
                      }}>
                        {s.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                      {isExpired && (
                        <div style={{ fontSize: 10, color: T.danger, marginTop: 2 }}>Contrato expirado</div>
                      )}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: T.info }}>
                      {s.viewCount.toLocaleString()}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: T.warning }}>
                      {s.clickCount.toLocaleString()}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center', fontSize: 11, color: T.textMuted }}>
                      {s.contractStartsAt || s.contractEndsAt ? (
                        <>
                          {s.contractStartsAt && new Date(s.contractStartsAt).toLocaleDateString('pt-BR')}
                          {' → '}
                          {s.contractEndsAt ? new Date(s.contractEndsAt).toLocaleDateString('pt-BR') : '∞'}
                        </>
                      ) : '—'}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button onClick={() => openEdit(s)} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12 }}>
                          ✏️
                        </button>
                        {s.tier === 'DIAMOND' && (
                          <button onClick={() => openAccessModal(s)} title="Configurar acesso Diamond"
                            style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12, color: '#7c3aed' }}>
                            💎
                          </button>
                        )}
                        <button onClick={() => toggleActive(s)} style={{
                          ...btnSecondary, padding: '6px 12px', fontSize: 12,
                          color: s.isActive ? T.danger : T.success,
                        }}>
                          {s.isActive ? '⏸' : '▶️'}
                        </button>
                        <button onClick={() => handleDelete(s.id)} style={{
                          ...btnSecondary, padding: '6px 12px', fontSize: 12, color: T.danger,
                        }}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {/* INVITES TAB */}
      {activeTab === 'invites' && (
        <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.borderLight}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: T.surface2, borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: 12, textAlign: 'left', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Empresa</th>
                  <th style={{ padding: 12, textAlign: 'left', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Contato</th>
                  <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Tipo</th>
                  <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Tier Proposto</th>
                  <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Status</th>
                  <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Views</th>
                  <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Validade</th>
                  <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {invites.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: T.textMuted }}>
                      Nenhum convite enviado ainda
                    </td>
                  </tr>
                ) : invites.map(inv => {
                  const tier = TIER_CONFIG[inv.proposedTier];
                  const st = INVITE_STATUS_CONFIG[inv.status];
                  const isExpired = new Date(inv.expiresAt) < new Date();
                  return (
                    <tr key={inv.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                      <td style={{ padding: 12 }}>
                        {inv.isUniversal ? (
                          <>
                            <div style={{ fontWeight: 600, color: '#059669' }}>🌐 {inv.universalTitle || 'Convite Universal'}</div>
                            <div style={{ fontSize: 11, color: T.textMuted }}>Universal — {inv.usageCount || 0} uso(s)</div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 600, color: T.textPrimary }}>{inv.companyName}</div>
                            <div style={{ fontSize: 11, color: T.textMuted }}>{TYPE_CONFIG[inv.proposedType]?.label}</div>
                          </>
                        )}
                      </td>
                      <td style={{ padding: 12 }}>
                        {inv.isUniversal ? (
                          <span style={{ color: T.textMuted, fontSize: 12, fontStyle: 'italic' }}>Qualquer parceiro</span>
                        ) : (
                          <>
                            <div style={{ color: T.textPrimary, fontSize: 13 }}>{inv.contactName}</div>
                            {inv.contactEmail && <div style={{ fontSize: 11, color: T.textMuted }}>{inv.contactEmail}</div>}
                          </>
                        )}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        {inv.isUniversal ? (
                          <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#e6f7f0', color: '#059669' }}>
                            🌐 Universal
                          </span>
                        ) : (
                          <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: T.surface2, color: T.textSecondary }}>
                            ✉️ Direcionado
                          </span>
                        )}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: tier?.bg, color: tier?.color }}>
                          {tier?.icon} {tier?.label}
                        </span>
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: st?.bg, color: st?.color }}>
                          {st?.label}
                        </span>
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: T.info }}>{inv.viewCount}</td>
                      <td style={{ padding: 12, textAlign: 'center', fontSize: 11, color: isExpired ? T.danger : T.textMuted }}>
                        {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                        {isExpired && <div style={{ color: T.danger, fontSize: 10 }}>Expirado</div>}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button onClick={() => copyInviteLink(inv.token)} title="Copiar link"
                            style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12 }}>🔗</button>
                          {['PENDING', 'VIEWED', 'EXPIRED'].includes(inv.status) && (
                            <button onClick={() => handleResendInvite(inv.id)} title="Reenviar"
                              style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12, color: T.info }}>🔄</button>
                          )}
                          {!['ACCEPTED', 'DECLINED'].includes(inv.status) && (
                            <button onClick={() => handleCancelInvite(inv.id)} title="Cancelar"
                              style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12, color: T.danger }}>🗑️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTRACTS TAB */}
      {activeTab === 'contracts' && (
        <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.borderLight}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: T.surface2, borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: 12, textAlign: 'left', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Nº Contrato</th>
                  <th style={{ padding: 12, textAlign: 'left', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Empresa</th>
                  <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Tier</th>
                  <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Status</th>
                  <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Vigência</th>
                  <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Assinado</th>
                  <th style={{ padding: 12, textAlign: 'center', color: T.textMuted, fontWeight: 500, fontSize: 12 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: T.textMuted }}>
                      Nenhum contrato encontrado
                    </td>
                  </tr>
                ) : contracts.map(c => {
                  const cTier = TIER_CONFIG[c.tier];
                  const cStatus: Record<string, { label: string; color: string; bg: string }> = {
                    DRAFT: { label: 'Rascunho', color: T.textMuted, bg: T.surface2 },
                    ACTIVE: { label: 'Ativo', color: T.success, bg: T.successBg },
                    EXPIRED: { label: 'Expirado', color: T.warning, bg: T.warningBg },
                    CANCELLED: { label: 'Cancelado', color: T.danger, bg: T.dangerBg },
                    RENEWED: { label: 'Renovado', color: T.info, bg: T.infoBg },
                  };
                  const st = cStatus[c.status] || cStatus.DRAFT;
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                      <td style={{ padding: 12 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12, color: T.gold }}>{c.contractNumber}</span>
                      </td>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 600, color: T.textPrimary }}>{c.contractedParty}</div>
                        <div style={{ fontSize: 11, color: T.textMuted }}>{c.contactName}</div>
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: cTier?.bg, color: cTier?.color }}>
                          {cTier?.icon} {cTier?.label}
                        </span>
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', fontSize: 11, color: T.textMuted }}>
                        {new Date(c.startsAt).toLocaleDateString('pt-BR')} — {new Date(c.endsAt).toLocaleDateString('pt-BR')}
                        <div style={{ fontSize: 10, color: T.textMuted }}>{c.durationMonths} meses</div>
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', fontSize: 11 }}>
                        {c.signedByName ? (
                          <div>
                            <div style={{ color: T.success, fontWeight: 600 }}>✓ {c.signedByName}</div>
                            {c.signedAt && <div style={{ color: T.textMuted, fontSize: 10 }}>{new Date(c.signedAt).toLocaleDateString('pt-BR')}</div>}
                          </div>
                        ) : (
                          <span style={{ color: T.textMuted }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button onClick={() => window.open(`/contrato/${c.contractNumber}`, '_blank')} title="Ver contrato"
                            style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12 }}>👁️</button>
                          {c.status === 'ACTIVE' && (
                            <button onClick={() => handleCancelContract(c.id)} title="Cancelar contrato"
                              style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12, color: T.danger }}>🗑️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          padding: '40px 16px', overflowY: 'auto',
        }}>
          <div style={{
            background: T.white, borderRadius: 16, width: '100%', maxWidth: 720,
            padding: 32, position: 'relative',
          }}>
            <button onClick={() => { setShowModal(false); setEditingSponsor(null); }} style={{
              position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
              fontSize: 22, cursor: 'pointer', color: T.textMuted, padding: 4,
            }}>✕</button>

            <h2 style={{ color: T.textPrimary, marginBottom: 4, fontFamily: 'Playfair Display, serif', fontSize: 22 }}>
              {editingSponsor ? '✏️ Editar Patrocinador' : '🤝 Novo Patrocinador'}
            </h2>
            <p style={{ color: T.textMuted, marginBottom: 24, fontSize: 13 }}>
              {editingSponsor ? 'Atualize as informações do patrocinador' : 'Cadastre um novo patrocinador ou parceiro'}
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: 16 }}>
                {/* Name + Slug */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Nome *</label>
                    <input type="text" required value={form.name}
                      onChange={e => {
                        const name = e.target.value;
                        setForm({ ...form, name, slug: editingSponsor ? form.slug : generateSlug(name) });
                      }}
                      placeholder="Ex: L'Oréal" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Slug *</label>
                    <input type="text" required value={form.slug}
                      onChange={e => setForm({ ...form, slug: e.target.value })}
                      placeholder="loreal" style={inputStyle} />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Descrição</label>
                  <textarea value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Breve descrição do patrocinador..."
                    rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>

                {/* Logos — Upload */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  {[
                    { field: 'logoLightUrl' as const, label: 'Logo (Light)', cat: 'logo', ref: logoLightRef },
                    { field: 'logoDarkUrl' as const, label: 'Logo (Dark)', cat: 'logo-dark', ref: logoDarkRef },
                    { field: 'coverImageUrl' as const, label: 'Capa', cat: 'cover', ref: coverRef },
                  ].map(img => (
                    <div key={img.field}>
                      <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>{img.label}</label>
                      <input ref={img.ref} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, img.cat, img.field); }} />
                      <div style={{
                        border: `2px dashed ${form[img.field] ? T.gold : T.borderLight}`,
                        borderRadius: 10, padding: 12, textAlign: 'center', cursor: 'pointer',
                        background: form[img.field] ? `${T.gold}08` : T.surface,
                        minHeight: 80, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: 6, position: 'relative',
                      }} onClick={() => img.ref.current?.click()}>
                        {uploadingField === img.field ? (
                          <span style={{ fontSize: 12, color: T.gold }}>Enviando...</span>
                        ) : form[img.field] ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form[img.field]} alt={img.label}
                              style={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain', borderRadius: 6 }} />
                            <span style={{ fontSize: 10, color: T.textMuted }}>Clique para trocar</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 22 }}>📁</span>
                            <span style={{ fontSize: 11, color: T.textMuted }}>Upload {img.label}</span>
                          </>
                        )}
                        {form[img.field] && (
                          <button type="button" onClick={e => { e.stopPropagation(); setForm(prev => ({ ...prev, [img.field]: '' })); }}
                            style={{ position: 'absolute', top: 4, right: 4, background: T.dangerBg, border: 'none',
                              borderRadius: 6, width: 20, height: 20, cursor: 'pointer', fontSize: 10, color: T.danger, lineHeight: '20px' }}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Website + CTA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Website</label>
                    <input type="url" value={form.websiteUrl}
                      onChange={e => setForm({ ...form, websiteUrl: e.target.value })}
                      placeholder="https://..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>CTA Label</label>
                    <input type="text" value={form.ctaLabel}
                      onChange={e => setForm({ ...form, ctaLabel: e.target.value })}
                      placeholder="Conhecer" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>CTA URL</label>
                    <input type="url" value={form.ctaUrl}
                      onChange={e => setForm({ ...form, ctaUrl: e.target.value })}
                      placeholder="https://..." style={inputStyle} />
                  </div>
                </div>

                {/* Tier + Type + Placement */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Tier</label>
                    <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value as Sponsor['tier'] })} style={inputStyle}>
                      {Object.entries(TIER_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Tipo</label>
                    <select value={form.sponsorType} onChange={e => setForm({ ...form, sponsorType: e.target.value as Sponsor['sponsorType'] })} style={inputStyle}>
                      {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Placement scopes */}
                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 6, display: 'block' }}>Onde exibir</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(PLACEMENT_CONFIG).map(([key, label]) => (
                      <button key={key} type="button" onClick={() => {
                        const scopes = form.placementScopes.includes(key)
                          ? form.placementScopes.filter(p => p !== key)
                          : [...form.placementScopes.filter(p => p !== 'ALL'), key];
                        setForm({ ...form, placementScopes: scopes.length ? scopes : ['ALL'] });
                      }} style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                        border: `1.5px solid ${form.placementScopes.includes(key) ? T.gold : T.borderLight}`,
                        background: form.placementScopes.includes(key) ? `${T.gold}15` : T.surface,
                        color: form.placementScopes.includes(key) ? T.gold : T.textMuted,
                        cursor: 'pointer',
                      }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order + Contract */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Ordem</label>
                    <input type="number" value={form.displayOrder} min={0}
                      onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Início contrato</label>
                    <input type="date" value={form.contractStartsAt}
                      onChange={e => setForm({ ...form, contractStartsAt: e.target.value })}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Fim contrato</label>
                    <input type="date" value={form.contractEndsAt}
                      onChange={e => setForm({ ...form, contractEndsAt: e.target.value })}
                      style={inputStyle} />
                  </div>
                </div>

                {/* Toggles */}
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[
                    { key: 'isActive', label: 'Ativo' },
                    { key: 'isFeatured', label: 'Destaque' },
                    { key: 'trackingEnabled', label: 'Tracking' },
                  ].map(toggle => (
                    <label key={toggle.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: T.textSecondary }}>
                      <input type="checkbox" checked={(form as Record<string, unknown>)[toggle.key] as boolean}
                        onChange={e => setForm({ ...form, [toggle.key]: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: T.gold }} />
                      {toggle.label}
                    </label>
                  ))}
                </div>

                {/* Notes */}
                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Notas internas</label>
                  <textarea value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                    placeholder="Notas visíveis apenas para admins..." />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button type="button" onClick={() => { setShowModal(false); setEditingSponsor(null); }} style={btnSecondary}>
                  Cancelar
                </button>
                <button type="submit" style={btnPrimary}>
                  {editingSponsor ? 'Salvar Alterações' : 'Criar Patrocinador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          padding: '40px 16px', overflowY: 'auto',
        }}>
          <div style={{
            background: T.white, borderRadius: 16, width: '100%', maxWidth: 640,
            padding: 32, position: 'relative',
          }}>
            <button onClick={() => setShowInviteModal(false)} style={{
              position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
              fontSize: 22, cursor: 'pointer', color: T.textMuted, padding: 4,
            }}>✕</button>

            <h2 style={{ color: T.textPrimary, marginBottom: 4, fontFamily: 'Playfair Display, serif', fontSize: 22 }}>
              ✉️ Convite para Parceiro
            </h2>
            <p style={{ color: T.textMuted, marginBottom: 20, fontSize: 13 }}>
              Envie um convite profissional e irrecusável para um parceiro ou fornecedor
            </p>

            <form onSubmit={handleSendInvite}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Empresa *</label>
                    <input type="text" required value={inviteForm.companyName}
                      onChange={e => setInviteForm({ ...inviteForm, companyName: e.target.value })}
                      placeholder="Ex: L'Oréal Brasil" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Nome do contato *</label>
                    <input type="text" required value={inviteForm.contactName}
                      onChange={e => setInviteForm({ ...inviteForm, contactName: e.target.value })}
                      placeholder="João Silva" style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Email</label>
                    <input type="email" value={inviteForm.contactEmail}
                      onChange={e => setInviteForm({ ...inviteForm, contactEmail: e.target.value })}
                      placeholder="contato@empresa.com" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Telefone</label>
                    <input type="tel" value={inviteForm.contactPhone}
                      onChange={e => setInviteForm({ ...inviteForm, contactPhone: e.target.value })}
                      placeholder="(11) 99999-0000" style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Tier proposto</label>
                    <select value={inviteForm.proposedTier} onChange={e => setInviteForm({ ...inviteForm, proposedTier: e.target.value as Sponsor['tier'] })} style={inputStyle}>
                      {Object.entries(TIER_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Tipo</label>
                    <select value={inviteForm.proposedType} onChange={e => setInviteForm({ ...inviteForm, proposedType: e.target.value as Sponsor['sponsorType'] })} style={inputStyle}>
                      {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Mensagem personalizada</label>
                  <textarea value={inviteForm.personalMessage}
                    onChange={e => setInviteForm({ ...inviteForm, personalMessage: e.target.value })}
                    rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                    placeholder="Escreva uma mensagem especial para este parceiro..." />
                </div>

                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 6, display: 'block' }}>Benefícios propostos</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {inviteForm.proposedBenefits.map((b, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="text" value={b}
                          onChange={e => {
                            const benefits = [...inviteForm.proposedBenefits];
                            benefits[i] = e.target.value;
                            setInviteForm({ ...inviteForm, proposedBenefits: benefits });
                          }}
                          style={{ ...inputStyle, flex: 1 }} />
                        <button type="button" onClick={() => {
                          setInviteForm({ ...inviteForm, proposedBenefits: inviteForm.proposedBenefits.filter((_, j) => j !== i) });
                        }} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 16 }}>✕</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setInviteForm({ ...inviteForm, proposedBenefits: [...inviteForm.proposedBenefits, ''] })}
                      style={{ ...btnSecondary, fontSize: 12, padding: '6px 14px', width: 'fit-content' }}>
                      + Adicionar benefício
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Validade (dias)</label>
                  <input type="number" value={inviteForm.expiresInDays} min={1} max={365}
                    onChange={e => setInviteForm({ ...inviteForm, expiresInDays: Number(e.target.value) })}
                    style={{ ...inputStyle, maxWidth: 120 }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button type="button" onClick={() => setShowInviteModal(false)} style={btnSecondary}>Cancelar</button>
                <button type="submit" style={{ ...btnPrimary, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
                  ✉️ Criar Convite & Copiar Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNIVERSAL INVITE MODAL */}
      {showUniversalModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          padding: '40px 16px', overflowY: 'auto',
        }}>
          <div style={{
            background: T.white, borderRadius: 16, width: '100%', maxWidth: 560,
            padding: 32, position: 'relative',
          }}>
            <button onClick={() => setShowUniversalModal(false)} style={{
              position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
              fontSize: 22, cursor: 'pointer', color: T.textMuted, padding: 4,
            }}>✕</button>

            <h2 style={{ color: T.textPrimary, marginBottom: 4, fontFamily: 'Playfair Display, serif', fontSize: 22 }}>
              🌐 Convite Universal
            </h2>
            <p style={{ color: T.textMuted, marginBottom: 6, fontSize: 13 }}>
              Crie um link genérico que qualquer parceiro pode usar para se cadastrar
            </p>
            <div style={{
              background: '#e6f7f0', border: '1px solid #b2e0d0', borderRadius: 10, padding: '10px 14px',
              fontSize: 12, color: '#047857', marginBottom: 20, lineHeight: 1.5,
            }}>
              💡 <strong>Diferente do convite direcionado:</strong> não precisa preencher dados do parceiro.
              O link pode ser compartilhado em redes sociais, site, ou por qualquer canal.
              Múltiplos parceiros podem se cadastrar pelo mesmo link.
            </div>

            <form onSubmit={handleCreateUniversal}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Título do convite</label>
                  <input type="text" value={universalForm.universalTitle}
                    onChange={e => setUniversalForm({ ...universalForm, universalTitle: e.target.value })}
                    placeholder="Seja nosso parceiro!" style={inputStyle} />
                </div>

                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Tier sugerido (o parceiro pode escolher outro)</label>
                  <select value={universalForm.proposedTier} onChange={e => setUniversalForm({ ...universalForm, proposedTier: e.target.value as Sponsor['tier'] })} style={inputStyle}>
                    {Object.entries(TIER_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Mensagem de boas-vindas (opcional)</label>
                  <textarea value={universalForm.personalMessage}
                    onChange={e => setUniversalForm({ ...universalForm, personalMessage: e.target.value })}
                    rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                    placeholder="Mensagem que aparecerá na página do convite..." />
                </div>

                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Validade (dias)</label>
                  <input type="number" value={universalForm.expiresInDays} min={1} max={365}
                    onChange={e => setUniversalForm({ ...universalForm, expiresInDays: Number(e.target.value) })}
                    style={{ ...inputStyle, maxWidth: 120 }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button type="button" onClick={() => setShowUniversalModal(false)} style={btnSecondary}>Cancelar</button>
                <button type="submit" style={{ ...btnPrimary, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
                  🌐 Criar Link Universal & Copiar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIAMOND ACCESS MODAL */}
      {showAccessModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '40px 16px',
        }}>
          <div style={{
            background: T.white, borderRadius: 16, width: '100%', maxWidth: 480,
            padding: 32, position: 'relative',
          }}>
            <button onClick={() => setShowAccessModal(false)} style={{
              position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
              fontSize: 22, cursor: 'pointer', color: T.textMuted, padding: 4,
            }}>✕</button>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💎</div>
              <h2 style={{ color: T.textPrimary, margin: 0, fontFamily: 'Playfair Display, serif', fontSize: 22 }}>
                Acesso Diamond Panel
              </h2>
              <p style={{ color: T.textMuted, marginTop: 4, fontSize: 13 }}>
                Configure login para <strong>{accessForm.sponsorName}</strong>
              </p>
              <p style={{ color: T.textMuted, fontSize: 12, marginTop: 2 }}>
                O patrocinador poderá acessar seu painel em <strong>/parceiro/login</strong>
              </p>
            </div>

            <form onSubmit={handleSetupAccess}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Email de acesso *</label>
                  <input type="email" required value={accessForm.email}
                    onChange={e => setAccessForm({ ...accessForm, email: e.target.value })}
                    placeholder="sponsor@empresa.com" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Senha *</label>
                  <input type="password" required minLength={6} value={accessForm.password}
                    onChange={e => setAccessForm({ ...accessForm, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowAccessModal(false)} style={btnSecondary}>Cancelar</button>
                <button type="submit" style={{ ...btnPrimary, background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
                  💎 Configurar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
