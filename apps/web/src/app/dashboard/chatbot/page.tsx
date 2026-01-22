'use client';

import { useEffect, useState } from 'react';

interface Conversation {
  id: string;
  clientPhone: string;
  status: string;
  createdAt: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
}

export default function ChatbotPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const API_URL = 'http://localhost:3001/api/v1';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Simulated data since chatbot API might not be fully implemented
    setLoading(false);
    setConversations([]);
  }, []);

  return (
    <div style={{ padding: isMobile ? 16 : 32, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>Chatbot</h1>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: isMobile ? 13 : 15 }}>Gerencie conversas e automações</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? 12 : 16, marginBottom: isMobile ? 16 : 24 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: isMobile ? 14 : 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: isMobile ? 16 : 20 }}>💬</span>
            <span style={{ color: '#64748b', fontSize: isMobile ? 11 : 13 }}>Conversas Hoje</span>
          </div>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1e293b' }}>0</div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: isMobile ? 14 : 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: isMobile ? 16 : 20 }}>✅</span>
            <span style={{ color: '#64748b', fontSize: isMobile ? 11 : 13 }}>Via Bot</span>
          </div>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#10b981' }}>0</div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: isMobile ? 14 : 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', gridColumn: isMobile ? '1 / -1' : 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: isMobile ? 16 : 20 }}>⚡</span>
            <span style={{ color: '#64748b', fontSize: isMobile ? 11 : 13 }}>Taxa de Conversão</span>
          </div>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#667eea' }}>0%</div>
        </div>
      </div>

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
            {conversations.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
                <p style={{ margin: 0 }}>Nenhuma conversa ainda</p>
                <p style={{ margin: '8px 0 0', fontSize: 13 }}>As conversas aparecerão aqui quando os clientes interagirem com o chatbot</p>
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  style={{
                    padding: 16,
                    borderBottom: '1px solid #f8fafc',
                    cursor: 'pointer',
                    background: selectedConversation?.id === conv.id ? '#f8fafc' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{conv.clientPhone}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {new Date(conv.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.messages[conv.messages.length - 1]?.content || '...'}
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
              {selectedConversation ? `Conversa com ${selectedConversation.clientPhone}` : 'Configurações do Chatbot'}
            </h3>
          </div>

          <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
            {selectedConversation ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {selectedConversation.messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: msg.role === 'assistant' ? 'flex-start' : 'flex-end',
                      maxWidth: '70%',
                    }}
                  >
                    <div style={{
                      background: msg.role === 'assistant' ? '#f1f5f9' : '#667eea',
                      color: msg.role === 'assistant' ? '#1e293b' : 'white',
                      padding: '12px 16px',
                      borderRadius: 16,
                      fontSize: 14,
                    }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: msg.role === 'assistant' ? 'left' : 'right' }}>
                      {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 32 }}>
                  <h4 style={{ margin: '0 0 16px', color: '#1e293b', fontWeight: 600 }}>🎯 Como funciona</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { icon: '1️⃣', text: 'Cliente envia mensagem para seu número' },
                      { icon: '2️⃣', text: 'Chatbot identifica intenção de agendamento' },
                      { icon: '3️⃣', text: 'Mostra serviços e horários disponíveis' },
                      { icon: '4️⃣', text: 'Confirma agendamento automaticamente' },
                    ].map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 10 }}>
                        <span style={{ fontSize: 20 }}>{step.icon}</span>
                        <span style={{ color: '#64748b' }}>{step.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 16,
                  padding: 24,
                  color: 'white',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
                  <h4 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>Em breve</h4>
                  <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>
                    Integração com WhatsApp Business API para atendimento automático 24/7
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
