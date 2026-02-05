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
  owner?: { name: string; email: string };
  _count: { members: number; appointments: number; clients: number; services: number };
}

export default function AdminWorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchWorkspaces();
  }, [page, search]);

  async function fetchWorkspaces() {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        ...(search && { search }),
      });

      const res = await fetch(`${API_URL}/admin/workspaces?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Erro ao carregar workspaces');

      const data = await res.json();
      // API returns { data: workspaces[], pagination: {...} }
      setWorkspaces(data.data || data.workspaces || data);
      setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleImpersonate(workspaceId: string, workspaceName: string) {
    if (!confirm(`Deseja acessar como a empresa "${workspaceName}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/impersonate/${workspaceId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Erro ao impersonar');

      const data = await res.json();
      // Save the impersonation token
      localStorage.setItem('original_token', token || '');
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('impersonating', 'true');
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleToggleActive(workspace: Workspace) {
    const action = workspace.isActive ? 'desativar' : 'ativar';
    if (!confirm(`Deseja ${action} a empresa "${workspace.name}"?`)) return;

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

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    paddingLeft: 44,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
  };

  const buttonStyle = (variant: 'primary' | 'danger' | 'success') => ({
    padding: '8px 14px',
    background: variant === 'primary' ? '#3b82f6' : variant === 'danger' ? '#dc2626' : '#10b981',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f8fafc' }}>
            Empresas
          </h1>
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 15 }}>
            Gerenciar todos os workspaces do sistema
          </p>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>
          🔍
        </span>
        <input
          type="text"
          placeholder="Buscar por nome ou slug..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={inputStyle}
        />
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
              gridTemplateColumns: '2fr 1fr 80px 80px 80px 100px 140px',
              padding: '16px 20px',
              borderBottom: '1px solid #334155',
              background: '#0f172a',
              color: '#64748b',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <div>Empresa</div>
              <div>Proprietário</div>
              <div style={{ textAlign: 'center' }}>Membros</div>
              <div style={{ textAlign: 'center' }}>Clientes</div>
              <div style={{ textAlign: 'center' }}>Agend.</div>
              <div style={{ textAlign: 'center' }}>Status</div>
              <div style={{ textAlign: 'center' }}>Ações</div>
            </div>

            {/* Rows */}
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 80px 80px 80px 100px 140px',
                  padding: '16px 20px',
                  borderBottom: '1px solid #334155',
                  alignItems: 'center',
                  opacity: ws.isActive ? 1 : 0.6,
                }}
              >
                {/* Empresa */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                  }}>
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>{ws.name}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>/{ws.slug}</div>
                  </div>
                </div>

                {/* Owner */}
                <div>
                  <div style={{ color: '#f8fafc', fontSize: 13 }}>{ws.owner?.name || '-'}</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>{ws.owner?.email || ''}</div>
                </div>

                {/* Members */}
                <div style={{ textAlign: 'center', color: '#f8fafc', fontWeight: 500 }}>
                  {ws._count?.members || 0}
                </div>

                {/* Clients */}
                <div style={{ textAlign: 'center', color: '#f8fafc', fontWeight: 500 }}>
                  {ws._count?.clients || 0}
                </div>

                {/* Appointments */}
                <div style={{ textAlign: 'center', color: '#f8fafc', fontWeight: 500 }}>
                  {ws._count?.appointments || 0}
                </div>

                {/* Status */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: ws.isActive ? '#064e3b' : '#7f1d1d',
                    color: ws.isActive ? '#6ee7b7' : '#fca5a5',
                  }}>
                    {ws.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button
                    onClick={() => handleImpersonate(ws.id, ws.name)}
                    style={buttonStyle('primary')}
                    title="Acessar como esta empresa"
                  >
                    🔑 Acessar
                  </button>
                  <button
                    onClick={() => handleToggleActive(ws)}
                    style={buttonStyle(ws.isActive ? 'danger' : 'success')}
                    title={ws.isActive ? 'Desativar empresa' : 'Ativar empresa'}
                  >
                    {ws.isActive ? '🚫' : '✅'}
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
          gap: 8,
          marginTop: 24,
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '10px 16px',
              background: page === 1 ? '#1e293b' : '#334155',
              border: 'none',
              borderRadius: 8,
              color: page === 1 ? '#64748b' : '#f8fafc',
              cursor: page === 1 ? 'default' : 'pointer',
            }}
          >
            ← Anterior
          </button>
          <span style={{
            padding: '10px 20px',
            background: '#1e293b',
            borderRadius: 8,
            color: '#f8fafc',
          }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '10px 16px',
              background: page === totalPages ? '#1e293b' : '#334155',
              border: 'none',
              borderRadius: 8,
              color: page === totalPages ? '#64748b' : '#f8fafc',
              cursor: page === totalPages ? 'default' : 'pointer',
            }}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
