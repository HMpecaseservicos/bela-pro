'use client';

import { useEffect, useState } from 'react';

export default function ChatbotPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{ padding: isMobile ? 16 : 32, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>Chatbot</h1>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: isMobile ? 13 : 15 }}>Automação de agendamentos via WhatsApp</p>
      </div>

      {/* Coming Soon Card */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 20,
        padding: isMobile ? 32 : 48,
        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
        textAlign: 'center',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        maxHeight: 500,
      }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🚀</div>
        
        <h2 style={{ 
          margin: 0, 
          fontSize: isMobile ? 24 : 32, 
          fontWeight: 700, 
          color: 'white',
          marginBottom: 16,
        }}>
          Em Breve
        </h2>
        
        <p style={{ 
          margin: 0, 
          fontSize: isMobile ? 15 : 18, 
          color: 'rgba(255,255,255,0.9)',
          maxWidth: 500,
          lineHeight: 1.6,
        }}>
          A integração com <strong>WhatsApp Cloud API</strong> está em desenvolvimento.
          Em breve você poderá automatizar agendamentos diretamente pelo WhatsApp!
        </p>

        <div style={{
          marginTop: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          width: '100%',
          maxWidth: 400,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <span style={{ color: 'white', fontSize: 14, textAlign: 'left' }}>
              Conexão oficial com WhatsApp Business
            </span>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <span style={{ color: 'white', fontSize: 14, textAlign: 'left' }}>
              Agendamento automático 24/7
            </span>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <span style={{ color: 'white', fontSize: 14, textAlign: 'left' }}>
              Confirmações e lembretes automáticos
            </span>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div style={{
        marginTop: 24,
        padding: 20,
        background: '#f8fafc',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 24 }}>💡</span>
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
            Enquanto isso, use o agendamento pelo link público
          </div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Compartilhe seu link de agendamento com os clientes ou configure no seu site e redes sociais.
          </div>
        </div>
      </div>
    </div>
  );
}
