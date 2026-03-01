'use client';

import { useEffect, useState } from 'react';

interface BusinessInvite {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  email?: string;
  city?: string;
  focusType: 'YOUTH_BEAUTY' | 'INCOME_GROWTH' | 'RECOGNITION';
  personalMessage?: string;
  status: 'PENDING' | 'VIEWED' | 'CLICKED_CTA' | 'REGISTERED' | 'ACTIVATED' | 'EXPIRED' | 'CANCELLED';
  viewCount: number;
  lastViewedAt?: string;
  ctaClickedAt?: string;
  registeredAt?: string;
  expiresAt: string;
  sentViaWhatsApp: boolean;
  sentViaEmail: boolean;
  createdAt: string;
  token: string;
  sentBy?: { id: string; name: string };
  convertedWorkspace?: { id: string; name: string; slug: string };
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
  last30Days: {
    sent: number;
    registered: number;
  };
  rates: {
    conversionRate: number;
    viewToClickRate: number;
  };
  byFocusType: { focusType: string; count: number }[];
}

const FOCUS_TYPES = {
  YOUTH_BEAUTY: { label: '✨ Juventude & Beleza', color: '#ec4899', description: 'Foco em autoestima e beleza feminina' },
  INCOME_GROWTH: { label: '💰 Aumento de Renda', color: '#10b981', description: 'Foco em crescimento financeiro' },
  RECOGNITION: { label: '🏆 Reconhecimento', color: '#f59e0b', description: 'Foco em reconhecimento profissional' },
};

const STATUS_LABELS = {
  PENDING: { label: 'Pendente', color: '#64748b', bg: '#1e293b' },
  VIEWED: { label: 'Visualizado', color: '#3b82f6', bg: '#1e3a5f' },
  CLICKED_CTA: { label: 'Clicou CTA', color: '#8b5cf6', bg: '#2e1065' },
  REGISTERED: { label: 'Cadastrado', color: '#10b981', bg: '#064e3b' },
  ACTIVATED: { label: 'Ativo', color: '#22c55e', bg: '#052e16' },
  EXPIRED: { label: 'Expirado', color: '#f97316', bg: '#431407' },
  CANCELLED: { label: 'Cancelado', color: '#ef4444', bg: '#450a0a' },
};

export default function AdminConvitesPage() {
  const [invites, setInvites] = useState<BusinessInvite[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<BusinessInvite | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappData, setWhatsappData] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: '',
    focusType: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [form, setForm] = useState({
    businessName: '',
    contactName: '',
    phone: '',
    email: '',
    city: '',
    focusType: 'RECOGNITION' as const,
    personalMessage: '',
    notes: '',
    expiresInDays: 7,
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [page, filters]);

  async function fetchMetrics() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/business-invites/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMetrics(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchInvites() {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        ...(filters.status && { status: filters.status }),
        ...(filters.focusType && { focusType: filters.focusType }),
        ...(filters.search && { search: filters.search }),
      });

      const res = await fetch(`${API_URL}/business-invites?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setInvites(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/business-invites`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erro ao criar convite');
      }

      const data = await res.json();
      setShowModal(false);
      resetForm();
      fetchInvites();
      fetchMetrics();

      // Show WhatsApp modal with the link
      setWhatsappData({
        phone: data.phone,
        message: data.whatsappMessage,
        inviteLink: data.inviteLink,
        whatsappLink: `https://wa.me/55${data.phone}?text=${encodeURIComponent(data.whatsappMessage)}`,
      });
      setShowWhatsAppModal(true);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleSendWhatsApp(inviteId: string) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/business-invites/${inviteId}/whatsapp-link`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setWhatsappData(data);
        setShowWhatsAppModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkWhatsAppSent(inviteId: string) {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/business-invites/${inviteId}/mark-whatsapp-sent`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchInvites();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCancel(invite: BusinessInvite) {
    if (!confirm(`Deseja cancelar o convite para "${invite.businessName}"?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/business-invites/${invite.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchInvites();
      fetchMetrics();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleReactivate(invite: BusinessInvite) {
    if (!confirm(`Deseja reativar o convite para "${invite.businessName}"?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/business-invites/${invite.id}/reactivate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresInDays: 7 }),
      });
      fetchInvites();
      fetchMetrics();
    } catch (err: any) {
      alert(err.message);
    }
  }

  function resetForm() {
    setForm({
      businessName: '',
      contactName: '',
      phone: '',
      email: '',
      city: '',
      focusType: 'RECOGNITION',
      personalMessage: '',
      notes: '',
      expiresInDays: 7,
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt) < new Date();
  }

  // Styles
  const cardStyle = {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    borderRadius: 16,
    padding: 24,
    border: '1px solid #334155',
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 10,
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
  };

  const buttonStyle = (variant: 'primary' | 'success' | 'danger' | 'secondary') => ({
    padding: '10px 20px',
    background: variant === 'primary' ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' :
                variant === 'success' ? '#10b981' :
                variant === 'danger' ? '#ef4444' : '#475569',
    border: 'none',
    borderRadius: 10,
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
    transition: 'all 0.2s',
  });

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            🎯 Convites de Empresas
          </h1>
          <p style={{ color: '#94a3b8', marginTop: 4 }}>
            Convide profissionais de beleza para fazer parte do Bela Pro
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            ...buttonStyle('primary'),
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 16,
            padding: '14px 28px',
          }}
        >
          <span>✉️</span> Novo Convite
        </button>
      </div>

      {/* Metrics Dashboard */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          <MetricCard
            title="Total Enviados"
            value={metrics.totals.total}
            icon="📤"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
          />
          <MetricCard
            title="Pendentes"
            value={metrics.totals.pending}
            icon="⏳"
            gradient="linear-gradient(135deg, #64748b 0%, #475569 100%)"
          />
          <MetricCard
            title="Visualizados"
            value={metrics.totals.viewed}
            icon="👁️"
            gradient="linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
          />
          <MetricCard
            title="Convertidos"
            value={metrics.totals.registered + metrics.totals.activated}
            icon="🎉"
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
          />
          <MetricCard
            title="Taxa Conversão"
            value={`${metrics.rates.conversionRate}%`}
            icon="📈"
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          />
          <MetricCard
            title="Últimos 30 dias"
            value={metrics.last30Days.sent}
            subtitle={`${metrics.last30Days.registered} convertidos`}
            icon="📅"
            gradient="linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
          />
        </div>
      )}

      {/* Filters */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>Buscar</label>
            <input
              type="text"
              placeholder="Nome, telefone, cidade..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={inputStyle}
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>Tipo de Foco</label>
            <select
              value={filters.focusType}
              onChange={(e) => setFilters({ ...filters, focusType: e.target.value })}
              style={inputStyle}
            >
              <option value="">Todos</option>
              {Object.entries(FOCUS_TYPES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Invites List */}
      <div style={cardStyle}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Carregando...</div>
        ) : invites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
            <h3 style={{ color: '#f8fafc', marginBottom: 8 }}>Nenhum convite encontrado</h3>
            <p style={{ color: '#94a3b8' }}>Clique em "Novo Convite" para começar</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: '#94a3b8', fontWeight: 500 }}>Empresa</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#94a3b8', fontWeight: 500 }}>Contato</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#94a3b8', fontWeight: 500 }}>Foco</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontWeight: 500 }}>Status</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontWeight: 500 }}>Views</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontWeight: 500 }}>Enviado</th>
                    <th style={{ padding: 12, textAlign: 'right', color: '#94a3b8', fontWeight: 500 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <tr key={invite.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{invite.businessName}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{invite.city || '-'}</div>
                      </td>
                      <td style={{ padding: 12 }}>
                        <div style={{ color: '#f8fafc' }}>{invite.contactName}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{invite.phone}</div>
                      </td>
                      <td style={{ padding: 12 }}>
                        <span style={{ color: FOCUS_TYPES[invite.focusType].color }}>
                          {FOCUS_TYPES[invite.focusType].label}
                        </span>
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 500,
                          color: STATUS_LABELS[invite.status].color,
                          background: STATUS_LABELS[invite.status].bg,
                        }}>
                          {STATUS_LABELS[invite.status].label}
                        </span>
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', color: '#f8fafc' }}>
                        {invite.viewCount}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        {invite.sentViaWhatsApp && <span title="WhatsApp" style={{ marginRight: 4 }}>💬</span>}
                        {invite.sentViaEmail && <span title="Email">📧</span>}
                        {!invite.sentViaWhatsApp && !invite.sentViaEmail && <span style={{ color: '#64748b' }}>-</span>}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          {invite.status !== 'CANCELLED' && invite.status !== 'REGISTERED' && invite.status !== 'ACTIVATED' && (
                            <button
                              onClick={() => handleSendWhatsApp(invite.id)}
                              style={{
                                padding: '6px 12px',
                                background: '#25d366',
                                border: 'none',
                                borderRadius: 6,
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: 13,
                              }}
                              title="Enviar WhatsApp"
                            >
                              📱
                            </button>
                          )}
                          {(invite.status === 'EXPIRED' || invite.status === 'CANCELLED') && (
                            <button
                              onClick={() => handleReactivate(invite)}
                              style={{
                                padding: '6px 12px',
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: 6,
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: 13,
                              }}
                              title="Reativar"
                            >
                              🔄
                            </button>
                          )}
                          {invite.status !== 'CANCELLED' && invite.status !== 'REGISTERED' && invite.status !== 'ACTIVATED' && (
                            <button
                              onClick={() => handleCancel(invite)}
                              style={{
                                padding: '6px 12px',
                                background: '#dc2626',
                                border: 'none',
                                borderRadius: 6,
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: 13,
                              }}
                              title="Cancelar"
                            >
                              ✖️
                            </button>
                          )}
                          {invite.convertedWorkspace && (
                            <span style={{ fontSize: 12, color: '#10b981', padding: '6px 8px' }}>
                              → {invite.convertedWorkspace.name}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ ...buttonStyle('secondary'), opacity: page === 1 ? 0.5 : 1 }}
                >
                  ← Anterior
                </button>
                <span style={{ padding: '10px 16px', color: '#94a3b8' }}>
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ ...buttonStyle('secondary'), opacity: page === totalPages ? 0.5 : 1 }}
                >
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Invite Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h2 style={{ color: '#f8fafc', marginBottom: 8 }}>✉️ Novo Convite</h2>
          <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14 }}>
            Crie um convite personalizado para um profissional de beleza
          </p>

          <form onSubmit={handleCreateInvite}>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>
                    Nome do Salão/Profissional *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    placeholder="Ex: Studio Maria Beauty"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>
                    Nome do Contato *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    placeholder="Ex: Maria"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>
                    WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="11999999999"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Ex: São Paulo"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>
                    Válido por
                  </label>
                  <select
                    value={form.expiresInDays}
                    onChange={(e) => setForm({ ...form, expiresInDays: Number(e.target.value) })}
                    style={inputStyle}
                  >
                    <option value={3}>3 dias</option>
                    <option value={7}>7 dias</option>
                    <option value={14}>14 dias</option>
                    <option value={30}>30 dias</option>
                  </select>
                </div>
              </div>

              {/* Focus Type Selection */}
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, display: 'block' }}>
                  🎯 Qual dor focar na mensagem?
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {Object.entries(FOCUS_TYPES).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, focusType: key as any })}
                      style={{
                        padding: 16,
                        background: form.focusType === key ? `${val.color}20` : '#0f172a',
                        border: `2px solid ${form.focusType === key ? val.color : '#334155'}`,
                        borderRadius: 12,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{val.label.split(' ')[0]}</div>
                      <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 600 }}>
                        {val.label.split(' ').slice(1).join(' ')}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                        {val.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>
                  Mensagem Personalizada (opcional)
                </label>
                <textarea
                  value={form.personalMessage}
                  onChange={(e) => setForm({ ...form, personalMessage: e.target.value })}
                  placeholder="Ex: Adorei conhecer seu trabalho no Instagram..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>
                  Notas Internas (não será enviado)
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ex: Conhecida na feira de beleza"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={buttonStyle('secondary')}
              >
                Cancelar
              </button>
              <button type="submit" style={buttonStyle('primary')}>
                Criar Convite
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && whatsappData && (
        <Modal onClose={() => setShowWhatsAppModal(false)}>
          <h2 style={{ color: '#f8fafc', marginBottom: 8 }}>📱 Enviar via WhatsApp</h2>
          <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14 }}>
            Clique no botão abaixo para enviar a mensagem personalizada
          </p>

          <div style={{
            background: '#0f172a',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>Mensagem:</div>
            <pre style={{
              color: '#f8fafc',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              margin: 0,
            }}>
              {whatsappData.message}
            </pre>
          </div>

          <div style={{
            background: '#0f172a',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>Link do convite:</div>
            <code style={{ color: '#3b82f6', fontSize: 13 }}>{whatsappData.inviteLink}</code>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(whatsappData.message);
                alert('Mensagem copiada!');
              }}
              style={buttonStyle('secondary')}
            >
              📋 Copiar Mensagem
            </button>
            <a
              href={whatsappData.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...buttonStyle('success'),
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#25d366',
              }}
            >
              <span>💬</span> Abrir WhatsApp
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, subtitle, icon, gradient }: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  gradient: string;
}) {
  return (
    <div style={{
      background: gradient,
      borderRadius: 16,
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: 12, top: 12, fontSize: 32, opacity: 0.3 }}>
        {icon}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'white' }}>{value}</div>
      {subtitle && (
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>{subtitle}</div>
      )}
    </div>
  );
}

// Modal Component
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: 20,
          padding: 32,
          maxWidth: 600,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '1px solid #334155',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
