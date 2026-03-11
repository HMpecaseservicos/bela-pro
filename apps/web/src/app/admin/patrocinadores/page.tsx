'use client';

import { useEffect, useState, useCallback } from 'react';

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

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getToken = () => localStorage.getItem('token') || '';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: T.textPrimary, margin: 0, fontFamily: 'Playfair Display, serif' }}>
            Patrocinadores & Parceiros
          </h1>
          <p style={{ color: T.textMuted, marginTop: 4, fontSize: 14 }}>
            Gerencie patrocinadores e parceiros da plataforma
          </p>
        </div>
        <button onClick={openCreate} style={btnPrimary}>
          + Novo Patrocinador
        </button>
      </div>

      {/* Metrics Cards */}
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

                {/* Logos */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Logo (light) URL</label>
                    <input type="url" value={form.logoLightUrl}
                      onChange={e => setForm({ ...form, logoLightUrl: e.target.value })}
                      placeholder="https://..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Logo (dark) URL</label>
                    <input type="url" value={form.logoDarkUrl}
                      onChange={e => setForm({ ...form, logoDarkUrl: e.target.value })}
                      placeholder="https://..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: T.textMuted, fontSize: 11, marginBottom: 3, display: 'block' }}>Capa URL</label>
                    <input type="url" value={form.coverImageUrl}
                      onChange={e => setForm({ ...form, coverImageUrl: e.target.value })}
                      placeholder="https://..." style={inputStyle} />
                  </div>
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
    </div>
  );
}
