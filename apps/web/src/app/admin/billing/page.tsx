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

export default function AdminBillingSettingsPage() {
  const [dashboard, setDashboard] = useState<BillingDashboard | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pix' | 'config'>('dashboard');

  // Form states
  const [pixKeyType, setPixKeyType] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixHolderName, setPixHolderName] = useState('');
  const [pixCity, setPixCity] = useState('');
  const [gracePeriodDays, setGracePeriodDays] = useState('7');
  const [autoSuspendDays, setAutoSuspendDays] = useState('30');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchSettings()]).finally(() => setLoading(false));
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
