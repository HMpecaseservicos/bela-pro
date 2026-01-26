'use client';

import { useEffect, useState } from 'react';

interface ConversationListItem {
  id: string;
  phoneE164: string;
  state: string;
  isHumanHandoff: boolean;
  lastMessage: string | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ConversationDetails {
  id: string;
  phoneE164: string;
  state: string;
  isHumanHandoff: boolean;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    direction: 'in' | 'out' | string;
    text: string;
    createdAt: string;
  }>;
}

interface WhatsAppConnectionStatus {
  hasInstance: boolean;
  instanceName: string | null;
  connectionState: string | null;
  webhookUrl: string | null;
  lastConnectedAt: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function extractErrorMessage(json: unknown, fallback: string): string {
  if (!isRecord(json)) return fallback;
  const directError = json.error;
  if (typeof directError === 'string' && directError.trim()) return directError;

  const message = json.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) {
    const first = message.find(m => typeof m === 'string' && m.trim());
    if (typeof first === 'string') return first;
  }

  return fallback;
}

function isConversationListItem(value: unknown): value is ConversationListItem {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.phoneE164) &&
    isString(value.state) &&
    isBoolean(value.isHumanHandoff) &&
    (value.lastMessage === null || isString(value.lastMessage)) &&
    isString(value.lastMessageAt) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isConversationDetails(value: unknown): value is ConversationDetails {
  if (!isRecord(value)) return false;
  if (!isString(value.id)) return false;
  if (!isString(value.phoneE164)) return false;
  if (!isString(value.state)) return false;
  if (!isBoolean(value.isHumanHandoff)) return false;
  if (!isString(value.createdAt)) return false;
  if (!isString(value.updatedAt)) return false;

  if (!Array.isArray(value.messages)) return false;
  return value.messages.every(m =>
    isRecord(m) &&
    isString(m.id) &&
    isString(m.direction) &&
    isString(m.text) &&
    isString(m.createdAt),
  );
}

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default function ChatbotPage() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [waStatus, setWaStatus] = useState<WhatsAppConnectionStatus | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadConversations() {
      try {
        setError(null);
        setLoading(true);

        const token = localStorage.getItem('token');
        if (!token) {
          window.location.href = '/login';
          return;
        }

        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/chatbot/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const maybeError = isRecord(json) ? json.error : undefined;
          throw new Error(typeof maybeError === 'string' ? maybeError : `Erro ao carregar conversas (${res.status})`);
        }

        if (!isRecord(json) || !Array.isArray(json.data)) {
          throw new Error('Resposta inválida do servidor');
        }

        const items = (json.data as unknown[]).filter(isConversationListItem);
        if (isMounted) {
          setConversations(items);
        }
      } catch (e) {
        if (isMounted) {
          setError(e instanceof Error ? e.message : 'Erro desconhecido');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadConversations();

    const interval = window.setInterval(loadConversations, 10000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadWhatsAppStatus() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/chatbot/whatsapp/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          return;
        }

        if (!isRecord(json) || !isRecord(json.data)) {
          return;
        }

        const data = json.data as Record<string, unknown>;
        const parsed: WhatsAppConnectionStatus = {
          hasInstance: Boolean(data.hasInstance),
          instanceName: isString(data.instanceName) ? data.instanceName : null,
          connectionState: isString(data.connectionState) ? data.connectionState : null,
          webhookUrl: isString(data.webhookUrl) ? data.webhookUrl : null,
          lastConnectedAt: isString(data.lastConnectedAt) ? data.lastConnectedAt : null,
        };

        if (isMounted) {
          setWaStatus(parsed);
        }
      } catch {
        // ignore
      }
    }

    loadWhatsAppStatus();
    const interval = window.setInterval(loadWhatsAppStatus, 10000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadConversationDetails(conversationId: string) {
      try {
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
          window.location.href = '/login';
          return;
        }

        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/chatbot/conversation/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const maybeError = isRecord(json) ? json.error : undefined;
          throw new Error(typeof maybeError === 'string' ? maybeError : `Erro ao carregar conversa (${res.status})`);
        }

        if (!isRecord(json) || !isRecord(json.data)) {
          throw new Error('Resposta inválida do servidor');
        }

        if (!isConversationDetails(json.data)) {
          throw new Error('Resposta inválida do servidor');
        }

        if (isMounted) {
          setSelectedConversation(json.data);
        }
      } catch (e) {
        if (isMounted) {
          setError(e instanceof Error ? e.message : 'Erro desconhecido');
        }
      }
    }

    if (selectedConversationId) {
      loadConversationDetails(selectedConversationId);
    } else {
      setSelectedConversation(null);
    }

    return () => {
      isMounted = false;
    };
  }, [selectedConversationId]);

  const conversationsToday = conversations.filter(c => isToday(new Date(c.lastMessageAt || c.createdAt))).length;
  const viaBot = conversations.filter(c => !c.isHumanHandoff).length;
  const conversionRate = conversations.length === 0 ? 0 : Math.round((viaBot / conversations.length) * 100);

  const waConnected = (waStatus?.connectionState || '').toLowerCase().includes('open');

  async function handleGenerateQr() {
    try {
      setError(null);
      setLoadingQr(true);
      setQrBase64(null);

      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/chatbot/whatsapp/qrcode`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(extractErrorMessage(json, `Erro ao gerar QR Code (${res.status})`));
      }

      if (!isRecord(json) || !isRecord(json.data)) {
        throw new Error('Resposta inválida do servidor');
      }

      const base64 = (json.data as Record<string, unknown>).base64;
      if (!isString(base64) || base64.length < 20) {
        throw new Error('QR Code não disponível (tente novamente)');
      }

      setQrBase64(base64);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoadingQr(false);
    }
  }

  async function handleDisconnectWhatsApp() {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/chatbot/whatsapp/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Erro ao desconectar (${res.status})`);
      }

      setQrBase64(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    }
  }

  return (
    <div style={{ padding: isMobile ? 16 : 32, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>Chatbot</h1>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: isMobile ? 13 : 15 }}>Gerencie conversas e automações</p>
      </div>

      {/* WhatsApp Connection */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: isMobile ? 14 : 18,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        marginBottom: isMobile ? 16 : 20,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: waConnected ? '#10b981' : '#f59e0b' }} />
            <div style={{ fontWeight: 700, color: '#0f172a' }}>WhatsApp</div>
          </div>
          <div style={{ marginTop: 6, color: '#64748b', fontSize: 13 }}>
            {waStatus
              ? (waConnected
                  ? `Conectado (${waStatus.connectionState || 'OPEN'})`
                  : `Desconectado (${waStatus.connectionState || '—'})`)
              : 'Carregando status…'}
          </div>
          {waStatus?.webhookUrl ? (
            <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 12, wordBreak: 'break-all' }}>
              Webhook: {waStatus.webhookUrl}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleGenerateQr}
            disabled={loadingQr}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '10px 14px',
              borderRadius: 10,
              fontWeight: 600,
              cursor: loadingQr ? 'not-allowed' : 'pointer',
            }}
          >
            {loadingQr ? 'Gerando…' : 'Gerar QR Code'}
          </button>
          <button
            onClick={handleDisconnectWhatsApp}
            style={{
              background: 'white',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              padding: '10px 14px',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Desconectar
          </button>
        </div>
      </div>

      {qrBase64 ? (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          marginBottom: 16,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 16,
          alignItems: 'center',
        }}>
          <img
            src={`data:image/png;base64,${qrBase64}`}
            alt="QR Code do WhatsApp"
            style={{ width: 220, height: 220, borderRadius: 12, border: '1px solid #e2e8f0' }}
          />
          <div style={{ color: '#334155', fontSize: 14, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Conectar WhatsApp</div>
            <div>1) No celular: WhatsApp → <b>Aparelhos conectados</b></div>
            <div>2) Toque em <b>Conectar um aparelho</b></div>
            <div>3) Aponte a câmera para este QR Code</div>
            <div style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>
              Depois de conectar, as conversas começam a aparecer automaticamente.
            </div>
          </div>
        </div>
      ) : null}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? 12 : 16, marginBottom: isMobile ? 16 : 24 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: isMobile ? 14 : 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: isMobile ? 16 : 20 }}>💬</span>
            <span style={{ color: '#64748b', fontSize: isMobile ? 11 : 13 }}>Conversas Hoje</span>
          </div>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1e293b' }}>{loading ? '—' : conversationsToday}</div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: isMobile ? 14 : 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: isMobile ? 16 : 20 }}>✅</span>
            <span style={{ color: '#64748b', fontSize: isMobile ? 11 : 13 }}>Via Bot</span>
          </div>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#10b981' }}>{loading ? '—' : viaBot}</div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: isMobile ? 14 : 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', gridColumn: isMobile ? '1 / -1' : 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: isMobile ? 16 : 20 }}>⚡</span>
            <span style={{ color: '#64748b', fontSize: isMobile ? 11 : 13 }}>Taxa de Conversão</span>
          </div>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#667eea' }}>{loading ? '—' : `${conversionRate}%`}</div>
        </div>
      </div>

      {error ? (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
          fontSize: 14,
        }}>
          {error}
        </div>
      ) : null}

      {/* Main Content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '350px 1fr', gap: isMobile ? 16 : 24, minHeight: 0 }}>
        {/* Conversations List */}
        <div style={{
          background: 'white',
          borderRadius: isMobile ? 12 : 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: isMobile ? 16 : 20, borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 600, color: '#1e293b' }}>Conversas</h3>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ margin: 0 }}>Carregando conversas…</p>
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
                <p style={{ margin: 0 }}>Nenhuma conversa ainda</p>
                <p style={{ margin: '8px 0 0', fontSize: 13 }}>As conversas aparecerão aqui quando os clientes interagirem com o chatbot</p>
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  style={{
                    padding: 16,
                    borderBottom: '1px solid #f8fafc',
                    cursor: 'pointer',
                    background: selectedConversationId === conv.id ? '#f8fafc' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{conv.phoneE164}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {new Date(conv.lastMessageAt || conv.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.lastMessage || (conv.isHumanHandoff ? 'Aguardando atendimento humano…' : 'Sem mensagens…')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat / Settings */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: 20, borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              {selectedConversation ? `Conversa com ${selectedConversation.phoneE164}` : 'Selecione uma conversa'}
            </h3>
          </div>

          <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
            {selectedConversation ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {selectedConversation.messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: msg.direction === 'out' ? 'flex-start' : 'flex-end',
                      maxWidth: '70%',
                    }}
                  >
                    <div style={{
                      background: msg.direction === 'out' ? '#f1f5f9' : '#667eea',
                      color: msg.direction === 'out' ? '#1e293b' : 'white',
                      padding: '12px 16px',
                      borderRadius: 16,
                      fontSize: 14,
                    }}>
                      {msg.text}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: msg.direction === 'out' ? 'left' : 'right' }}>
                      {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <p style={{ margin: 0 }}>Selecione uma conversa à esquerda</p>
                <p style={{ margin: '8px 0 0', fontSize: 13 }}>As mensagens aparecerão aqui em tempo real (atualiza a cada 10s)</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
