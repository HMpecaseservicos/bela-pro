'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  whatsappLastConnectionState: string | null;
  chatbotEnabled: boolean;
  owner?: { id: string; name: string; email: string } | null;
  _count: { memberships: number; appointments: number; clients: number; services: number };
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
}

type FilterStatus = 'all' | 'active' | 'inactive';
type FilterPlan = 'all' | 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
type SortBy = 'createdAt' | 'name' | 'appointments' | 'clients';
type SortOrder = 'asc' | 'desc';

export default function AdminWorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0 });
  
  // Filtros e paginação
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FilterStatus>('all');
  const [plan, setPlan] = useState<FilterPlan>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal de confirmação
  const [deleteModal, setDeleteModal] = useState<{ workspace: Workspace; permanent: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchWorkspaces();
  }, [page, search, status, plan, sortBy, sortOrder]);

  async function fetchWorkspaces() {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        status,
        plan,
        sortBy,
        sortOrder,
        ...(search && { search }),
      });

      const res = await fetch(`${API_URL}/admin/workspaces?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Erro ao carregar workspaces');

      const data = await res.json();
      setWorkspaces(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleImpersonate(workspace: Workspace) {
    if (!confirm(`Deseja acessar como "${workspace.name}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/impersonate/${workspace.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Erro ao acessar');

      const data = await res.json();
      localStorage.setItem('original_token', token || '');
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('impersonating', 'true');
      router.push('/dashboard');
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleToggleActive(workspace: Workspace) {
    const action = workspace.isActive ? 'desativar' : 'ativar';
    if (!confirm(`Deseja ${action} "${workspace.name}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !workspace.isActive }),
      });

      if (!res.ok) throw new Error('Erro ao atualizar');
      fetchWorkspaces();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = deleteModal.permanent 
        ? `${API_URL}/admin/workspaces/${deleteModal.workspace.id}/permanent`
        : `${API_URL}/admin/workspaces/${deleteModal.workspace.id}`;
      
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao excluir');
      }
      
      alert(data.message || 'Workspace excluído com sucesso');
      setDeleteModal(null);
      fetchWorkspaces();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function getPlanColor(p: string) {
    const colors: Record<string, { bg: string; text: string }> = {
      FREE: { bg: '#374151', text: '#9ca3af' },
      BASIC: { bg: '#1e40af', text: '#93c5fd' },
      PRO: { bg: '#7c3aed', text: '#c4b5fd' },
      ENTERPRISE: { bg: '#b45309', text: '#fcd34d' },
    };
    return colors[p] || colors.FREE;
  }

  const selectStyle = {
    padding: '10px 14px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#f8fafc',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f8fafc' }}>
          Gerenciar Empresas
        </h1>
        <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 15 }}>
          Controle total sobre todos os workspaces do sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{
          background: '#1e293b',
          borderRadius: 12,
          padding: '20px 24px',
          border: '1px solid #334155',
        }}>
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>Total</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#f8fafc' }}>{stats.total}</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
          borderRadius: 12,
          padding: '20px 24px',
          border: '1px solid #10b981',
        }}>
          <div style={{ color: '#6ee7b7', fontSize: 13, marginBottom: 4 }}>Ativos</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#ecfdf5' }}>{stats.active}</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
          borderRadius: 12,
          padding: '20px 24px',
          border: '1px solid #dc2626',
        }}>
          <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 4 }}>Inativos</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#fef2f2' }}>{stats.inactive}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: '#1e293b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        border: '1px solid #334155',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar por nome ou slug..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              color: '#f8fafc',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>

        {/* Status Filter */}
        <select value={status} onChange={(e) => { setStatus(e.target.value as FilterStatus); setPage(1); }} style={selectStyle}>
          <option value="all">📊 Todos os Status</option>
          <option value="active">✅ Ativos</option>
          <option value="inactive">🚫 Inativos</option>
        </select>

        {/* Plan Filter */}
        <select value={plan} onChange={(e) => { setPlan(e.target.value as FilterPlan); setPage(1); }} style={selectStyle}>
          <option value="all">📦 Todos os Planos</option>
          <option value="FREE">Free</option>
          <option value="BASIC">Basic</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>

        {/* Sort */}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} style={selectStyle}>
          <option value="createdAt">📅 Data de criação</option>
          <option value="name">🔤 Nome</option>
          <option value="appointments">📆 Agendamentos</option>
          <option value="clients">👥 Clientes</option>
        </select>

        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          style={{
            padding: '10px 14px',
            background: '#334155',
            border: 'none',
            borderRadius: 8,
            color: '#f8fafc',
            cursor: 'pointer',
            fontSize: 16,
          }}
          title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: '#1e293b',
        borderRadius: 16,
        border: '1px solid #334155',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            Carregando...
          </div>
        ) : workspaces.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            Nenhuma empresa encontrada
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.5fr 80px 80px 80px 80px 180px',
              padding: '14px 20px',
              borderBottom: '1px solid #334155',
              background: '#0f172a',
              color: '#64748b',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <div>Empresa</div>
              <div>Proprietário</div>
              <div style={{ textAlign: 'center' }}>Clientes</div>
              <div style={{ textAlign: 'center' }}>Agend.</div>
              <div style={{ textAlign: 'center' }}>Plano</div>
              <div style={{ textAlign: 'center' }}>Status</div>
              <div style={{ textAlign: 'center' }}>Ações</div>
            </div>

            {/* Rows */}
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 80px 80px 80px 80px 180px',
                  padding: '14px 20px',
                  borderBottom: '1px solid #334155',
                  alignItems: 'center',
                  opacity: ws.isActive ? 1 : 0.5,
                  background: ws.isActive ? 'transparent' : '#0f172a',
                }}
              >
                {/* Empresa */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: ws.isActive 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : '#374151',
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
                    <div style={{ color: '#64748b', fontSize: 11 }}>/{ws.slug} • {formatDate(ws.createdAt)}</div>
                  </div>
                </div>

                {/* Owner */}
                <div>
                  {ws.owner ? (
                    <>
                      <div style={{ color: '#f8fafc', fontSize: 13 }}>{ws.owner.name}</div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>{ws.owner.email}</div>
                    </>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: 12 }}>-</span>
                  )}
                </div>

                {/* Clients */}
                <div style={{ textAlign: 'center', color: '#f8fafc', fontWeight: 500 }}>
                  {ws._count?.clients || 0}
                </div>

                {/* Appointments */}
                <div style={{ textAlign: 'center', color: '#f8fafc', fontWeight: 500 }}>
                  {ws._count?.appointments || 0}
                </div>

                {/* Plan */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    background: getPlanColor(ws.plan).bg,
                    color: getPlanColor(ws.plan).text,
                  }}>
                    {ws.plan}
                  </span>
                </div>

                {/* Status */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 600,
                    background: ws.isActive ? '#064e3b' : '#7f1d1d',
                    color: ws.isActive ? '#6ee7b7' : '#fca5a5',
                  }}>
                    {ws.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <button
                    onClick={() => handleImpersonate(ws)}
                    style={{
                      padding: '6px 10px',
                      background: '#3b82f6',
                      border: 'none',
                      borderRadius: 6,
                      color: 'white',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                    title="Acessar como esta empresa"
                  >
                    🔑
                  </button>
                  <button
                    onClick={() => handleToggleActive(ws)}
                    style={{
                      padding: '6px 10px',
                      background: ws.isActive ? '#dc2626' : '#10b981',
                      border: 'none',
                      borderRadius: 6,
                      color: 'white',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                    title={ws.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {ws.isActive ? '🚫' : '✅'}
                  </button>
                  <button
                    onClick={() => setDeleteModal({ workspace: ws, permanent: false })}
                    style={{
                      padding: '6px 10px',
                      background: '#7f1d1d',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fca5a5',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                    title="Excluir"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          marginTop: 24,
        }}>
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            style={{
              padding: '8px 12px',
              background: page === 1 ? '#1e293b' : '#334155',
              border: 'none',
              borderRadius: 6,
              color: page === 1 ? '#64748b' : '#f8fafc',
              cursor: page === 1 ? 'default' : 'pointer',
            }}
          >
            ⟪
          </button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 12px',
              background: page === 1 ? '#1e293b' : '#334155',
              border: 'none',
              borderRadius: 6,
              color: page === 1 ? '#64748b' : '#f8fafc',
              cursor: page === 1 ? 'default' : 'pointer',
            }}
          >
            ←
          </button>
          <span style={{ color: '#94a3b8', fontSize: 14, padding: '0 16px' }}>
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '8px 12px',
              background: page === totalPages ? '#1e293b' : '#334155',
              border: 'none',
              borderRadius: 6,
              color: page === totalPages ? '#64748b' : '#f8fafc',
              cursor: page === totalPages ? 'default' : 'pointer',
            }}
          >
            →
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            style={{
              padding: '8px 12px',
              background: page === totalPages ? '#1e293b' : '#334155',
              border: 'none',
              borderRadius: 6,
              color: page === totalPages ? '#64748b' : '#f8fafc',
              cursor: page === totalPages ? 'default' : 'pointer',
            }}
          >
            ⟫
          </button>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: 16,
            padding: 32,
            maxWidth: 480,
            width: '90%',
            border: '1px solid #334155',
          }}>
            <h3 style={{ margin: '0 0 16px', color: '#f8fafc', fontSize: 20 }}>
              {deleteModal.permanent ? '⚠️ Exclusão Permanente' : '🗑️ Excluir Empresa'}
            </h3>
            
            <p style={{ color: '#94a3b8', marginBottom: 20, lineHeight: 1.6 }}>
              {deleteModal.permanent ? (
                <>
                  Você está prestes a <strong style={{ color: '#dc2626' }}>excluir permanentemente</strong> a empresa 
                  <strong style={{ color: '#f8fafc' }}> "{deleteModal.workspace.name}"</strong>.
                  <br /><br />
                  Esta ação é <strong style={{ color: '#dc2626' }}>IRREVERSÍVEL</strong>. Todos os dados serão perdidos!
                </>
              ) : (
                <>
                  Escolha como deseja excluir a empresa 
                  <strong style={{ color: '#f8fafc' }}> "{deleteModal.workspace.name}"</strong>:
                </>
              )}
            </p>

            {/* Info da empresa */}
            <div style={{
              background: '#0f172a',
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
              fontSize: 13,
            }}>
              <div style={{ color: '#64748b', marginBottom: 8 }}>
                👤 {deleteModal.workspace._count.clients} clientes • 
                📅 {deleteModal.workspace._count.appointments} agendamentos
              </div>
              {deleteModal.workspace._count.appointments > 0 && !deleteModal.permanent && (
                <div style={{ color: '#fbbf24', fontSize: 12 }}>
                  ⚠️ Esta empresa tem agendamentos. Exclusão permanente não disponível.
                </div>
              )}
            </div>

            {!deleteModal.permanent && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    padding: '14px',
                    background: '#dc2626',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: deleting ? 0.5 : 1,
                  }}
                >
                  🚫 Desativar (Soft Delete)
                </button>
                
                {deleteModal.workspace._count.appointments === 0 && deleteModal.workspace._count.clients === 0 && (
                  <button
                    onClick={() => setDeleteModal({ ...deleteModal, permanent: true })}
                    style={{
                      padding: '14px',
                      background: 'transparent',
                      border: '2px solid #dc2626',
                      borderRadius: 8,
                      color: '#dc2626',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ⚠️ Excluir Permanentemente
                  </button>
                )}
              </div>
            )}

            {deleteModal.permanent && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: deleting ? 0.5 : 1,
                  marginBottom: 12,
                }}
              >
                {deleting ? 'Excluindo...' : '⚠️ CONFIRMAR EXCLUSÃO PERMANENTE'}
              </button>
            )}

            <button
              onClick={() => setDeleteModal(null)}
              disabled={deleting}
              style={{
                width: '100%',
                padding: '14px',
                background: '#334155',
                border: 'none',
                borderRadius: 8,
                color: '#f8fafc',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
