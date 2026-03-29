'use client';

import { useEffect, useState, useCallback } from 'react';

// ========================= TYPES =========================

interface BillingDashboard {
  subscriptions: { total: number; active: number; trial: number; suspended: number };
  invoices: { pendingCount: number; pendingAmount: number; paidThisMonth: number; revenueThisMonth: number };
  sponsors: {
    total: number; active: number; activeContracts: number;
    pendingCount: number; pendingAmount: number;
    paidThisMonth: number; revenueThisMonth: number; mrr: number;
  };
  mrr: number;
  revenueByPlan: Array<{ planId: string; name: string; subscriptions: number }>;
}

interface PendingPayment {
  id: string; createdAt: string; amountCents: number; billingCycle: string;
  status: string; expiresAt: string;
  workspace: { id: string; name: string; slug: string };
  plan: { id: string; name: string };
}

interface SponsorPendingPayment {
  id: string; sponsorName: string; sponsorEmail: string; contractNumber: string;
  tier: string; durationMonths: number; amountCents: number; amountFormatted: string;
  pixExpiresAt: string | null; pixExpired: boolean; createdAt: string;
}

interface HistoryItem {
  id: string; type: 'subscription' | 'sponsor'; description: string;
  amountCents: number; status: string; paidAt: string | null; createdAt: string;
  metadata: Record<string, any>;
}

// ========================= THEME =========================

const T = {
  bg: '#0f172a', surface: '#1e293b', surface2: '#0f172a',
  border: '#334155', borderLight: '#475569',
  text: '#f8fafc', textSec: '#94a3b8', textMuted: '#64748b',
  green: '#10b981', greenDark: '#064e3b', greenLight: '#6ee7b7',
  gold: '#f59e0b', goldDark: '#78350f', goldLight: '#fbbf24',
  red: '#ef4444', redDark: '#7f1d1d', redLight: '#fecaca',
  blue: '#3b82f6', blueDark: '#1e3a5f', blueLight: '#93c5fd',
  purple: '#8b5cf6', purpleDark: '#4c1d95', purpleLight: '#c4b5fd',
};

// ========================= COMPONENT =========================

export default function AdminBillingPage() {
  const [dashboard, setDashboard] = useState<BillingDashboard | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [sponsorPayments, setSponsorPayments] = useState<SponsorPendingPayment[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'subscription' | 'sponsor'>('all');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'sponsors' | 'history' | 'settings'>('overview');

  // PIX form
  const [pixKeyType, setPixKeyType] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixHolderName, setPixHolderName] = useState('');
  const [pixCity, setPixCity] = useState('');
  const [gracePeriodDays, setGracePeriodDays] = useState('7');
  const [autoSuspendDays, setAutoSuspendDays] = useState('30');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  const getToken = () => localStorage.getItem('token') || '';

  // ========================= FETCHERS =========================

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/billing/dashboard`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) setDashboard(await res.json());
    } catch { /* ignore */ }
  }, [API_URL]);

  const fetchPendingPayments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/billing/payment/pending`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) { const d = await res.json(); setPendingPayments(Array.isArray(d) ? d : []); }
    } catch { /* ignore */ }
  }, [API_URL]);

  const fetchSponsorPayments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/sponsor-payments/pending`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) { const d = await res.json(); setSponsorPayments(Array.isArray(d) ? d : []); }
    } catch { /* ignore */ }
  }, [API_URL]);

  const fetchHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(historyPage), limit: '15' });
      if (historyFilter !== 'all') params.set('type', historyFilter);
      const res = await fetch(`${API_URL}/billing/payment-history?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const d = await res.json();
        setHistory(Array.isArray(d.items) ? d.items : []);
        setHistoryTotal(d.pagination?.totalPages || 1);
      }
    } catch { /* ignore */ }
  }, [API_URL, historyPage, historyFilter]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/billing/settings`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setPixKeyType(data['payment.pix_key_type'] || '');
        setPixKey(data['payment.pix_key'] || '');
        setPixHolderName(data['payment.pix_holder_name'] || '');
        setPixCity(data['payment.pix_city'] || '');
        setGracePeriodDays(data['billing.grace_period_days'] || '7');
        setAutoSuspendDays(data['billing.auto_suspend_days'] || '30');
      }
    } catch { /* ignore */ }
  }, [API_URL]);

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchPendingPayments(), fetchSponsorPayments(), fetchSettings()])
      .finally(() => setLoading(false));
  }, [fetchDashboard, fetchPendingPayments, fetchSponsorPayments, fetchSettings]);

  useEffect(() => { if (activeTab === 'history') fetchHistory(); }, [activeTab, fetchHistory]);

  // ========================= ACTIONS =========================

  async function confirmSubscriptionPayment(intentId: string) {
    setConfirmingId(intentId);
    try {
      const res = await fetch(`${API_URL}/billing/payment/confirm/${intentId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Erro'); }
      alert('Pagamento confirmado!');
      fetchPendingPayments(); fetchDashboard();
    } catch (err: any) { alert(err.message); }
    finally { setConfirmingId(null); }
  }

  async function deletePaymentIntent(intentId: string) {
    if (!confirm('Tem certeza que deseja excluir este pagamento?')) return;
    try {
      const res = await fetch(`${API_URL}/billing/payment/${intentId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Erro'); }
      fetchPendingPayments(); fetchDashboard();
    } catch (err: any) { alert(err.message); }
  }

  async function confirmSponsorPayment(paymentId: string) {
    const name = prompt('Nome de quem pagou:');
    if (!name) return;
    const txId = prompt('ID da transação (opcional):') || '';
    setConfirmingId(paymentId);
    try {
      const res = await fetch(`${API_URL}/admin/sponsor-payments/${paymentId}/confirm`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidByName: name, transactionId: txId }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Erro'); }
      alert('Pagamento do patrocinador confirmado!');
      fetchSponsorPayments(); fetchDashboard();
    } catch (err: any) { alert(err.message); }
    finally { setConfirmingId(null); }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/billing/settings`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'payment.pix_key_type': pixKeyType, 'payment.pix_key': pixKey,
          'payment.pix_holder_name': pixHolderName, 'payment.pix_city': pixCity,
          'billing.grace_period_days': gracePeriodDays, 'billing.auto_suspend_days': autoSuspendDays,
        }),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      alert('Configurações salvas!'); fetchSettings();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  }

  // ========================= HELPERS =========================

  const fmt = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  const isExpired = (date: string) => new Date(date) < new Date();
  const totalPending = pendingPayments.length + sponsorPayments.length;

  const cycleName: Record<string, string> = { MONTHLY: 'Mensal', QUARTERLY: 'Trimestral', SEMIANNUAL: 'Semestral', ANNUAL: 'Anual' };
  const tierColors: Record<string, { bg: string; text: string }> = {
    DIAMOND: { bg: '#312e81', text: '#c4b5fd' }, GOLD: { bg: '#78350f', text: '#fbbf24' },
    SILVER: { bg: '#374151', text: '#d1d5db' }, BRONZE: { bg: '#451a03', text: '#fdba74' },
  };

  // ========================= STYLES =========================

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: T.surface2, border: `1px solid ${T.border}`,
    borderRadius: 10, color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { display: 'block', color: T.textSec, fontSize: 13, marginBottom: 6, fontWeight: 500 };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: T.textMuted }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${T.border}`, borderTopColor: T.green, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        Carregando dados financeiros...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* ===== HEADER ===== */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 12 }}>
          💰 Central Financeira
        </h1>
        <p style={{ margin: '8px 0 0', color: T.textSec, fontSize: 15 }}>
          Controle unificado de receitas — assinaturas, patrocinadores e pagamentos
        </p>
      </div>

      {/* ===== TABS ===== */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {([
          { key: 'overview', label: '📊 Visão Geral', badge: 0 },
          { key: 'subscriptions', label: '💳 Assinaturas', badge: pendingPayments.length },
          { key: 'sponsors', label: '🤝 Patrocínios', badge: sponsorPayments.length },
          { key: 'history', label: '📋 Histórico', badge: 0 },
          { key: 'settings', label: '⚙️ Configurações', badge: 0 },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', background: activeTab === tab.key ? T.border : 'transparent',
              border: 'none', borderRadius: 8, color: activeTab === tab.key ? T.text : T.textMuted,
              fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span style={{
                padding: '2px 8px', background: T.gold, color: T.bg,
                borderRadius: 10, fontSize: 11, fontWeight: 700,
              }}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* TAB: VISÃO GERAL                                             */}
      {/* ============================================================ */}
      {activeTab === 'overview' && dashboard && (
        <div>
          {/* --- Métricas Principais --- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            {/* MRR Total */}
            <div style={{ background: `linear-gradient(135deg, ${T.greenDark} 0%, #022c22 100%)`, borderRadius: 16, padding: 24, border: `1px solid ${T.green}` }}>
              <div style={{ color: T.greenLight, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' as const }}>
                MRR Total (Recorrente)
              </div>
              <div style={{ color: T.text, fontSize: 34, fontWeight: 700 }}>{fmt(dashboard.mrr)}</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11 }}>
                <span style={{ color: T.greenLight }}>💳 {fmt(dashboard.mrr - (dashboard.sponsors?.mrr || 0))} assinaturas</span>
                <span style={{ color: T.purpleLight }}>🤝 {fmt(dashboard.sponsors?.mrr || 0)} sponsors</span>
              </div>
            </div>

            {/* Receita este mês */}
            <div style={{ background: T.surface, borderRadius: 16, padding: 24, border: `1px solid ${T.border}` }}>
              <div style={{ color: T.textSec, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' as const }}>
                Receita Este Mês
              </div>
              <div style={{ color: T.green, fontSize: 28, fontWeight: 700 }}>
                {fmt((dashboard.invoices.revenueThisMonth || 0) + (dashboard.sponsors?.revenueThisMonth || 0))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11 }}>
                <span style={{ color: T.textSec }}>{dashboard.invoices.paidThisMonth + (dashboard.sponsors?.paidThisMonth || 0)} pagamentos</span>
              </div>
            </div>

            {/* Pendente Total */}
            <div style={{ background: T.surface, borderRadius: 16, padding: 24, border: `1px solid ${T.border}` }}>
              <div style={{ color: T.textSec, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' as const }}>
                Valor Pendente
              </div>
              <div style={{ color: T.gold, fontSize: 28, fontWeight: 700 }}>
                {fmt((dashboard.invoices.pendingAmount || 0) + (dashboard.sponsors?.pendingAmount || 0))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11 }}>
                <span style={{ color: T.textSec }}>{totalPending} pagamentos aguardando</span>
              </div>
            </div>

            {/* Clientes Ativos */}
            <div style={{ background: T.surface, borderRadius: 16, padding: 24, border: `1px solid ${T.border}` }}>
              <div style={{ color: T.textSec, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' as const }}>
                Clientes Ativos
              </div>
              <div style={{ color: T.text, fontSize: 28, fontWeight: 700 }}>
                {dashboard.subscriptions.active + (dashboard.sponsors?.active || 0)}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 11, flexWrap: 'wrap' as const }}>
                <span style={{ color: T.greenLight }}>💳 {dashboard.subscriptions.active} empresas</span>
                <span style={{ color: T.purpleLight }}>🤝 {dashboard.sponsors?.active || 0} sponsors</span>
                <span style={{ color: T.goldLight }}>🎁 {dashboard.subscriptions.trial} trial</span>
              </div>
            </div>
          </div>

          {/* --- Detalhamento: Assinaturas vs Sponsors --- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
            {/* Card Assinaturas */}
            <div style={{ background: T.surface, borderRadius: 16, padding: 24, border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: T.text }}>💳 Assinaturas SaaS</h3>
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 12px', color: T.textSec, fontSize: 12, cursor: 'pointer' }}
                >Ver pendentes →</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: T.surface2, borderRadius: 10, padding: 14 }}>
                  <div style={{ color: T.textMuted, fontSize: 11, marginBottom: 4 }}>Total</div>
                  <div style={{ color: T.text, fontSize: 22, fontWeight: 700 }}>{dashboard.subscriptions.total}</div>
                </div>
                <div style={{ background: T.surface2, borderRadius: 10, padding: 14 }}>
                  <div style={{ color: T.textMuted, fontSize: 11, marginBottom: 4 }}>Ativos</div>
                  <div style={{ color: T.green, fontSize: 22, fontWeight: 700 }}>{dashboard.subscriptions.active}</div>
                </div>
                <div style={{ background: T.surface2, borderRadius: 10, padding: 14 }}>
                  <div style={{ color: T.textMuted, fontSize: 11, marginBottom: 4 }}>Trial</div>
                  <div style={{ color: T.gold, fontSize: 22, fontWeight: 700 }}>{dashboard.subscriptions.trial}</div>
                </div>
                <div style={{ background: T.surface2, borderRadius: 10, padding: 14 }}>
                  <div style={{ color: T.textMuted, fontSize: 11, marginBottom: 4 }}>Suspensos</div>
                  <div style={{ color: T.red, fontSize: 22, fontWeight: 700 }}>{dashboard.subscriptions.suspended}</div>
                </div>
              </div>
              {/* Distribuição por plano */}
              <div style={{ marginTop: 16 }}>
                <div style={{ color: T.textSec, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Distribuição por Plano</div>
                {dashboard.revenueByPlan.map(p => (
                  <div key={p.planId} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: T.surface2, borderRadius: 8, marginBottom: 6,
                  }}>
                    <span style={{ color: T.text, fontWeight: 500, fontSize: 14 }}>{p.name}</span>
                    <span style={{ padding: '3px 10px', background: T.border, borderRadius: 20, color: T.textSec, fontSize: 12 }}>
                      {p.subscriptions} assinantes
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card Patrocinadores */}
            <div style={{ background: T.surface, borderRadius: 16, padding: 24, border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: T.text }}>🤝 Patrocínios</h3>
                <button
                  onClick={() => setActiveTab('sponsors')}
                  style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 12px', color: T.textSec, fontSize: 12, cursor: 'pointer' }}
                >Ver pendentes →</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: T.surface2, borderRadius: 10, padding: 14 }}>
                  <div style={{ color: T.textMuted, fontSize: 11, marginBottom: 4 }}>Total Sponsors</div>
                  <div style={{ color: T.text, fontSize: 22, fontWeight: 700 }}>{dashboard.sponsors?.total || 0}</div>
                </div>
                <div style={{ background: T.surface2, borderRadius: 10, padding: 14 }}>
                  <div style={{ color: T.textMuted, fontSize: 11, marginBottom: 4 }}>Ativos</div>
                  <div style={{ color: T.purple, fontSize: 22, fontWeight: 700 }}>{dashboard.sponsors?.active || 0}</div>
                </div>
                <div style={{ background: T.surface2, borderRadius: 10, padding: 14 }}>
                  <div style={{ color: T.textMuted, fontSize: 11, marginBottom: 4 }}>Contratos Ativos</div>
                  <div style={{ color: T.blue, fontSize: 22, fontWeight: 700 }}>{dashboard.sponsors?.activeContracts || 0}</div>
                </div>
                <div style={{ background: T.surface2, borderRadius: 10, padding: 14 }}>
                  <div style={{ color: T.textMuted, fontSize: 11, marginBottom: 4 }}>MRR Sponsors</div>
                  <div style={{ color: T.greenLight, fontSize: 18, fontWeight: 700 }}>{fmt(dashboard.sponsors?.mrr || 0)}</div>
                </div>
              </div>
              {/* Receita mês sponsors */}
              <div style={{ marginTop: 16, background: T.surface2, borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ color: T.textSec, fontSize: 13 }}>Receita Este Mês</span>
                  <span style={{ color: T.green, fontWeight: 700 }}>{fmt(dashboard.sponsors?.revenueThisMonth || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.textSec, fontSize: 13 }}>Pendente</span>
                  <span style={{ color: T.gold, fontWeight: 700 }}>{fmt(dashboard.sponsors?.pendingAmount || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* --- Alertas rápidos --- */}
          {totalPending > 0 && (
            <div style={{
              background: `linear-gradient(135deg, ${T.goldDark}30 0%, ${T.goldDark}10 100%)`,
              border: `1px solid ${T.gold}40`, borderRadius: 12, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{ fontSize: 28 }}>⏳</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: T.goldLight, fontWeight: 700, fontSize: 15 }}>
                  {totalPending} pagamento{totalPending > 1 ? 's' : ''} aguardando confirmação
                </div>
                <div style={{ color: T.textSec, fontSize: 13, marginTop: 2 }}>
                  {pendingPayments.length > 0 && `${pendingPayments.length} assinatura${pendingPayments.length > 1 ? 's' : ''}`}
                  {pendingPayments.length > 0 && sponsorPayments.length > 0 && ' + '}
                  {sponsorPayments.length > 0 && `${sponsorPayments.length} patrocínio${sponsorPayments.length > 1 ? 's' : ''}`}
                </div>
              </div>
              <button
                onClick={() => setActiveTab(pendingPayments.length > 0 ? 'subscriptions' : 'sponsors')}
                style={{
                  padding: '10px 18px', background: T.gold, color: T.bg,
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                Revisar →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: ASSINATURAS PENDENTES                                   */}
      {/* ============================================================ */}
      {activeTab === 'subscriptions' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ margin: 0, color: T.text, fontSize: 20, fontWeight: 600 }}>
              💳 PIX de Assinaturas Pendentes
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {pendingPayments.some(p => isExpired(p.expiresAt)) && (
                <button
                  onClick={async () => {
                    if (!confirm(`Excluir todos os ${pendingPayments.filter(p => isExpired(p.expiresAt)).length} pagamentos expirados?`)) return;
                    const expired = pendingPayments.filter(p => isExpired(p.expiresAt));
                    for (const p of expired) {
                      try {
                        await fetch(`${API_URL}/billing/payment/${p.id}`, {
                          method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
                        });
                      } catch { /* continue */ }
                    }
                    fetchPendingPayments(); fetchDashboard();
                  }}
                  style={{ padding: '8px 14px', background: T.redDark, border: 'none', borderRadius: 8, color: T.redLight, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                >
                  🗑️ Limpar expirados
                </button>
              )}
              <button onClick={fetchPendingPayments} style={{ padding: '8px 14px', background: T.border, border: 'none', borderRadius: 8, color: T.textSec, fontSize: 13, cursor: 'pointer' }}>
                🔄 Atualizar
              </button>
            </div>
          </div>

          {pendingPayments.length === 0 ? (
            <div style={{ background: T.surface, borderRadius: 16, padding: 48, textAlign: 'center', border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ color: T.text, fontSize: 16, fontWeight: 600 }}>Nenhum pagamento pendente</div>
              <div style={{ color: T.textMuted, fontSize: 13, marginTop: 4 }}>Todos os PIX foram confirmados</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {pendingPayments.map(p => {
                const expired = isExpired(p.expiresAt);
                return (
                  <div key={p.id} style={{
                    background: T.surface, borderRadius: 14, padding: 20,
                    border: `1px solid ${expired ? T.red + '50' : T.border}`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const,
                  }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ color: T.text, fontSize: 16, fontWeight: 600 }}>{p.workspace.name}</span>
                        {expired && <span style={{ padding: '2px 8px', background: T.redDark, color: T.redLight, borderRadius: 6, fontSize: 10, fontWeight: 600 }}>EXPIRADO</span>}
                      </div>
                      <div style={{ color: T.textSec, fontSize: 13 }}>
                        Plano: <strong style={{ color: T.gold }}>{p.plan.name}</strong> • {cycleName[p.billingCycle] || p.billingCycle}
                      </div>
                      <div style={{ color: T.textMuted, fontSize: 11, marginTop: 4 }}>
                        Criado: {fmtDateTime(p.createdAt)} • Expira: {fmtDateTime(p.expiresAt)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' as const }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: T.green }}>{fmt(p.amountCents)}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                        {expired && (
                          <button
                            onClick={() => deletePaymentIntent(p.id)}
                            style={{
                              padding: '8px 14px', border: 'none', borderRadius: 8,
                              background: T.redDark, color: T.redLight,
                              fontWeight: 600, fontSize: 13, cursor: 'pointer',
                            }}
                          >
                            🗑️ Excluir
                          </button>
                        )}
                        <button
                          onClick={() => confirmSubscriptionPayment(p.id)}
                          disabled={confirmingId === p.id || expired}
                          style={{
                            padding: '8px 18px', border: 'none', borderRadius: 8,
                            background: expired ? T.border : T.green, color: expired ? T.textMuted : '#fff',
                            fontWeight: 600, fontSize: 13, cursor: expired ? 'default' : 'pointer',
                          }}
                        >
                          {confirmingId === p.id ? '⏳...' : expired ? 'Expirado' : '✓ Confirmar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: PATROCÍNIOS PENDENTES                                   */}
      {/* ============================================================ */}
      {activeTab === 'sponsors' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ margin: 0, color: T.text, fontSize: 20, fontWeight: 600 }}>
              🤝 PIX de Patrocínios Pendentes
            </h2>
            <button onClick={fetchSponsorPayments} style={{ padding: '8px 14px', background: T.border, border: 'none', borderRadius: 8, color: T.textSec, fontSize: 13, cursor: 'pointer' }}>
              🔄 Atualizar
            </button>
          </div>

          {sponsorPayments.length === 0 ? (
            <div style={{ background: T.surface, borderRadius: 16, padding: 48, textAlign: 'center', border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ color: T.text, fontSize: 16, fontWeight: 600 }}>Nenhum pagamento pendente</div>
              <div style={{ color: T.textMuted, fontSize: 13, marginTop: 4 }}>Todos os patrocínios foram confirmados</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {sponsorPayments.map(sp => {
                const expired = sp.pixExpired || (sp.pixExpiresAt ? isExpired(sp.pixExpiresAt) : false);
                const tc = tierColors[sp.tier] || tierColors.BRONZE;
                return (
                  <div key={sp.id} style={{
                    background: T.surface, borderRadius: 14, padding: 20,
                    border: `1px solid ${expired ? T.red + '50' : T.border}`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const,
                  }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ color: T.text, fontSize: 16, fontWeight: 600 }}>{sp.sponsorName}</span>
                        <span style={{ padding: '2px 10px', background: tc.bg, color: tc.text, borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                          {sp.tier}
                        </span>
                        {expired && <span style={{ padding: '2px 8px', background: T.redDark, color: T.redLight, borderRadius: 6, fontSize: 10, fontWeight: 600 }}>EXPIRADO</span>}
                      </div>
                      <div style={{ color: T.textSec, fontSize: 13 }}>
                        Contrato: {sp.contractNumber} • {sp.durationMonths} meses
                      </div>
                      <div style={{ color: T.textMuted, fontSize: 11, marginTop: 4 }}>
                        {sp.sponsorEmail} • Criado: {fmtDateTime(sp.createdAt)}
                        {sp.pixExpiresAt && ` • Expira: ${fmtDateTime(sp.pixExpiresAt)}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' as const }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: T.purple }}>{sp.amountFormatted}</div>
                      <button
                        onClick={() => confirmSponsorPayment(sp.id)}
                        disabled={!!confirmingId || !!expired}
                        style={{
                          marginTop: 8, padding: '8px 18px', border: 'none', borderRadius: 8,
                          background: expired ? T.border : T.purple, color: expired ? T.textMuted : '#fff',
                          fontWeight: 600, fontSize: 13, cursor: expired ? 'default' : 'pointer',
                        }}
                      >
                        {confirmingId === sp.id ? '⏳...' : expired ? 'Expirado' : '✓ Confirmar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: HISTÓRICO                                               */}
      {/* ============================================================ */}
      {activeTab === 'history' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap' as const, gap: 12 }}>
            <h2 style={{ margin: 0, color: T.text, fontSize: 20, fontWeight: 600 }}>
              📋 Histórico de Pagamentos
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'subscription', 'sponsor'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setHistoryFilter(f); setHistoryPage(1); }}
                  style={{
                    padding: '6px 14px', border: 'none', borderRadius: 6,
                    background: historyFilter === f ? T.border : 'transparent',
                    color: historyFilter === f ? T.text : T.textMuted,
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  {f === 'all' ? 'Todos' : f === 'subscription' ? '💳 Assinaturas' : '🤝 Patrocínios'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            {history.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: T.textMuted }}>
                Nenhum pagamento registrado
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      <th style={{ padding: '14px 16px', textAlign: 'left' as const, color: T.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const }}>Data</th>
                      <th style={{ padding: '14px 16px', textAlign: 'left' as const, color: T.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const }}>Tipo</th>
                      <th style={{ padding: '14px 16px', textAlign: 'left' as const, color: T.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const }}>Descrição</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' as const, color: T.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(item => (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${T.surface2}` }}>
                        <td style={{ padding: '12px 16px', color: T.text, fontSize: 13 }}>
                          {item.paidAt ? fmtDate(item.paidAt) : fmtDate(item.createdAt)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: item.type === 'subscription' ? T.blueDark : T.purpleDark,
                            color: item.type === 'subscription' ? T.blueLight : T.purpleLight,
                          }}>
                            {item.type === 'subscription' ? '💳 Assinatura' : '🤝 Patrocínio'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: T.text, fontSize: 13 }}>
                          {item.description}
                          {item.metadata?.billingCycle && (
                            <span style={{ color: T.textMuted, fontSize: 11, marginLeft: 8 }}>
                              ({cycleName[item.metadata.billingCycle] || item.metadata.billingCycle})
                            </span>
                          )}
                          {item.metadata?.tier && (
                            <span style={{
                              marginLeft: 8, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                              ...(tierColors[item.metadata.tier] ? { background: tierColors[item.metadata.tier].bg, color: tierColors[item.metadata.tier].text } : { background: T.border, color: T.textSec }),
                            }}>
                              {item.metadata.tier}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' as const, color: T.green, fontWeight: 700, fontSize: 14 }}>
                          {fmt(item.amountCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {historyTotal > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16, borderTop: `1px solid ${T.border}` }}>
                <button
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  style={{ padding: '6px 12px', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, color: T.textSec, cursor: historyPage === 1 ? 'default' : 'pointer' }}
                >←</button>
                <span style={{ padding: '6px 12px', color: T.textSec, fontSize: 13 }}>
                  {historyPage} / {historyTotal}
                </span>
                <button
                  onClick={() => setHistoryPage(p => Math.min(historyTotal, p + 1))}
                  disabled={historyPage >= historyTotal}
                  style={{ padding: '6px 12px', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, color: T.textSec, cursor: historyPage >= historyTotal ? 'default' : 'pointer' }}
                >→</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: CONFIGURAÇÕES (PIX + billing config merged)             */}
      {/* ============================================================ */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          {/* PIX Config */}
          <div style={{ background: T.surface, borderRadius: 16, padding: 28, border: `1px solid ${T.border}` }}>
            <h3 style={{ margin: '0 0 20px', color: T.text, fontSize: 18, fontWeight: 600 }}>💠 Chave PIX do Sistema</h3>
            <p style={{ color: T.textSec, fontSize: 13, marginBottom: 20 }}>
              Dados PIX usados para todos os pagamentos da plataforma (assinaturas e patrocínios).
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Tipo da Chave</label>
              <select value={pixKeyType} onChange={e => setPixKeyType(e.target.value)} style={inputStyle}>
                <option value="">Selecione...</option>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="PHONE">Telefone</option>
                <option value="RANDOM">Chave Aleatória</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Chave PIX</label>
              <input type="text" value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="Sua chave PIX" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nome do Titular</label>
              <input type="text" value={pixHolderName} onChange={e => setPixHolderName(e.target.value)} placeholder="Nome ou razão social" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Cidade</label>
              <input type="text" value={pixCity} onChange={e => setPixCity(e.target.value)} placeholder="Cidade" style={inputStyle} />
            </div>

            {/* PIX Status */}
            <div style={{
              background: pixKey ? T.greenDark + '40' : T.redDark + '40',
              border: `1px solid ${pixKey ? T.green + '30' : T.red + '30'}`,
              borderRadius: 10, padding: 14, marginBottom: 20,
            }}>
              <div style={{ color: pixKey ? T.greenLight : T.redLight, fontSize: 13, fontWeight: 600 }}>
                {pixKey ? '✅ PIX configurado' : '❌ PIX não configurado'}
              </div>
              <div style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>
                {pixKey ? `${pixKeyType} • ${pixKey.slice(0, 8)}...` : 'Configure a chave PIX para receber pagamentos'}
              </div>
            </div>
          </div>

          {/* Billing Config */}
          <div style={{ background: T.surface, borderRadius: 16, padding: 28, border: `1px solid ${T.border}` }}>
            <h3 style={{ margin: '0 0 20px', color: T.text, fontSize: 18, fontWeight: 600 }}>⚙️ Regras de Cobrança</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Período de Carência (dias)</label>
              <input type="number" value={gracePeriodDays} onChange={e => setGracePeriodDays(e.target.value)} min={0} max={30} style={inputStyle} />
              <p style={{ color: T.textMuted, fontSize: 12, marginTop: 4 }}>
                Dias após vencimento antes de marcar como atrasado
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Suspensão Automática (dias)</label>
              <input type="number" value={autoSuspendDays} onChange={e => setAutoSuspendDays(e.target.value)} min={0} max={90} style={inputStyle} />
              <p style={{ color: T.textMuted, fontSize: 12, marginTop: 4 }}>
                Dias para suspender automaticamente (0 = manual)
              </p>
            </div>

            <div style={{ background: T.surface2, borderRadius: 10, padding: 16, marginBottom: 20, border: `1px solid ${T.border}` }}>
              <div style={{ color: T.gold, fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' as const }}>
                Roadmap
              </div>
              <div style={{ color: T.textSec, fontSize: 13 }}>
                Integração com gateways (Stripe, MercadoPago) em desenvolvimento. Pagamentos atualmente via PIX com confirmação manual.
              </div>
            </div>

            <button
              onClick={saveSettings}
              disabled={saving}
              style={{
                width: '100%', padding: 14, border: 'none', borderRadius: 10,
                background: saving ? T.border : `linear-gradient(135deg, ${T.green} 0%, #059669 100%)`,
                color: '#fff', fontWeight: 600, fontSize: 15, cursor: saving ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Salvando...' : '💾 Salvar Todas as Configurações'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
