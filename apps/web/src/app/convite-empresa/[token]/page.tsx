'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface InviteData {
  businessName: string;
  contactName: string;
  focusType: 'YOUTH_BEAUTY' | 'INCOME_GROWTH' | 'RECOGNITION';
  personalMessage?: string;
  expiresAt: string;
}

// Conteúdo personalizado por tipo de foco
const FOCUS_CONTENT = {
  YOUTH_BEAUTY: {
    heroTitle: 'Transforme autoestima em sucesso',
    heroSubtitle: 'Você não vende apenas beleza. Você devolve confiança, juventude e poder para suas clientes.',
    accentColor: '#ec4899',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fb923c 100%)',
    benefits: [
      { icon: '✨', title: 'Clientes mais Felizes', desc: 'Com lembretes automáticos, suas clientes nunca mais perdem o horário da transformação delas' },
      { icon: '💄', title: 'Mais Tempo pra Arte', desc: 'Menos tempo no WhatsApp, mais tempo criando looks incríveis' },
      { icon: '👑', title: 'Experiência VIP', desc: 'Agendamento online 24h que faz suas clientes se sentirem especiais' },
      { icon: '💅', title: 'Fidelização Natural', desc: 'Clientes que se sentem cuidadas voltam sempre' },
    ],
    testimonial: {
      text: 'Minhas clientes adoram poder agendar a qualquer hora. Elas dizem que se sentem VIPs!',
      author: 'Carla, Especialista em Coloração',
      emoji: '💇‍♀️',
    },
    ctaText: 'Comece a Encantar suas Clientes',
  },
  INCOME_GROWTH: {
    heroTitle: 'Ganhe mais trabalhando melhor',
    heroSubtitle: 'Chega de faltas, atrasos e clientes perdidas. Com o Bela Pro, cada hora do seu dia vale mais.',
    accentColor: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)',
    benefits: [
      { icon: '💰', title: 'Reduza Faltas em 80%', desc: 'Lembretes automáticos por WhatsApp que realmente funcionam' },
      { icon: '📈', title: 'Aumente seu Faturamento', desc: 'Agenda organizada = mais atendimentos = mais dinheiro no bolso' },
      { icon: '⏰', title: 'Recupere seu Tempo', desc: 'Pare de perder horas no WhatsApp confirmando horários' },
      { icon: '🎯', title: 'Zero Buracos na Agenda', desc: 'Preencha horários cancelados rapidamente' },
    ],
    testimonial: {
      text: 'Em 2 meses aumentei meu faturamento em 35%. As faltas praticamente acabaram!',
      author: 'Jessica, Nail Designer',
      emoji: '💅',
    },
    ctaText: 'Quero Ganhar Mais',
  },
  RECOGNITION: {
    heroTitle: 'Seja reconhecida como profissional de elite',
    heroSubtitle: 'Seu talento merece uma ferramenta à altura. Destaque-se no mercado com uma gestão profissional.',
    accentColor: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #ea580c 100%)',
    benefits: [
      { icon: '🏆', title: 'Imagem Profissional', desc: 'Sistema de agendamento moderno que impressiona suas clientes' },
      { icon: '⭐', title: 'Destaque-se da Concorrência', desc: 'Enquanto outros usam papel, você usa tecnologia' },
      { icon: '📱', title: 'Presença Digital', desc: 'Link de agendamento exclusivo para divulgar nas redes' },
      { icon: '🎖️', title: 'Credibilidade', desc: 'Clientes confiam mais em profissionais organizados' },
    ],
    testimonial: {
      text: 'Minhas clientes sempre elogiam como sou organizada. Virei referência na minha região!',
      author: 'Patricia, Maquiadora Profissional',
      emoji: '💄',
    },
    ctaText: 'Quero me Destacar',
  },
};

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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
      }}>
        <div style={{
          width: 60,
          height: 60,
          border: '3px solid #334155',
          borderTopColor: '#ec4899',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (expired) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        padding: 20,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 80, marginBottom: 24 }}>⏰</div>
        <h1 style={{ color: '#f8fafc', fontSize: 32, marginBottom: 16 }}>
          Ops! Este convite expirou
        </h1>
        <p style={{ color: '#94a3b8', maxWidth: 400, marginBottom: 32 }}>
          Mas não se preocupe! Você ainda pode conhecer o Bela Pro e transformar seu negócio.
        </p>
        <Link
          href="/cadastro"
          style={{
            padding: '16px 32px',
            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            borderRadius: 12,
            color: 'white',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          Criar minha conta grátis →
        </Link>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        padding: 20,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 80, marginBottom: 24 }}>🔍</div>
        <h1 style={{ color: '#f8fafc', fontSize: 32, marginBottom: 16 }}>
          Convite não encontrado
        </h1>
        <p style={{ color: '#94a3b8', maxWidth: 400, marginBottom: 32 }}>
          Este link pode estar incorreto ou o convite foi cancelado. Que tal criar sua conta e experimentar grátis?
        </p>
        <Link
          href="/cadastro"
          style={{
            padding: '16px 32px',
            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            borderRadius: 12,
            color: 'white',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          Experimentar Grátis →
        </Link>
      </div>
    );
  }

  const content = FOCUS_CONTENT[invite.focusType];

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      {/* Hero Section */}
      <section style={{
        background: content.gradient,
        padding: '60px 20px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -50,
          left: -50,
          width: 200,
          height: 200,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto' }}>
          {/* Logo */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255,255,255,0.2)',
            padding: '8px 20px',
            borderRadius: 30,
            marginBottom: 32,
          }}>
            <span style={{ fontSize: 24 }}>💜</span>
            <span style={{ fontWeight: 700, color: 'white' }}>BELA PRO</span>
          </div>

          {/* Personal greeting */}
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            padding: '12px 24px',
            borderRadius: 30,
            display: 'inline-block',
            marginBottom: 24,
          }}>
            <span style={{ color: 'white' }}>✨ Convite especial para </span>
            <strong style={{ color: 'white' }}>{invite.contactName}</strong>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 6vw, 52px)',
            fontWeight: 800,
            color: 'white',
            lineHeight: 1.2,
            marginBottom: 20,
            textShadow: '0 2px 20px rgba(0,0,0,0.2)',
          }}>
            {content.heroTitle}
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 3vw, 20px)',
            color: 'rgba(255,255,255,0.9)',
            maxWidth: 600,
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}>
            {content.heroSubtitle}
          </p>

          {/* Personal message */}
          {invite.personalMessage && (
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              padding: 20,
              borderRadius: 16,
              marginBottom: 32,
              maxWidth: 500,
              margin: '0 auto 32px',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', margin: 0 }}>
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
              padding: '18px 40px',
              background: 'white',
              borderRadius: 14,
              color: '#0f172a',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 18,
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s',
            }}
          >
            🎁 Começar 14 Dias Grátis
          </Link>

          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 16, fontSize: 14 }}>
            Sem cartão de crédito • Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section style={{ padding: '80px 20px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 48,
        }}>
          Por que profissionais de sucesso escolhem o <span style={{ color: content.accentColor }}>Bela Pro</span>?
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {content.benefits.map((benefit, index) => (
            <div
              key={index}
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                border: '1px solid #334155',
                borderRadius: 20,
                padding: 28,
                transition: 'transform 0.2s, border-color 0.2s',
              }}
            >
              <div style={{
                width: 56,
                height: 56,
                background: `${content.accentColor}20`,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                marginBottom: 16,
              }}>
                {benefit.icon}
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f8fafc' }}>
                {benefit.title}
              </h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                {benefit.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section style={{
        padding: '60px 20px',
        background: '#1e293b',
      }}>
        <div style={{
          maxWidth: 700,
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>{content.testimonial.emoji}</div>
          <blockquote style={{
            fontSize: 24,
            fontStyle: 'italic',
            color: '#f8fafc',
            lineHeight: 1.6,
            marginBottom: 24,
          }}>
            "{content.testimonial.text}"
          </blockquote>
          <p style={{ color: content.accentColor, fontWeight: 600 }}>
            — {content.testimonial.author}
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '80px 20px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 48,
        }}>
          Tudo o que você precisa em um só lugar
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
        }}>
          {[
            { icon: '📅', text: 'Agenda inteligente' },
            { icon: '💬', text: 'Integração WhatsApp' },
            { icon: '🔔', text: 'Lembretes automáticos' },
            { icon: '📊', text: 'Relatórios financeiros' },
            { icon: '👥', text: 'Cadastro de clientes' },
            { icon: '💸', text: 'Pagamento PIX' },
          ].map((feature, i) => (
            <div
              key={i}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{feature.icon}</div>
              <p style={{ color: '#f8fafc', margin: 0, fontWeight: 500 }}>{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        padding: '80px 20px',
        background: content.gradient,
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            color: 'white',
            marginBottom: 20,
          }}>
            Pronta para transformar seu negócio?
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: 18,
            marginBottom: 32,
          }}>
            {invite.businessName}, o Bela Pro foi feito para profissionais como você.
            Comece agora e veja a diferença em poucos dias.
          </p>

          <Link
            href={`/cadastro?ref=${token}`}
            onClick={handleCtaClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '20px 48px',
              background: 'white',
              borderRadius: 14,
              color: '#0f172a',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 20,
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            🚀 {content.ctaText}
          </Link>

          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 20, fontSize: 14 }}>
            14 dias grátis • Sem compromisso • Suporte humano
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 20px',
        textAlign: 'center',
        borderTop: '1px solid #334155',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 24 }}>💜</span>
          <span style={{ fontWeight: 700, color: '#f8fafc' }}>BELA PRO</span>
        </div>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          A plataforma das profissionais de beleza de sucesso
        </p>
      </footer>
    </div>
  );
}
