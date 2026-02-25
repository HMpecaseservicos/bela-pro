'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
  period: { startDate: string; endDate: string };
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    profit: number;
  };
  appointments: {
    completed: number;
    revenue: number;
    averageTicket: number;
  };
  pending: { count: number };
  incomeByCategory: Array<{ name: string; total: number; color: string }>;
  expenseByCategory: Array<{ name: string; total: number; color: string }>;
  dailyData: Array<{ date: string; income: number; expense: number }>;
  paymentMethods: Array<{ method: string; total: number }>;
}

const PAYMENT_METHODS_LABELS: Record<string, string> = {
  PIX: 'PIX',
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  TRANSFER: 'Transferência',
  OTHER: 'Outro',
};

export default function FinanceiroPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [isMobile, setIsMobile] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  function getDateRange() {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
  }

  async function fetchDashboard() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const res = await fetch(
        `${API_URL}/financial/dashboard?startDate=${startDate}&endDate=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error('Erro ao carregar dados');
      const dashData = await res.json();
      setData(dashData);
    } catch (err) {
      console.error('Erro ao carregar dashboard financeiro:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 32, minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>💰</span>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>
            Financeiro
          </h1>
        </div>
        <p style={{ margin: 0, color: '#64748b', fontSize: isMobile ? 13 : 15 }}>
          Gerencie suas receitas e despesas
        </p>
      </div>

      {/* Período + Ações */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        gap: 16,
        marginBottom: 24,
      }}>
        {/* Filtro de período */}
        <div style={{ display: 'flex', gap: 8, background: '#fff', borderRadius: 12, padding: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {[
            { value: 'today', label: 'Hoje' },
            { value: 'week', label: '7 dias' },
            { value: 'month', label: 'Mês' },
            { value: 'year', label: 'Ano' },
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value as any)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 8,
                background: period === p.value ? '#10b981' : 'transparent',
                color: period === p.value ? 'white' : '#64748b',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: 13,
                transition: 'all 0.2s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Ações rápidas */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Link
            href="/dashboard/financeiro/transacoes"
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#667eea',
              border: '1px solid #667eea',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📋 Transações
          </Link>
          <Link
            href="/dashboard/financeiro/nova"
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
            }}
          >
            + Nova Transação
          </Link>
        </div>
      </div>

      {data && (
        <>
          {/* Cards principais */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', 
            gap: 16, 
            marginBottom: 24,
          }}>
            {/* Receitas */}
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: 16,
              padding: 20,
              color: 'white',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.9 }}>
                <span style={{ fontSize: 20 }}>📈</span>
                <span style={{ fontSize: 13 }}>Receitas</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{formatPrice(data.summary.totalIncome)}</div>
            </div>

            {/* Despesas */}
            <div style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              borderRadius: 16,
              padding: 20,
              color: 'white',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.9 }}>
                <span style={{ fontSize: 20 }}>📉</span>
                <span style={{ fontSize: 13 }}>Despesas</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{formatPrice(data.summary.totalExpense)}</div>
            </div>

            {/* Saldo */}
            <div style={{
              background: data.summary.balance >= 0 
                ? 'linear-gradient(135deg, #667eea 0%, #5a67d8 100%)'
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: 16,
              padding: 20,
              color: 'white',
              boxShadow: data.summary.balance >= 0 
                ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                : '0 4px 12px rgba(245, 158, 11, 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.9 }}>
                <span style={{ fontSize: 20 }}>💰</span>
                <span style={{ fontSize: 13 }}>Saldo</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{formatPrice(data.summary.balance)}</div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>
                {data.summary.profit >= 0 ? '+' : ''}{data.summary.profit}% lucro
              </div>
            </div>

            {/* Ticket Médio */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 20,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#64748b' }}>
                <span style={{ fontSize: 20 }}>🎯</span>
                <span style={{ fontSize: 13 }}>Ticket Médio</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
                {formatPrice(data.appointments.averageTicket)}
              </div>
              <div style={{ fontSize: 12, marginTop: 4, color: '#64748b' }}>
                {data.appointments.completed} atendimentos concluídos
              </div>
            </div>
          </div>

          {/* Alertas */}
          {data.pending.count > 0 && (
            <div style={{
              background: '#fef3c7',
              borderLeft: '4px solid #f59e0b',
              borderRadius: '0 12px 12px 0',
              padding: '16px 20px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, color: '#92400e' }}>
                  {data.pending.count} transaç{data.pending.count > 1 ? 'ões' : 'ão'} pendente{data.pending.count > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 13, color: '#b45309' }}>
                  Você tem contas vencidas aguardando pagamento
                </div>
              </div>
              <Link
                href="/dashboard/financeiro/transacoes?status=PENDING"
                style={{
                  marginLeft: 'auto',
                  padding: '8px 16px',
                  background: '#f59e0b',
                  color: 'white',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: 13,
                }}
              >
                Ver pendentes
              </Link>
            </div>
          )}

          {/* Grid de detalhes */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
            gap: 24,
          }}>
            {/* Receitas por categoria */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📊</span> Receitas por Categoria
              </h3>
              {data.incomeByCategory.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                  Nenhuma receita no período
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.incomeByCategory.map((cat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: cat.color,
                        flexShrink: 0,
                      }} />
                      <span style={{ flex: 1, fontSize: 14, color: '#475569' }}>{cat.name}</span>
                      <span style={{ fontWeight: 600, color: '#10b981' }}>{formatPrice(cat.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Despesas por categoria */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📊</span> Despesas por Categoria
              </h3>
              {data.expenseByCategory.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                  Nenhuma despesa no período
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.expenseByCategory.map((cat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: cat.color,
                        flexShrink: 0,
                      }} />
                      <span style={{ flex: 1, fontSize: 14, color: '#475569' }}>{cat.name}</span>
                      <span style={{ fontWeight: 600, color: '#ef4444' }}>{formatPrice(cat.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Métodos de Pagamento */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>💳</span> Formas de Pagamento
              </h3>
              {data.paymentMethods.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                  Sem dados no período
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.paymentMethods.map((pm, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 18 }}>
                        {pm.method === 'PIX' ? '🔵' : pm.method === 'CASH' ? '💵' : pm.method === 'CREDIT_CARD' ? '💳' : pm.method === 'DEBIT_CARD' ? '💳' : '🔄'}
                      </span>
                      <span style={{ flex: 1, fontSize: 14, color: '#475569' }}>
                        {PAYMENT_METHODS_LABELS[pm.method] || pm.method}
                      </span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatPrice(pm.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gráfico de evolução diária */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📈</span> Evolução Diária
              </h3>
              {data.dailyData.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                  Sem dados no período
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.dailyData.slice(-7).map((day, i) => {
                    const maxValue = Math.max(...data.dailyData.map(d => Math.max(d.income, d.expense)));
                    const incomeWidth = maxValue > 0 ? (day.income / maxValue) * 100 : 0;
                    const expenseWidth = maxValue > 0 ? (day.expense / maxValue) * 100 : 0;
                    
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 50, fontSize: 12, color: '#64748b' }}>{formatDate(day.date)}</span>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{
                            height: 6,
                            width: `${Math.max(incomeWidth, 2)}%`,
                            background: '#10b981',
                            borderRadius: 3,
                          }} />
                          <div style={{
                            height: 6,
                            width: `${Math.max(expenseWidth, 2)}%`,
                            background: '#ef4444',
                            borderRadius: 3,
                          }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981' }} />
                      Receitas
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }} />
                      Despesas
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
