'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// =============================================================================
// LOGO PROFISSIONAL DO BELA PRO
// =============================================================================

function BelaProLogo({ size = 'md', variant = 'color' }: { size?: 'sm' | 'md' | 'lg'; variant?: 'color' | 'white' }) {
  const sizes = {
    sm: { height: 36 },
    md: { height: 50 },
    lg: { height: 70 },
  };
  
  const { height } = sizes[size];
  const src = variant === 'white' ? '/logo-white.png' : '/logo.png';
  
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={src}
      alt="Bela Pro"
      style={{
        height,
        width: 'auto',
        objectFit: 'contain',
      }}
    />
  );
}

interface InviteData {
  businessName: string;
  contactName: string;
  focusType: 'YOUTH_BEAUTY' | 'INCOME_GROWTH' | 'RECOGNITION';
  personalMessage?: string;
  expiresAt: string;
}

// =============================================================================
// MOCKUPS DO SISTEMA - Representações visuais das funcionalidades reais
// =============================================================================

// Mockup da Agenda Digital
function AgendaMockup({ accentColor }: { accentColor: string }) {
  const appointments = [
    { time: '09:00', client: 'Ana Paula', service: 'Corte + Escova', status: 'confirmed' },
    { time: '10:30', client: 'Mariana S.', service: 'Coloração', status: 'confirmed' },
    { time: '13:00', client: 'Juliana M.', service: 'Manicure', status: 'pending' },
    { time: '15:00', client: 'Beatriz R.', service: 'Hidratação', status: 'confirmed' },
  ];

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
      overflow: 'hidden',
      maxWidth: 380,
    }}>
      {/* Header */}
      <div style={{
        background: accentColor,
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>Março 2026</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
            <span key={i} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, width: 24, textAlign: 'center' }}>{day}</span>
          ))}
        </div>
      </div>
      
      {/* Appointments */}
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 12, fontWeight: 500 }}>HOJE, 6 DE MARÇO</div>
        {appointments.map((apt, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: i < appointments.length - 1 ? '1px solid #f0f0f0' : 'none',
          }}>
            <span style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: '#333',
              width: 50,
            }}>{apt.time}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{apt.client}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{apt.service}</div>
            </div>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: apt.status === 'confirmed' ? '#10b981' : '#f59e0b',
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Mockup do Link de Agendamento Público
function BookingLinkMockup({ accentColor }: { accentColor: string }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
      overflow: 'hidden',
      maxWidth: 320,
    }}>
      {/* Header com Logo */}
      <div style={{
        background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'white',
          margin: '0 auto 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}>
          💇‍♀️
        </div>
        <div style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>Studio Beleza</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>Escolha seu serviço</div>
      </div>
      
      {/* Services */}
      <div style={{ padding: 16 }}>
        {[
          { name: 'Corte Feminino', price: 'R$ 80', duration: '45 min' },
          { name: 'Escova Modelada', price: 'R$ 60', duration: '30 min' },
          { name: 'Coloração', price: 'R$ 180', duration: '2h' },
        ].map((service, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 0',
            borderBottom: i < 2 ? '1px solid #f0f0f0' : 'none',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{service.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{service.duration}</div>
            </div>
            <div style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              color: accentColor,
            }}>{service.price}</div>
          </div>
        ))}
        
        <button style={{
          width: '100%',
          padding: '14px',
          background: accentColor,
          border: 'none',
          borderRadius: 8,
          color: 'white',
          fontWeight: 600,
          fontSize: 14,
          marginTop: 16,
          cursor: 'pointer',
        }}>
          Agendar Horário
        </button>
      </div>
    </div>
  );
}

// Mockup do Financeiro
function FinanceMockup({ accentColor }: { accentColor: string }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
      overflow: 'hidden',
      maxWidth: 380,
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Março 2026</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 12, color: '#10b981', marginBottom: 2 }}>Receitas</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>R$ 8.450</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 2 }}>Despesas</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#666' }}>R$ 2.180</div>
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
        {[65, 45, 80, 55, 90, 70, 85].map((h, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{
              height: h,
              background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}80 100%)`,
              borderRadius: 4,
            }} />
            <span style={{ fontSize: 10, color: '#999', textAlign: 'center' }}>
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i]}
            </span>
          </div>
        ))}
      </div>
      
      {/* Recent */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 500 }}>RECENTES</div>
        {[
          { desc: 'Ana Paula - Corte', value: '+R$ 80', type: 'in' },
          { desc: 'Conta de Luz', value: '-R$ 180', type: 'out' },
          { desc: 'Mariana - Coloração', value: '+R$ 180', type: 'in' },
        ].map((t, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: i < 2 ? '1px solid #f5f5f5' : 'none',
          }}>
            <span style={{ fontSize: 13, color: '#444' }}>{t.desc}</span>
            <span style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: t.type === 'in' ? '#10b981' : '#ef4444',
            }}>{t.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mockup dos Clientes
function ClientsMockup({ accentColor }: { accentColor: string }) {
  const clients = [
    { name: 'Ana Paula Oliveira', phone: '(11) 99999-1234', visits: 12, status: 'pontual' },
    { name: 'Mariana Santos', phone: '(11) 98888-5678', visits: 8, status: 'normal' },
    { name: 'Juliana Mendes', phone: '(11) 97777-9012', visits: 5, status: 'normal' },
  ];

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
      overflow: 'hidden',
      maxWidth: 380,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 600, color: '#1a1a1a' }}>Clientes</span>
        <span style={{ fontSize: 13, color: accentColor, fontWeight: 500 }}>+ Nova</span>
      </div>
      
      {/* List */}
      <div style={{ padding: '8px 0' }}>
        {clients.map((client, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 20px',
            gap: 12,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: accentColor + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              fontWeight: 600,
              fontSize: 14,
            }}>
              {client.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{client.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{client.visits} visitas</div>
            </div>
            {client.status === 'pontual' && (
              <span style={{
                fontSize: 10,
                padding: '4px 8px',
                background: '#d1fae5',
                color: '#059669',
                borderRadius: 100,
                fontWeight: 500,
              }}>Pontual</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// FEATURES DO SISTEMA - Funcionalidades reais
// =============================================================================

const SYSTEM_FEATURES = [
  {
    icon: '📅',
    title: 'Agenda Digital Completa',
    description: 'Visualize todos os agendamentos do dia, semana ou mês. Crie, edite e cancele com poucos cliques.',
    details: ['Visão diária, semanal e mensal', 'Status em tempo real', 'Horários de funcionamento configuráveis'],
  },
  {
    icon: '🔗',
    title: 'Link de Agendamento',
    description: 'Seus clientes agendam online 24h por dia. Compartilhe no Instagram, WhatsApp e Facebook.',
    details: ['Página personalizada com sua marca', 'Todos os serviços e preços', 'Escolha de data e horário'],
  },
  {
    icon: '👥',
    title: 'Gestão de Clientes',
    description: 'Cadastro completo com histórico, preferências e classificação de pontualidade.',
    details: ['Histórico de atendimentos', 'Status: Pontual, Normal, Faltou', 'Notas e observações'],
  },
  {
    icon: '💰',
    title: 'Controle Financeiro',
    description: 'Saiba exatamente quanto você ganha e gasta. Receitas, despesas e lucro em tempo real.',
    details: ['Categorias personalizadas', 'Gráficos de evolução', 'Filtros por período'],
  },
  {
    icon: '💳',
    title: 'Pagamento PIX',
    description: 'Receba sinal ou pagamento total via PIX antes do atendimento. QR Code automático.',
    details: ['QR Code + código copia e cola', 'Confirmação manual', 'Valor total ou percentual'],
  },
  {
    icon: '⚙️',
    title: 'Configurações Flexíveis',
    description: 'Defina horários, folgas, antecedência mínima e intervalo entre atendimentos.',
    details: ['Horário por dia da semana', 'Bloqueios e folgas', 'Regras de agendamento'],
  },
];

// Conteúdo por tipo de foco
const FOCUS_CONTENT = {
  YOUTH_BEAUTY: {
    heroTitle: 'A gestão que profissionais de sucesso usam',
    heroSubtitle: 'Organize seus atendimentos, clientes e finanças em um único lugar. Simples, elegante e profissional.',
    accentColor: '#be9b7b',
    accentLight: '#f5ebe0',
    accentDark: '#9a7d64',
  },
  INCOME_GROWTH: {
    heroTitle: 'Mais organização. Mais clientes. Mais lucro.',
    heroSubtitle: 'A plataforma completa para você ter controle total do seu negócio e aumentar seus resultados.',
    accentColor: '#2d5a4a',
    accentLight: '#e8f0ed',
    accentDark: '#1e3d32',
  },
  RECOGNITION: {
    heroTitle: 'Profissionalismo que se vê',
    heroSubtitle: 'Destaque-se com uma gestão de alto padrão. Suas clientes vão notar a diferença.',
    accentColor: '#4a4a68',
    accentLight: '#eeeef2',
    accentDark: '#35354d',
  },
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function BusinessInviteLandingPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchInvite();
  }, [token]);

  async function fetchInvite() {
    try {
      const res = await fetch(`${API_URL}/business-invites/public/${token}`);
      const data = await res.json();

      if (!data.success) {
        if (data.expired) {
          setExpired(true);
        } else {
          setError(data.error || 'Convite não encontrado');
        }
        return;
      }

      setInvite(data.data);
    } catch (err) {
      setError('Erro ao carregar convite');
    } finally {
      setLoading(false);
    }
  }

  async function handleCtaClick() {
    try {
      await fetch(`${API_URL}/business-invites/public/${token}/cta-click`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  }

  // Loading
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa',
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: '3px solid #e5e5e5',
          borderTopColor: '#333',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Expired
  if (expired) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa',
        padding: 40,
        textAlign: 'center',
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          fontSize: 36,
        }}>⏰</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>
          Este convite expirou
        </h1>
        <p style={{ color: '#666', maxWidth: 400, marginBottom: 32, lineHeight: 1.6 }}>
          Não se preocupe! Você ainda pode conhecer o Bela Pro e transformar a gestão do seu negócio.
        </p>
        <Link
          href="/cadastro"
          style={{
            padding: '16px 40px',
            background: '#1a1a1a',
            borderRadius: 8,
            color: 'white',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          Criar minha conta grátis
        </Link>
      </div>
    );
  }

  // Error
  if (error || !invite) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa',
        padding: 40,
        textAlign: 'center',
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          fontSize: 36,
        }}>🔍</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>
          Convite não encontrado
        </h1>
        <p style={{ color: '#666', maxWidth: 400, marginBottom: 32, lineHeight: 1.6 }}>
          Este link pode estar incorreto. Que tal criar sua conta e experimentar gratuitamente?
        </p>
        <Link
          href="/cadastro"
          style={{
            padding: '16px 40px',
            background: '#1a1a1a',
            borderRadius: 8,
            color: 'white',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          Experimentar grátis
        </Link>
      </div>
    );
  }

  const content = FOCUS_CONTENT[invite.focusType];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(20px)',
        zIndex: 100,
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <BelaProLogo size="sm" variant="color" />
        <Link
          href={`/cadastro?ref=${token}`}
          onClick={handleCtaClick}
          style={{
            padding: '12px 28px',
            background: content.accentColor,
            borderRadius: 8,
            color: 'white',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 14,
            boxShadow: `0 4px 12px ${content.accentColor}30`,
          }}
        >
          Começar grátis
        </Link>
      </nav>

      {/* Hero Section */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '120px 24px 80px',
        background: `linear-gradient(180deg, ${content.accentLight} 0%, #ffffff 60%)`,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 64,
          alignItems: 'center',
          width: '100%',
        }}>
          {/* Left - Text */}
          <div>
            {/* Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'white',
              borderRadius: 100,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              marginBottom: 32,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: content.accentColor,
              }} />
              <span style={{ color: '#666', fontSize: 14 }}>
                Convite exclusivo para <strong style={{ color: '#1a1a1a' }}>{invite.contactName}</strong>
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 800,
              color: '#1a1a1a',
              lineHeight: 1.1,
              marginBottom: 24,
              letterSpacing: '-2px',
            }}>
              {content.heroTitle}
            </h1>

            <p style={{
              fontSize: 'clamp(18px, 2vw, 21px)',
              color: '#555',
              lineHeight: 1.7,
              marginBottom: 40,
              maxWidth: 500,
            }}>
              {content.heroSubtitle}
            </p>

            {/* Personal message */}
            {invite.personalMessage && (
              <div style={{
                background: 'white',
                padding: '20px 24px',
                borderRadius: 12,
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                marginBottom: 40,
                borderLeft: `4px solid ${content.accentColor}`,
                maxWidth: 480,
              }}>
                <p style={{ color: '#444', fontStyle: 'italic', margin: 0, lineHeight: 1.7, fontSize: 15 }}>
                  "{invite.personalMessage}"
                </p>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              <Link
                href={`/cadastro?ref=${token}`}
                onClick={handleCtaClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '18px 36px',
                  background: `linear-gradient(135deg, ${content.accentColor} 0%, ${content.accentDark} 100%)`,
                  borderRadius: 10,
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 16,
                  boxShadow: `0 8px 24px ${content.accentColor}40`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                Experimentar 14 dias grátis
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
              
              <span style={{ color: '#888', fontSize: 14 }}>
                Sem cartão de crédito
              </span>
            </div>
          </div>

          {/* Right - Mockups */}
          <div style={{ 
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
          }}>
            {/* Main Mockup */}
            <div style={{ transform: 'perspective(1000px) rotateY(-5deg)' }}>
              <AgendaMockup accentColor={content.accentColor} />
            </div>
            
            {/* Floating Badge */}
            <div style={{
              position: 'absolute',
              top: -20,
              right: 0,
              background: 'white',
              padding: '12px 20px',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Novo agendamento!</div>
                <div style={{ fontSize: 11, color: '#888' }}>Ana Paula confirmou</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{
        padding: '100px 24px',
        background: '#fafafa',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 800,
              color: '#1a1a1a',
              marginBottom: 16,
              letterSpacing: '-1px',
            }}>
              Tudo que você precisa em um só lugar
            </h2>
            <p style={{ color: '#666', fontSize: 18, maxWidth: 600, margin: '0 auto' }}>
              Funcionalidades pensadas para o dia a dia de profissionais de beleza
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 24,
          }}>
            {SYSTEM_FEATURES.map((feature, index) => (
              <div
                key={index}
                style={{
                  background: 'white',
                  padding: 32,
                  borderRadius: 16,
                  border: '1px solid #eee',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                }}
              >
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: content.accentLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  marginBottom: 20,
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>
                  {feature.title}
                </h3>
                <p style={{ color: '#666', lineHeight: 1.6, marginBottom: 20, fontSize: 15 }}>
                  {feature.description}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {feature.details.map((detail, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={content.accentColor} strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span style={{ color: '#555', fontSize: 14 }}>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Demo Section */}
      <section style={{
        padding: '100px 24px',
        background: 'white',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 800,
              color: '#1a1a1a',
              marginBottom: 16,
              letterSpacing: '-1px',
            }}>
              Veja como funciona
            </h2>
            <p style={{ color: '#666', fontSize: 18, maxWidth: 600, margin: '0 auto' }}>
              Interface limpa e intuitiva que você aprende a usar em minutos
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 40,
            alignItems: 'center',
          }}>
            {/* Link de Agendamento */}
            <div style={{ textAlign: 'center' }}>
              <BookingLinkMockup accentColor={content.accentColor} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginTop: 24, marginBottom: 8 }}>
                Link de Agendamento
              </h3>
              <p style={{ color: '#666', fontSize: 14, maxWidth: 280, margin: '0 auto' }}>
                Seus clientes agendam sozinhos, 24h por dia
              </p>
            </div>

            {/* Financeiro */}
            <div style={{ textAlign: 'center' }}>
              <FinanceMockup accentColor={content.accentColor} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginTop: 24, marginBottom: 8 }}>
                Controle Financeiro
              </h3>
              <p style={{ color: '#666', fontSize: 14, maxWidth: 280, margin: '0 auto' }}>
                Saiba exatamente quanto você ganha
              </p>
            </div>

            {/* Clientes */}
            <div style={{ textAlign: 'center' }}>
              <ClientsMockup accentColor={content.accentColor} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginTop: 24, marginBottom: 8 }}>
                Gestão de Clientes
              </h3>
              <p style={{ color: '#666', fontSize: 14, maxWidth: 280, margin: '0 auto' }}>
                Histórico completo de cada cliente
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{
        padding: '80px 24px',
        background: `linear-gradient(135deg, ${content.accentColor} 0%, ${content.accentDark} 100%)`,
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 48,
            textAlign: 'center',
          }}>
            {[
              { value: '500+', label: 'Profissionais ativos' },
              { value: '15.000+', label: 'Agendamentos por mês' },
              { value: '4.9', label: 'Avaliação média' },
              { value: 'R$ 2M+', label: 'Gerenciados por mês' },
            ].map((stat, i) => (
              <div key={i}>
                <div style={{ fontSize: 'clamp(36px, 5vw, 48px)', fontWeight: 800, color: 'white', marginBottom: 8 }}>
                  {stat.value}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{
        padding: '100px 24px',
        background: '#fafafa',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 800,
              color: '#1a1a1a',
              marginBottom: 16,
              letterSpacing: '-1px',
            }}>
              O que dizem nossas clientes
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}>
            {[
              {
                text: 'Antes eu anotava tudo em caderno e sempre perdia informação. Agora tenho tudo organizado no celular e no computador.',
                author: 'Marina Silva',
                role: 'Cabeleireira • São Paulo',
              },
              {
                text: 'O link de agendamento mudou minha vida! Coloquei no Instagram e as clientes agendam sozinhas. Menos ligações, mais atendimentos.',
                author: 'Priscila Santos',
                role: 'Nail Designer • Rio de Janeiro',
              },
              {
                text: 'Finalmente sei quanto eu ganho no mês. Os relatórios financeiros são claros e me ajudam a tomar decisões melhores.',
                author: 'Fernanda Costa',
                role: 'Esteticista • Belo Horizonte',
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                style={{
                  background: 'white',
                  padding: 32,
                  borderRadius: 16,
                  border: '1px solid #eee',
                }}
              >
                <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24" stroke="none">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                </div>
                <p style={{ color: '#333', lineHeight: 1.7, marginBottom: 24, fontSize: 16 }}>
                  "{testimonial.text}"
                </p>
                <div>
                  <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 15 }}>
                    {testimonial.author}
                  </div>
                  <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                    {testimonial.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        padding: '100px 24px',
        background: 'white',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 800,
            color: '#1a1a1a',
            marginBottom: 20,
            letterSpacing: '-1px',
          }}>
            Pronta para transformar seu negócio?
          </h2>
          <p style={{
            color: '#666',
            fontSize: 18,
            marginBottom: 40,
            lineHeight: 1.7,
          }}>
            <strong style={{ color: '#1a1a1a' }}>{invite.businessName}</strong>, junte-se a centenas de profissionais que já organizaram
            sua gestão com o Bela Pro.
          </p>

          <Link
            href={`/cadastro?ref=${token}`}
            onClick={handleCtaClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '20px 48px',
              background: `linear-gradient(135deg, ${content.accentColor} 0%, ${content.accentDark} 100%)`,
              borderRadius: 12,
              color: 'white',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 17,
              boxShadow: `0 12px 32px ${content.accentColor}40`,
            }}
          >
            Criar minha conta grátis
          </Link>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 40,
            marginTop: 40,
            flexWrap: 'wrap',
          }}>
            {['14 dias grátis', 'Sem cartão de crédito', 'Suporte humanizado'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={content.accentColor} strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style={{ fontSize: 14 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '48px 24px',
        background: '#1a1a1a',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <BelaProLogo size="md" variant="white" />
        </div>
        <p style={{ color: '#888', fontSize: 14 }}>
          A plataforma de gestão para profissionais de beleza
        </p>
        <p style={{ color: '#555', fontSize: 12, marginTop: 24 }}>
          © 2026 Bela Pro. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
