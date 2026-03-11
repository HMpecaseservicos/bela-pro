'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

// =============================================================================
// TYPES
// =============================================================================

interface PendingPayment {
  id: string;
  sponsorName: string;
  sponsorEmail: string;
  contractNumber: string;
  tier: 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE';
  durationMonths: number;
  amountCents: number;
  amountFormatted: string;
  pixExpiresAt: string;
  pixExpired: boolean;
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

const TIER_META: Record<string, { name: string; icon: string; color: string; bg: string }> = {
  DIAMOND: { name: 'Diamond', icon: '💎', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  GOLD: { name: 'Gold', icon: '🥇', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  SILVER: { name: 'Silver', icon: '🥈', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  BRONZE: { name: 'Bronze', icon: '🥉', color: '#92400e', bg: 'rgba(146,64,14,0.1)' },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// COMPONENT
// =============================================================================

export default function SponsorFinanceiroPage() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<PendingPayment | null>(null);
  const [confirmData, setConfirmData] = useState({ paidByName: '', transactionId: '', notes: '' });
  const [stats, setStats] = useState({ pending: 0, totalPending: 0 });

  // Load token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  // Fetch pending payments
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      const res = await fetch(`${API_URL}/admin/sponsor-payments/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Erro ao carregar pagamentos');
      }

      const data = await res.json();
      setPayments(data);

      // Calculate stats
      const totalCents = data.reduce((sum: number, p: PendingPayment) => sum + p.amountCents, 0);
      setStats({
        pending: data.length,
        totalPending: totalCents,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Confirm payment
  const handleConfirmPayment = async () => {
    if (!confirmModal) return;

    try {
      setConfirming(confirmModal.id);
      const token = getToken();

      const res = await fetch(`${API_URL}/admin/sponsor-payments/${confirmModal.id}/confirm`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(confirmData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao confirmar pagamento');
      }

      setConfirmModal(null);
      setConfirmData({ paidByName: '', transactionId: '', notes: '' });
      fetchPayments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao confirmar');
    } finally {
      setConfirming(null);
    }
  };

  // Expire pending payments (manual trigger)
  const handleExpirePayments = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/sponsor-payments/expire-pending`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        alert(`${data.expiredCount} pagamento(s) expirado(s)`);
        fetchPayments();
      }
    } catch {
      alert('Erro ao processar');
    }
  };

  // Expire contracts (manual trigger)
  const handleExpireContracts = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/sponsor-payments/expire-contracts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        alert(`${data.expiredCount} contrato(s) expirado(s), ${data.deactivatedSponsors} patrocinador(es) desativado(s)`);
      }
    } catch {
      alert('Erro ao processar');
    }
  };

  // Format currency
  const formatCurrency = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: `3px solid ${T.border}`, borderTopColor: T.gold,
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: T.textMuted }}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: T.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: T.danger, fontSize: 16 }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{
            marginTop: 16, padding: '10px 24px', borderRadius: T.radius,
            background: T.gold, border: 'none', color: T.white,
            fontWeight: 600, cursor: 'pointer',
          }}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.page, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header style={{
        background: T.white, borderBottom: `1px solid ${T.border}`,
        padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <Link href="/admin/patrocinadores" style={{ color: T.textMuted, fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            ← Voltar para Patrocinadores
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, margin: 0 }}>
            💰 Financeiro de Patrocinadores
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleExpirePayments} style={{
            padding: '10px 20px', borderRadius: T.radius,
            background: T.warningBg, border: `1px solid ${T.warning}`,
            color: T.warning, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            🕐 Expirar PIX Vencidos
          </button>
          <button onClick={handleExpireContracts} style={{
            padding: '10px 20px', borderRadius: T.radius,
            background: T.dangerBg, border: `1px solid ${T.danger}`,
            color: T.danger, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            ⏰ Expirar Contratos Vencidos
          </button>
        </div>
      </header>

      <main style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 32 }}>
          <div style={{
            background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`,
            padding: 24, textAlign: 'center',
          }}>
            <p style={{ color: T.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Pagamentos Pendentes
            </p>
            <p style={{ fontSize: 36, fontWeight: 800, color: T.warning }}>{stats.pending}</p>
          </div>
          <div style={{
            background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`,
            padding: 24, textAlign: 'center',
          }}>
            <p style={{ color: T.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Total Pendente
            </p>
            <p style={{ fontSize: 36, fontWeight: 800, color: T.gold }}>{formatCurrency(stats.totalPending)}</p>
          </div>
        </div>

        {/* Payments list */}
        {payments.length === 0 ? (
          <div style={{
            background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`,
            padding: 48, textAlign: 'center',
          }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>✨</p>
            <p style={{ color: T.textSecondary, fontSize: 16 }}>Nenhum pagamento pendente</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {payments.map((payment) => {
              const tier = TIER_META[payment.tier] || TIER_META.GOLD;

              return (
                <div key={payment.id} style={{
                  background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`,
                  padding: 24, display: 'flex', alignItems: 'center', gap: 24,
                  opacity: payment.pixExpired ? 0.6 : 1,
                }}>
                  {/* Tier badge */}
                  <div style={{
                    width: 60, height: 60, borderRadius: 12,
                    background: tier.bg, border: `1px solid ${tier.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                  }}>
                    {tier.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, margin: 0 }}>
                        {payment.sponsorName}
                      </h3>
                      <span style={{
                        padding: '3px 10px', borderRadius: 8,
                        background: tier.bg, color: tier.color,
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {tier.name}
                      </span>
                      {payment.pixExpired && (
                        <span style={{
                          padding: '3px 10px', borderRadius: 8,
                          background: T.dangerBg, color: T.danger,
                          fontSize: 11, fontWeight: 700,
                        }}>
                          PIX EXPIRADO
                        </span>
                      )}
                    </div>
                    <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 4 }}>
                      {payment.sponsorEmail} · Contrato: <strong>{payment.contractNumber}</strong>
                    </p>
                    <p style={{ color: T.textMuted, fontSize: 11 }}>
                      {payment.durationMonths} meses · Criado em {formatDate(payment.createdAt)} · PIX válido até {formatDate(payment.pixExpiresAt)}
                    </p>
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 24, fontWeight: 800, color: T.gold, marginBottom: 8 }}>
                      {payment.amountFormatted}
                    </p>
                    {!payment.pixExpired && (
                      <button onClick={() => setConfirmModal(payment)} style={{
                        padding: '10px 24px', borderRadius: T.radius,
                        background: T.success, border: 'none', color: T.white,
                        fontWeight: 700, cursor: 'pointer', fontSize: 13,
                      }}>
                        ✓ Confirmar Pagamento
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirm Modal */}
      {confirmModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setConfirmModal(null)}>
          <div style={{
            background: T.white, borderRadius: T.radius, padding: 32, width: 480, maxWidth: '90vw',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>
              Confirmar Pagamento
            </h3>
            <p style={{ color: T.textSecondary, fontSize: 14, marginBottom: 24 }}>
              Confirme o recebimento do pagamento de <strong>{confirmModal.sponsorName}</strong> no valor de{' '}
              <strong style={{ color: T.gold }}>{confirmModal.amountFormatted}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', color: T.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                  Pagante (opcional)
                </label>
                <input
                  type="text"
                  value={confirmData.paidByName}
                  onChange={e => setConfirmData({ ...confirmData, paidByName: e.target.value })}
                  placeholder="Nome de quem efetuou o pagamento"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: T.radius,
                    border: `1px solid ${T.border}`, fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: T.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                  ID da Transação (opcional)
                </label>
                <input
                  type="text"
                  value={confirmData.transactionId}
                  onChange={e => setConfirmData({ ...confirmData, transactionId: e.target.value })}
                  placeholder="Código E2E ou ID do PIX"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: T.radius,
                    border: `1px solid ${T.border}`, fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: T.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                  Observações (opcional)
                </label>
                <textarea
                  value={confirmData.notes}
                  onChange={e => setConfirmData({ ...confirmData, notes: e.target.value })}
                  placeholder="Anotações sobre o pagamento..."
                  rows={2}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: T.radius,
                    border: `1px solid ${T.border}`, fontSize: 14,
                    outline: 'none', resize: 'vertical',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmModal(null)} style={{
                padding: '12px 24px', borderRadius: T.radius,
                background: 'transparent', border: `1px solid ${T.border}`,
                color: T.textSecondary, fontWeight: 600, cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button onClick={handleConfirmPayment} disabled={confirming === confirmModal.id} style={{
                padding: '12px 28px', borderRadius: T.radius,
                background: T.success, border: 'none', color: T.white,
                fontWeight: 700, cursor: 'pointer',
                opacity: confirming === confirmModal.id ? 0.6 : 1,
              }}>
                {confirming === confirmModal.id ? 'Confirmando...' : '✓ Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
