'use client';

import { useEffect, useState } from 'react';

interface BillingDashboard {
  subscriptions: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
  };
  invoices: {
    pendingCount: number;
    pendingAmount: number;
    paidThisMonth: number;
    revenueThisMonth: number;
  };
  mrr: number;
  revenueByPlan: Array<{
    planId: string;
    name: string;
    subscriptions: number;
  }>;
}

interface PendingPayment {
  id: string;
  createdAt: string;
  amountCents: number;
  billingCycle: string;
  status: string;
  expiresAt: string;
  workspace: { id: string; name: string; slug: string };
  plan: { id: string; name: string };
}

export default function AdminBillingSettingsPage() {
  const [dashboard, setDashboard] = useState<BillingDashboard | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payments' | 'pix' | 'config'>('dashboard');

  // Form states
  const [pixKeyType, setPixKeyType] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixHolderName, setPixHolderName] = useState('');
  const [pixCity, setPixCity] = useState('');
  const [gracePeriodDays, setGracePeriodDays] = useState('7');
  const [autoSuspendDays, setAutoSuspendDays] = useState('30');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchSettings(), fetchPendingPayments()]).finally(() => setLoading(false));
  }, []);

  async function fetchDashboard() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/billing/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchPendingPayments() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/billing/payment/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingPayments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function confirmPayment(intentId: string) {
    setConfirmingId(intentId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/billing/payment/confirm/${intentId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erro ao confirmar');
      }
      alert('Pagamento confirmado com sucesso!');
      fetchPendingPayments();
      fetchDashboard();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConfirmingId(null);
    }
  }

  async function fetchSettings() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/billing/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        // Populate form
        setPixKeyType(data['payment.pix_key_type'] || '');
        setPixKey(data['payment.pix_key'] || '');
        setPixHolderName(data['payment.pix_holder_name'] || '');
        setPixCity(data['payment.pix_city'] || '');
        setGracePeriodDays(data['billing.grace_period_days'] || '7');
        setAutoSuspendDays(data['billing.auto_suspend_days'] || '30');
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/billing/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'payment.pix_key_type': pixKeyType,
          'payment.pix_key': pixKey,
          'payment.pix_holder_name': pixHolderName,
          'payment.pix_city': pixCity,
          'billing.grace_period_days': gracePeriodDays,
          'billing.auto_suspend_days': autoSuspendDays,
        }),
      });

      if (!res.ok) throw new Error('Erro ao salvar');
      alert('Configurações salvas com sucesso!');
      fetchSettings();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 10,
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: 500 as const,
  };

  const tabStyle = (active: boolean) => ({
    padding: '12px 24px',
    background: active ? '#334155' : 'transparent',
    border: 'none',
    borderRadius: 8,
    color: active ? '#f8fafc' : '#64748b',
    fontSize: 14,
    fontWeight: 600 as const,
    cursor: 'pointer',
  });

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
        Carregando...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f8fafc' }}>
          Billing & Configurações
        </h1>
        <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 15 }}>
          Dashboard de receita e configurações de pagamento
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setActiveTab('dashboard')} style={tabStyle(activeTab === 'dashboard')}>
          📊 Dashboard
        </button>
        <button onClick={() => setActiveTab('payments')} style={tabStyle(activeTab === 'payments')}>
          💳 Pagamentos Pendentes
          {pendingPayments.length > 0 && (
            <span style={{
              marginLeft: 8,
              padding: '2px 8px',
              background: '#f59e0b',
              color: '#0f172a',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
            }}>
              {pendingPayments.length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('pix')} style={tabStyle(activeTab === 'pix')}>
          💠 PIX do Sistema
        </button>
        <button onClick={() => setActiveTab('config')} style={tabStyle(activeTab === 'config')}>
          ⚙️ Configurações
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboard && (
        <div>
          {/* Métricas principais */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            {/* MRR */}
            <div style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid #10b981',
            }}>
              <div style={{ color: '#6ee7b7', fontSize: 13, marginBottom: 8 }}>
                💰 MRR (Receita Mensal)
              </div>
              <div style={{ color: '#f8fafc', fontSize: 32, fontWeight: 700 }}>
                {formatPrice(dashboard.mrr)}
              </div>
            </div>

            {/* Receita do mês */}
            <div style={{
              background: '#1e293b',
              borderRadius: 16,
              padding: 24,
              border: '1px solid #334155',
            }}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
                📈 Receita Este Mês
              </div>
              <div style={{ color: '#10b981', fontSize: 28, fontWeight: 700 }}>
                {formatPrice(dashboard.invoices.revenueThisMonth)}
              </div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                {dashboard.invoices.paidThisMonth} faturas pagas
              </div>
            </div>

            {/* Pendente */}
            <div style={{
              background: '#1e293b',
              borderRadius: 16,
              padding: 24,
              border: '1px solid #334155',
            }}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
                ⏳ Valor Pendente
              </div>
              <div style={{ color: '#f59e0b', fontSize: 28, fontWeight: 700 }}>
                {formatPrice(dashboard.invoices.pendingAmount)}
              </div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                {dashboard.invoices.pendingCount} faturas
              </div>
            </div>

            {/* Total assinantes */}
            <div style={{
              background: '#1e293b',
              borderRadius: 16,
              padding: 24,
              border: '1px solid #334155',
            }}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
                👥 Assinantes
              </div>
              <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 700 }}>
                {dashboard.subscriptions.total}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 11 }}>
                <span style={{ color: '#10b981' }}>✓ {dashboard.subscriptions.active} ativos</span>
                <span style={{ color: '#f59e0b' }}>🎁 {dashboard.subscriptions.trial} trial</span>
                <span style={{ color: '#ef4444' }}>⚠️ {dashboard.subscriptions.suspended}</span>
              </div>
            </div>
          </div>

          {/* Receita por plano */}
          <div style={{
            background: '#1e293b',
            borderRadius: 16,
            padding: 24,
            border: '1px solid #334155',
          }}>
            <h3 style={{ margin: '0 0 20px', color: '#f8fafc', fontSize: 16 }}>
              📊 Distribuição por Plano
            </h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {dashboard.revenueByPlan.map((item) => (
                <div
                  key={item.planId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: '#0f172a',
                    borderRadius: 10,
                  }}
                >
                  <span style={{ color: '#f8fafc', fontWeight: 500 }}>{item.name}</span>
                  <span style={{
                    padding: '4px 12px',
                    background: '#334155',
                    borderRadius: 20,
                    color: '#94a3b8',
                    fontSize: 13,
                  }}>
                    {item.subscriptions} assinantes
                  </span>
                </div>
              ))}
              {dashboard.revenueByPlan.length === 0 && (
                <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>
                  Nenhum plano ativo
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab - Pagamentos Pendentes */}
      {activeTab === 'payments' && (
        <div style={{
          background: '#1e293b',
          borderRadius: 16,
          padding: 28,
          border: '1px solid #334155',
        }}>
          <h3 style={{ margin: '0 0 24px', color: '#f8fafc', fontSize: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            💳 Pagamentos PIX Pendentes
            <button
              onClick={fetchPendingPayments}
              style={{
                padding: '6px 12px',
                background: '#334155',
                border: 'none',
                borderRadius: 6,
                color: '#94a3b8',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              🔄 Atualizar
            </button>
          </h3>

          {pendingPayments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <p style={{ fontSize: 16 }}>Nenhum pagamento pendente</p>
              <p style={{ fontSize: 13 }}>Todos os pagamentos foram confirmados</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {pendingPayments.map((payment) => {
                const isExpired = new Date(payment.expiresAt) < new Date();
                return (
                  <div
                    key={payment.id}
                    style={{
                      background: '#0f172a',
                      borderRadius: 12,
                      padding: 20,
                      border: isExpired ? '1px solid #dc2626' : '1px solid #334155',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ color: '#f8fafc', fontSize: 16, fontWeight: 600 }}>
                            {payment.workspace.name}
                          </span>
                          {isExpired && (
                            <span style={{
                              padding: '2px 8px',
                              background: '#7f1d1d',
                              color: '#fecaca',
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 600,
                            }}>
                              EXPIRADO
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
                          Plano: <strong style={{ color: '#f59e0b' }}>{payment.plan.name}</strong>
                          {' • '}
                          Ciclo: {payment.billingCycle === 'MONTHLY' ? 'Mensal' : 
                                   payment.billingCycle === 'QUARTERLY' ? 'Trimestral' :
                                   payment.billingCycle === 'SEMIANNUAL' ? 'Semestral' : 'Anual'}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 12 }}>
                          Criado em: {new Date(payment.createdAt).toLocaleString('pt-BR')}
                          {' • '}
                          Expira em: {new Date(payment.expiresAt).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>
                          {formatPrice(payment.amountCents)}
                        </div>
                        <button
                          onClick={() => confirmPayment(payment.id)}
                          disabled={confirmingId === payment.id || isExpired}
                          style={{
                            marginTop: 12,
                            padding: '10px 20px',
                            background: isExpired 
                              ? '#334155' 
                              : confirmingId === payment.id 
                                ? '#334155'
                                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            borderRadius: 8,
                            color: isExpired || confirmingId === payment.id ? '#64748b' : 'white',
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: isExpired || confirmingId === payment.id ? 'default' : 'pointer',
                          }}
                        >
                          {confirmingId === payment.id 
                            ? '⏳ Confirmando...' 
                            : isExpired 
                              ? 'Expirado'
                              : '✓ Confirmar Pagamento'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{
            marginTop: 24,
            padding: 16,
            background: '#0f172a',
            borderRadius: 12,
            border: '1px solid #334155',
          }}>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
              ℹ️ <strong>Importante:</strong> Verifique se o pagamento PIX foi recebido na sua conta antes de confirmar. 
              Após confirmação, o plano do workspace será ativado automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* PIX Tab */}
      {activeTab === 'pix' && (
        <div style={{
          background: '#1e293b',
          borderRadius: 16,
          padding: 28,
          border: '1px solid #334155',
          maxWidth: 600,
        }}>
          <h3 style={{ margin: '0 0 24px', color: '#f8fafc', fontSize: 18 }}>
            💠 Configuração PIX do Sistema
          </h3>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
            Configure os dados da sua chave PIX para receber pagamentos de assinaturas.
          </p>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Tipo da Chave PIX</label>
            <select
              value={pixKeyType}
              onChange={(e) => setPixKeyType(e.target.value)}
              style={inputStyle}
            >
              <option value="">Selecione...</option>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="EMAIL">E-mail</option>
              <option value="PHONE">Telefone</option>
              <option value="RANDOM">Chave Aleatória</option>
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Chave PIX</label>
            <input
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="Sua chave PIX"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Nome do Titular</label>
            <input
              type="text"
              value={pixHolderName}
              onChange={(e) => setPixHolderName(e.target.value)}
              placeholder="Nome completo ou razão social"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Cidade</label>
            <input
              type="text"
              value={pixCity}
              onChange={(e) => setPixCity(e.target.value)}
              placeholder="Cidade do estabelecimento"
              style={inputStyle}
            />
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              width: '100%',
              padding: 16,
              background: saving ? '#334155' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontWeight: 600,
              fontSize: 15,
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Salvando...' : '💾 Salvar Configurações PIX'}
          </button>
        </div>
      )}

      {/* Config Tab */}
      {activeTab === 'config' && (
        <div style={{
          background: '#1e293b',
          borderRadius: 16,
          padding: 28,
          border: '1px solid #334155',
          maxWidth: 600,
        }}>
          <h3 style={{ margin: '0 0 24px', color: '#f8fafc', fontSize: 18 }}>
            ⚙️ Configurações de Cobrança
          </h3>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Período de Carência (dias)</label>
            <input
              type="number"
              value={gracePeriodDays}
              onChange={(e) => setGracePeriodDays(e.target.value)}
              min={0}
              max={30}
              style={inputStyle}
            />
            <p style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
              Dias após o vencimento antes de marcar como "atrasado"
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Suspensão Automática (dias)</label>
            <input
              type="number"
              value={autoSuspendDays}
              onChange={(e) => setAutoSuspendDays(e.target.value)}
              min={0}
              max={90}
              style={inputStyle}
            />
            <p style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
              Dias após o vencimento para suspender automaticamente (0 = manual)
            </p>
          </div>

          <div style={{
            background: '#0f172a',
            borderRadius: 10,
            padding: 16,
            marginBottom: 24,
            border: '1px solid #334155',
          }}>
            <div style={{ color: '#f59e0b', fontSize: 13, marginBottom: 8 }}>
              🚧 Em desenvolvimento
            </div>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
              Integração com gateways de pagamento (Stripe, PagSeguro) estará disponível em breve.
              Por enquanto, os pagamentos são confirmados manualmente.
            </p>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              width: '100%',
              padding: 16,
              background: saving ? '#334155' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontWeight: 600,
              fontSize: 15,
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Salvando...' : '💾 Salvar Configurações'}
          </button>
        </div>
      )}
    </div>
  );
}
