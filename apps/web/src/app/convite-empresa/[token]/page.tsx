'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// =============================================================================
// TYPES
// =============================================================================

interface InviteData {
  inviteType: 'PERSONAL' | 'PUBLIC';
  businessName?: string;
  contactName?: string;
  campaignName?: string;
  focusType: 'YOUTH_BEAUTY' | 'INCOME_GROWTH' | 'RECOGNITION';
  personalMessage?: string;
  expiresAt: string;
}

// =============================================================================
// DESIGN TOKENS — Dark Premium + Gold
// =============================================================================

const C = {
  bg: '#0a0a0a',
  bgCard: '#111111',
  bgGlass: 'rgba(255,255,255,0.04)',
  gold: '#c9a55c',
  goldLight: '#e3cc8e',
  goldDark: '#a07a35',
  white: '#ffffff',
  textPrimary: '#f5f1eb',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.08)',
  borderGold: 'rgba(201,165,92,0.25)',
  heroGradient: 'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(201,165,92,0.12) 0%, transparent 60%)',
  sectionAlt: '#080808',
};

const FONT = {
  serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
  sans: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
};

// =============================================================================
// CSS ANIMATIONS (injected once)
// =============================================================================

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap');

  @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
  @keyframes glowPulse { 0%,100% { box-shadow: 0 0 30px rgba(201,165,92,0.15); } 50% { box-shadow: 0 0 60px rgba(201,165,92,0.3); } }

  .anim-up { animation: fadeUp 0.8s ease both; }
  .anim-up-d1 { animation: fadeUp 0.8s ease 0.1s both; }
  .anim-up-d2 { animation: fadeUp 0.8s ease 0.2s both; }
  .anim-up-d3 { animation: fadeUp 0.8s ease 0.3s both; }
  .anim-up-d4 { animation: fadeUp 0.8s ease 0.4s both; }
  .anim-up-d5 { animation: fadeUp 0.8s ease 0.5s both; }
  .anim-scale { animation: scaleIn 0.6s ease both; }

  .gold-text {
    background: linear-gradient(135deg, #e3cc8e 0%, #c9a55c 40%, #a07a35 70%, #c9a55c 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s linear infinite;
  }

  .cta-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 20px 44px;
    background: linear-gradient(135deg, #c9a55c 0%, #a07a35 100%);
    border: none;
    border-radius: 60px;
    color: #0a0a0a;
    font-weight: 700;
    font-size: 16px;
    font-family: ${FONT.sans};
    cursor: pointer;
    text-decoration: none;
    letter-spacing: 0.3px;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
    box-shadow: 0 8px 32px rgba(201,165,92,0.3);
  }
  .cta-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 48px rgba(201,165,92,0.45);
  }

  .cta-btn-outline {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 16px 36px;
    background: transparent;
    border: 1px solid rgba(201,165,92,0.35);
    border-radius: 60px;
    color: #c9a55c;
    font-weight: 600;
    font-size: 15px;
    font-family: ${FONT.sans};
    cursor: pointer;
    text-decoration: none;
    transition: all 0.3s ease;
  }
  .cta-btn-outline:hover {
    background: rgba(201,165,92,0.08);
    border-color: rgba(201,165,92,0.5);
  }

  .feature-card {
    position: relative;
    padding: 40px 32px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
    overflow: hidden;
  }
  .feature-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(201,165,92,0.3), transparent);
    opacity: 0;
    transition: opacity 0.4s;
  }
  .feature-card:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(201,165,92,0.15);
    transform: translateY(-4px);
  }
  .feature-card:hover::before { opacity: 1; }

  .testimonial-card {
    padding: 36px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    transition: all 0.3s ease;
  }
  .testimonial-card:hover {
    border-color: rgba(201,165,92,0.2);
    background: rgba(255,255,255,0.05);
  }

  .stat-item { text-align: center; }

  .nav-fixed {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    padding: 16px 32px;
    display: flex; justify-content: space-between; align-items: center;
    background: rgba(10,10,10,0.8);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: all 0.3s;
  }

  @media (max-width: 768px) {
    .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
    .hero-grid > div:first-child { align-items: center; }
    .features-grid { grid-template-columns: 1fr !important; }
    .stats-grid { grid-template-columns: 1fr 1fr !important; }
    .testimonials-grid { grid-template-columns: 1fr !important; }
    .demo-grid { grid-template-columns: 1fr !important; }
    .cta-btn { padding: 18px 36px; font-size: 15px; }
    .final-cta-row { flex-direction: column !important; }
  }
`;

// =============================================================================
// ANIMATED MOCKUP — Dashboard Preview (glass style)
// =============================================================================

function DashboardMockup() {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 480,
      animation: 'float 6s ease-in-out infinite',
    }}>
      {/* Main window */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Title bar */}
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febb2e' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
          <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: C.textMuted, fontFamily: FONT.sans }}>
            app.belapro.com.br
          </div>
        </div>

        {/* Dashboard content */}
        <div style={{ padding: 20 }}>
          {/* Metrics row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Hoje', val: '8', sub: 'agendamentos', color: C.gold },
              { label: 'Receita', val: 'R$ 1.240', sub: 'hoje', color: '#5fba7d' },
              { label: 'Clientes', val: '156', sub: 'ativos', color: '#6b8dde' },
            ].map((m, i) => (
              <div key={i} style={{
                padding: '14px 12px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT.sans, marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: m.color, fontFamily: FONT.serif }}>{m.val}</div>
                <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Appointments preview */}
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, fontFamily: FONT.sans, fontWeight: 500, letterSpacing: 1 }}>
            PRÓXIMOS HORÁRIOS
          </div>
          {[
            { t: '09:00', n: 'Ana Paula', s: 'Atendimento', status: true },
            { t: '10:30', n: 'Mariana S.', s: 'Procedimento', status: true },
            { t: '13:00', n: 'Juliana M.', s: 'Consulta', status: false },
            { t: '15:00', n: 'Beatriz R.', s: 'Retorno', status: true },
          ].map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0',
              borderBottom: i < 3 ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.gold, width: 42, fontFamily: FONT.sans }}>{a.t}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary, fontFamily: FONT.sans }}>{a.n}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{a.s}</div>
              </div>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: a.status ? '#5fba7d' : '#f5a623',
              }} />
            </div>
          ))}
        </div>
      </div>

      {/* Floating notification */}
      <div style={{
        position: 'absolute', top: -16, right: -16,
        background: 'rgba(17,17,17,0.95)', border: `1px solid ${C.borderGold}`,
        borderRadius: 14, padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        backdropFilter: 'blur(12px)',
        animation: 'glowPulse 3s ease-in-out infinite',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(95,186,125,0.15)', border: '1px solid rgba(95,186,125,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>✓</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary, fontFamily: FONT.sans }}>Agendamento confirmado</div>
          <div style={{ fontSize: 10, color: C.textMuted }}>Ana Paula • agora</div>
        </div>
      </div>

      {/* Floating revenue */}
      <div style={{
        position: 'absolute', bottom: 20, left: -24,
        background: 'rgba(17,17,17,0.95)', border: `1px solid ${C.border}`,
        borderRadius: 14, padding: '14px 18px',
        backdropFilter: 'blur(12px)',
        animation: 'float 5s ease-in-out 1s infinite',
      }}>
        <div style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT.sans, marginBottom: 4 }}>Receita mensal</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#5fba7d', fontFamily: FONT.serif }}>R$ 8.450</div>
        <div style={{ fontSize: 10, color: C.gold, marginTop: 2 }}>↑ 23% vs mês anterior</div>
      </div>
    </div>
  );
}

// =============================================================================
// FEATURES DATA
// =============================================================================

const FEATURES = [
  {
    icon: '📅',
    title: 'Agenda Inteligente',
    desc: 'Visão completa do seu dia, semana e mês. Agendamentos, confirmações e cancelamentos em tempo real.',
    details: ['Arrastar e reorganizar', 'Confirmação automática', 'Bloqueio de horários'],
  },
  {
    icon: '🔗',
    title: 'Link de Agendamento',
    desc: 'Seus clientes agendam online 24h. Compartilhe no Instagram, WhatsApp e redes sociais.',
    details: ['Página personalizada', 'Serviços com preço e duração', 'Integração com WhatsApp'],
  },
  {
    icon: '👥',
    title: 'Gestão de Clientes',
    desc: 'Cadastro completo com histórico de atendimentos e classificação automática.',
    details: ['Histórico completo', 'Notas e observações', 'Classificação automática'],
  },
  {
    icon: '💰',
    title: 'Controle Financeiro',
    desc: 'Receitas, despesas e lucro real em um painel visual. Gráficos e relatórios que facilitam decisões.',
    details: ['Receitas automáticas', 'Gráficos de evolução', 'Categorias personalizadas'],
  },
  {
    icon: '💳',
    title: 'Pagamento via PIX',
    desc: 'Receba sinal ou pagamento total via PIX direto da plataforma. QR Code gerado automaticamente.',
    details: ['QR Code instantâneo', 'Sinal configurável', 'Confirmação automática'],
  },
  {
    icon: '🤖',
    title: 'Chatbot WhatsApp',
    desc: 'Atendimento automatizado via WhatsApp. Confirma, reagenda e responde clientes sem você levantar o dedo.',
    details: ['Respostas automáticas', 'Lembretes automáticos', 'Disponível 24/7'],
  },
];

// =============================================================================
// STATS
// =============================================================================

const STATS = [
  { value: '500+', label: 'Profissionais ativos', icon: '👩‍💼' },
  { value: '15.000+', label: 'Agendamentos / mês', icon: '📅' },
  { value: '4.9★', label: 'Avaliação média', icon: '⭐' },
  { value: 'R$ 2M+', label: 'Gerenciados / mês', icon: '💰' },
];

// =============================================================================
// TESTIMONIALS
// =============================================================================

const TESTIMONIALS = [
  {
    text: 'Antes eu anotava tudo em caderno e sempre perdia informação. Agora tenho tudo organizado no celular. Me sinto profissional de verdade.',
    author: 'Marina Silva',
    role: 'Profissional autônoma • São Paulo',
    avatar: 'MS',
  },
  {
    text: 'O link de agendamento mudou minha vida! Coloquei no Instagram e os clientes agendam sozinhos. Minha agenda nunca ficou tão cheia.',
    author: 'Priscila Santos',
    role: 'Empreendedora • Rio de Janeiro',
    avatar: 'PS',
  },
  {
    text: 'Finalmente sei exatamente quanto eu ganho no mês. Os relatórios são claros e me ajudam a investir certo no meu negócio.',
    author: 'Fernanda Costa',
    role: 'Consultora de imagem • Belo Horizonte',
    avatar: 'FC',
  },
];

// =============================================================================
// HOW IT WORKS
// =============================================================================

const STEPS = [
  { num: '01', title: 'Crie sua conta', desc: 'Em menos de 2 minutos. Sem cartão de crédito, sem burocracia.' },
  { num: '02', title: 'Configure seus serviços', desc: 'Adicione seus serviços, preços e horários de funcionamento.' },
  { num: '03', title: 'Compartilhe o link', desc: 'Divulgue seu link no Instagram, WhatsApp e comece a receber agendamentos.' },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BusinessInviteLandingPage() {
  const params = useParams();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchInvite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function fetchInvite() {
    try {
      const res = await fetch(`${API_URL}/business-invites/public/${token}`);
      const data = await res.json();
      if (!data.success) {
        if (data.expired) setExpired(true);
        else setError(data.error || 'Convite não encontrado');
        return;
      }
      setInvite(data.data);
    } catch {
      setError('Erro ao carregar convite');
    } finally {
      setLoading(false);
    }
  }

  async function handleCtaClick() {
    try {
      await fetch(`${API_URL}/business-invites/public/${token}/cta-click`, { method: 'POST' });
    } catch {
      // silencioso
    }
  }

  // ---------- LOADING ----------
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: C.bg,
      }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{
          width: 48, height: 48,
          border: `3px solid ${C.border}`, borderTopColor: C.gold,
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  // ---------- EXPIRED ----------
  if (expired) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: C.bg, padding: 40, textAlign: 'center',
      }}>
        <style>{GLOBAL_CSS}</style>
        <div className="anim-scale" style={{
          width: 90, height: 90, borderRadius: '50%',
          background: 'rgba(201,165,92,0.1)', border: `1px solid ${C.borderGold}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, fontSize: 40,
        }}>⏰</div>
        <h1 className="anim-up" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, marginBottom: 12, fontFamily: FONT.serif }}>
          Este convite expirou
        </h1>
        <p className="anim-up-d1" style={{ color: C.textSecondary, maxWidth: 420, marginBottom: 36, lineHeight: 1.7, fontFamily: FONT.sans }}>
          Não se preocupe! Você ainda pode conhecer o Bela Pro e transformar a gestão do seu negócio.
        </p>
        <Link href="/cadastro" className="cta-btn anim-up-d2">
          Criar minha conta grátis
        </Link>
      </div>
    );
  }

  // ---------- ERROR ----------
  if (error || !invite) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: C.bg, padding: 40, textAlign: 'center',
      }}>
        <style>{GLOBAL_CSS}</style>
        <div className="anim-scale" style={{
          width: 90, height: 90, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, fontSize: 40,
        }}>🔍</div>
        <h1 className="anim-up" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, marginBottom: 12, fontFamily: FONT.serif }}>
          Convite não encontrado
        </h1>
        <p className="anim-up-d1" style={{ color: C.textSecondary, maxWidth: 420, marginBottom: 36, lineHeight: 1.7, fontFamily: FONT.sans }}>
          Este link pode estar incorreto. Que tal criar sua conta e experimentar gratuitamente?
        </p>
        <Link href="/cadastro" className="cta-btn anim-up-d2">
          Experimentar grátis
        </Link>
      </div>
    );
  }

  const recipientName = invite.inviteType === 'PUBLIC'
    ? null
    : invite.contactName || invite.businessName;

  // ==========================================================================
  // RENDER — SINGLE ULTRA PREMIUM MODEL
  // ==========================================================================

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT.sans, color: C.textPrimary, overflowX: 'hidden' }}>
      <style>{GLOBAL_CSS}</style>

      {/* ::::::::: NAV ::::::::: */}
      <nav className="nav-fixed">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Bela Pro" style={{ height: 36, width: 'auto' }} />
        </div>
        <Link href={`/cadastro?ref=${token}`} onClick={handleCtaClick} className="cta-btn" style={{ padding: '12px 28px', fontSize: 14 }}>
          Começar grátis
        </Link>
      </nav>

      {/* ::::::::: HERO ::::::::: */}
      <section ref={heroRef} style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '120px 32px 80px',
        background: C.heroGradient,
      }}>
        {/* Glow orb */}
        <div style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,165,92,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="hero-grid" style={{
          maxWidth: 1280, margin: '0 auto', width: '100%',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center',
          position: 'relative', zIndex: 2,
        }}>
          {/* Left — Copy */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Badge */}
            <div className="anim-up" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '8px 18px', background: C.bgGlass,
              border: `1px solid ${C.borderGold}`, borderRadius: 60,
              marginBottom: 36, alignSelf: 'flex-start',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.gold, animation: 'pulse 2s infinite' }} />
              <span style={{ color: C.textSecondary, fontSize: 13, fontWeight: 500 }}>
                {invite.inviteType === 'PUBLIC'
                  ? <><span style={{ color: C.gold }}>Oferta Exclusiva</span> para você</>                    
                  : <>Convite exclusivo para <span style={{ color: C.gold }}>{recipientName}</span></>
                }
              </span>
            </div>

            {/* Headline */}
            <h1 className="anim-up-d1" style={{
              fontSize: 'clamp(38px, 5.5vw, 64px)',
              fontWeight: 800,
              fontFamily: FONT.serif,
              lineHeight: 1.08,
              marginBottom: 28,
              letterSpacing: '-1.5px',
            }}>
              A plataforma que{' '}
              <span className="gold-text">
                transforma
              </span>{' '}
              o seu negócio
            </h1>

            {/* Sub */}
            <p className="anim-up-d2" style={{
              fontSize: 'clamp(17px, 2vw, 20px)',
              color: C.textSecondary,
              lineHeight: 1.7,
              marginBottom: 40,
              maxWidth: 520,
            }}>
              Organize sua agenda, clientes e finanças em um só lugar. 
              Menos cadernos e planilhas. Mais tempo para o que realmente importa.
            </p>

            {/* Personal message */}
            {invite.personalMessage && (
              <div className="anim-up-d3" style={{
                background: C.bgGlass,
                padding: '20px 24px',
                borderRadius: 14,
                border: `1px solid ${C.borderGold}`,
                marginBottom: 40,
                maxWidth: 500,
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: -8, left: 24,
                  background: C.bg, padding: '0 8px',
                  fontSize: 11, color: C.gold, fontWeight: 600, letterSpacing: 1,
                }}>MENSAGEM PESSOAL</div>
                <p style={{ color: C.textSecondary, fontStyle: 'italic', margin: 0, lineHeight: 1.7, fontSize: 15, fontFamily: FONT.serif }}>
                  &ldquo;{invite.personalMessage}&rdquo;
                </p>
              </div>
            )}

            {/* CTAs */}
            <div className="anim-up-d4" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              <Link href={`/cadastro?ref=${token}`} onClick={handleCtaClick} className="cta-btn">
                Experimentar 14 dias grátis
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <span style={{ color: C.textMuted, fontSize: 13 }}>Sem cartão de crédito</span>
            </div>

            {/* Trust markers */}
            <div className="anim-up-d5" style={{ display: 'flex', gap: 24, marginTop: 48, flexWrap: 'wrap' }}>
              {['500+ profissionais', '4.9★ avaliação', 'Suporte humano'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold }} />
                  <span style={{ color: C.textMuted, fontSize: 12, fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Mockup */}
          <div className="anim-up-d3" style={{ display: 'flex', justifyContent: 'center' }}>
            <DashboardMockup />
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 11, color: C.textMuted, letterSpacing: 2, textTransform: 'uppercase' }}>Descubra</span>
          <div style={{ width: 1, height: 40, background: `linear-gradient(180deg, ${C.gold} 0%, transparent 100%)` }} />
        </div>
      </section>

      {/* ::::::::: SOCIAL PROOF BAR ::::::::: */}
      <section style={{
        padding: '56px 32px',
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div className="stats-grid" style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32,
        }}>
          {STATS.map((s, i) => (
            <div key={i} className="stat-item">
              <div style={{ fontSize: 14, marginBottom: 8 }}>{s.icon}</div>
              <div className="gold-text" style={{ fontSize: 'clamp(30px, 4vw, 42px)', fontWeight: 800, fontFamily: FONT.serif, marginBottom: 4 }}>
                {s.value}
              </div>
              <div style={{ color: C.textMuted, fontSize: 13, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ::::::::: FEATURES ::::::::: */}
      <section style={{ padding: '120px 32px', background: C.sectionAlt }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>
              FUNCIONALIDADES
            </div>
            <h2 style={{
              fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 700, fontFamily: FONT.serif,
              marginBottom: 18, letterSpacing: '-1px',
            }}>
              Tudo que você precisa.<br />
              <span className="gold-text">Nada que não precisa.</span>
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 17, maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
              Ferramentas pensadas para o dia a dia do profissional. Simples, elegante, poderoso.
            </p>
          </div>

          <div className="features-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
          }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(201,165,92,0.08)', border: `1px solid ${C.borderGold}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, marginBottom: 24,
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 700, fontFamily: FONT.serif, marginBottom: 10, color: C.textPrimary }}>
                  {f.title}
                </h3>
                <p style={{ color: C.textSecondary, lineHeight: 1.65, marginBottom: 20, fontSize: 14 }}>
                  {f.desc}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {f.details.map((d, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
                      <span style={{ color: C.textMuted, fontSize: 13 }}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ::::::::: HOW IT WORKS ::::::::: */}
      <section style={{ padding: '120px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>
              COMO FUNCIONA
            </div>
            <h2 style={{ fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 700, fontFamily: FONT.serif, letterSpacing: '-1px' }}>
              3 passos para{' '}
              <span className="gold-text">transformar</span>{' '}
              seu negócio
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{
                display: 'flex', gap: 32, alignItems: 'flex-start', position: 'relative',
                padding: '32px 0',
              }}>
                {/* Number + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 60, flexShrink: 0 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: i === 0 ? `linear-gradient(135deg, ${C.gold}, ${C.goldDark})` : C.bgGlass,
                    border: `1px solid ${i === 0 ? 'transparent' : C.borderGold}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, fontFamily: FONT.serif,
                    color: i === 0 ? C.bg : C.gold,
                  }}>{step.num}</div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 1, height: 48, background: `linear-gradient(180deg, ${C.borderGold}, transparent)`, marginTop: 12 }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ paddingTop: 8 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.serif, marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ color: C.textSecondary, fontSize: 15, lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ::::::::: TESTIMONIALS ::::::::: */}
      <section style={{ padding: '120px 32px', background: C.sectionAlt }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>
              DEPOIMENTOS
            </div>
            <h2 style={{ fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 700, fontFamily: FONT.serif, letterSpacing: '-1px' }}>
              Quem usa,{' '}
              <span className="gold-text">recomenda</span>
            </h2>
          </div>

          <div className="testimonials-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
          }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card">
                {/* Stars */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} width="18" height="18" viewBox="0 0 24 24" fill={C.gold} stroke="none">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: C.textSecondary, marginBottom: 28, fontFamily: FONT.sans }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: C.bg, fontFamily: FONT.sans,
                  }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.textPrimary }}>{t.author}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ::::::::: FINAL CTA ::::::::: */}
      <section style={{
        position: 'relative',
        padding: '140px 32px',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,165,92,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>
            COMECE AGORA
          </div>
          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, fontFamily: FONT.serif,
            marginBottom: 24, letterSpacing: '-1.5px', lineHeight: 1.1,
          }}>
            Pronta para dar o{' '}
            <span className="gold-text">próximo passo?</span>
          </h2>
          <p style={{ color: C.textSecondary, fontSize: 18, marginBottom: 48, lineHeight: 1.7, maxWidth: 540, margin: '0 auto 48px' }}>
            {recipientName
              ? <><strong style={{ color: C.textPrimary }}>{recipientName}</strong>, junte-se a centenas de profissionais que já transformaram seu negócio.</>
              : 'Junte-se a centenas de profissionais que já transformaram seu negócio com o Bela Pro.'
            }
          </p>

          <div className="final-cta-row" style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link href={`/cadastro?ref=${token}`} onClick={handleCtaClick} className="cta-btn" style={{ fontSize: 17, padding: '22px 52px' }}>
              Criar minha conta grátis
            </Link>
          </div>

          {/* Trust */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 36, marginTop: 44, flexWrap: 'wrap' }}>
            {['14 dias grátis', 'Sem cartão', 'Cancele quando quiser'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ color: C.textMuted, fontSize: 13 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ::::::::: FOOTER ::::::::: */}
      <footer style={{
        padding: '48px 32px',
        borderTop: `1px solid ${C.border}`,
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Bela Pro" style={{ height: 40, width: 'auto', opacity: 0.7 }} />
        </div>
        <p style={{ color: C.textMuted, fontSize: 13 }}>
          A plataforma de gestão para profissionais
        </p>
        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, marginTop: 16 }}>
          © 2026 Bela Pro. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
