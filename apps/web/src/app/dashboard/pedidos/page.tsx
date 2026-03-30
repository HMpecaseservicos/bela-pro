'use client';

import { useEffect, useState } from 'react';

interface OrderItem {
  id: string;
  quantity: number;
  priceCents: number;
  service: { id: string; name: string; imageUrl?: string };
}

interface Order {
  id: string;
  status: string;
  totalCents: number;
  createdAt: string;
  client: { id: string; name: string; phoneE164: string };
  items: OrderItem[];
  linkedAppointment?: { id: string; startAt: string; status: string } | null;
}

const THEME = {
  gold: '#a07a45',
  goldSoft: '#c9a66b',
  page: '#f4f1ec',
  surface: '#fbf8f3',
  textPrimary: '#2f2a24',
  textSecondary: '#6e6256',
  textMuted: '#9b8e81',
  border: '#e4dbcf',
};

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: 'Pendente', bg: '#fffbeb', color: '#f59e0b' },
  CONFIRMED: { label: 'Confirmado', bg: '#eff6ff', color: '#3b82f6' },
  PREPARING: { label: 'Preparando', bg: '#fef3c7', color: '#d97706' },
  READY: { label: 'Pronto', bg: '#ecfdf5', color: '#10b981' },
  DELIVERED: { label: 'Entregue', bg: '#f0fdf4', color: '#22c55e' },
  CANCELLED: { label: 'Cancelado', bg: '#fef2f2', color: '#ef4444' },
};

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list = data?.orders ?? (Array.isArray(data) ? data : []);
      setOrders(list);
    } catch {
      // keep state
    }
    setLoading(false);
  }

  async function updateStatus(orderId: string, newStatus: string) {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: THEME.page }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${THEME.border}`, borderTopColor: THEME.gold, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 30, maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <section
        style={{
          borderRadius: 18,
          border: `1px solid ${THEME.border}`,
          background: 'linear-gradient(180deg, #fbf8f3 0%, #f7f2ea 100%)',
          padding: isMobile ? 18 : 26,
          marginBottom: 22,
        }}
      >
        <h1 className="font-display" style={{ margin: 0, fontSize: isMobile ? 29 : 38, color: THEME.textPrimary, fontWeight: 600 }}>
          Pedidos
        </h1>
        <p style={{ margin: '10px 0 0', color: THEME.textSecondary, fontSize: isMobile ? 13 : 14 }}>
          Gerencie os pedidos de produtos da sua loja.
        </p>

        {/* Resumo rápido */}
        {orders.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            {Object.entries(statusCounts).map(([status, count]) => {
              const info = STATUS_MAP[status] || { label: status, bg: '#f3f4f6', color: '#6b7280' };
              return (
                <span
                  key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    background: statusFilter === status ? info.color : info.bg,
                    color: statusFilter === status ? '#fff' : info.color,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {info.label} ({count})
                </span>
              );
            })}
            {statusFilter !== 'all' && (
              <span
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  background: '#fff',
                  color: THEME.textSecondary,
                  border: `1px solid ${THEME.border}`,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Todos
              </span>
            )}
          </div>
        )}
      </section>

      {/* Lista de pedidos */}
      {filteredOrders.length === 0 ? (
        <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 42, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h3 className="font-display" style={{ margin: 0, color: THEME.textPrimary, fontSize: 26, fontWeight: 600 }}>
            {orders.length === 0 ? 'Nenhum pedido ainda' : 'Nenhum pedido com esse status'}
          </h3>
          <p style={{ margin: '10px 0 0', color: THEME.textMuted }}>
            {orders.length === 0 ? 'Os pedidos aparecerão aqui quando seus clientes comprarem produtos.' : 'Tente filtrar por outro status.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredOrders.map(order => {
            const statusInfo = STATUS_MAP[order.status] || { label: order.status, bg: '#f3f4f6', color: '#6b7280' };
            const nextStatuses = getNextStatuses(order.status);

            return (
              <article
                key={order.id}
                style={{
                  background: THEME.surface,
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 16,
                  padding: 18,
                  boxShadow: '0 4px 16px rgba(72, 52, 26, 0.06)',
                }}
              >
                {/* Header do pedido */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: THEME.textPrimary }}>
                        {order.client.name}
                      </span>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 999,
                          background: statusInfo.bg,
                          color: statusInfo.color,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: THEME.textMuted }}>
                      📞 {order.client.phoneE164} • {formatDate(order.createdAt)} às {formatTime(order.createdAt)}
                    </p>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 700, color: THEME.gold }}>
                    {formatPrice(order.totalCents)}
                  </span>
                </div>

                {/* Itens */}
                <div style={{ background: '#f7f2ea', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  {order.items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: THEME.textPrimary }}>
                      <span>{item.service.name} × {item.quantity}</span>
                      <span style={{ fontWeight: 600 }}>{formatPrice(item.priceCents * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Ações de status */}
                {nextStatuses.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {nextStatuses.map(ns => {
                      const nsInfo = STATUS_MAP[ns] || { label: ns, bg: '#f3f4f6', color: '#6b7280' };
                      return (
                        <button
                          key={ns}
                          onClick={() => updateStatus(order.id, ns)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 10,
                            border: ns === 'CANCELLED' ? `1px solid ${nsInfo.color}` : 'none',
                            background: ns === 'CANCELLED' ? 'transparent' : nsInfo.color,
                            color: ns === 'CANCELLED' ? nsInfo.color : '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                          }}
                        >
                          {ns === 'CANCELLED' ? 'Cancelar' : `Marcar como ${nsInfo.label}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getNextStatuses(current: string): string[] {
  switch (current) {
    case 'PENDING': return ['CONFIRMED', 'CANCELLED'];
    case 'CONFIRMED': return ['PREPARING', 'CANCELLED'];
    case 'PREPARING': return ['READY', 'CANCELLED'];
    case 'READY': return ['DELIVERED'];
    default: return [];
  }
}
