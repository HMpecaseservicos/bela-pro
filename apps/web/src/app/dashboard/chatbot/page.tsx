'use client';

import { useEffect, useState, useCallback } from 'react';

type SessionState = 'disconnected' | 'connecting' | 'qr_pending' | 'connected' | 'auth_failure';

interface WhatsAppStatus {
  state: SessionState;
  connectedPhone: string | null;
  connectedAt: string | null;
  qrCode: string | null;
}

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
}

// Gera URL de imagem QR a partir do código
function getQrImageUrl(qrCode: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrCode)}`;
}

export default function ChatbotPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Buscar status
  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const res = await fetch(`${getApiUrl()}/chatbot/whatsapp/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (json.success && json.data) {
        setStatus(json.data);
      }
    } catch {
      // Ignora erro de fetch
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling para atualizar status
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // Atualiza a cada 3s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Conectar
  async function handleConnect() {
    try {
      setConnecting(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const res = await fetch(`${getApiUrl()}/chatbot/whatsapp/connect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Erro ao conectar');
      }
      
      // Atualizar status imediatamente
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar');
    } finally {
      setConnecting(false);
    }
  }

  // Desconectar
  async function handleDisconnect() {
    try {
      setDisconnecting(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const res = await fetch(`${getApiUrl()}/chatbot/whatsapp/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Erro ao desconectar');
      }
      
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  }

  // Estado visual
  const isConnected = status?.state === 'connected';
  const isWaitingQr = status?.state === 'qr_pending';
  const isConnecting = status?.state === 'connecting' || connecting;

  const stateLabel: Record<SessionState, string> = {
    disconnected: '🔴 Desconectado',
    connecting: '🟡 Conectando...',
    qr_pending: '📱 Aguardando QR Code',
    connected: '🟢 Conectado',
    auth_failure: '🔴 Falha na autenticação',
  };

  const stateColor: Record<SessionState, string> = {
    disconnected: '#ef4444',
    connecting: '#f59e0b',
    qr_pending: '#3b82f6',
    connected: '#10b981',
    auth_failure: '#ef4444',
  };

  return (
    <div style={{ padding: isMobile ? 16 : 32, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>
          WhatsApp Bot
        </h1>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: isMobile ? 13 : 15 }}>
          Automação de atendimento via WhatsApp
        </p>
      </div>

      {/* Erro */}
      {error && (
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
      )}

      {/* Card de Status */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: isMobile ? 20 : 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: status ? stateColor[status.state] : '#94a3b8',
              }} />
              <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                {loading ? 'Carregando...' : (status ? stateLabel[status.state] : 'Erro')}
              </span>
            </div>

            {isConnected && status?.connectedPhone && (
              <div style={{ marginTop: 8, color: '#64748b', fontSize: 14 }}>
                📞 Conectado: <strong>{status.connectedPhone}</strong>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {!isConnected && !isWaitingQr && (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: isConnecting ? 'not-allowed' : 'pointer',
                  opacity: isConnecting ? 0.7 : 1,
                }}
              >
                {isConnecting ? 'Conectando...' : '🔗 Conectar WhatsApp'}
              </button>
            )}

            {(isConnected || isWaitingQr) && (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: disconnecting ? 'not-allowed' : 'pointer',
                  opacity: disconnecting ? 0.7 : 1,
                }}
              >
                {disconnecting ? 'Desconectando...' : '❌ Desconectar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QR Code */}
      {isWaitingQr && status?.qrCode && (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 24,
          alignItems: 'center',
          marginBottom: 24,
        }}>
          <div style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
          }}>
            <img
              src={getQrImageUrl(status.qrCode)}
              alt="QR Code WhatsApp"
              style={{ width: 280, height: 280 }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 20, color: '#0f172a' }}>
              📱 Escaneie o QR Code
            </h3>
            <ol style={{ margin: 0, paddingLeft: 20, color: '#334155', lineHeight: 1.8 }}>
              <li>Abra o WhatsApp no seu celular</li>
              <li>Toque em <strong>Mais opções</strong> (⋮) ou <strong>Configurações</strong></li>
              <li>Toque em <strong>Aparelhos conectados</strong></li>
              <li>Toque em <strong>Conectar um aparelho</strong></li>
              <li>Aponte a câmera para este QR Code</li>
            </ol>
            <p style={{ marginTop: 16, color: '#64748b', fontSize: 13 }}>
              ⏳ O QR Code expira em 60 segundos. Se expirar, clique em &quot;Reconectar&quot;.
            </p>
          </div>
        </div>
      )}

      {/* Conectando */}
      {(status?.state === 'connecting' || (connecting && !isWaitingQr)) && (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 48,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: 18 }}>Iniciando conexão...</h3>
          <p style={{ margin: '8px 0 0', color: '#64748b' }}>
            Aguarde, o QR Code aparecerá em instantes.
          </p>
        </div>
      )}

      {/* Conectado - Info */}
      {isConnected && (
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: 16,
          padding: 32,
          color: 'white',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>WhatsApp Conectado!</h3>
          <p style={{ margin: '12px 0 0', opacity: 0.9, fontSize: 15 }}>
            O bot está ativo e respondendo mensagens automaticamente.
          </p>
          {status?.connectedAt && (
            <p style={{ margin: '8px 0 0', opacity: 0.7, fontSize: 13 }}>
              Conectado desde: {new Date(status.connectedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      )}

      {/* Features */}
      <div style={{
        background: '#f8fafc',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <span style={{ fontSize: 24 }}>💡</span>
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
            Como funciona
          </div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4, lineHeight: 1.6 }}>
            Quando conectado, o bot responde automaticamente aos clientes com um menu de opções.
            Os clientes podem agendar via link, consultar agendamentos ou solicitar atendimento humano.
            As mensagens são personalizáveis nos templates do sistema.
          </div>
        </div>
      </div>
    </div>
  );
}
