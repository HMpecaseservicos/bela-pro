'use client';

import { useEffect, useState } from 'react';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
}

interface Subscription {
  id: string;
  status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED';
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL';
  trialEndsAt?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  discountPercent?: number;
  notes?: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  };
  plan: Plan;
  _count: { invoices: number };
}

const STATUS_CONFIG = {
  ACTIVE: { label: 'Ativo', bg: '#064e3b', color: '#6ee7b7', icon: '✓' },
  TRIAL: { label: 'Trial', bg: '#78350f', color: '#fbbf24', icon: '🎁' },
  PAST_DUE: { label: 'Atrasado', bg: '#7f1d1d', color: '#fecaca', icon: '⚠️' },
  CANCELLED: { label: 'Cancelado', bg: '#374151', color: '#9ca3af', icon: '✗' },
  SUSPENDED: { label: 'Suspenso', bg: '#7f1d1d', color: '#fecaca', icon: '⏸️' },
};

const CYCLE_LABELS = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
};

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [page, search, statusFilter]);

  async function fetchPlans() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/billing/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchSubscriptions() {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await fetch(`${API_URL}/billing/subscriptions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Erro ao carregar');

      const data = await res.json();
      setSubscriptions(data.subscriptions);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(subId: string, action: 'activate' | 'cancel' | 'suspend') {
    const messages = {
      activate: 'Deseja ativar esta assinatura?',
      cancel: 'Deseja cancelar esta assinatura?',
      suspend: 'Deseja suspender esta assinatura?',
    };

    if (!confirm(messages[action])) return;

    try {
      const token = localStorage.getItem('token');
      const endpoint = action === 'activate'
        ? `${API_URL}/billing/subscriptions/${subId}/activate`
        : action === 'cancel'
          ? `${API_URL}/billing/subscriptions/${subId}/cancel`
          : `${API_URL}/billing/subscriptions/${subId}`;

      const res = await fetch(endpoint, {
        method: action === 'suspend' ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: action === 'suspend' ? JSON.stringify({ status: 'SUSPENDED' }) : undefined,
      });

      if (!res.ok) throw new Error('Erro na ação');
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleCreateInvoice(subId: string) {
    if (!confirm('Gerar nova fatura para esta assinatura?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/billing/invoices/${subId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Erro ao gerar fatura');
      alert('Fatura gerada com sucesso!');
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.message);
    }
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  function daysUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  const inputStyle = {
    padding: '12px 16px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f8fafc' }}>
          Assinaturas
        </h1>
        <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 15 }}>
          Gerenciar assinaturas dos workspaces
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar workspace..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ ...inputStyle, width: '100%', paddingLeft: 42 }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ ...inputStyle, minWidth: 150 }}
        >
          <option value="">Todos os Status</option>
          <option value="ACTIVE">Ativo</option>
          <option value="TRIAL">Trial</option>
          <option value="PAST_DUE">Atrasado</option>
          <option value="SUSPENDED">Suspenso</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      {/* Table */}
      <div style={{
        background: '#1e293b',
        borderRadius: 16,
        border: '1px solid #334155',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            Carregando...
          </div>
        ) : subscriptions.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            Nenhuma assinatura encontrada
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr 120px',
              padding: '14px 20px',
              borderBottom: '1px solid #334155',
              background: '#0f172a',
              color: '#64748b',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <div>Workspace</div>
              <div>Plano</div>
              <div>Status</div>
              <div>Ciclo</div>
              <div>Próx. Vencimento</div>
              <div style={{ textAlign: 'center' }}>Ações</div>
            </div>

            {/* Rows */}
            {subscriptions.map((sub) => {
              const status = STATUS_CONFIG[sub.status];
              const daysLeft = daysUntil(sub.currentPeriodEnd);

              return (
                <div
                  key={sub.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr 120px',
                    padding: '16px 20px',
                    borderBottom: '1px solid #334155',
                    alignItems: 'center',
                  }}
                >
                  {/* Workspace */}
                  <div>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 14 }}>
                      {sub.workspace.name}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      /{sub.workspace.slug}
                    </div>
                  </div>

                  {/* Plano */}
                  <div>
                    <div style={{ color: '#f8fafc', fontSize: 13 }}>{sub.plan.name}</div>
                    <div style={{ color: '#10b981', fontSize: 11 }}>
                      {formatPrice(sub.plan.priceMonthly)}/mês
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background: status.bg,
                      color: status.color,
                    }}>
                      {status.icon} {status.label}
                    </span>
                    {sub.status === 'TRIAL' && sub.trialEndsAt && (
                      <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 4 }}>
                        {daysUntil(sub.trialEndsAt)} dias restantes
                      </div>
                    )}
                  </div>

                  {/* Ciclo */}
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>
                    {CYCLE_LABELS[sub.billingCycle]}
                    {sub.discountPercent && (
                      <span style={{
                        marginLeft: 6,
                        padding: '2px 6px',
                        background: '#064e3b',
                        color: '#6ee7b7',
                        borderRadius: 4,
                        fontSize: 10,
                      }}>
                        -{sub.discountPercent}%
                      </span>
                    )}
                  </div>

                  {/* Vencimento */}
                  <div>
                    <div style={{ color: '#f8fafc', fontSize: 13 }}>
                      {formatDate(sub.currentPeriodEnd)}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: daysLeft < 0 
                        ? '#ef4444' 
                        : daysLeft <= 7 
                          ? '#f59e0b' 
                          : '#64748b',
                    }}>
                      {daysLeft < 0 
                        ? `Vencido há ${Math.abs(daysLeft)} dias`
                        : `em ${daysLeft} dias`}
                    </div>
                  </div>

                  {/* Ações */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                    <button
                      onClick={() => { setSelectedSub(sub); setShowModal(true); }}
                      style={{
                        padding: '6px 10px',
                        background: '#334155',
                        border: 'none',
                        borderRadius: 6,
                        color: '#f8fafc',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                      title="Detalhes"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => handleCreateInvoice(sub.id)}
                      style={{
                        padding: '6px 10px',
                        background: '#1e3a5f',
                        border: 'none',
                        borderRadius: 6,
                        color: '#60a5fa',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                      title="Gerar Fatura"
                    >
                      📄
                    </button>
                    {sub.status === 'ACTIVE' || sub.status === 'TRIAL' ? (
                      <button
                        onClick={() => handleAction(sub.id, 'suspend')}
                        style={{
                          padding: '6px 10px',
                          background: '#78350f',
                          border: 'none',
                          borderRadius: 6,
                          color: '#fbbf24',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                        title="Suspender"
                      >
                        ⏸️
                      </button>
                    ) : sub.status === 'SUSPENDED' || sub.status === 'PAST_DUE' ? (
                      <button
                        onClick={() => handleAction(sub.id, 'activate')}
                        style={{
                          padding: '6px 10px',
                          background: '#064e3b',
                          border: 'none',
                          borderRadius: 6,
                          color: '#6ee7b7',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                        title="Ativar"
                      >
                        ▶️
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginTop: 24,
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '10px 16px',
              background: page === 1 ? '#1e293b' : '#334155',
              border: 'none',
              borderRadius: 8,
              color: page === 1 ? '#64748b' : '#f8fafc',
              cursor: page === 1 ? 'default' : 'pointer',
            }}
          >
            ← Anterior
          </button>
          <span style={{
            padding: '10px 20px',
            background: '#1e293b',
            borderRadius: 8,
            color: '#f8fafc',
          }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '10px 16px',
              background: page === totalPages ? '#1e293b' : '#334155',
              border: 'none',
              borderRadius: 8,
              color: page === totalPages ? '#64748b' : '#f8fafc',
              cursor: page === totalPages ? 'default' : 'pointer',
            }}
          >
            Próxima →
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {showModal && selectedSub && (
        <SubscriptionDetailModal
          subscription={selectedSub}
          plans={plans}
          apiUrl={API_URL}
          onClose={() => setShowModal(false)}
          onUpdated={() => { setShowModal(false); fetchSubscriptions(); }}
        />
      )}
    </div>
  );
}

// ==================== MODAL DE DETALHES ====================

function SubscriptionDetailModal({ subscription, plans, apiUrl, onClose, onUpdated }: {
  subscription: Subscription;
  plans: Plan[];
  apiUrl: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [planId, setPlanId] = useState(subscription.plan.id);
  const [billingCycle, setBillingCycle] = useState(subscription.billingCycle);
  const [discountPercent, setDiscountPercent] = useState<number | ''>(subscription.discountPercent || '');
  const [discountNote, setDiscountNote] = useState('');
  const [notes, setNotes] = useState(subscription.notes || '');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/billing/subscriptions/${subscription.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          discountPercent: discountPercent || null,
          discountNote: discountNote || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) throw new Error('Erro ao salvar');
      onUpdated();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6,
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1e293b',
        borderRadius: 16,
        padding: 28,
        width: 500,
        maxWidth: '90vw',
        border: '1px solid #334155',
      }}>
        <h2 style={{ margin: '0 0 20px', color: '#f8fafc', fontSize: 20 }}>
          📋 Assinatura: {subscription.workspace.name}
        </h2>

        {/* Plano */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Plano</label>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            style={inputStyle}
          >
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Ciclo */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Ciclo de Cobrança</label>
          <select
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value as any)}
            style={inputStyle}
          >
            <option value="MONTHLY">Mensal</option>
            <option value="QUARTERLY">Trimestral</option>
            <option value="SEMIANNUAL">Semestral</option>
            <option value="ANNUAL">Anual</option>
          </select>
        </div>

        {/* Desconto */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Desconto (%)</label>
            <input
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="0"
              min={0}
              max={100}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Motivo do Desconto</label>
            <input
              type="text"
              value={discountNote}
              onChange={(e) => setDiscountNote(e.target.value)}
              placeholder="Ex: Parceiro"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Notas */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Observações Internas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'none' }}
            placeholder="Notas sobre este cliente..."
          />
        </div>

        {/* Botões */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 14,
              background: '#334155',
              border: 'none',
              borderRadius: 10,
              color: '#f8fafc',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              flex: 1,
              padding: 14,
              background: loading ? '#334155' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
