'use client';

import { useEffect, useState } from 'react';

interface AdminMessage {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'UPDATE' | 'MAINTENANCE' | 'FEATURE' | 'WARNING' | 'PROMOTION';
  isActive: boolean;
  startsAt: string;
  expiresAt: string | null;
  icon: string | null;
  actionLabel: string | null;
  actionUrl: string | null;
  dismissible: boolean;
  targetPlans: string[];
  viewCount: number;
  createdAt: string;
  _count?: { dismissals: number };
}

const THEME = {
  gold: '#a07a45',
  goldSoft: '#c9a66b',
  surface: '#fbf8f3',
  textPrimary: '#2f2a24',
  textSecondary: '#6e6256',
  textMuted: '#9b8e81',
  border: '#e4dbcf',
  success: '#2e7d32',
  error: '#c62828',
};

const TYPE_CONFIG: Record<AdminMessage['type'], { icon: string; color: string; label: string }> = {
  INFO: { icon: '📢', color: '#1976d2', label: 'Informativo' },
  UPDATE: { icon: '🚀', color: '#7b1fa2', label: 'Atualização' },
  MAINTENANCE: { icon: '🔧', color: '#f57c00', label: 'Manutenção' },
  FEATURE: { icon: '✨', color: '#388e3c', label: 'Novidade' },
  WARNING: { icon: '⚠️', color: '#d32f2f', label: 'Aviso' },
  PROMOTION: { icon: '🎁', color: '#e91e63', label: 'Promoção' },
};

const PLANS = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];

const defaultForm = {
  title: '',
  content: '',
  type: 'INFO' as AdminMessage['type'],
  isActive: true,
  startsAt: new Date().toISOString().slice(0, 16),
  expiresAt: '',
  icon: '',
  actionLabel: '',
  actionUrl: '',
  dismissible: true,
  targetPlans: [] as string[],
};

export default function AdminMensagensPage() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  async function fetchMessages() {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('isActive', filter === 'active' ? 'true' : 'false');

      const res = await fetch(`${API_URL}/admin/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch {
      setError('Erro ao carregar mensagens');
    }
    setLoading(false);
  }

  async function saveMessage() {
    const token = localStorage.getItem('token');
    setError(null);

    if (!form.title.trim()) {
      setError('Título é obrigatório');
      return;
    }
    if (!form.content.trim()) {
      setError('Conteúdo é obrigatório');
      return;
    }

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId 
      ? `${API_URL}/admin/messages/${editingId}` 
      : `${API_URL}/admin/messages`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          type: form.type,
          isActive: form.isActive,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
          icon: form.icon || null,
          actionLabel: form.actionLabel || null,
          actionUrl: form.actionUrl || null,
          dismissible: form.dismissible,
          targetPlans: form.targetPlans,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao salvar');
      }

      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
      setSuccess(editingId ? 'Mensagem atualizada!' : 'Mensagem criada!');
      fetchMessages();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar mensagem');
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm('Tem certeza que deseja remover esta mensagem?')) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/admin/messages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccess('Mensagem removida!');
        fetchMessages();
      }
    } catch {
      setError('Erro ao remover mensagem');
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    const token = localStorage.getItem('token');
    const endpoint = isActive ? 'deactivate' : 'activate';
    try {
      await fetch(`${API_URL}/admin/messages/${id}/${endpoint}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMessages();
    } catch {
      setError('Erro ao atualizar status');
    }
  }

  function handleEdit(msg: AdminMessage) {
    setForm({
      title: msg.title,
      content: msg.content,
      type: msg.type,
      isActive: msg.isActive,
      startsAt: msg.startsAt ? new Date(msg.startsAt).toISOString().slice(0, 16) : '',
      expiresAt: msg.expiresAt ? new Date(msg.expiresAt).toISOString().slice(0, 16) : '',
      icon: msg.icon || '',
      actionLabel: msg.actionLabel || '',
      actionUrl: msg.actionUrl || '',
      dismissible: msg.dismissible,
      targetPlans: msg.targetPlans || [],
    });
    setEditingId(msg.id);
    setShowForm(true);
  }

  function togglePlan(plan: string) {
    setForm(prev => ({
      ...prev,
      targetPlans: prev.targetPlans.includes(plan)
        ? prev.targetPlans.filter(p => p !== plan)
        : [...prev.targetPlans, plan],
    }));
  }

  const activeCount = messages.filter(m => m.isActive).length;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <h1 style={{ color: THEME.textPrimary, fontSize: 28, margin: 0 }}>
            📢 Mensagens Globais
          </h1>
          <p style={{ color: THEME.textMuted, margin: '4px 0 0', fontSize: 14 }}>
            Comunicados para todos os workspaces
          </p>
        </div>

        <div style={{
          background: THEME.surface,
          padding: '12px 20px',
          borderRadius: 12,
          border: `1px solid ${THEME.border}`,
          fontSize: 14,
        }}>
          <span style={{ color: THEME.textMuted }}>Ativas: </span>
          <strong style={{ color: THEME.gold }}>{activeCount}</strong>
          <span style={{ color: THEME.textMuted }}> / {messages.length}</span>
        </div>
      </div>

      {/* Mensagens */}
      {error && (
        <div style={{
          background: '#ffebee',
          color: THEME.error,
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          ❌ {error}
        </div>
      )}
      {success && (
        <div style={{
          background: '#e8f5e9',
          color: THEME.success,
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          ✅ {success}
        </div>
      )}

      {/* Filtros */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${filter === f ? THEME.gold : THEME.border}`,
              background: filter === f ? THEME.gold : 'white',
              color: filter === f ? 'white' : THEME.textSecondary,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Inativas'}
          </button>
        ))}
      </div>

      {/* Botão Adicionar */}
      {!showForm && (
        <button
          onClick={() => {
            setForm(defaultForm);
            setEditingId(null);
            setShowForm(true);
          }}
          style={{
            width: '100%',
            background: `linear-gradient(135deg, ${THEME.gold} 0%, ${THEME.goldSoft} 100%)`,
            color: 'white',
            border: 'none',
            padding: '16px 24px',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          ➕ Nova Mensagem
        </button>
      )}

      {/* Formulário */}
      {showForm && (
        <div style={{
          background: THEME.surface,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          border: `1px solid ${THEME.border}`,
        }}>
          <h3 style={{ margin: '0 0 20px', color: THEME.textPrimary }}>
            {editingId ? '✏️ Editar Mensagem' : '➕ Nova Mensagem'}
          </h3>

          <div style={{ display: 'grid', gap: 16 }}>
            {/* Título e Tipo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Nova funcionalidade disponível!"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                  Tipo
                </label>
                <select
                  value={form.type}
                  onChange={e => setForm(prev => ({ ...prev, type: e.target.value as AdminMessage['type'] }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: 'white',
                  }}
                >
                  {Object.entries(TYPE_CONFIG).map(([value, cfg]) => (
                    <option key={value} value={value}>{cfg.icon} {cfg.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conteúdo */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                Conteúdo *
              </label>
              <textarea
                value={form.content}
                onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Mensagem detalhada para os usuários..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  fontSize: 15,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Datas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                  Início
                </label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={e => setForm(prev => ({ ...prev, startsAt: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                  Expira em (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={e => setForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* CTA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                  Texto do Botão de Ação
                </label>
                <input
                  type="text"
                  value={form.actionLabel}
                  onChange={e => setForm(prev => ({ ...prev, actionLabel: e.target.value }))}
                  placeholder="Ex: Saiba mais"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                  Link do Botão
                </label>
                <input
                  type="url"
                  value={form.actionUrl}
                  onChange={e => setForm(prev => ({ ...prev, actionUrl: e.target.value }))}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Público-alvo */}
            <div>
              <label style={{ display: 'block', marginBottom: 10, color: THEME.textSecondary, fontSize: 14 }}>
                Público-alvo (vazio = todos)
              </label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {PLANS.map(plan => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => togglePlan(plan)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: `1px solid ${form.targetPlans.includes(plan) ? THEME.gold : THEME.border}`,
                      background: form.targetPlans.includes(plan) ? THEME.gold : 'white',
                      color: form.targetPlans.includes(plan) ? 'white' : THEME.textSecondary,
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {plan}
                  </button>
                ))}
              </div>
            </div>

            {/* Opções */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ color: THEME.textSecondary }}>Ativa</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.dismissible}
                  onChange={e => setForm(prev => ({ ...prev, dismissible: e.target.checked }))}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ color: THEME.textSecondary }}>Pode ser dispensada</span>
              </label>
            </div>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              onClick={saveMessage}
              style={{
                flex: 1,
                background: `linear-gradient(135deg, ${THEME.gold} 0%, ${THEME.goldSoft} 100%)`,
                color: 'white',
                border: 'none',
                padding: '14px 24px',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              {editingId ? '💾 Salvar Alterações' : '✅ Criar Mensagem'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(defaultForm);
              }}
              style={{
                padding: '14px 24px',
                borderRadius: 10,
                border: `1px solid ${THEME.border}`,
                background: 'white',
                color: THEME.textSecondary,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Mensagens */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: THEME.textMuted }}>
          ⏳ Carregando...
        </div>
      ) : messages.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 48,
          color: THEME.textMuted,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <p>Nenhuma mensagem encontrada.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {messages.map(msg => {
            const cfg = TYPE_CONFIG[msg.type];
            const isExpired = msg.expiresAt && new Date(msg.expiresAt) < new Date();
            
            return (
              <div
                key={msg.id}
                style={{
                  background: THEME.surface,
                  borderRadius: 12,
                  padding: 20,
                  border: `1px solid ${msg.isActive && !isExpired ? cfg.color : THEME.border}`,
                  borderLeftWidth: 4,
                  opacity: msg.isActive && !isExpired ? 1 : 0.7,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 28 }}>{cfg.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: THEME.textPrimary, fontSize: 16 }}>
                        {msg.title}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: cfg.color + '20',
                        color: cfg.color,
                      }}>
                        {cfg.label}
                      </span>
                      {!msg.isActive && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          background: '#f5f5f5',
                          color: THEME.textMuted,
                        }}>
                          Inativa
                        </span>
                      )}
                      {isExpired && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          background: '#ffebee',
                          color: THEME.error,
                        }}>
                          Expirada
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: THEME.textSecondary, fontSize: 14, lineHeight: 1.5 }}>
                      {msg.content}
                    </p>
                  </div>
                </div>

                {/* Meta */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  paddingTop: 12,
                  borderTop: `1px solid ${THEME.border}`,
                }}>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: THEME.textMuted }}>
                    <span>👁️ {msg.viewCount} views</span>
                    {msg._count && <span>❌ {msg._count.dismissals} dispensas</span>}
                    {msg.targetPlans.length > 0 && (
                      <span>🎯 {msg.targetPlans.join(', ')}</span>
                    )}
                    {!msg.dismissible && <span>🔒 Não dispensável</span>}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => toggleActive(msg.id, msg.isActive)}
                      title={msg.isActive ? 'Desativar' : 'Ativar'}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: `1px solid ${THEME.border}`,
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: 16,
                      }}
                    >
                      {msg.isActive ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={() => handleEdit(msg)}
                      title="Editar"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: `1px solid ${THEME.border}`,
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: 16,
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      title="Remover"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: `1px solid ${THEME.border}`,
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: 16,
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
