'use client';

import { useEffect, useState } from 'react';

interface DashboardStats {
  overview: {
    totalWorkspaces: number;
    activeWorkspaces: number;
    totalUsers: number;
    activeUsers: number;
    totalAppointments: number;
    appointmentsThisMonth: number;
  };
  workspacesByPlan: Record<string, number>;
  recentWorkspaces: Array<{
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    _count: { clients: number; appointments: number };
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Erro ao carregar dashboard');
      }

      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{
          width: 40,
          height: 40,
          border: '4px solid #334155',
          borderTopColor: '#f59e0b',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#7f1d1d',
        border: '1px solid #dc2626',
        borderRadius: 12,
        padding: 24,
        color: '#fecaca',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Erro ao carregar</div>
        <div style={{ fontSize: 14, opacity: 0.8 }}>{error}</div>
      </div>
    );
  }

  const statCards = [
    { label: 'Empresas', value: stats?.overview?.totalWorkspaces || 0, subValue: `${stats?.overview?.activeWorkspaces || 0} ativas`, icon: '🏢', color: '#3b82f6' },
    { label: 'Usuários', value: stats?.overview?.totalUsers || 0, subValue: `${stats?.overview?.activeUsers || 0} ativos`, icon: '👥', color: '#10b981' },
    { label: 'Agendamentos', value: stats?.overview?.totalAppointments || 0, subValue: `${stats?.overview?.appointmentsThisMonth || 0} este mês`, icon: '📅', color: '#8b5cf6' },
  ];

  const planCounts = stats?.workspacesByPlan || {};

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f8fafc' }}>
          Dashboard
        </h1>
        <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 15 }}>
          Visão geral do sistema BELA PRO
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 20,
        marginBottom: 32,
      }}>
        {statCards.map((stat, index) => (
          <div
            key={index}
            style={{
              background: '#1e293b',
              borderRadius: 16,
              padding: 24,
              border: '1px solid #334155',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 32 }}>{stat.icon}</span>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: stat.color,
              }} />
            </div>
            <div style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#f8fafc',
              marginBottom: 4,
            }}>
              {stat.value.toLocaleString('pt-BR')}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 14 }}>
              {stat.label}
            </div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
              {stat.subValue}
            </div>
          </div>
        ))}
        
        {/* Plan Distribution Card */}
        <div
          style={{
            background: '#1e293b',
            borderRadius: 16,
            padding: 24,
            border: '1px solid #334155',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 32 }}>📊</span>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#f59e0b',
            }} />
          </div>
          <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 12 }}>
            Planos
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(planCounts).map(([plan, count]) => (
              <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: 13, textTransform: 'capitalize' }}>{plan.toLowerCase()}</span>
                <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: 14 }}>{count}</span>
              </div>
            ))}
            {Object.keys(planCounts).length === 0 && (
              <span style={{ color: '#64748b', fontSize: 12 }}>Sem dados</span>
            )}
          </div>
        </div>
      </div>

      {/* Recent Workspaces */}
      <div style={{
        background: '#1e293b',
        borderRadius: 16,
        border: '1px solid #334155',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#f8fafc' }}>
            🏢 Empresas Recentes
          </h2>
          <a
            href="/admin/workspaces"
            style={{
              color: '#f59e0b',
              fontSize: 13,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Ver todas →
          </a>
        </div>
        
        <div style={{ padding: '8px 0' }}>
          {stats?.recentWorkspaces && stats.recentWorkspaces.length > 0 ? (
            stats.recentWorkspaces.map((ws) => (
              <div
                key={ws.id}
                style={{
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #334155',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: 16,
                  }}>
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 14 }}>{ws.name}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>/{ws.slug}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 14 }}>
                      {ws._count?.clients || 0}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>clientes</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 14 }}>
                      {ws._count?.appointments || 0}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>agendamentos</div>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>
                    {new Date(ws.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{
              padding: 40,
              textAlign: 'center',
              color: '#64748b',
            }}>
              Nenhuma empresa cadastrada ainda
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
