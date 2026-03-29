'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
}

interface Client {
  id: string;
  name: string;
  phoneE164: string;
}

const PAYMENT_METHODS = [
  { value: 'PIX', label: 'PIX', icon: '🔵' },
  { value: 'CASH', label: 'Dinheiro', icon: '💵' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito', icon: '💳' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito', icon: '💳' },
  { value: 'TRANSFER', label: 'Transferência', icon: '🔄' },
  { value: 'OTHER', label: 'Outro', icon: '📋' },
];

export default function NovaTransacaoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState('');

  // Form state
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'COMPLETED' | 'PENDING'>('COMPLETED');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [categoryId, setCategoryId] = useState('');
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchClients();
  }, []);

  useEffect(() => {
    // Limpa categoria quando muda o tipo
    setCategoryId('');
  }, [type]);

  async function fetchCategories() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/financial/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  }

  async function fetchClients() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClients(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    }
  }

  function formatCurrency(value: string): string {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    const cents = parseInt(numbers || '0', 10);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  }

  function parseCurrencyToCents(value: string): number {
    const numbers = value.replace(/\D/g, '');
    return parseInt(numbers || '0', 10);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const amountCents = parseCurrencyToCents(amountStr);
    if (amountCents <= 0) {
      setError('Informe um valor válido');
      return;
    }

    if (!description.trim()) {
      setError('Informe uma descrição');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/financial/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          amountCents,
          description: description.trim(),
          notes: notes.trim() || undefined,
          transactionDate: new Date(transactionDate + 'T12:00:00').toISOString(),
          dueDate: dueDate ? new Date(dueDate + 'T12:00:00').toISOString() : undefined,
          status,
          paymentMethod: status === 'COMPLETED' ? paymentMethod : undefined,
          categoryId: categoryId || undefined,
          clientId: clientId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao criar transação');
      }

      router.push('/dashboard/financeiro/transacoes');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  const filteredCategories = categories.filter(c => c.type === type);

  return (
    <div style={{ padding: isMobile ? 16 : 32, minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/financeiro" style={{ color: '#64748b', fontSize: 24 }}>←</Link>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#1a1a2e' }}>
            Nova Transação
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Registre uma receita ou despesa
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{
        background: 'white',
        borderRadius: 16,
        padding: isMobile ? 20 : 32,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        maxWidth: 600,
      }}>
        {/* Tipo de transação */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Tipo *
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              style={{
                flex: 1,
                padding: '16px',
                border: type === 'INCOME' ? '2px solid #10b981' : '2px solid #e2e8f0',
                borderRadius: 12,
                background: type === 'INCOME' ? '#d1fae5' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>📈</div>
              <div style={{ fontWeight: 600, color: type === 'INCOME' ? '#10b981' : '#64748b' }}>Receita</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Entrada de dinheiro</div>
            </button>
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              style={{
                flex: 1,
                padding: '16px',
                border: type === 'EXPENSE' ? '2px solid #ef4444' : '2px solid #e2e8f0',
                borderRadius: 12,
                background: type === 'EXPENSE' ? '#fee2e2' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>📉</div>
              <div style={{ fontWeight: 600, color: type === 'EXPENSE' ? '#ef4444' : '#64748b' }}>Despesa</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Saída de dinheiro</div>
            </button>
          </div>
        </div>

        {/* Valor */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Valor *
          </label>
          <input
            type="text"
            value={amountStr ? formatCurrency(amountStr) : ''}
            onChange={(e) => setAmountStr(e.target.value.replace(/\D/g, ''))}
            placeholder="R$ 0,00"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '2px solid #e2e8f0',
              borderRadius: 10,
              fontSize: 24,
              fontWeight: 700,
              color: type === 'INCOME' ? '#10b981' : '#ef4444',
              textAlign: 'center',
            }}
          />
        </div>

        {/* Descrição */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Descrição *
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'INCOME' ? 'Ex: Corte feminino - Maria' : 'Ex: Aluguel do mês'}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '2px solid #e2e8f0',
              borderRadius: 10,
              fontSize: 15,
            }}
          />
        </div>

        {/* Data e Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Data *
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #e2e8f0',
                borderRadius: 10,
                fontSize: 14,
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #e2e8f0',
                borderRadius: 10,
                fontSize: 14,
                background: 'white',
              }}
            >
              <option value="COMPLETED">{type === 'INCOME' ? '✓ Recebido' : '✓ Pago'}</option>
              <option value="PENDING">{type === 'INCOME' ? '⏳ A receber' : '⏳ A pagar'}</option>
            </select>
          </div>
        </div>

        {/* Data de vencimento (se pendente) */}
        {status === 'PENDING' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Data de Vencimento
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #e2e8f0',
                borderRadius: 10,
                fontSize: 14,
              }}
            />
          </div>
        )}

        {/* Método de pagamento (se concluído) */}
        {status === 'COMPLETED' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Forma de Pagamento
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setPaymentMethod(pm.value)}
                  style={{
                    padding: '10px 8px',
                    border: paymentMethod === pm.value ? '2px solid #667eea' : '2px solid #e2e8f0',
                    borderRadius: 8,
                    background: paymentMethod === pm.value ? '#f0f4ff' : 'white',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    color: paymentMethod === pm.value ? '#667eea' : '#64748b',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{pm.icon}</span>
                  {pm.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categoria */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Categoria
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {filteredCategories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(categoryId === cat.id ? '' : cat.id)}
                style={{
                  padding: '8px 14px',
                  border: categoryId === cat.id ? 'none' : '1px solid #e2e8f0',
                  borderRadius: 20,
                  background: categoryId === cat.id ? (cat.color || '#667eea') : 'white',
                  color: categoryId === cat.id ? 'white' : '#64748b',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Cliente (somente para receitas) */}
        {type === 'INCOME' && clients.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Cliente (opcional)
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #e2e8f0',
                borderRadius: 10,
                fontSize: 14,
                background: 'white',
              }}
            >
              <option value="">Selecione um cliente</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Observações */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Observações
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Anotações adicionais..."
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '2px solid #e2e8f0',
              borderRadius: 10,
              fontSize: 14,
              resize: 'none',
            }}
          />
        </div>

        {/* Erro */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            color: '#dc2626',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Link
            href="/dashboard/financeiro"
            style={{
              flex: 1,
              padding: '14px',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              color: '#64748b',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '14px',
              background: type === 'INCOME' 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Salvando...' : `Salvar ${type === 'INCOME' ? 'Receita' : 'Despesa'}`}
          </button>
        </div>
      </form>
    </div>
  );
}
