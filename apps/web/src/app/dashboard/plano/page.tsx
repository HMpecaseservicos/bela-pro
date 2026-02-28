'use client';

import { useEffect, useState } from 'react';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceQuarterly: number | null;
  priceSemiannual: number | null;
  priceAnnual: number | null;
  maxAppointments: number | null;
  maxClients: number | null;
  maxTeamMembers: number | null;
  chatbotEnabled: boolean;
  whatsappEnabled: boolean;
  financialEnabled: boolean;
  pixPaymentEnabled: boolean;
  features: string[];
  trialDays: number;
  isHighlighted: boolean;
}

interface Subscription {
  id: string;
  status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED';
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  plan: Plan;
}

export default function PlanoPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'>('MONTHLY');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [plansRes, subRes] = await Promise.all([
        fetch(`${API_URL}/billing/available-plans`, { headers }),
        fetch(`${API_URL}/billing/my-subscription`, { headers }),
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData);
        if (subData?.billingCycle) {
          setSelectedCycle(subData.billingCycle);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  }

  function getPriceForCycle(plan: Plan, cycle: string) {
    switch (cycle) {
      case 'QUARTERLY': return plan.priceQuarterly || plan.priceMonthly * 3;
      case 'SEMIANNUAL': return plan.priceSemiannual || plan.priceMonthly * 6;
      case 'ANNUAL': return plan.priceAnnual || plan.priceMonthly * 12;
      default: return plan.priceMonthly;
    }
  }

  function getMonthlyEquivalent(plan: Plan, cycle: string) {
    const total = getPriceForCycle(plan, cycle);
    switch (cycle) {
      case 'QUARTERLY': return total / 3;
      case 'SEMIANNUAL': return total / 6;
      case 'ANNUAL': return total / 12;
      default: return total;
    }
  }

  function getCycleLabel(cycle: string) {
    switch (cycle) {
      case 'MONTHLY': return 'Mensal';
      case 'QUARTERLY': return 'Trimestral';
      case 'SEMIANNUAL': return 'Semestral';
      case 'ANNUAL': return 'Anual';
      default: return cycle;
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'ACTIVE': return { text: 'Ativo', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'TRIAL': return { text: 'Período de Teste', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'PAST_DUE': return { text: 'Pagamento Pendente', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'SUSPENDED': return { text: 'Suspenso', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)' };
      case 'CANCELLED': return { text: 'Cancelado', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' };
      default: return { text: status, color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' };
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
        <div style={{
          width: 40,
          height: 40,
          margin: '0 auto 16px',
          border: '3px solid #334155',
          borderTopColor: '#f59e0b',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        Carregando...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f8fafc' }}>
          Meu Plano
        </h1>
        <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 15 }}>
          Gerencie sua assinatura e veja os planos disponíveis
        </p>
      </div>

      {/* Assinatura Atual */}
      {subscription ? (
        <div style={{
          background: '#1e293b',
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
          border: '1px solid #334155',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>Plano Atual</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
                {subscription.plan.name}
              </div>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: getStatusLabel(subscription.status).bg,
                color: getStatusLabel(subscription.status).color,
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
              }}>
                {getStatusLabel(subscription.status).text}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>
                Cobrança {getCycleLabel(subscription.billingCycle)}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>
                {formatPrice(getPriceForCycle(subscription.plan, subscription.billingCycle))}
              </div>
              <div style={{ color: '#64748b', fontSize: 12 }}>
                Próx. cobrança: {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          {subscription.status === 'TRIAL' && subscription.trialEndsAt && (
            <div style={{
              marginTop: 16,
              padding: 12,
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: 8,
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}>
              <span style={{ color: '#f59e0b', fontWeight: 500 }}>
                🎁 Seu período de teste termina em {new Date(subscription.trialEndsAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 16,
          padding: 32,
          marginBottom: 32,
          border: '1px solid #f59e0b',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
          <h2 style={{ color: '#f8fafc', margin: '0 0 8px', fontSize: 22 }}>
            Escolha seu plano ideal
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>
            Comece agora com um período de teste gratuito
          </p>
        </div>
      )}

      {/* Seletor de Ciclo */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 32,
        flexWrap: 'wrap',
      }}>
        {(['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'] as const).map((cycle) => (
          <button
            key={cycle}
            onClick={() => setSelectedCycle(cycle)}
            style={{
              padding: '10px 20px',
              background: selectedCycle === cycle ? '#f59e0b' : '#1e293b',
              border: '1px solid ' + (selectedCycle === cycle ? '#f59e0b' : '#334155'),
              borderRadius: 8,
              color: selectedCycle === cycle ? '#0f172a' : '#94a3b8',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {getCycleLabel(cycle)}
            {cycle === 'ANNUAL' && (
              <span style={{
                marginLeft: 6,
                padding: '2px 6px',
                background: selectedCycle === cycle ? '#0f172a' : '#10b981',
                color: selectedCycle === cycle ? '#f59e0b' : 'white',
                borderRadius: 4,
                fontSize: 10,
              }}>
                -20%
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid de Planos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
      }}>
        {plans.map((plan) => {
          const isCurrentPlan = subscription?.plan.id === plan.id;
          const monthlyEquivalent = getMonthlyEquivalent(plan, selectedCycle);
          const totalPrice = getPriceForCycle(plan, selectedCycle);

          return (
            <div
              key={plan.id}
              style={{
                background: plan.isHighlighted 
                  ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                  : '#1e293b',
                borderRadius: 16,
                padding: 24,
                border: plan.isHighlighted 
                  ? '2px solid #f59e0b'
                  : isCurrentPlan 
                    ? '2px solid #10b981'
                    : '1px solid #334155',
                position: 'relative',
              }}
            >
              {plan.isHighlighted && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '4px 16px',
                  background: '#f59e0b',
                  color: '#0f172a',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  MAIS POPULAR
                </div>
              )}

              {isCurrentPlan && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  right: 16,
                  padding: '4px 12px',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  Seu plano
                </div>
              )}

              <h3 style={{ margin: '0 0 8px', color: '#f8fafc', fontSize: 20 }}>
                {plan.name}
              </h3>
              {plan.description && (
                <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>
                  {plan.description}
                </p>
              )}

              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: '#f8fafc' }}>
                  {formatPrice(monthlyEquivalent)}
                </span>
                <span style={{ color: '#64748b', fontSize: 14 }}>/mês</span>
                {selectedCycle !== 'MONTHLY' && (
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                    Total: {formatPrice(totalPrice)} ({getCycleLabel(selectedCycle).toLowerCase()})
                  </div>
                )}
              </div>

              {/* Features */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#94a3b8', fontSize: 13 }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  {plan.maxAppointments ? `${plan.maxAppointments} agendamentos/mês` : 'Agendamentos ilimitados'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#94a3b8', fontSize: 13 }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  {plan.maxClients ? `${plan.maxClients} clientes` : 'Clientes ilimitados'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#94a3b8', fontSize: 13 }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  {plan.maxTeamMembers ? `${plan.maxTeamMembers} membros da equipe` : 'Equipe ilimitada'}
                </div>

                {plan.chatbotEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#94a3b8', fontSize: 13 }}>
                    <span style={{ color: '#10b981' }}>✓</span>
                    Chatbot WhatsApp
                  </div>
                )}
                {plan.whatsappEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#94a3b8', fontSize: 13 }}>
                    <span style={{ color: '#10b981' }}>✓</span>
                    Integração WhatsApp
                  </div>
                )}
                {plan.financialEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#94a3b8', fontSize: 13 }}>
                    <span style={{ color: '#10b981' }}>✓</span>
                    Módulo Financeiro
                  </div>
                )}
                {plan.pixPaymentEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#94a3b8', fontSize: 13 }}>
                    <span style={{ color: '#10b981' }}>✓</span>
                    Pagamento PIX
                  </div>
                )}

                {plan.features.map((feature, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#94a3b8', fontSize: 13 }}>
                    <span style={{ color: '#10b981' }}>✓</span>
                    {feature}
                  </div>
                ))}
              </div>

              {/* Trial */}
              {plan.trialDays > 0 && !subscription && (
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: 8,
                  marginBottom: 16,
                  textAlign: 'center',
                }}>
                  <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 500 }}>
                    🎁 {plan.trialDays} dias grátis para testar
                  </span>
                </div>
              )}

              {/* Botão */}
              <button
                disabled={isCurrentPlan}
                style={{
                  width: '100%',
                  padding: 14,
                  background: isCurrentPlan 
                    ? '#334155' 
                    : plan.isHighlighted 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : '#1e40af',
                  border: 'none',
                  borderRadius: 10,
                  color: isCurrentPlan ? '#64748b' : 'white',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: isCurrentPlan ? 'default' : 'pointer',
                }}
              >
                {isCurrentPlan ? 'Plano atual' : subscription ? 'Mudar para este plano' : 'Começar agora'}
              </button>
            </div>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 60,
          color: '#64748b',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <p>Nenhum plano disponível no momento.</p>
          <p style={{ fontSize: 13 }}>Entre em contato com o suporte.</p>
        </div>
      )}

      {/* Nota */}
      <div style={{
        marginTop: 32,
        padding: 16,
        background: '#1e293b',
        borderRadius: 12,
        border: '1px solid #334155',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
          💬 Dúvidas sobre os planos? Entre em contato pelo WhatsApp ou email.
        </p>
      </div>
    </div>
  );
}
