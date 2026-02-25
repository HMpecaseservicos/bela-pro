'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
}

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  amountCents: number;
  description: string;
  notes?: string;
  transactionDate: string;
  dueDate?: string;
  completedAt?: string;
  paymentMethod?: string;
  category?: Category;
  client?: { id: string; name: string };
  appointment?: { 
    id: string; 
    startAt: string;
    services: Array<{ service: { name: string } }>;
  };
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pendente', bg: '#fef3c7', color: '#d97706', icon: '⏳' },
  COMPLETED: { label: 'Concluído', bg: '#d1fae5', color: '#059669', icon: '✓' },
  CANCELLED: { label: 'Cancelado', bg: '#fee2e2', color: '#dc2626', icon: '✗' },
};

const PAYMENT_METHODS: Record<string, string> = {
  PIX: 'PIX',
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartão Crédito',
  DEBIT_CARD: 'Cartão Débito',
  TRANSFER: 'Transferência',
  OTHER: 'Outro',
};

function TransacoesContent() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Filtros
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>(
    (searchParams.get('status') as any) || 'ALL'
  );
  
  // Modal de confirmação
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, statusFilter]);

  async function fetchTransactions() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('limit', '100');

      const res = await fetch(`${API_URL}/financial/transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Erro ao carregar transações');
      const data = await res.json();
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const token = localStorage.getItem('token');
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/financial/transactions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Erro ao excluir');
        return;
      }
      setDeleteId(null);
      fetchTransactions();
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setDeleting(false);
    }
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/financeiro" style={{ color: '#64748b', fontSize: 24 }}>←</Link>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#1a1a2e' }}>
            Transações
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            {total} transaç{total !== 1 ? 'ões' : 'ão'} encontrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/financeiro/nova"
          style={{
            marginLeft: 'auto',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
          }}
        >
          + Nova
        </Link>
      </div>

      {/* Filtros */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: 16, 
        marginBottom: 24,
        padding: 16,
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {/* Tipo */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { value: 'ALL', label: 'Todos' },
            { value: 'INCOME', label: '📈 Receitas' },
            { value: 'EXPENSE', label: '📉 Despesas' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value as any)}
              style={{
                padding: '6px 14px',
                border: typeFilter === t.value ? 'none' : '1px solid #e2e8f0',
                borderRadius: 8,
                background: typeFilter === t.value 
                  ? (t.value === 'INCOME' ? '#10b981' : t.value === 'EXPENSE' ? '#ef4444' : '#667eea')
                  : 'white',
                color: typeFilter === t.value ? 'white' : '#64748b',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { value: 'ALL', label: 'Todos Status' },
            { value: 'PENDING', label: '⏳ Pendentes' },
            { value: 'COMPLETED', label: '✓ Concluídos' },
          ].map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value as any)}
              style={{
                padding: '6px 14px',
                border: statusFilter === s.value ? 'none' : '1px solid #e2e8f0',
                borderRadius: 8,
                background: statusFilter === s.value ? '#475569' : 'white',
                color: statusFilter === s.value ? 'white' : '#64748b',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de transações */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {transactions.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p>Nenhuma transação encontrada</p>
            <Link
              href="/dashboard/financeiro/nova"
              style={{
                display: 'inline-block',
                marginTop: 16,
                padding: '10px 20px',
                background: '#10b981',
                color: 'white',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Adicionar primeira transação
            </Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Descrição
                </th>
                {!isMobile && (
                  <>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                      Categoria
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                      Data
                    </th>
                  </>
                )}
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Valor
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => {
                const statusConfig = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
                const isIncome = t.type === 'INCOME';
                
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: isIncome ? '#d1fae5' : '#fee2e2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          flexShrink: 0,
                        }}>
                          {isIncome ? '📈' : '📉'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
                            {t.description}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            {t.client?.name && <span>{t.client.name} • </span>}
                            {t.paymentMethod && <span>{PAYMENT_METHODS[t.paymentMethod]} • </span>}
                            {t.appointment && <span>🗓️ Agendamento</span>}
                          </div>
                          {isMobile && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              {formatDate(t.transactionDate)}
                              {t.category && ` • ${t.category.icon || ''} ${t.category.name}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {!isMobile && (
                      <>
                        <td style={{ padding: '16px' }}>
                          {t.category ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              background: t.category.color ? `${t.category.color}20` : '#f1f5f9',
                              borderRadius: 6,
                              fontSize: 12,
                              color: t.category.color || '#64748b',
                            }}>
                              {t.category.icon} {t.category.name}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '16px', color: '#64748b', fontSize: 13 }}>
                          {formatDate(t.transactionDate)}
                        </td>
                      </>
                    )}
                    <td style={{ 
                      padding: '16px', 
                      textAlign: 'right', 
                      fontWeight: 700, 
                      fontSize: 15,
                      color: isIncome ? '#10b981' : '#ef4444',
                    }}>
                      {isIncome ? '+' : '-'}{formatPrice(t.amountCents)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        background: statusConfig.bg,
                        color: statusConfig.color,
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {statusConfig.icon} {statusConfig.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      {!t.appointment && (
                        <button
                          onClick={() => setDeleteId(t.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: 16,
                            padding: 4,
                          }}
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      {deleteId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            maxWidth: 400,
            width: '90%',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, color: '#1e293b' }}>
              Excluir transação?
            </h3>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>
              Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  color: '#64748b',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontWeight: 500,
                  cursor: deleting ? 'wait' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>
      <p style={{ color: '#64748b' }}>Carregando transações...</p>
    </div>
  );
}

export default function TransacoesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TransacoesContent />
    </Suspense>
  );
}
