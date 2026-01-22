'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Tipos de templates
interface MessageTemplate {
  id: string | null;
  eventType: string;
  label: string;
  description: string;
  message: string;
  enabled: boolean;
  allowClientReply: boolean;
  isCustomized: boolean;
}

interface TemplateVariable {
  key: string;
  label: string;
  example: string;
}

// Variáveis disponíveis para templates
const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: 'clientName', label: 'Nome do cliente', example: 'Maria' },
  { key: 'serviceName', label: 'Nome do serviço', example: 'Corte + Escova' },
  { key: 'date', label: 'Data do agendamento', example: '25/01/2026' },
  { key: 'time', label: 'Horário', example: '14:30' },
  { key: 'workspaceName', label: 'Nome do estabelecimento', example: 'Studio da Ana' },
];

export default function ComunicacaoPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [previewMessage, setPreviewMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Você precisa estar logado');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/message-templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError('Sessão expirada. Faça login novamente.');
        } else {
          setError('Erro ao carregar templates');
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  }

  async function toggleTemplate(eventType: string, enabled: boolean) {
    setSaving(eventType);
    setError(null);
    setSuccess(null);

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

      if (!res.ok) {
        setError('Erro ao atualizar template');
        return;
      }

      // Atualiza lista local
      setTemplates(prev =>
        prev.map(t => (t.eventType === eventType ? { ...t, enabled } : t))
      );
      setSuccess('Template atualizado!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Erro ao atualizar template');
    } finally {
      setSaving(null);
    }
  }

  async function saveTemplate(eventType: string) {
    setSaving(eventType);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/message-templates/${eventType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: editedMessage }),
      });

      if (!res.ok) {
        setError('Erro ao salvar template');
        return;
      }

      // Atualiza lista local
      setTemplates(prev =>
        prev.map(t =>
          t.eventType === eventType
            ? { ...t, message: editedMessage, isCustomized: true }
            : t
        )
      );
      setEditingTemplate(null);
      setSuccess('Mensagem salva com sucesso!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Erro ao salvar template');
    } finally {
      setSaving(null);
    }
  }

  async function resetTemplate(eventType: string) {
    if (!confirm('Restaurar mensagem padrão? Sua personalização será perdida.')) {
      return;
    }

    setSaving(eventType);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/message-templates/${eventType}/reset`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError('Erro ao restaurar template');
        return;
      }

      await loadTemplates();
      setSuccess('Mensagem restaurada!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Erro ao restaurar template');
    } finally {
      setSaving(null);
    }
  }

  function startEditing(template: MessageTemplate) {
    setEditingTemplate(template.eventType);
    setEditedMessage(template.message);
    updatePreview(template.message);
  }

  function cancelEditing() {
    setEditingTemplate(null);
    setEditedMessage('');
    setPreviewMessage('');
  }

  function updatePreview(message: string) {
    // Substitui variáveis por exemplos
    let preview = message;
    TEMPLATE_VARIABLES.forEach(v => {
      preview = preview.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.example);
    });
    setPreviewMessage(preview);
  }

  function insertVariable(key: string) {
    const variable = `{{${key}}}`;
    setEditedMessage(prev => prev + variable);
    updatePreview(editedMessage + variable);
  }

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 24 }}>⏳</div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 900, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14, color: '#666' }}>
        <Link href="/dashboard/config" style={{ color: '#8B5CF6', textDecoration: 'none' }}>
          ⚙️ Configurações
        </Link>
        {' › '}
        <span>Comunicação</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 28, fontWeight: 600 }}>
          📱 Mensagens Automáticas
        </h1>
        <p style={{ margin: '8px 0 0', color: '#666', lineHeight: 1.5 }}>
          Configure os templates de mensagem para cada evento. O envio é feito manualmente via WhatsApp.
        </p>
      </div>

      {/* Alertas */}
      {error && (
        <div style={{
          padding: 16,
          background: '#FEE2E2',
          border: '1px solid #EF4444',
          borderRadius: 8,
          marginBottom: 24,
          color: '#DC2626',
        }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: 16,
          background: '#D1FAE5',
          border: '1px solid #10B981',
          borderRadius: 8,
          marginBottom: 24,
          color: '#059669',
        }}>
          ✅ {success}
        </div>
      )}

      {/* Nota informativa */}
      <div style={{
        padding: 16,
        background: '#F3F4F6',
        borderRadius: 8,
        marginBottom: 24,
        fontSize: 14,
        lineHeight: 1.6,
      }}>
        <strong>ℹ️ Como funciona:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li>Configure as mensagens para cada tipo de evento</li>
          <li>Use as variáveis disponíveis (ex: {'{{clientName}}'})</li>
          <li>O envio é feito manualmente pela tela de agendamentos</li>
          <li>O WhatsApp será aberto com a mensagem pronta</li>
        </ul>
      </div>

      {/* Lista de Templates */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {templates.map(template => (
          <div
            key={template.eventType}
            style={{
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              padding: 20,
              opacity: template.enabled ? 1 : 0.6,
            }}
          >
            {/* Header do template */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  {template.label}
                  {template.isCustomized && (
                    <span style={{
                      marginLeft: 8,
                      fontSize: 11,
                      background: '#8B5CF6',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}>
                      Personalizado
                    </span>
                  )}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
                  {template.description}
                </p>
              </div>

              {/* Toggle */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}>
                <span style={{ fontSize: 13, color: '#666' }}>
                  {template.enabled ? 'Ativo' : 'Inativo'}
                </span>
                <div
                  onClick={() => toggleTemplate(template.eventType, !template.enabled)}
                  style={{
                    width: 44,
                    height: 24,
                    background: template.enabled ? '#8B5CF6' : '#D1D5DB',
                    borderRadius: 12,
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 20,
                    height: 20,
                    background: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: 2,
                    left: template.enabled ? 22 : 2,
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </label>
            </div>

            {/* Modo edição */}
            {editingTemplate === template.eventType ? (
              <div>
                {/* Variáveis disponíveis */}
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                    Clique para inserir variável:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {TEMPLATE_VARIABLES.map(v => (
                      <button
                        key={v.key}
                        onClick={() => insertVariable(v.key)}
                        style={{
                          padding: '4px 8px',
                          background: '#F3F4F6',
                          border: '1px solid #D1D5DB',
                          borderRadius: 4,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                        title={`${v.label} (ex: ${v.example})`}
                      >
                        {`{{${v.key}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  value={editedMessage}
                  onChange={e => {
                    setEditedMessage(e.target.value);
                    updatePreview(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    minHeight: 120,
                    padding: 12,
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    fontSize: 14,
                    lineHeight: 1.5,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  placeholder="Digite a mensagem..."
                />

                {/* Preview */}
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: '#F0FDF4',
                  borderRadius: 8,
                  border: '1px solid #BBF7D0',
                }}>
                  <p style={{ fontSize: 12, color: '#166534', marginBottom: 8, fontWeight: 500 }}>
                    👁️ Preview:
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    whiteSpace: 'pre-wrap',
                    color: '#333',
                  }}>
                    {previewMessage || '(mensagem vazia)'}
                  </p>
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => saveTemplate(template.eventType)}
                    disabled={saving === template.eventType}
                    style={{
                      padding: '10px 20px',
                      background: '#8B5CF6',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: saving ? 'wait' : 'pointer',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving === template.eventType ? 'Salvando...' : '💾 Salvar'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    style={{
                      padding: '10px 20px',
                      background: '#F3F4F6',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: 8,
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Mensagem atual */}
                <div style={{
                  padding: 12,
                  background: '#F9FAFB',
                  borderRadius: 8,
                  marginBottom: 12,
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    whiteSpace: 'pre-wrap',
                    color: '#374151',
                    lineHeight: 1.6,
                  }}>
                    {template.message}
                  </p>
                </div>

                {/* Botões */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => startEditing(template)}
                    style={{
                      padding: '8px 16px',
                      background: '#8B5CF6',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Editar
                  </button>
                  {template.isCustomized && (
                    <button
                      onClick={() => resetTemplate(template.eventType)}
                      style={{
                        padding: '8px 16px',
                        background: '#F3F4F6',
                        color: '#374151',
                        border: '1px solid #D1D5DB',
                        borderRadius: 6,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      🔄 Restaurar padrão
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
