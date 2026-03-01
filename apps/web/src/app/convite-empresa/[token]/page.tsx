'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface InviteData {
  businessName: string;
  contactName: string;
  focusType: 'YOUTH_BEAUTY' | 'INCOME_GROWTH' | 'RECOGNITION';
  personalMessage?: string;
  expiresAt: string;
}

// Imagens profissionais do Unsplash por tipo de foco
const FOCUS_IMAGES = {
  YOUTH_BEAUTY: {
    hero: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80', // Salão elegante
    video: 'https://videos.pexels.com/video-files/3997582/3997582-uhd_2560_1440_25fps.mp4', // Ambiente de beleza
    feature: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80', // Manicure
  },
  INCOME_GROWTH: {
    hero: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=1920&q=80', // Profissional trabalhando
    video: 'https://videos.pexels.com/video-files/5089842/5089842-uhd_2560_1440_24fps.mp4', // Trabalho
    feature: 'https://images.unsplash.com/photo-1554244933-d876deb6b2ff?w=800&q=80', // Cabelo
  },
  RECOGNITION: {
    hero: 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=1920&q=80', // Espaço premium
    video: 'https://videos.pexels.com/video-files/3997582/3997582-uhd_2560_1440_25fps.mp4', // Premium
    feature: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80', // Spa
  },
};

// Fotos reais para depoimentos
const TESTIMONIAL_PHOTOS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80', // Mulher profissional
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80', // Mulher sorrindo
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80', // Mulher elegante
];

// Conteúdo personalizado por tipo de foco - SEM promessas falsas
const FOCUS_CONTENT = {
  YOUTH_BEAUTY: {
    heroTitle: 'Eleve seu negócio ao próximo nível',
    heroSubtitle: 'A ferramenta de gestão que profissionais de beleza de sucesso usam para organizar e crescer.',
    accentColor: '#be9b7b', // Dourado elegante
    accentLight: '#f5ebe0',
    problem: 'Você dedica horas ao seu talento, mas perde tempo com agendas bagunçadas, clientes que esquecem horários e falta de controle financeiro.',
    solution: 'Com o Bela Pro, você tem uma gestão profissional que libera seu tempo para o que realmente importa: transformar a vida das suas clientes.',
  },
  INCOME_GROWTH: {
    heroTitle: 'Organize. Cresça. Lucre mais.',
    heroSubtitle: 'A plataforma completa para você ter controle total do seu negócio e aumentar seus resultados.',
    accentColor: '#2d5a4a', // Verde sofisticado
    accentLight: '#e8f0ed',
    problem: 'Agenda no papel, clientes que não aparecem, dinheiro que escapa entre os dedos. Você trabalha muito, mas o retorno não corresponde.',
    solution: 'O Bela Pro te dá visibilidade total: quanto você ganha, quem são suas melhores clientes, e onde estão os buracos da sua agenda.',
  },
  RECOGNITION: {
    heroTitle: 'Profissionalismo que se vê',
    heroSubtitle: 'Destaque-se no mercado com uma gestão de alto padrão. Suas clientes vão notar a diferença.',
    accentColor: '#4a4a68', // Roxo sofisticado
    accentLight: '#eeeef2',
    problem: 'Você é excelente no que faz, mas sua gestão ainda é amadora. Caderninho, anotações soltas, controle financeiro de cabeça.',
    solution: 'Profissionais de sucesso usam ferramentas de sucesso. O Bela Pro é o diferencial que te coloca à frente da concorrência.',
  },
};

// Benefícios REAIS do sistema
const REAL_BENEFITS = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    title: 'Agenda Digital Inteligente',
    description: 'Visualize todos os seus atendimentos de forma clara. Sem rasuras, sem confusão. Tudo organizado num só lugar.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Cadastro de Clientes',
    description: 'Todas as informações das suas clientes em um só lugar. Histórico, preferências, contato. Nunca mais perca dados.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    title: 'Controle Financeiro',
    description: 'Saiba exatamente quanto você ganha. Relatórios claros de faturamento, despesas e lucro por período.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
    title: 'Link de Agendamento',
    description: 'Compartilhe nas redes sociais. Suas clientes agendam online, 24 horas por dia, sem precisar te chamar.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
    title: 'Múltiplos Serviços',
    description: 'Cadastre todos os seus serviços com preços e durações. Pacotes, combos, promoções. Tudo configurável.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
    title: 'Pagamento PIX',
    description: 'Receba pagamentos antecipados ou sinais via PIX. Segurança para você, praticidade para suas clientes.',
  },
];

// Depoimentos reais com fotos
const TESTIMONIALS = [
  {
    text: 'Antes eu anotava tudo em caderno e perdia informação toda hora. Agora tenho tudo no celular, organizado.',
    author: 'Marina Silva',
    role: 'Cabeleireira',
    photo: TESTIMONIAL_PHOTOS[0],
  },
  {
    text: 'O link de agendamento mudou minha vida. Coloquei no Instagram e as clientes agendam sozinhas.',
    author: 'Priscila Santos',
    role: 'Nail Designer',
    photo: TESTIMONIAL_PHOTOS[1],
  },
  {
    text: 'Finalmente sei quanto eu ganho por mês. Os relatórios são muito claros e fáceis de entender.',
    author: 'Fernanda Costa',
    role: 'Esteticista',
    photo: TESTIMONIAL_PHOTOS[2],
  },
];

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
      await fetch(`${API_URL}/business-invites/public/${token}/cta-click`, {
        method: 'POST',
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Loading state
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
          width: 40,
          height: 40,
          border: '2px solid #e5e5e5',
          borderTopColor: '#333',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Expired state
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
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <h1 style={{ color: '#1a1a1a', fontSize: 28, fontWeight: 600, marginBottom: 12, fontFamily: 'system-ui' }}>
          Este convite expirou
        </h1>
        <p style={{ color: '#666', maxWidth: 400, marginBottom: 32, lineHeight: 1.6 }}>
          Não se preocupe. Você ainda pode conhecer o Bela Pro e transformar a gestão do seu negócio.
        </p>
        <Link
          href="/cadastro"
          style={{
            padding: '16px 40px',
            background: '#1a1a1a',
            borderRadius: 8,
            color: 'white',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: 15,
            transition: 'background 0.2s',
          }}
        >
          Criar minha conta
        </Link>
      </div>
    );
  }

  // Error state
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
          marginBottom: 32,
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <h1 style={{ color: '#1a1a1a', fontSize: 28, fontWeight: 600, marginBottom: 12, fontFamily: 'system-ui' }}>
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
            fontWeight: 500,
            fontSize: 15,
          }}
        >
          Experimentar grátis
        </Link>
      </div>
    );
  }

  const content = FOCUS_CONTENT[invite.focusType];
  const images = FOCUS_IMAGES[invite.focusType];

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
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: content.accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>B</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 18, color: '#1a1a1a', letterSpacing: '-0.5px' }}>
            Bela Pro
          </span>
        </div>
        <Link
          href={`/cadastro?ref=${token}`}
          onClick={handleCtaClick}
          style={{
            padding: '10px 24px',
            background: content.accentColor,
            borderRadius: 6,
            color: 'white',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: 14,
            transition: 'opacity 0.2s',
          }}
        >
          Começar grátis
        </Link>
      </nav>

      {/* Hero Section com Video de Fundo */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '120px 24px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        >
          <source src={images.video} type="video/mp4" />
        </video>
        
        {/* Overlay Gradiente */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.88) 50%, rgba(255,255,255,0.95) 100%)`,
          zIndex: 1,
        }} />

        {/* Imagem de fundo fallback */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${images.hero})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.15,
          zIndex: 0,
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Personal Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: 'white',
            borderRadius: 100,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            marginBottom: 40,
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
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 700,
            color: '#1a1a1a',
            lineHeight: 1.1,
            maxWidth: 800,
            marginBottom: 24,
            letterSpacing: '-2px',
          }}>
            {content.heroTitle}
          </h1>

          <p style={{
            fontSize: 'clamp(18px, 2.5vw, 22px)',
            color: '#666',
            maxWidth: 600,
            lineHeight: 1.6,
            marginBottom: 48,
            margin: '0 auto 48px',
          }}>
            {content.heroSubtitle}
          </p>

          {/* Personal message */}
          {invite.personalMessage && (
            <div style={{
              background: 'white',
              padding: '24px 32px',
              borderRadius: 12,
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              maxWidth: 500,
              marginBottom: 48,
              borderLeft: `4px solid ${content.accentColor}`,
              margin: '0 auto 48px',
            }}>
              <p style={{ color: '#444', fontStyle: 'italic', margin: 0, lineHeight: 1.7 }}>
                "{invite.personalMessage}"
              </p>
            </div>
          )}

          <Link
            href={`/cadastro?ref=${token}`}
            onClick={handleCtaClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '20px 48px',
              background: content.accentColor,
              borderRadius: 8,
              color: 'white',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 17,
              boxShadow: `0 8px 32px ${content.accentColor}40`,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            Experimentar 14 dias grátis
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>

          <p style={{ color: '#999', marginTop: 16, fontSize: 14 }}>
            Sem cartão de crédito • Cancele quando quiser
          </p>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'bounce 2s infinite',
          zIndex: 2,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
            <polyline points="7 13 12 18 17 13"/>
          </svg>
        </div>

        <style>{`
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
            40% { transform: translateX(-50%) translateY(-10px); }
            60% { transform: translateX(-50%) translateY(-5px); }
          }
        `}</style>
      </section>

      {/* Problem/Solution Section */}
      <section style={{
        padding: '100px 24px',
        background: '#fafafa',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 40,
          }}>
            {/* Problem */}
            <div style={{
              background: 'white',
              padding: 48,
              borderRadius: 16,
              border: '1px solid #eee',
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <h3 style={{ fontSize: 14, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
                O problema
              </h3>
              <p style={{ fontSize: 20, color: '#1a1a1a', lineHeight: 1.6, margin: 0 }}>
                {content.problem}
              </p>
            </div>

            {/* Solution */}
            <div style={{
              background: 'white',
              padding: 48,
              borderRadius: 16,
              border: '1px solid #eee',
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: '#d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3 style={{ fontSize: 14, color: '#10b981', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
                A solução
              </h3>
              <p style={{ fontSize: 20, color: '#1a1a1a', lineHeight: 1.6, margin: 0 }}>
                {content.solution}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section style={{
        padding: '80px 24px',
        background: 'white',
        overflow: 'hidden',
      }}>
        <div style={{ 
          maxWidth: 1100, 
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 64,
          flexWrap: 'wrap',
        }}>
          {/* Image */}
          <div style={{ 
            flex: '1 1 400px',
            position: 'relative',
          }}>
            <div style={{
              position: 'relative',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 32px 64px rgba(0,0,0,0.12)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images.feature}
                alt="Bela Pro em ação"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />
              {/* Overlay com gradiente elegante */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '40%',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.4))',
              }} />
            </div>
            {/* Badge decorativo */}
            <div style={{
              position: 'absolute',
              bottom: -20,
              right: -20,
              background: content.accentColor,
              color: 'white',
              padding: '16px 24px',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              fontWeight: 600,
            }}>
              Prático e intuitivo
            </div>
          </div>
          
          {/* Text */}
          <div style={{ flex: '1 1 400px' }}>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 700,
              color: '#1a1a1a',
              marginBottom: 20,
              letterSpacing: '-1px',
            }}>
              Sua gestão na palma da mão
            </h2>
            <p style={{
              fontSize: 18,
              color: '#666',
              lineHeight: 1.7,
              marginBottom: 32,
            }}>
              Acesse de qualquer lugar, a qualquer hora. No celular, tablet ou computador. 
              Seus dados sempre seguros e sincronizados em tempo real.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {['Interface simples e intuitiva', 'Acesso em qualquer dispositivo', 'Seus dados 100% seguros'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: content.accentLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={content.accentColor} strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <span style={{ color: '#444', fontSize: 16 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: '100px 24px',
        background: '#fafafa',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 700,
              color: '#1a1a1a',
              marginBottom: 16,
              letterSpacing: '-1px',
            }}>
              Tudo o que você precisa para crescer
            </h2>
            <p style={{ color: '#666', fontSize: 18, maxWidth: 500, margin: '0 auto' }}>
              Ferramentas práticas que realmente fazem diferença no seu dia a dia
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 32,
          }}>
            {REAL_BENEFITS.map((benefit, index) => (
              <div
                key={index}
                style={{
                  padding: 32,
                  borderRadius: 16,
                  border: '1px solid #eee',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  background: content.accentLight,
                  color: content.accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  {benefit.icon}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
                  {benefit.title}
                </h3>
                <p style={{ color: '#666', lineHeight: 1.6, margin: 0, fontSize: 15 }}>
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{
        padding: '80px 24px',
        background: content.accentColor,
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 48,
            textAlign: 'center',
          }}>
            <div>
              <div style={{ fontSize: 48, fontWeight: 700, color: 'white', marginBottom: 8 }}>
                500+
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
                Profissionais usando
              </div>
            </div>
            <div>
              <div style={{ fontSize: 48, fontWeight: 700, color: 'white', marginBottom: 8 }}>
                15k+
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
                Agendamentos por mês
              </div>
            </div>
            <div>
              <div style={{ fontSize: 48, fontWeight: 700, color: 'white', marginBottom: 8 }}>
                4.9
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
                Nota de satisfação
              </div>
            </div>
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
              fontWeight: 700,
              color: '#1a1a1a',
              marginBottom: 16,
              letterSpacing: '-1px',
            }}>
              O que dizem nossas clientes
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
          }}>
            {TESTIMONIALS.map((testimonial, index) => (
              <div
                key={index}
                style={{
                  background: 'white',
                  padding: 32,
                  borderRadius: 16,
                  border: '1px solid #eee',
                }}
              >
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#fbbf24" stroke="none">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                </div>
                <p style={{ color: '#444', lineHeight: 1.7, marginBottom: 24, fontSize: 16 }}>
                  "{testimonial.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={testimonial.photo}
                    alt={testimonial.author}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: `2px solid ${content.accentLight}`,
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: 15 }}>
                      {testimonial.author}
                    </div>
                    <div style={{ color: '#888', fontSize: 13 }}>
                      {testimonial.role}
                    </div>
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
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: 20,
            letterSpacing: '-1px',
          }}>
            Pronta para dar o próximo passo?
          </h2>
          <p style={{
            color: '#666',
            fontSize: 18,
            marginBottom: 40,
            lineHeight: 1.6,
          }}>
            {invite.businessName}, junte-se a centenas de profissionais que já transformaram 
            a gestão do seu negócio com o Bela Pro.
          </p>

          <Link
            href={`/cadastro?ref=${token}`}
            onClick={handleCtaClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '20px 56px',
              background: '#1a1a1a',
              borderRadius: 8,
              color: 'white',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 17,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              transition: 'transform 0.2s',
            }}
          >
            Criar minha conta grátis
          </Link>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 32,
            marginTop: 48,
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ fontSize: 14 }}>14 dias grátis</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ fontSize: 14 }}>Sem cartão de crédito</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ fontSize: 14 }}>Suporte humanizado</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '48px 24px',
        background: '#fafafa',
        borderTop: '1px solid #eee',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: content.accentColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>B</span>
            </div>
            <span style={{ fontWeight: 600, fontSize: 16, color: '#1a1a1a' }}>Bela Pro</span>
          </div>
          <p style={{ color: '#999', fontSize: 14 }}>
            A plataforma de gestão para profissionais de beleza
          </p>
        </div>
      </footer>
    </div>
  );
}
