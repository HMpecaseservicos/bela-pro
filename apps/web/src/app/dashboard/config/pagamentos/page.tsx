'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type PaymentType = 'NONE' | 'FULL' | 'PARTIAL_PERCENT' | 'PARTIAL_FIXED';
type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';

interface PaymentSettings {
  requirePayment: boolean;
  paymentType: PaymentType;
  partialPercent: number | null;
  partialFixedAmount: number | null;
  pixKeyType: PixKeyType | null;
  pixKey: string;
  pixHolderName: string;
  paymentExpiryMinutes: number;
}

const paymentTypeLabels: Record<PaymentType, string> = {
  NONE: 'Nenhum',
  FULL: 'Valor Total',
  PARTIAL_PERCENT: 'Porcentagem do Valor',
  PARTIAL_FIXED: 'Valor Fixo',
};

const pixKeyTypeLabels: Record<PixKeyType, string> = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  EMAIL: 'E-mail',
  PHONE: 'Telefone',
  RANDOM: 'Chave Aleatória',
};

export default function PagamentosPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<PaymentSettings>({
    requirePayment: false,
    paymentType: 'NONE',
    partialPercent: null,
    partialFixedAmount: null,
    pixKeyType: null,
    pixKey: '',
    pixHolderName: '',
    paymentExpiryMinutes: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // For input field (R$)
  const [partialFixedReais, setPartialFixedReais] = useState('');

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch(`${API_URL}/payments/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Erro ao carregar configurações de pagamento');
      }

      const data = await res.json();
      setSettings({
        requirePayment: data.requirePayment ?? false,
        paymentType: data.paymentType ?? 'NONE',
        partialPercent: data.partialPercent ?? null,
        partialFixedAmount: data.partialFixedAmount ?? null,
        pixKeyType: data.pixKeyType ?? null,
        pixKey: data.pixKey ?? '',
        pixHolderName: data.pixHolderName ?? '',
        paymentExpiryMinutes: data.paymentExpiryMinutes ?? 30,
      });

      // Convert to reais for display
      if (data.partialFixedAmount) {
        setPartialFixedReais(data.partialFixedAmount.toFixed(2).replace('.', ','));
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError('Erro ao carregar configurações de pagamento');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Validate required fields when payment is enabled
      if (settings.requirePayment) {
        if (settings.paymentType === 'NONE') {
          setError('Selecione um tipo de pagamento');
          setSaving(false);
          return;
        }

        if (settings.paymentType === 'PARTIAL_PERCENT' && !settings.partialPercent) {
          setError('Informe a porcentagem do valor');
          setSaving(false);
          return;
        }

        if (settings.paymentType === 'PARTIAL_FIXED' && !settings.partialFixedAmount) {
          setError('Informe o valor fixo');
          setSaving(false);
          return;
        }

        if (!settings.pixKeyType || !settings.pixKey) {
          setError('Configure a chave PIX');
          setSaving(false);
          return;
        }

        if (!settings.pixHolderName) {
          setError('Informe o nome do titular PIX');
          setSaving(false);
          return;
        }
      }

      const res = await fetch(`${API_URL}/payments/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao salvar configurações');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      setError(err.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  function handlePartialFixedChange(value: string) {
    // Allow only numbers and one comma/period
    const cleaned = value.replace(/[^\d,\.]/g, '').replace('.', ',');
    setPartialFixedReais(cleaned);

    // Convert to number (reais)
    const parts = cleaned.split(',');
    const reais = parseInt(parts[0] || '0');
    const centavos = parseInt((parts[1] || '0').padEnd(2, '0').slice(0, 2));
    const totalReais = reais + (centavos / 100);

    setSettings(prev => ({ ...prev, partialFixedAmount: totalReais || null }));
  }

  if (loading) {
    return (
      <div style={{ padding: isMobile ? 16 : 32, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 16 }}>⏳</div>
          <p style={{ color: '#64748b' }}>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 800 }}>
      {/* Header with Back Button */}
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <button
          onClick={() => router.push('/dashboard/config')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: 0,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          ← Voltar para Configurações
        </button>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>
          💳 Pagamentos
        </h1>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: isMobile ? 13 : 15 }}>
          Configure o pagamento PIX para confirmação de agendamentos
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          color: '#dc2626',
          fontSize: 14,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Enable Payment Toggle */}
      <div style={{
        background: 'white',
        borderRadius: isMobile ? 12 : 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: isMobile ? 16 : 24,
        marginBottom: isMobile ? 16 : 24,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4, fontSize: 16 }}>
              Exigir Pagamento para Confirmar
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Quando ativado, o cliente precisa pagar via PIX para confirmar o agendamento
            </div>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, requirePayment: !prev.requirePayment }))}
            style={{
              width: 56,
              height: 32,
              borderRadius: 16,
              border: 'none',
              background: settings.requirePayment ? '#10b981' : '#e5e7eb',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: 3,
              left: settings.requirePayment ? 27 : 3,
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
      </div>

      {/* Payment Settings - Only show when enabled */}
      {settings.requirePayment && (
        <>
          {/* Payment Type */}
          <div style={{
            background: 'white',
            borderRadius: isMobile ? 12 : 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            padding: isMobile ? 16 : 24,
            marginBottom: isMobile ? 16 : 24,
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Tipo de Pagamento
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(['FULL', 'PARTIAL_PERCENT', 'PARTIAL_FIXED'] as PaymentType[]).map(type => (
                <label
                  key={type}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 16,
                    background: settings.paymentType === type ? '#f0fdf4' : '#f8fafc',
                    borderRadius: 12,
                    cursor: 'pointer',
                    border: settings.paymentType === type ? '2px solid #10b981' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    checked={settings.paymentType === type}
                    onChange={() => setSettings(prev => ({ ...prev, paymentType: type }))}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{paymentTypeLabels[type]}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                      {type === 'FULL' && 'Cliente paga o valor total do serviço'}
                      {type === 'PARTIAL_PERCENT' && 'Cliente paga uma porcentagem do valor total'}
                      {type === 'PARTIAL_FIXED' && 'Cliente paga um valor fixo independente do serviço'}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Partial Amount Config */}
            {settings.paymentType === 'PARTIAL_PERCENT' && (
              <div style={{ marginTop: 16, paddingLeft: 28 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                  Porcentagem do Valor (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.partialPercent || ''}
                  onChange={e => setSettings(prev => ({ ...prev, partialPercent: parseInt(e.target.value) || null }))}
                  placeholder="Ex: 30"
                  style={inputStyle}
                />
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>
                  Ex: Se o serviço custa R$ 100 e a porcentagem é 30%, o cliente paga R$ 30
                </p>
              </div>
            )}

            {settings.paymentType === 'PARTIAL_FIXED' && (
              <div style={{ marginTop: 16, paddingLeft: 28 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                  Valor Fixo (R$)
                </label>
                <input
                  type="text"
                  value={partialFixedReais}
                  onChange={e => handlePartialFixedChange(e.target.value)}
                  placeholder="Ex: 20,00"
                  style={inputStyle}
                />
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>
                  Este valor será cobrado independente do preço do serviço
                </p>
              </div>
            )}
          </div>

          {/* PIX Configuration */}
          <div style={{
            background: 'white',
            borderRadius: isMobile ? 12 : 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            padding: isMobile ? 16 : 24,
            marginBottom: isMobile ? 16 : 24,
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Configuração PIX
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                  Tipo de Chave PIX
                </label>
                <select
                  value={settings.pixKeyType || ''}
                  onChange={e => setSettings(prev => ({ ...prev, pixKeyType: e.target.value as PixKeyType || null }))}
                  style={inputStyle}
                >
                  <option value="">Selecione o tipo</option>
                  {Object.entries(pixKeyTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                  Chave PIX
                </label>
                <input
                  type="text"
                  value={settings.pixKey}
                  onChange={e => setSettings(prev => ({ ...prev, pixKey: e.target.value }))}
                  placeholder={
                    settings.pixKeyType === 'CPF' ? '000.000.000-00' :
                    settings.pixKeyType === 'CNPJ' ? '00.000.000/0000-00' :
                    settings.pixKeyType === 'EMAIL' ? 'email@exemplo.com' :
                    settings.pixKeyType === 'PHONE' ? '+5511999999999' :
                    'Chave aleatória'
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                  Nome do Titular PIX (aparece na tela de pagamento)
                </label>
                <input
                  type="text"
                  value={settings.pixHolderName}
                  onChange={e => setSettings(prev => ({ ...prev, pixHolderName: e.target.value }))}
                  placeholder="Ex: Maria Silva ou Studio Maria"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Expiration */}
          <div style={{
            background: 'white',
            borderRadius: isMobile ? 12 : 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            padding: isMobile ? 16 : 24,
            marginBottom: isMobile ? 16 : 24,
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Prazo de Pagamento
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                  Tempo limite para pagamento (minutos)
                </label>
                <input
                  type="number"
                  min="10"
                  max="1440"
                  value={settings.paymentExpiryMinutes}
                  onChange={e => setSettings(prev => ({ ...prev, paymentExpiryMinutes: parseInt(e.target.value) || 30 }))}
                  style={inputStyle}
                />
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>
                  Após este tempo sem pagamento, o agendamento será cancelado automaticamente.
                  Mínimo: 10 minutos. Recomendado: 30-60 minutos.
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}>
            <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: 8 }}>
              ℹ️ Como funciona o pagamento PIX
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#1e40af', fontSize: 14, lineHeight: 1.6 }}>
              <li>Quando o cliente faz um agendamento, ele receberá as instruções PIX na tela</li>
              <li>O agendamento ficará com status "Aguardando Pagamento" até você confirmar</li>
              <li>Você verá os agendamentos pendentes na agenda com destaque</li>
              <li>Ao receber o pagamento, você confirma manualmente na agenda</li>
              <li>Se o cliente não pagar no prazo, o horário é liberado automaticamente</li>
            </ul>
          </div>
        </>
      )}

      {/* Save Button */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '14px 32px',
            borderRadius: 10,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 15,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? '⏳ Salvando...' : '💾 Salvar Configurações'}
        </button>
        {saved && (
          <span style={{ color: '#10b981', fontWeight: 500 }}>✓ Salvo com sucesso!</span>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  border: '2px solid #e5e7eb',
  borderRadius: 10,
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
};
