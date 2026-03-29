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
  trialDays: number;
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
  dangerText: '#f87171',
  successText: '#5fba7d',
};

const FONT = {
  serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
  sans: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
};

// =============================================================================
// CSS
// =============================================================================

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
  @keyframes glowPulse { 0%,100% { box-shadow: 0 0 30px rgba(201,165,92,0.15); } 50% { box-shadow: 0 0 60px rgba(201,165,92,0.3); } }
  @keyframes ctaPulse { 0%,100% { box-shadow: 0 8px 32px rgba(201,165,92,0.3); } 50% { box-shadow: 0 8px 48px rgba(201,165,92,0.5); } }

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
    animation: ctaPulse 3s ease-in-out infinite;
  }
  .cta-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 48px rgba(201,165,92,0.45);
  }

  .cta-btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 16px 36px;
    background: transparent;
    border: 1.5px solid rgba(201,165,92,0.35);
    border-radius: 60px;
    color: #c9a55c;
    font-weight: 600;
    font-size: 15px;
    font-family: ${FONT.sans};
    cursor: pointer;
    text-decoration: none;
    transition: all 0.3s ease;
  }
  .cta-btn-secondary:hover {
    background: rgba(201,165,92,0.08);
    border-color: rgba(201,165,92,0.5);
  }

  .feature-card {
    position: relative;
    padding: 36px 28px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
    overflow: hidden;
  }
  .feature-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
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
    padding: 32px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    transition: all 0.3s ease;
  }
  .testimonial-card:hover {
    border-color: rgba(201,165,92,0.2);
    background: rgba(255,255,255,0.05);
  }

  .loss-card {
    padding: 28px;
    background: rgba(248,113,113,0.04);
    border: 1px solid rgba(248,113,113,0.12);
    border-radius: 16px;
    transition: all 0.3s ease;
  }
  .loss-card:hover {
    background: rgba(248,113,113,0.07);
    border-color: rgba(248,113,113,0.2);
  }

  .compare-bad { background: rgba(248,113,113,0.04); border: 1px solid rgba(248,113,113,0.1); }
  .compare-good { background: rgba(95,186,125,0.04); border: 1px solid rgba(95,186,125,0.15); }

  .faq-item {
    padding: 24px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  .faq-item:hover {
    background: rgba(255,255,255,0.04);
    border-color: rgba(201,165,92,0.15);
  }

  .nav-fixed {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    padding: 14px 24px;
    display: flex; justify-content: space-between; align-items: center;
    background: rgba(10,10,10,0.85);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .mobile-cta-bar {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
    padding: 12px 16px;
    background: rgba(10,10,10,0.95);
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255,255,255,0.08);
    justify-content: center;
  }

  @media (max-width: 768px) {
    .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
    .hero-grid > div:first-child { align-items: center; }
    .features-grid { grid-template-columns: 1fr !important; }
    .stats-grid { grid-template-columns: 1fr 1fr 1fr !important; gap: 16px !important; }
    .testimonials-grid { grid-template-columns: 1fr !important; }
    .loss-grid { grid-template-columns: 1fr !important; }
    .compare-grid { grid-template-columns: 1fr !important; }
    .cta-btn { padding: 18px 32px; font-size: 15px; }
    .final-cta-row { flex-direction: column !important; }
    .mobile-cta-bar { display: flex; }
    .hide-mobile { display: none !important; }
    .nav-cta { display: none !important; }
    .price-compare { flex-direction: column !important; }
    body { padding-bottom: 70px; }
  }
`;

// =============================================================================
// DASHBOARD MOCKUP
// =============================================================================

function DashboardMockup() {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${C.border}`,
        borderRadius: 16, overflow: 'hidden',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{
          padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febb2e' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
          <div style={{ flex: 1, textAlign: 'center', fontSize: 10, color: C.textMuted, fontFamily: FONT.sans }}>
            app.belapro.com.br
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Hoje', val: '8', sub: 'agendamentos', color: C.gold },
              { label: 'Receita', val: 'R$ 1.240', sub: 'hoje', color: '#5fba7d' },
              { label: 'Clientes', val: '156', sub: 'ativos', color: '#6b8dde' },
            ].map((m, i) => (
              <div key={i} style={{
                padding: '12px 10px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 9, color: C.textMuted, fontFamily: FONT.sans, marginBottom: 3 }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: FONT.serif }}>{m.val}</div>
                <div style={{ fontSize: 8, color: C.textMuted, marginTop: 2 }}>{m.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 8, fontFamily: FONT.sans, fontWeight: 500, letterSpacing: 1 }}>
            PRÓXIMOS HORÁRIOS
          </div>
          {[
            { t: '09:00', n: 'Ana Paula', s: 'Unha em Gel' },
            { t: '10:30', n: 'Mariana S.', s: 'Extensão de Cílios' },
            { t: '13:00', n: 'Juliana M.', s: 'Manicure + Pedicure' },
          ].map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0',
              borderBottom: i < 2 ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.gold, width: 38, fontFamily: FONT.sans }}>{a.t}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.textPrimary, fontFamily: FONT.sans }}>{a.n}</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>{a.s}</div>
              </div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5fba7d' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Floating notification */}
      <div style={{
        position: 'absolute', top: -14, right: -14,
        background: 'rgba(17,17,17,0.95)', border: `1px solid ${C.borderGold}`,
        borderRadius: 12, padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
        backdropFilter: 'blur(12px)',
        animation: 'glowPulse 3s ease-in-out infinite',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(95,186,125,0.15)', border: '1px solid rgba(95,186,125,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
        }}>✓</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textPrimary, fontFamily: FONT.sans }}>Agendamento confirmado</div>
          <div style={{ fontSize: 9, color: C.textMuted }}>Ana Paula • agora</div>
        </div>
      </div>

      {/* Floating Pix */}
      <div style={{
        position: 'absolute', bottom: 16, left: -20,
        background: 'rgba(17,17,17,0.95)', border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '10px 14px',
        backdropFilter: 'blur(12px)',
        animation: 'float 5s ease-in-out 1s infinite',
      }}>
        <div style={{ fontSize: 9, color: C.textMuted, fontFamily: FONT.sans, marginBottom: 3 }}>Pix recebido</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#5fba7d', fontFamily: FONT.serif }}>R$ 120,00</div>
        <div style={{ fontSize: 9, color: C.gold, marginTop: 2 }}>Sinal automático</div>
      </div>
    </div>
  );
}

// =============================================================================
// DATA
// =============================================================================

const FEATURES = [
  {
    icon: '📅',
    title: 'Agenda Inteligente',
    desc: 'Veja seu dia, semana e mês numa tela só. Arrastar horário, confirmar, bloquear — tudo em 1 toque.',
    details: ['Arrastar e reorganizar', 'Confirmação automática', 'Bloqueio de horários'],
  },
  {
    icon: '🔗',
    title: 'Link de Agendamento',
    desc: 'Coloque na bio do Instagram e os clientes agendam sozinhos, 24h. Acabou o "manda mensagem pra agendar".',
    details: ['Página com sua marca', 'Serviços com preço e duração', 'Agenda em tempo real'],
  },
  {
    icon: '💳',
    title: 'Pix Automático',
    desc: 'Cobre sinal ou valor total via Pix direto pelo app. QR Code instantâneo. Sem mais "vou mandar o comprovante".',
    details: ['QR Code na hora', 'Sinal configurável', 'Confirmação automática'],
  },
  {
    icon: '🤖',
    title: 'Robô no WhatsApp',
    desc: 'Confirma horários, lembra clientes e responde dúvidas 24h. Funciona até quando a cliente agenda às 23h.',
    details: ['Lembretes automáticos', 'Respostas inteligentes', 'Zero trabalho manual'],
  },
  {
    icon: '👥',
    title: 'Gestão de Clientes',
    desc: 'Histórico completo: quando veio, o que fez, quanto pagou. Descubra quem é VIP e quem sumiu.',
    details: ['Histórico completo', 'Notas por cliente', 'Classificação automática'],
  },
  {
    icon: '💰',
    title: 'Controle Financeiro',
    desc: 'Saiba exatamente quanto entra e quanto sai. Gráficos claros que mostram se o mês tá bom ou se precisa correr.',
    details: ['Receita automática', 'Gráficos de evolução', 'Relatório mensal'],
  },
];

const LOSSES = [
  {
    icon: '📱',
    title: '3-5 clientes/mês esquecem o horário',
    desc: 'Porque você confirma no WhatsApp e a mensagem se perde entre 200 conversas.',
  },
  {
    icon: '⏰',
    title: '4-6 horas/semana respondendo mensagens',
    desc: '"Qual horário tem?", "Quanto custa?", "Pode encaixar amanhã?" — sempre as mesmas perguntas.',
  },
  {
    icon: '💸',
    title: 'R$ 800-1.500/mês em agendamentos perdidos',
    desc: 'Cliente não aparece, horário vago, sinal não cobrado. Prejuízo invisível todo mês.',
  },
];

const COMPARE = [
  { bad: 'Agenda no caderno ou no WhatsApp', good: 'Agenda digital completa no celular' },
  { bad: 'Cliente esquece o horário e não vem', good: 'Lembrete automático por WhatsApp' },
  { bad: '"Quanto custa?" 50x por dia no direct', good: 'Link de agendamento com preços online' },
  { bad: 'Cobra por Pix "quando lembra"', good: 'Pix automático com QR Code' },
  { bad: 'Não sabe quanto ganhou no mês', good: 'Relatório financeiro em tempo real' },
  { bad: 'Perde cliente e nem percebe', good: 'Alerta de cliente sumido' },
];

const STATS = [
  { value: '200+', label: 'Profissionais já usam', icon: '👩‍💼' },
  { value: '5.000+', label: 'Agendamentos realizados', icon: '📅' },
  { value: '4.9★', label: 'Avaliação média', icon: '⭐' },
];

const TESTIMONIALS = [
  {
    text: 'Eu perdia pelo menos 3 clientes por semana porque esqueciam o horário. Depois que coloquei o lembrete automático do Bela Pro, meu no-show caiu pra quase zero. Fiz conta: tô ganhando R$ 600 a mais todo mês.',
    author: 'Marina S.',
    role: 'Nail Designer • São Paulo',
    avatar: 'MS',
  },
  {
    text: 'Coloquei o link de agendamento na bio do Instagram e em 1 semana recebi 14 agendamentos sem trocar uma mensagem. Chorei de emoção, juro.',
    author: 'Priscila R.',
    role: 'Lash Artist • Rio de Janeiro',
    avatar: 'PR',
  },
  {
    text: 'Eu achava que controlava bem minhas finanças no caderninho. Quando vi o relatório do Bela Pro, descobri que tava deixando R$ 400/mês na mesa por não cobrar sinal. Nunca mais.',
    author: 'Fernanda C.',
    role: 'Esteticista • Belo Horizonte',
    avatar: 'FC',
  },
];

const STEPS = [
  { num: '01', title: 'Crie sua conta', desc: 'Nome, e-mail e senha. Sem cartão de crédito. Leva 30 segundos.' },
  { num: '02', title: 'Adicione seus serviços', desc: 'Coloque nome, preço e duração de cada serviço que você faz.' },
  { num: '03', title: 'Compartilhe o link', desc: 'Cole na bio do Instagram, mande no WhatsApp. Pronto — seus clientes já podem agendar.' },
];

const FAQS = [
  { q: 'Preciso de cartão de crédito para testar?', a: 'Não. Os dias de trial são 100% grátis, sem pedir cartão.' },
  { q: 'Funciona no celular?', a: 'Sim. O Bela Pro funciona direto no navegador do celular, tablet ou computador. Não precisa instalar nada.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Sem multa, sem taxa, sem burocracia.' },
  { q: 'Meus clientes precisam baixar app?', a: 'Não. Eles acessam o link de agendamento pelo navegador, sem cadastro.' },
  { q: 'E se eu não entender como usar?', a: 'Nosso suporte humano te ajuda por WhatsApp. Nada de robô respondendo.' },
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
  const [sponsors, setSponsors] = useState<{ id: string; name: string; logoLightUrl?: string; logoDarkUrl?: string; websiteUrl?: string; ctaUrl?: string; tier: string }[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const heroRef = useRef<HTMLElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchInvite();
    fetchSponsors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function fetchSponsors() {
    try {
      const res = await fetch(`${API_URL}/public/sponsors?placement=INVITE_LANDING`);
      if (res.ok) setSponsors(await res.json());
    } catch { /* silent */ }
  }

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
    } catch { /* silent */ }
  }

  // ---- LOADING ----
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ width: 48, height: 48, border: `3px solid ${C.border}`, borderTopColor: C.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // ---- EXPIRED ----
  if (expired) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: 40, textAlign: 'center' }}>
        <style>{GLOBAL_CSS}</style>
        <div className="anim-scale" style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(201,165,92,0.1)', border: `1px solid ${C.borderGold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, fontSize: 40 }}>⏰</div>
        <h1 className="anim-up" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, marginBottom: 12, fontFamily: FONT.serif }}>Este convite expirou</h1>
        <p className="anim-up-d1" style={{ color: C.textSecondary, maxWidth: 420, marginBottom: 36, lineHeight: 1.7, fontFamily: FONT.sans }}>
          Não se preocupe! Você ainda pode conhecer o Bela Pro e transformar a gestão do seu negócio.
        </p>
        <Link href="/cadastro" className="cta-btn anim-up-d2">Criar minha conta grátis</Link>
      </div>
    );
  }

  // ---- ERROR ----
  if (error || !invite) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: 40, textAlign: 'center' }}>
        <style>{GLOBAL_CSS}</style>
        <div className="anim-scale" style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, fontSize: 40 }}>🔍</div>
        <h1 className="anim-up" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, marginBottom: 12, fontFamily: FONT.serif }}>Convite não encontrado</h1>
        <p className="anim-up-d1" style={{ color: C.textSecondary, maxWidth: 420, marginBottom: 36, lineHeight: 1.7, fontFamily: FONT.sans }}>
          Este link pode estar incorreto. Que tal criar sua conta e experimentar gratuitamente?
        </p>
        <Link href="/cadastro" className="cta-btn anim-up-d2">Experimentar grátis</Link>
      </div>
    );
  }

  const recipientName = invite.inviteType === 'PUBLIC' ? null : invite.contactName || invite.businessName;
  const trialDays = invite.trialDays || 7;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT.sans, color: C.textPrimary, overflowX: 'hidden' }}>
      <style>{GLOBAL_CSS}</style>

      {/* ===== NAV STICKY ===== */}
      <nav className="nav-fixed">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: FONT.serif, fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px',
            background: `linear-gradient(135deg, ${C.goldLight} 0%, ${C.gold} 50%, ${C.goldDark} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Bela Pro</span>
          <div style={{ padding: '4px 12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>🎁 {trialDays} dias grátis</span>
          </div>
        </div>
        <Link href={`/cadastro?ref=${token}`} onClick={handleCtaClick} className="cta-btn nav-cta" style={{ padding: '10px 24px', fontSize: 13, animation: 'none' }}>
          Quero experimentar →
        </Link>
      </nav>

      {/* ===== HERO ===== */}
      <section ref={heroRef} style={{
        position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '120px 24px 80px', background: C.heroGradient,
      }}>
        <div style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,165,92,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="hero-grid" style={{
          maxWidth: 1200, margin: '0 auto', width: '100%',
          display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 60, alignItems: 'center',
          position: 'relative', zIndex: 2,
        }}>
          {/* Left — Copy */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Urgency Badge */}
            <div className="anim-up" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '10px 18px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 60, marginBottom: 20, alignSelf: 'flex-start',
            }}>
              <span style={{ fontSize: 18 }}>🎁</span>
              <span style={{ color: '#10b981', fontSize: 14, fontWeight: 700 }}>
                OFERTA EXCLUSIVA — {trialDays} DIAS GRÁTIS
              </span>
            </div>

            {/* Personal badge for directed invites */}
            {recipientName && (
              <div className="anim-up" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', background: C.bgGlass,
                border: `1px solid ${C.borderGold}`, borderRadius: 60,
                marginBottom: 24, alignSelf: 'flex-start',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, animation: 'pulse 2s infinite' }} />
                <span style={{ color: C.textSecondary, fontSize: 12, fontWeight: 500 }}>
                  Convite exclusivo para <span style={{ color: C.gold }}>{recipientName}</span>
                </span>
              </div>
            )}

            {/* Headline — pain-focused */}
            <h1 className="anim-up-d1" style={{
              fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, fontFamily: FONT.serif,
              lineHeight: 1.1, marginBottom: 24, letterSpacing: '-1.5px',
            }}>
              Chega de perder cliente por causa de{' '}
              <span className="gold-text">agenda bagunçada no WhatsApp.</span>
            </h1>

            {/* Sub — solution */}
            <p className="anim-up-d2" style={{
              fontSize: 'clamp(16px, 1.8vw, 19px)', color: C.textSecondary,
              lineHeight: 1.7, marginBottom: 36, maxWidth: 520,
            }}>
              O Bela Pro organiza seus agendamentos, cobra via Pix automático e confirma horários por WhatsApp — tudo sozinho. Para que você foque no que sabe fazer: <strong style={{ color: C.textPrimary }}>atender bem.</strong>
            </p>

            {/* Personal message */}
            {invite.personalMessage && (
              <div className="anim-up-d3" style={{
                background: C.bgGlass, padding: '18px 22px', borderRadius: 14,
                border: `1px solid ${C.borderGold}`, marginBottom: 32, maxWidth: 480, position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: -8, left: 20, background: C.bg, padding: '0 8px', fontSize: 10, color: C.gold, fontWeight: 600, letterSpacing: 1 }}>
                  MENSAGEM PESSOAL
                </div>
                <p style={{ color: C.textSecondary, fontStyle: 'italic', margin: 0, lineHeight: 1.7, fontSize: 14, fontFamily: FONT.serif }}>
                  &ldquo;{invite.personalMessage}&rdquo;
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="anim-up-d4" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', marginBottom: 8 }}>
              <Link href={`/cadastro?ref=${token}`} onClick={handleCtaClick} className="cta-btn">
                Criar minha conta grátis
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            {/* Trust markers */}
            <div className="anim-up-d5" style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
              {[`✓ ${trialDays} dias grátis`, '✓ Sem cartão de crédito', '✓ Cancele quando quiser'].map((t, i) => (
                <span key={i} style={{ color: C.textMuted, fontSize: 12, fontWeight: 500 }}>{t}</span>
              ))}
            </div>

            <div className="anim-up-d5" style={{ marginTop: 16 }}>
              <span style={{ color: C.textMuted, fontSize: 12 }}>Já usado por profissionais em SP, RJ, BH e mais 12 cidades</span>
            </div>
          </div>

          {/* Right — Mockup */}
          <div className="anim-up-d3 hide-mobile" style={{ display: 'flex', justifyContent: 'center' }}>
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ===== SECTION: QUANTO VOCÊ PERDE HOJE ===== */}
      <section style={{ padding: '100px 24px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 12, color: C.dangerText, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>
              ATENÇÃO
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 700, fontFamily: FONT.serif, letterSpacing: '-1px', marginBottom: 16 }}>
              Você sabia que profissionais da beleza perdem até{' '}
              <span style={{ color: C.dangerText }}>R$ 1.200/mês</span>{' '}
              por falta de organização?
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 16, maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
              São problemas do dia a dia que parecem pequenos, mas somam um prejuízo enorme no final do mês.
            </p>
          </div>

          <div className="loss-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {LOSSES.map((l, i) => (
              <div key={i} className="loss-card">
                <div style={{ fontSize: 32, marginBottom: 16 }}>{l.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.dangerText, fontFamily: FONT.serif, marginBottom: 10 }}>{l.title}</h3>
                <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.65 }}>{l.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link href={`/cadastro?ref=${token}`} onClick={handleCtaClick} className="cta-btn-secondary">
              Resolver isso agora →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SECTION: PROVA SOCIAL ===== */}
      <section style={{ padding: '56px 24px', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
            PROFISSIONAIS REAIS, RESULTADOS REAIS
          </p>
        </div>
        <div className="stats-grid" style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>{s.icon}</div>
              <div className="gold-text" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, fontFamily: FONT.serif, marginBottom: 4 }}>
                {s.value}
              </div>
              <div style={{ color: C.textMuted, fontSize: 13, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SECTION: FUNCIONALIDADES ===== */}
      <section style={{ padding: '100px 24px', background: C.sectionAlt }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>
              FUNCIONALIDADES
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, fontFamily: FONT.serif, marginBottom: 16, letterSpacing: '-1px' }}>
              Tudo que você precisa.{' '}
              <span className="gold-text">Nada que não precisa.</span>
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 16, maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
              Ferramentas pensadas para o dia a dia de quem atende cliente. Simples de usar, poderosas no resultado.
            </p>
          </div>

          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'rgba(201,165,92,0.08)', border: `1px solid ${C.borderGold}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 20,
                }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, fontFamily: FONT.serif, marginBottom: 8, color: C.textPrimary }}>{f.title}</h3>
                <p style={{ color: C.textSecondary, lineHeight: 1.6, marginBottom: 16, fontSize: 13 }}>{f.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {f.details.map((d, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
                      <span style={{ color: C.textMuted, fontSize: 12 }}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION: ANTES vs DEPOIS ===== */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, fontFamily: FONT.serif, letterSpacing: '-1px' }}>
              <span style={{ color: C.dangerText }}>Sem</span> Bela Pro{' '}
              <span style={{ color: C.textMuted, fontSize: '0.6em' }}>vs</span>{' '}
              <span className="gold-text">Com</span> Bela Pro
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {COMPARE.map((c, i) => (
              <div key={i} className="compare-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="compare-bad" style={{ padding: '16px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>❌</span>
                  <span style={{ color: 'rgba(248,113,113,0.85)', fontSize: 14 }}>{c.bad}</span>
                </div>
                <div className="compare-good" style={{ padding: '16px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>✅</span>
                  <span style={{ color: C.successText, fontSize: 14 }}>{c.good}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION: DEPOIMENTOS ===== */}
      <section style={{ padding: '100px 24px', background: C.sectionAlt }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>
              DEPOIMENTOS
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, fontFamily: FONT.serif, letterSpacing: '-1px' }}>
              Quem usa, <span className="gold-text">recomenda</span>
            </h2>
          </div>

          <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} width="16" height="16" viewBox="0 0 24 24" fill={C.gold} stroke="none">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: C.textSecondary, marginBottom: 24 }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: C.bg,
                  }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.textPrimary }}>{t.author}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION: PREÇO TRANSPARENTE ===== */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>
            TRANSPARÊNCIA TOTAL
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, fontFamily: FONT.serif, marginBottom: 20, letterSpacing: '-1px' }}>
            Sem surpresas. <span className="gold-text">Sem letra pequena.</span>
          </h2>

          <div style={{
            padding: '40px 32px', borderRadius: 20,
            background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.borderGold}`,
            marginBottom: 32,
          }}>
            <p style={{ color: C.textSecondary, fontSize: 17, lineHeight: 1.8, marginBottom: 24 }}>
              Os primeiros <strong style={{ color: '#10b981' }}>{trialDays} dias são 100% grátis.</strong><br />
              Sem cartão, sem taxa, sem pegadinha.
            </p>
            <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 20 }}>
              Depois do trial, se quiser continuar:
            </p>
            <div style={{ display: 'inline-block', padding: '16px 32px', borderRadius: 14, background: 'rgba(201,165,92,0.08)', border: `1px solid ${C.borderGold}`, marginBottom: 24 }}>
              <span className="gold-text" style={{ fontSize: 36, fontWeight: 800, fontFamily: FONT.serif }}>R$ 49,90</span>
              <span style={{ color: C.textMuted, fontSize: 15 }}>/mês</span>
            </div>
            <p style={{ color: C.textMuted, fontSize: 13, maxWidth: 480, margin: '0 auto' }}>
              Menos que o preço de 1 atendimento. Com agenda + Pix automático + WhatsApp + controle financeiro + tudo incluso.
            </p>
          </div>

          {/* Comparison */}
          <div className="price-compare" style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', maxWidth: 500, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.04)' }}>
              <span style={{ color: C.textMuted, fontSize: 13 }}>Caderno + WhatsApp + dor de cabeça</span>
              <span style={{ color: C.dangerText, fontSize: 13, fontWeight: 600, textDecoration: 'line-through' }}>-R$ 800/mês</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.04)' }}>
              <span style={{ color: C.textMuted, fontSize: 13 }}>Outras plataformas genéricas</span>
              <span style={{ color: C.dangerText, fontSize: 13, fontWeight: 600, textDecoration: 'line-through' }}>R$ 99-199/mês</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderRadius: 10, background: 'rgba(95,186,125,0.06)', border: '1px solid rgba(95,186,125,0.15)' }}>
              <span style={{ color: C.successText, fontSize: 13, fontWeight: 600 }}>Bela Pro — tudo incluso</span>
              <span style={{ color: C.successText, fontSize: 15, fontWeight: 700 }}>R$ 49,90/mês</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION: COMO FUNCIONA ===== */}
      <section style={{ padding: '100px 24px', background: C.sectionAlt }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>
              COMO FUNCIONA
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, fontFamily: FONT.serif, letterSpacing: '-1px' }}>
              Comece em menos de{' '}
              <span className="gold-text">2 minutos</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 28, alignItems: 'flex-start', padding: '28px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 56, flexShrink: 0 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: i === 0 ? `linear-gradient(135deg, ${C.gold}, ${C.goldDark})` : C.bgGlass,
                    border: `1px solid ${i === 0 ? 'transparent' : C.borderGold}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, fontFamily: FONT.serif,
                    color: i === 0 ? C.bg : C.gold,
                  }}>{step.num}</div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 1, height: 40, background: `linear-gradient(180deg, ${C.borderGold}, transparent)`, marginTop: 10 }} />
                  )}
                </div>
                <div style={{ paddingTop: 6 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT.serif, marginBottom: 6 }}>{step.title}</h3>
                  <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION: FAQ ===== */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, fontFamily: FONT.serif, letterSpacing: '-1px' }}>
              Perguntas frequentes
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQS.map((faq, i) => (
              <div key={i} className="faq-item" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: 0 }}>{faq.q}</h3>
                  <span style={{ color: C.gold, fontSize: 20, fontWeight: 300, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 12 }}>+</span>
                </div>
                {openFaq === i && (
                  <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.7, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, marginBottom: 0 }}>
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION: CTA FINAL ===== */}
      <section style={{
        position: 'relative', padding: '120px 24px', textAlign: 'center', overflow: 'hidden',
        background: C.sectionAlt,
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,165,92,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 800, fontFamily: FONT.serif,
            marginBottom: 20, letterSpacing: '-1.5px', lineHeight: 1.1,
          }}>
            Pronta pra parar de{' '}
            <span className="gold-text">perder cliente?</span>
          </h2>
          <p style={{ color: C.textSecondary, fontSize: 17, marginBottom: 44, lineHeight: 1.7, maxWidth: 520, margin: '0 auto 44px' }}>
            {recipientName
              ? <><strong style={{ color: C.textPrimary }}>{recipientName}</strong>, junte-se a centenas de profissionais que já largaram o caderninho e o WhatsApp bagunçado.</>
              : 'Junte-se a centenas de profissionais que já largaram o caderninho e o WhatsApp bagunçado. Teste grátis — se não gostar, é só não continuar.'
            }
          </p>

          <div className="final-cta-row" style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link href={`/cadastro?ref=${token}`} onClick={handleCtaClick} className="cta-btn" style={{ fontSize: 17, padding: '22px 48px' }}>
              Criar minha conta grátis →
            </Link>
          </div>

          {/* Urgency */}
          <div style={{ marginTop: 28, padding: '12px 20px', borderRadius: 10, background: 'rgba(201,165,92,0.06)', border: `1px solid ${C.borderGold}`, display: 'inline-block' }}>
            <span style={{ color: C.gold, fontSize: 13, fontWeight: 500 }}>
              ⏰ Oferta de {trialDays} dias grátis válida para novas contas. Vagas limitadas nesta rodada.
            </span>
          </div>

          {/* Trust */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 36, flexWrap: 'wrap' }}>
            {['🔒 Dados seguros', `🎁 ${trialDays} dias grátis`, '❌ Cancele quando quiser'].map((item, i) => (
              <span key={i} style={{ color: C.textMuted, fontSize: 12 }}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SPONSORS (only if any) ===== */}
      {sponsors.length > 0 && (
        <section style={{ padding: '48px 24px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
              PARCEIROS OFICIAIS
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 36, flexWrap: 'wrap', maxWidth: 800, margin: '0 auto' }}>
            {sponsors.map(s => (
              <a key={s.id} href={s.ctaUrl || s.websiteUrl || '#'} target="_blank" rel="noopener noreferrer"
                onClick={() => { fetch(`${API_URL}/public/sponsors/${s.id}/click`, { method: 'POST' }).catch(() => {}); }}
                style={{ display: 'flex', alignItems: 'center', padding: 10, filter: 'grayscale(70%) brightness(0.7)', opacity: 0.6, transition: 'all 0.3s ease' }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'grayscale(0%) brightness(1)'; e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'grayscale(70%) brightness(0.7)'; e.currentTarget.style.opacity = '0.6'; }}
              >
                {(s.logoDarkUrl || s.logoLightUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logoDarkUrl || s.logoLightUrl} alt={s.name} style={{ height: 32, maxWidth: 110, objectFit: 'contain' }} />
                ) : (
                  <span style={{ color: C.textMuted, fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer style={{ padding: '40px 24px', borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
        <span style={{
          fontFamily: FONT.serif, fontSize: 24, fontWeight: 800,
          background: `linear-gradient(135deg, ${C.goldLight} 0%, ${C.gold} 50%, ${C.goldDark} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', opacity: 0.6,
        }}>Bela Pro</span>
        <p style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>A agenda inteligente para profissionais da beleza</p>
        <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 11, marginTop: 12 }}>© 2026 Bela Pro. Todos os direitos reservados.</p>
      </footer>

      {/* ===== MOBILE CTA BAR ===== */}
      <div className="mobile-cta-bar">
        <Link href={`/cadastro?ref=${token}`} onClick={handleCtaClick} className="cta-btn" style={{ width: '100%', justifyContent: 'center', padding: '16px 24px', fontSize: 15, animation: 'none' }}>
          Criar minha conta grátis →
        </Link>
      </div>
    </div>
  );
}
