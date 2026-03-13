'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface WorkspaceConfig {
  businessName: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  appointmentBuffer: number;
  maxAdvanceDays: number;
  autoConfirm: boolean;
  minLeadTimeMinutes: number;
  slotIntervalMinutes: number;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<WorkspaceConfig>({
    businessName: '',
    slug: '',
    email: '',
    phone: '',
    address: '',
    appointmentBuffer: 30,
    maxAdvanceDays: 60,
    autoConfirm: true,
    minLeadTimeMinutes: 120,
    slotIntervalMinutes: 15,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Você precisa estar logado');
          setLoading(false);
          return;
        }

        // Check super admin status
        fetch(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.ok ? r.json() : null).then(data => {
          if (data?.isSuperAdmin) setIsSuperAdmin(true);
        }).catch(() => {});

        const res = await fetch(`${API_URL}/workspace/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 401) {
            setError('Sessão expirada. Faça login novamente.');
          } else {
            setError('Erro ao carregar configurações');
          }
          setLoading(false);
          return;
        }

        const workspace = await res.json();
        setConfig({
          businessName: workspace.brandName || workspace.name || '',
          slug: workspace.slug || '',
          email: '', // Email vem do User, não do workspace
          phone: workspace.profile?.phoneE164 || '',
          address: workspace.profile?.addressLine || '',
          appointmentBuffer: workspace.bufferMinutes || 30,
          maxAdvanceDays: workspace.maxBookingDaysAhead || 60,
          autoConfirm: true, // TODO: adicionar campo no schema
          minLeadTimeMinutes: workspace.minLeadTimeMinutes || 120,
          slotIntervalMinutes: workspace.slotIntervalMinutes || 15,
        });
      } catch (err) {
        console.error('Erro ao carregar workspace:', err);
        setError('Erro de conexão com o servidor');
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Você precisa estar logado');
        setSaving(false);
        return;
      }

      const res = await fetch(`${API_URL}/workspace/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          brandName: config.businessName,
          slug: config.slug,
          bufferMinutes: config.appointmentBuffer,
          maxBookingDaysAhead: config.maxAdvanceDays,
          minLeadTimeMinutes: config.minLeadTimeMinutes,
          slotIntervalMinutes: config.slotIntervalMinutes,
          profile: {
            phoneE164: config.phone,
            addressLine: config.address,
          },
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError('Sessão expirada. Faça login novamente.');
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.message || 'Erro ao salvar configurações');
        }
        setSaving(false);
        return;
      }

      // Atualiza o nome no localStorage para refletir no menu lateral
      localStorage.setItem('workspaceName', config.businessName);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError('Erro de conexão com o servidor');
    } finally {
      setSaving(false);
    }
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
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>Configurações</h1>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: isMobile ? 13 : 15 }}>Gerencie as configurações do seu negócio</p>
      </div>

      {/* Quick Actions - Meu Plano */}
      <Link href="/dashboard/plano" style={{ textDecoration: 'none' }}>
        <div style={{
          background: 'white',
          borderRadius: isMobile ? 12 : 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          padding: isMobile ? 16 : 24,
          marginBottom: isMobile ? 16 : 24,
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}>
                📋
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b' }}>
                  Meu Plano
                </div>
                <div style={{ fontSize: 14, color: '#64748b' }}>
                  Gerenciar assinatura e recursos do plano
                </div>
              </div>
            </div>
            <span style={{ fontSize: 20, color: '#94a3b8' }}>→</span>
          </div>
        </div>
      </Link>

      {/* Quick Actions - Mensagens */}
      <Link href="/dashboard/config/comunicacao" style={{ textDecoration: 'none' }}>
        <div style={{
          background: 'white',
          borderRadius: isMobile ? 12 : 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          padding: isMobile ? 16 : 24,
          marginBottom: isMobile ? 16 : 24,
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}>
                💬
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b' }}>
                  Mensagens
                </div>
                <div style={{ fontSize: 14, color: '#64748b' }}>
                  Personalize as mensagens enviadas aos clientes
                </div>
              </div>
            </div>
            <span style={{ fontSize: 20, color: '#94a3b8' }}>→</span>
          </div>
        </div>
      </Link>

      {/* Quick Actions - Pagamentos */}
      <Link href="/dashboard/config/pagamentos" style={{ textDecoration: 'none' }}>
        <div style={{
          background: 'white',
          borderRadius: isMobile ? 12 : 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          padding: isMobile ? 16 : 24,
          marginBottom: isMobile ? 16 : 24,
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}>
                💳
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b' }}>
                  Pagamentos
                </div>
                <div style={{ fontSize: 14, color: '#64748b' }}>
                  Configure pagamento PIX para confirmação de agendamentos
                </div>
              </div>
            </div>
            <span style={{ fontSize: 20, color: '#94a3b8' }}>→</span>
          </div>
        </div>
      </Link>

      {/* Super Admin — só aparece para super admins */}
      {isSuperAdmin && (
        <Link href="/admin" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: isMobile ? 12 : 16,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: isMobile ? 16 : 24,
            marginBottom: isMobile ? 16 : 24,
            border: '1px solid rgba(201,165,92,0.3)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #c9a55c 0%, #a07a35 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                }}>
                  🛡️
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#f5f1eb' }}>
                    Painel Super Admin
                  </div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                    Gerenciar usuários, convites e sistema
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 20, color: '#c9a55c' }}>→</span>
            </div>
          </div>
        </Link>
      )}

      {/* Link Público de Agendamento */}
      {config.slug && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: isMobile ? 12 : 16,
          padding: isMobile ? 16 : 24,
          marginBottom: isMobile ? 16 : 24,
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: isMobile ? 20 : 24 }}>🔗</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Link Público de Agendamento</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>Compartilhe este link com seus clientes</div>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 10,
            padding: '12px 16px',
          }}>
            <code style={{ flex: 1, fontSize: 14, wordBreak: 'break-all' }}>
              {typeof window !== 'undefined' ? `${window.location.origin}/${config.slug}/booking` : `/${config.slug}/booking`}
            </code>
            <button
              onClick={() => {
                const url = `${window.location.origin}/${config.slug}/booking`;
                navigator.clipboard.writeText(url);
                alert('Link copiado!');
              }}
              style={{
                background: 'white',
                color: '#667eea',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 13,
                whiteSpace: 'nowrap',
              }}
            >
              📋 Copiar
            </button>
          </div>
        </div>
      )}

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

      {/* Business Info */}
      <div style={{
        background: 'white',
        borderRadius: isMobile ? 12 : 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: isMobile ? 16 : 32,
        marginBottom: isMobile ? 16 : 24,
      }}>
        <h3 style={{ margin: '0 0 24px', fontSize: isMobile ? 16 : 18, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🏪</span> Informações do Negócio
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? 16 : 20 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: isMobile ? 13 : 14 }}>
              Nome do Estabelecimento
            </label>
            <input
              type="text"
              value={config.businessName}
              onChange={e => setConfig({ ...config, businessName: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
              Slug (URL)
            </label>
            <input
              type="text"
              value={config.slug}
              onChange={e => setConfig({ ...config, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              style={inputStyle}
            />
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8' }}>
              Usado na URL: seusite.com/<strong>{config.slug || 'seu-slug'}</strong>/booking
            </p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
              E-mail de Contato
            </label>
            <input
              type="email"
              value={config.email}
              onChange={e => setConfig({ ...config, email: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
              Telefone / WhatsApp
            </label>
            <input
              type="tel"
              value={config.phone}
              onChange={e => setConfig({ ...config, phone: e.target.value })}
              placeholder="+55 11 99999-9999"
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
              Endereço
            </label>
            <input
              type="text"
              value={config.address}
              onChange={e => setConfig({ ...config, address: e.target.value })}
              placeholder="Rua, número, bairro, cidade"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Booking Settings */}
      <div style={{
        background: 'white',
        borderRadius: isMobile ? 12 : 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: isMobile ? 16 : 32,
        marginBottom: isMobile ? 16 : 24,
      }}>
        <h3 style={{ margin: '0 0 24px', fontSize: isMobile ? 16 : 18, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📅</span> Configurações de Agendamento
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? 16 : 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: isMobile ? 13 : 14 }}>
                Antecedência mínima (min)
              </label>
              <input
                type="number"
                value={config.appointmentBuffer}
                onChange={e => setConfig({ ...config, appointmentBuffer: parseInt(e.target.value) || 0 })}
                style={inputStyle}
              />
              <p style={{ margin: '8px 0 0', fontSize: isMobile ? 11 : 12, color: '#94a3b8' }}>
                Cliente precisa agendar com essa antecedência mínima
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                Agendamento com antecedência máxima (dias)
              </label>
              <input
                type="number"
                value={config.maxAdvanceDays}
                onChange={e => setConfig({ ...config, maxAdvanceDays: parseInt(e.target.value) || 0 })}
                style={inputStyle}
              />
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8' }}>
                Quantos dias no futuro o cliente pode agendar
              </p>
            </div>
          </div>

          {/* Auto Confirm Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 20,
            background: '#f8fafc',
            borderRadius: 12,
          }}>
            <div>
              <div style={{ fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>Confirmação Automática</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Confirmar agendamentos automaticamente sem sua aprovação</div>
            </div>
            <button
              onClick={() => setConfig({ ...config, autoConfirm: !config.autoConfirm })}
              style={{
                width: 50,
                height: 28,
                borderRadius: 14,
                border: 'none',
                background: config.autoConfirm ? '#667eea' : '#e5e7eb',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: 3,
                left: config.autoConfirm ? 25 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{
        background: 'white',
        borderRadius: isMobile ? 12 : 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: isMobile ? 16 : 32,
        marginBottom: isMobile ? 16 : 24,
        border: '1px solid #fee2e2',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: isMobile ? 16 : 18, fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⚠️</span> Zona de Perigo
        </h3>
        <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: isMobile ? 13 : 14 }}>
          Ações irreversíveis. Tenha cuidado.
        </p>
        <button
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            border: 'none',
            padding: isMobile ? '10px 16px' : '12px 24px',
            borderRadius: 10,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: isMobile ? 13 : 14,
          }}
        >
          Excluir Conta
        </button>
      </div>

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
          {saving ? '⏳ Salvando...' : '💾 Salvar Alterações'}
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
