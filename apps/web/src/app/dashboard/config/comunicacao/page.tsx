'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface MessageEvent {
  type: string;
  label: string;
  description: string;
}

interface TemplateVariable {
  key: string;
  label: string;
  example: string;
}

interface MessageTemplate {
  eventType: string;
  message: string;
  enabled: boolean;
  isDefault: boolean;
}

export default function ComunicacaoPage() {
  const router = useRouter();
  const [events, setEvents] = useState<MessageEvent[]>([]);
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Carregar eventos disponíveis e templates
      const [eventsRes, templatesRes] = await Promise.all([
        fetch(`${API_URL}/message-templates/events`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/message-templates`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!eventsRes.ok || !templatesRes.ok) {
        if (eventsRes.status === 401 || templatesRes.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Erro ao carregar dados');
      }

      const eventsData = await eventsRes.json();
      const templatesData = await templatesRes.json();

      setEvents(eventsData.events || []);
      setVariables(eventsData.variables || []);
      setTemplates(templatesData || []);
    } catch (err) {
      console.error('Erro ao carregar:', err);
      setError('Erro ao carregar templates de mensagem');
    } finally {
      setLoading(false);
    }
  }

  function getTemplate(eventType: string): MessageTemplate | undefined {
    return templates.find(t => t.eventType === eventType);
  }

  function handleSelectEvent(eventType: string) {
    const template = getTemplate(eventType);
    setSelectedEvent(eventType);
    setEditingMessage(template?.message || '');
    setError(null);
  }

  async function handleToggle(eventType: string, enabled: boolean) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/message-templates/${eventType}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      });

      if (!res.ok) throw new Error('Erro ao atualizar');

      // Atualizar estado local
      setTemplates(prev =>
        prev.map(t =>
          t.eventType === eventType ? { ...t, enabled } : t
        )
      );
    } catch (err) {
      console.error('Erro ao toggle:', err);
      setError('Erro ao atualizar status');
    }
  }

  async function handleSave() {
    if (!selectedEvent) return;

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/message-templates/${selectedEvent}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: editingMessage }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao salvar');
      }

      const updated = await res.json();

      // Atualizar estado local
      setTemplates(prev => {
        const exists = prev.find(t => t.eventType === selectedEvent);
        if (exists) {
          return prev.map(t =>
            t.eventType === selectedEvent ? { ...t, message: editingMessage, isDefault: false } : t
          );
        } else {
          return [...prev, { eventType: selectedEvent, message: editingMessage, enabled: true, isDefault: false }];
        }
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      setError(err.message || 'Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!selectedEvent) return;
    if (!confirm('Restaurar mensagem padrão? Suas alterações serão perdidas.')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/message-templates/${selectedEvent}/reset`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Erro ao restaurar');

      // Recarregar dados
      await loadData();
      // Atualizar mensagem no editor
      const templatesRes = await fetch(`${API_URL}/message-templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const templatesData = await templatesRes.json();
      const template = templatesData.find((t: MessageTemplate) => t.eventType === selectedEvent);
      if (template) {
        setEditingMessage(template.message || '');
      }
    } catch (err) {
      console.error('Erro ao restaurar:', err);
      setError('Erro ao restaurar template padrão');
    }
  }

  if (loading) {
    return (
      <div style={{ padding: isMobile ? 16 : 32, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 16 }}>⏳</div>
          <p style={{ color: '#64748b' }}>Carregando templates...</p>
        </div>
      </div>
    );
  }

  const selectedEventMeta = events.find(e => e.type === selectedEvent);

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button
            onClick={() => router.push('/dashboard/config')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>
            Mensagens
          </h1>
        </div>
        <p style={{ margin: '8px 0 0 36px', color: '#64748b', fontSize: isMobile ? 13 : 15 }}>
          Personalize as mensagens enviadas aos clientes em cada evento
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          color: '#dc2626',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* Lista de eventos */}
        <div style={{ flex: isMobile ? 'none' : '0 0 320px' }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              fontWeight: 600,
              color: '#334155',
            }}>
              Tipos de Mensagem
            </div>
            {events.map((event) => {
              const template = getTemplate(event.type);
              const isSelected = selectedEvent === event.type;
              return (
                <div
                  key={event.type}
                  onClick={() => handleSelectEvent(event.type)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: isSelected ? '#f0f9ff' : 'white',
                    borderLeft: isSelected ? '3px solid #667eea' : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>
                        {event.label}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {event.description}
                      </div>
                    </div>
                    <label
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', marginLeft: 12 }}
                    >
                      <input
                        type="checkbox"
                        checked={template?.enabled ?? true}
                        onChange={(e) => handleToggle(event.type, e.target.checked)}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                    </label>
                  </div>
                  {template && !template.isDefault && (
                    <div style={{
                      marginTop: 8,
                      fontSize: 11,
                      color: '#667eea',
                      fontWeight: 500,
                    }}>
                      ✏️ Personalizado
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor de mensagem */}
        <div style={{ flex: 1 }}>
          {selectedEvent ? (
            <div style={{
              background: 'white',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: isMobile ? 16 : 24,
            }}>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1e293b' }}>
                  {selectedEventMeta?.label}
                </h3>
                <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748b' }}>
                  {selectedEventMeta?.description}
                </p>
              </div>

              {/* Variáveis disponíveis */}
              <div style={{
                background: '#f8fafc',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  Variáveis disponíveis (clique para inserir):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {variables.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => setEditingMessage(prev => prev + `{{${v.key}}}`)}
                      style={{
                        background: '#e2e8f0',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                        color: '#334155',
                      }}
                      title={`${v.label} - ex: ${v.example}`}
                    >
                      {'{{' + v.key + '}}'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <textarea
                value={editingMessage}
                onChange={(e) => setEditingMessage(e.target.value)}
                rows={8}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
                placeholder="Digite a mensagem..."
              />

              {/* Preview */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  Pré-visualização:
                </div>
                <div style={{
                  background: '#dcf8c6',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  whiteSpace: 'pre-wrap',
                  maxWidth: 350,
                  lineHeight: 1.5,
                }}>
                  {editingMessage
                    .replace(/\{\{clientName\}\}/g, 'Maria')
                    .replace(/\{\{serviceName\}\}/g, 'Corte + Escova')
                    .replace(/\{\{date\}\}/g, '30/01/2026')
                    .replace(/\{\{time\}\}/g, '14:30')
                    .replace(/\{\{workspaceName\}\}/g, 'Studio da Ana')
                  }
                </div>
              </div>

              {/* Botões */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 20,
                gap: 12,
                flexWrap: 'wrap',
              }}>
                <button
                  onClick={handleReset}
                  style={{
                    padding: '10px 16px',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 14,
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  Restaurar Padrão
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    background: saving ? '#94a3b8' : '#667eea',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'white',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'white',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: 40,
              textAlign: 'center',
              color: '#64748b',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <p>Selecione um tipo de mensagem para editar</p>
            </div>
          )}
        </div>
      </div>

      {/* Info card */}
      <div style={{
        marginTop: 24,
        background: '#fef3c7',
        border: '1px solid #fcd34d',
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <div>
            <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
              Como funciona
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#a16207', lineHeight: 1.6 }}>
              Personalize as mensagens que serão enviadas aos seus clientes em cada evento. 
              Use as variáveis disponíveis para incluir informações dinâmicas como nome do cliente, 
              data e horário do agendamento. As mensagens podem ser copiadas para enviar manualmente 
              pelo WhatsApp ou integradas futuramente com automações.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
