'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TeamMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'STAFF';
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    createdAt: string;
  };
}

interface PendingInvite {
  id: string;
  email: string;
  role: 'OWNER' | 'STAFF';
  expiresAt: string;
  createdAt: string;
}

export default function EquipePage() {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'STAFF' as 'OWNER' | 'STAFF' });
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'OWNER' | 'STAFF' | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchTeam();
    fetchPendingInvites();
    fetchCurrentUser();
  }, []);

  async function fetchPendingInvites() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/team/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(data);
      }
    } catch {
      // Ignore - might not have permission
    }
  }

  async function fetchCurrentUser() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUserRole(data.role);
      }
    } catch {
      // Ignore
    }
  }

  async function fetchTeam() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/team`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInviting(true);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/team/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(inviteForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao convidar');
      }

      setSuccess(data.message || 'Convite enviado com sucesso!');
      if (data.inviteUrl) {
        setInviteUrl(data.inviteUrl);
      }
      setShowInviteModal(false);
      setInviteForm({ email: '', name: '', role: 'STAFF' });
      fetchPendingInvites();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao convidar');
    } finally {
      setInviting(false);
    }
  }

  async function cancelInvite(inviteId: string) {
    if (!confirm('Cancelar este convite?')) return;
    
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/team/invites/${inviteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPendingInvites();
      setSuccess('Convite cancelado');
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleMemberStatus(member: TeamMember) {
    if (currentUserRole !== 'OWNER') return;
    
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/team/${member.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      fetchTeam();
    } catch (err) {
      console.error(err);
    }
  }

  async function removeMember(member: TeamMember) {
    if (currentUserRole !== 'OWNER') return;
    if (!confirm(`Remover ${member.user.name} da equipe?`)) return;

    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/team/${member.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTeam();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const activeMembers = members.filter(m => m.isActive);
  const inactiveMembers = members.filter(m => !m.isActive);

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 900 }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        gap: isMobile ? 16 : 0,
        marginBottom: isMobile ? 20 : 32 
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>Equipe</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: isMobile ? 13 : 15 }}>
            Gerencie os membros da sua equipe
          </p>
        </div>
        {currentUserRole === 'OWNER' && (
          <button
            onClick={() => setShowInviteModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: isMobile ? '14px 20px' : '12px 24px',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            + Convidar membro
          </button>
        )}
      </div>

      {success && (
        <div style={{ 
          background: '#d1fae5', 
          border: '1px solid #a7f3d0', 
          color: '#059669', 
          padding: isMobile ? 12 : 16, 
          borderRadius: 12, 
          marginBottom: isMobile ? 16 : 24,
          fontSize: isMobile ? 13 : 14,
        }}>
          ✅ {success}
          {inviteUrl && (
            <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.5)', borderRadius: 6, fontSize: 12, wordBreak: 'break-all' }}>
              <strong>Link de convite:</strong>{' '}
              <a href={inviteUrl} target="_blank" rel="noreferrer" style={{ color: '#047857' }}>{inviteUrl}</a>
              <button 
                onClick={() => { navigator.clipboard.writeText(inviteUrl); }}
                style={{ marginLeft: 8, padding: '2px 8px', fontSize: 11, background: '#059669', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Copiar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
        gap: isMobile ? 12 : 16, 
        marginBottom: isMobile ? 20 : 32 
      }}>
        <div style={{ 
          background: 'white', 
          borderRadius: isMobile ? 12 : 16, 
          padding: isMobile ? 16 : 24, 
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)' 
        }}>
          <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, color: '#667eea' }}>{activeMembers.length}</div>
          <div style={{ fontSize: isMobile ? 12 : 14, color: '#64748b', marginTop: 4 }}>Membros ativos</div>
        </div>
        <div style={{ 
          background: 'white', 
          borderRadius: isMobile ? 12 : 16, 
          padding: isMobile ? 16 : 24, 
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)' 
        }}>
          <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, color: '#10b981' }}>
            {activeMembers.filter(m => m.role === 'OWNER').length}
          </div>
          <div style={{ fontSize: isMobile ? 12 : 14, color: '#64748b', marginTop: 4 }}>Proprietários</div>
        </div>
        <div style={{ 
          background: 'white', 
          borderRadius: isMobile ? 12 : 16, 
          padding: isMobile ? 16 : 24, 
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          gridColumn: isMobile ? '1 / -1' : 'auto',
        }}>
          <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, color: '#3b82f6' }}>
            {activeMembers.filter(m => m.role === 'STAFF').length}
          </div>
          <div style={{ fontSize: isMobile ? 12 : 14, color: '#64748b', marginTop: 4 }}>Colaboradores</div>
        </div>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && currentUserRole === 'OWNER' && (
        <div style={{ 
          background: 'white', 
          borderRadius: isMobile ? 12 : 16, 
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          marginBottom: isMobile ? 16 : 24,
        }}>
          <div style={{ padding: isMobile ? 16 : '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 600, color: '#1e293b' }}>
              ✉️ Convites pendentes ({pendingInvites.length})
            </h2>
          </div>
          {pendingInvites.map((invite, i) => (
            <div
              key={invite.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 12 : 16,
                padding: isMobile ? 16 : '16px 24px',
                borderBottom: i < pendingInvites.length - 1 ? '1px solid #f8fafc' : 'none',
              }}
            >
              <div style={{
                width: isMobile ? 44 : 52,
                height: isMobile ? 44 : 52,
                background: '#f1f5f9',
                borderRadius: isMobile ? 12 : 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: 22,
                flexShrink: 0,
              }}>
                ⏳
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: isMobile ? 14 : 16 }}>
                    {invite.email}
                  </span>
                  <span style={{
                    background: invite.role === 'OWNER' ? '#dbeafe' : '#f1f5f9',
                    color: invite.role === 'OWNER' ? '#2563eb' : '#64748b',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    {invite.role === 'OWNER' ? 'Proprietário' : 'Colaborador'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: isMobile ? 12 : 13, color: '#94a3b8' }}>
                  Expira em {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => cancelInvite(invite.id)}
                style={{
                  padding: isMobile ? '8px 12px' : '8px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  background: 'white',
                  color: '#64748b',
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Members List */}
      <div style={{ 
        background: 'white', 
        borderRadius: isMobile ? 12 : 16, 
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: isMobile ? 16 : '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 600, color: '#1e293b' }}>
            👥 Membros da equipe
          </h2>
        </div>

        {activeMembers.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
            <p style={{ margin: 0 }}>Nenhum membro na equipe ainda</p>
          </div>
        ) : (
          activeMembers.map((member, i) => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 12 : 16,
                padding: isMobile ? 16 : '16px 24px',
                borderBottom: i < activeMembers.length - 1 ? '1px solid #f8fafc' : 'none',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: isMobile ? 44 : 52,
                height: isMobile ? 44 : 52,
                background: member.role === 'OWNER' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: isMobile ? 12 : 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: isMobile ? 18 : 20,
                flexShrink: 0,
              }}>
                {member.user.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  flexWrap: 'wrap',
                }}>
                  <span style={{ 
                    fontWeight: 600, 
                    color: '#1e293b', 
                    fontSize: isMobile ? 14 : 16,
                  }}>
                    {member.user.name}
                  </span>
                  <span style={{
                    background: member.role === 'OWNER' ? '#dbeafe' : '#f1f5f9',
                    color: member.role === 'OWNER' ? '#2563eb' : '#64748b',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    {member.role === 'OWNER' ? 'Proprietário' : 'Colaborador'}
                  </span>
                </div>
                <p style={{ 
                  margin: '4px 0 0', 
                  fontSize: isMobile ? 12 : 13, 
                  color: '#64748b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {member.user.email}
                </p>
              </div>

              {/* Actions */}
              {currentUserRole === 'OWNER' && member.role !== 'OWNER' && (
                <button
                  onClick={() => removeMember(member)}
                  style={{
                    padding: isMobile ? '8px 12px' : '8px 16px',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {isMobile ? '✕' : 'Remover'}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: isMobile ? 16 : 20,
            padding: isMobile ? 20 : 32,
            width: '100%',
            maxWidth: 440,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#1a1a2e' }}>
              Convidar membro
            </h2>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: isMobile ? 13 : 14 }}>
              Adicione um novo membro à sua equipe
            </p>

            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: 12,
                borderRadius: 10,
                marginBottom: 16,
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleInvite}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151', fontSize: 13 }}>
                  Nome (opcional)
                </label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="Nome do convidado"
                  style={{
                    width: '100%',
                    padding: 14,
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    fontSize: 15,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151', fontSize: 13 }}>
                  E-mail *
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  required
                  style={{
                    width: '100%',
                    padding: 14,
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    fontSize: 15,
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  O convidado receberá um link para criar sua senha
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151', fontSize: 13 }}>
                  Função
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setInviteForm({ ...inviteForm, role: 'STAFF' })}
                    style={{
                      flex: 1,
                      padding: 12,
                      border: `2px solid ${inviteForm.role === 'STAFF' ? '#667eea' : '#e5e7eb'}`,
                      borderRadius: 10,
                      background: inviteForm.role === 'STAFF' ? '#eff3ff' : 'white',
                      color: inviteForm.role === 'STAFF' ? '#667eea' : '#64748b',
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    Colaborador
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteForm({ ...inviteForm, role: 'OWNER' })}
                    style={{
                      flex: 1,
                      padding: 12,
                      border: `2px solid ${inviteForm.role === 'OWNER' ? '#667eea' : '#e5e7eb'}`,
                      borderRadius: 10,
                      background: inviteForm.role === 'OWNER' ? '#eff3ff' : 'white',
                      color: inviteForm.role === 'OWNER' ? '#667eea' : '#64748b',
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    Proprietário
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => { setShowInviteModal(false); setError(''); }}
                  style={{
                    flex: 1,
                    padding: 14,
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    background: 'white',
                    color: '#64748b',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  style={{
                    flex: 1,
                    padding: 14,
                    border: 'none',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: inviting ? 'wait' : 'pointer',
                    fontSize: 14,
                    opacity: inviting ? 0.7 : 1,
                  }}
                >
                  {inviting ? 'Enviando...' : 'Convidar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
