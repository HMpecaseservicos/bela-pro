'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  createdAt: string;
  workspace?: { name: string; slug: string };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  async function fetchUsers() {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search && { search }),
      });

      const res = await fetch(`${API_URL}/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Erro ao carregar usuários');

      const data = await res.json();
      // API returns { data: users[], pagination: {...} }
      const usersData = data.data || data.users || data;
      setUsers(usersData.map((u: any) => ({
        ...u,
        // Get first workspace from memberships
        workspace: u.memberships?.[0]?.workspace || null,
      })));
      setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSuperAdmin(user: User) {
    const action = user.isSuperAdmin ? 'remover' : 'promover a';
    if (!confirm(`Deseja ${action} super admin para "${user.name}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isSuperAdmin: !user.isSuperAdmin }),
      });

      if (!res.ok) throw new Error('Erro ao atualizar');
      fetchUsers();
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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f8fafc' }}>
            Usuários
          </h1>
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 15 }}>
            Gerenciar todos os usuários do sistema
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            border: 'none',
            borderRadius: 10,
            color: '#0f172a',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          ➕ Novo Super Admin
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>
          🔍
        </span>
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
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
        ) : users.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            Nenhum usuário encontrado
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 2fr 1.5fr 120px 100px',
              padding: '16px 20px',
              borderBottom: '1px solid #334155',
              background: '#0f172a',
              color: '#64748b',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <div>Usuário</div>
              <div>Email</div>
              <div>Empresa</div>
              <div style={{ textAlign: 'center' }}>Tipo</div>
              <div style={{ textAlign: 'center' }}>Ações</div>
            </div>

            {/* Rows */}
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 1.5fr 120px 100px',
                  padding: '16px 20px',
                  borderBottom: '1px solid #334155',
                  alignItems: 'center',
                }}
              >
                {/* User */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: user.isSuperAdmin 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                      : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: 14,
                  }}>
                    {user.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                    {user.name || 'Sem nome'}
                    {user.isSuperAdmin && (
                      <span style={{ 
                        marginLeft: 8, 
                        fontSize: 12,
                        color: '#fbbf24',
                      }}>
                        ⭐
                      </span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div style={{ color: '#94a3b8', fontSize: 13 }}>
                  {user.email}
                </div>

                {/* Workspace */}
                <div>
                  {user.workspace ? (
                    <div>
                      <div style={{ color: '#f8fafc', fontSize: 13 }}>{user.workspace.name}</div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>/{user.workspace.slug}</div>
                    </div>
                  ) : (
                    <span style={{ color: '#64748b', fontStyle: 'italic' }}>-</span>
                  )}
                </div>

                {/* Type */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: user.isSuperAdmin ? '#78350f' : '#1e3a5f',
                    color: user.isSuperAdmin ? '#fbbf24' : '#60a5fa',
                  }}>
                    {user.isSuperAdmin ? 'Super Admin' : 'Usuário'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleToggleSuperAdmin(user)}
                    style={{
                      padding: '8px 14px',
                      background: user.isSuperAdmin ? '#dc2626' : '#10b981',
                      border: 'none',
                      borderRadius: 8,
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                    title={user.isSuperAdmin ? 'Remover Super Admin' : 'Promover a Super Admin'}
                  >
                    {user.isSuperAdmin ? '⬇️ Rebaixar' : '⬆️ Promover'}
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
              color: page === totalPages ? 'gray' : '#f8fafc',
              cursor: page === totalPages ? 'default' : 'pointer',
            }}
          >
            Próxima →
          </button>
        </div>
      )}

      {/* Create Super Admin Modal */}
      {showCreateModal && (
        <CreateSuperAdminModal
          apiUrl={API_URL}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchUsers(); }}
        />
      )}
    </div>
  );
}

function CreateSuperAdminModal({ apiUrl, onClose, onCreated }: {
  apiUrl: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/admin/users/super-admin`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao criar');
      }

      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 10,
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1e293b',
        borderRadius: 16,
        padding: 32,
        width: 420,
        maxWidth: '90vw',
        border: '1px solid #334155',
      }}>
        <h2 style={{ margin: '0 0 24px', color: '#f8fafc', fontSize: 20, fontWeight: 600 }}>
          ➕ Novo Super Admin
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: '#7f1d1d',
              border: '1px solid #dc2626',
              borderRadius: 8,
              padding: 12,
              color: '#fecaca',
              fontSize: 13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: 14,
                background: '#334155',
                border: 'none',
                borderRadius: 10,
                color: '#f8fafc',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: 14,
                background: loading ? '#78350f' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                borderRadius: 10,
                color: '#0f172a',
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Criando...' : 'Criar Super Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
