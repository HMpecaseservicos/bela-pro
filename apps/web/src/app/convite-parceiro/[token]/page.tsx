'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// =============================================================================
// TYPES
// =============================================================================

interface InviteData {
  isUniversal?: boolean;
  universalTitle?: string;
  companyName: string;
  contactName: string;
  personalMessage?: string;
  proposedTier: 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE';
  proposedType: string;
  proposedBenefits: string[];
  expiresAt: string;
}

interface TierDetail {
  name: string;
  icon: string;
  color: string;
  highlights: string[];
  placement: string;
  maxPosts: string;
  pricing: {
    [key: number]: {
      price: number;
      priceLabel: string;
      perMonth: string;
      discount?: string;
      featured?: boolean;
    };
  };
}

interface PaymentInfo {
  amountCents: number;
  amountFormatted: string;
  pixCode: string;
  pixExpiresAt: string;
  durationMonths: number;
}

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const C = {
  bg: '#050505',
  bgCard: '#0c0c0c',
  bgGlass: 'rgba(255,255,255,0.03)',
  gold: '#c9a55c',
  goldLight: '#e3cc8e',
  goldDark: '#a07a35',
  goldMuted: 'rgba(201,165,92,0.15)',
  white: '#ffffff',
  textPrimary: '#f5f1eb',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.06)',
  borderGold: 'rgba(201,165,92,0.2)',
  success: '#34d399',
  successBg: 'rgba(52,211,153,0.12)',
  danger: '#f87171',
  dangerBg: 'rgba(248,113,113,0.12)',
  diamond: '#a78bfa',
  diamondBg: 'rgba(167,139,250,0.12)',
};

const FONT = {
  serif: "'Playfair Display', Georgia, serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

const TIER_META: Record<string, { name: string; icon: string; color: string; glow: string }> = {
  DIAMOND: { name: 'Diamond Partner', icon: '💎', color: '#a78bfa', glow: 'rgba(167,139,250,0.3)' },
  GOLD: { name: 'Gold Partner', icon: '🥇', color: '#f59e0b', glow: 'rgba(245,158,11,0.3)' },
  SILVER: { name: 'Silver Partner', icon: '🥈', color: '#94a3b8', glow: 'rgba(148,163,184,0.3)' },
  BRONZE: { name: 'Bronze Partner', icon: '🥉', color: '#d97706', glow: 'rgba(217,119,6,0.3)' },
};

const TYPE_LABELS: Record<string, string> = {
  BRAND: 'Marca Parceira',
  SUPPLIER: 'Fornecedor Parceiro',
  OFFICIAL_PARTNER: 'Parceiro Oficial',
  EDUCATIONAL_PARTNER: 'Parceiro Educacional',
  TECH_PARTNER: 'Parceiro de Tecnologia',
  CAMPAIGN_PARTNER: 'Parceiro de Campanha',
};

const TYPE_OPTIONS = [
  { key: 'BRAND', label: 'Marca', desc: 'Empresa que deseja expor sua marca' },
  { key: 'SUPPLIER', label: 'Fornecedor', desc: 'Fornecedor de produtos de beleza' },
  { key: 'OFFICIAL_PARTNER', label: 'Parceiro Oficial', desc: 'Parceiro estratégico da plataforma' },
  { key: 'EDUCATIONAL_PARTNER', label: 'Educacional', desc: 'Instituição de ensino ou treinamento' },
  { key: 'TECH_PARTNER', label: 'Tecnologia', desc: 'Empresa de tecnologia parceira' },
  { key: 'CAMPAIGN_PARTNER', label: 'Campanha', desc: 'Parceria para campanhas específicas' },
];

const DURATION_OPTIONS = [
  { months: 3, label: '3 meses', desc: 'Ideal para testar' },
  { months: 6, label: '6 meses', desc: 'Mais popular', featured: true },
  { months: 12, label: '12 meses', desc: 'Melhor valor' },
];

// =============================================================================
// CSS
// =============================================================================

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap';

const GLOBAL_CSS = `

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: ${C.bg}; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
  @keyframes glowPulse { 0%,100% { box-shadow: 0 0 30px rgba(201,165,92,0.12); } 50% { box-shadow: 0 0 60px rgba(201,165,92,0.28); } }
  @keyframes celebrate { 0% { transform: scale(0.8); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes ctaPulse { 0%,100% { box-shadow: 0 8px 32px rgba(201,165,92,0.3); } 50% { box-shadow: 0 8px 48px rgba(201,165,92,0.5); } }
  @keyframes diamondGlow { 0%,100% { box-shadow: 0 0 30px rgba(167,139,250,0.2); } 50% { box-shadow: 0 0 60px rgba(167,139,250,0.4); } }

  .anim-up { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-up-d1 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
  .anim-up-d2 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
  .anim-up-d3 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
  .anim-up-d4 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
  .anim-up-d5 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.5s both; }
  .anim-up-d6 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.6s both; }

  .gold-text {
    background: linear-gradient(135deg, #e3cc8e 0%, #c9a55c 40%, #a07a35 70%, #c9a55c 100%);
    background-size: 200% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite;
  }

  .glass-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    backdrop-filter: blur(20px);
    transition: all 0.3s ease;
  }
  .glass-card:hover {
    border-color: rgba(201,165,92,0.2);
    background: rgba(255,255,255,0.05);
    transform: translateY(-2px);
  }

  .cta-btn {
    position: relative;
    display: inline-flex; align-items: center; gap: 12px;
    padding: 20px 44px;
    background: linear-gradient(135deg, #c9a55c 0%, #a07a35 100%);
    border: none; border-radius: 60px; color: #050505;
    font-weight: 700; font-size: 16px;
    font-family: 'Inter', sans-serif;
    cursor: pointer; text-decoration: none;
    letter-spacing: 0.3px;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
    animation: ctaPulse 3s ease-in-out infinite;
  }
  .cta-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 48px rgba(201,165,92,0.45);
  }

  .cta-btn-secondary {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 16px 36px; background: transparent;
    border: 1.5px solid rgba(201,165,92,0.35); border-radius: 60px;
    color: #c9a55c; font-weight: 600; font-size: 15px;
    font-family: 'Inter', sans-serif;
    cursor: pointer; text-decoration: none; transition: all 0.3s ease;
  }
  .cta-btn-secondary:hover {
    background: rgba(201,165,92,0.08);
    border-color: rgba(201,165,92,0.5);
  }

  .section-divider {
    height: 1px; width: 80px; margin: 0 auto;
    background: linear-gradient(90deg, transparent, #c9a55c, transparent);
    opacity: 0.4;
  }

  .problem-card {
    padding: 28px; background: rgba(248,113,113,0.04);
    border: 1px solid rgba(248,113,113,0.12);
    border-radius: 16px; transition: all 0.3s ease;
  }
  .problem-card:hover { background: rgba(248,113,113,0.07); border-color: rgba(248,113,113,0.2); }

  .opportunity-card {
    padding: 28px; background: rgba(52,211,153,0.04);
    border: 1px solid rgba(52,211,153,0.12);
    border-radius: 16px; transition: all 0.3s ease;
  }
  .opportunity-card:hover { background: rgba(52,211,153,0.07); border-color: rgba(52,211,153,0.2); }

  .diamond-hero-card {
    padding: 36px; background: rgba(167,139,250,0.05);
    border: 2px solid rgba(167,139,250,0.2);
    border-radius: 24px; transition: all 0.3s ease;
    animation: diamondGlow 4s ease-in-out infinite;
  }

  .faq-item {
    padding: 24px; background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px; cursor: pointer; transition: all 0.3s ease;
  }
  .faq-item:hover { background: rgba(255,255,255,0.04); border-color: rgba(201,165,92,0.15); }

  .nav-fixed {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    padding: 14px 24px;
    display: flex; justify-content: space-between; align-items: center;
    background: rgba(5,5,5,0.85); backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .mobile-cta-bar {
    display: none; position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
    padding: 12px 16px; background: rgba(5,5,5,0.95);
    backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.08);
    justify-content: center;
  }

  input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
  input:focus, textarea:focus, select:focus { border-color: #c9a55c !important; outline: none; }

  @media (max-width: 768px) {
    .tier-grid { grid-template-columns: 1fr !important; }
    .stats-grid { grid-template-columns: 1fr 1fr !important; }
    .benefits-grid { grid-template-columns: 1fr !important; }
    .problems-grid { grid-template-columns: 1fr !important; }
    .form-2col { grid-template-columns: 1fr !important; }
    .compare-table { overflow-x: auto; }
    .compare-table table { min-width: 600px; }
    .mobile-cta-bar { display: flex; }
    .nav-cta { display: none !important; }
    .hide-mobile { display: none !important; }
    body { padding-bottom: 70px; }
  }

  @media print {
    .no-print { display: none !important; }
    body { background: white !important; color: #111 !important; }
  }
`;

const API_URL_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// LANDING PAGE DATA (CRO-optimized)
// =============================================================================

const SPONSOR_PROBLEMS = [
  { icon: '💸', title: 'Influencer caro, ROI incerto', desc: 'Você paga R$ 2.000-10.000 por post e não sabe quantas vendas vieram de lá.' },
  { icon: '🎯', title: 'Público genérico', desc: 'Google Ads e Meta Ads mostram sua marca pra quem nem trabalha com beleza.' },
  { icon: '📊', title: 'Sem dados reais', desc: 'Você sabe quantas impressões teve, mas não sabe se a profissional que viu realmente comprou.' },
  { icon: '🏪', title: 'Sell-in difícil', desc: 'Convencer profissionais autônomas a conhecer seu produto é um trabalho de formiguinha.' },
];

const SPONSOR_OPPORTUNITIES = [
  { icon: '🎯', title: 'Público 100% qualificado', desc: 'Cada usuária é uma profissional da beleza ativa que atende clientes toda semana. Zero desperdício.' },
  { icon: '📊', title: 'Dados reais de engajamento', desc: 'Impressões, cliques, interações — tudo no seu painel. Sem métricas de vaidade.' },
  { icon: '🤝', title: 'Co-branding natural', desc: 'Sua marca aparece como parceira oficial da plataforma que elas confiam. Sell-in facilitado.' },
];

const DIAMOND_FEATURES = [
  { icon: '📊', text: 'Dashboard de analytics em tempo real — Impressões, cliques, engajamento, reach por região' },
  { icon: '📝', text: 'Gestão própria de postagens e anúncios — Publique, pause e edite direto do painel' },
  { icon: '⭐', text: 'Destaque prioritário — Sua marca aparece primeiro em todas as páginas' },
  { icon: '📄', text: 'Relatórios exportáveis — PDF com métricas para apresentar ao board' },
  { icon: '🏷️', text: 'Logo em todas as páginas — Landing page, agendamento, área do cliente' },
  { icon: '♾️', text: 'Postagens ilimitadas — Sem limite de anúncios ativos' },
];

const SPONSOR_FAQS = [
  { q: 'Qual o prazo mínimo de contrato?', a: '3 meses. Recomendamos 6 meses para ver resultados consistentes.' },
  { q: 'Posso trocar de plano depois?', a: 'Sim, upgrade a qualquer momento. Downgrade no próximo ciclo.' },
  { q: 'Como funciona o painel Diamond?', a: 'Você recebe login e senha próprios para acessar um dashboard completo com analytics, gestão de postagens e relatórios. É seu espaço dentro da plataforma.' },
  { q: 'Minha marca aparece para todos os usuários?', a: 'Sim, de acordo com o seu plano. Diamond aparece em todas as páginas, Gold e Silver em páginas específicas.' },
  { q: 'Como é feito o pagamento?', a: 'Via Pix, com QR Code gerado automaticamente. Simples e instantâneo.' },
];


// =============================================================================
// COMPONENT
// =============================================================================

export default function SponsorInviteLandingPage() {
  const params = useParams();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [step, setStep] = useState<'landing' | 'tier' | 'form' | 'contract' | 'payment' | 'success'>('landing');
  const [tierDetails, setTierDetails] = useState<Record<string, TierDetail> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [result, setResult] = useState<{ contractNumber: string; isDiamond: boolean; pendingPayment?: boolean; payment?: PaymentInfo; paymentId?: string } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);

  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    companyDocument: '',
    companyAddress: '',
    websiteUrl: '',
    description: '',
    selectedTier: 'GOLD' as string,
    selectedType: 'BRAND',
    durationMonths: 6,
    password: '',
    acceptedTerms: false,
    signedByName: '',
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    async function load() {
      try {
        const [invRes, tierRes] = await Promise.all([
          fetch(`${API_URL_BASE}/public/sponsor-invites/${encodeURIComponent(token)}`),
          fetch(`${API_URL_BASE}/public/sponsor-invites/tier-details`),
        ]);
        const invData = await invRes.json();
        if (invData.expired) { setExpired(true); setLoading(false); return; }
        if (!invData.isUniversal && !invData.companyName) { setError('Convite não encontrado'); setLoading(false); return; }
        setInvite(invData);
        if (tierRes.ok) setTierDetails(await tierRes.json());

        if (!invData.isUniversal) {
          setForm(prev => ({ ...prev, companyName: invData.companyName, contactName: invData.contactName, selectedTier: invData.proposedTier, selectedType: invData.proposedType || 'BRAND' }));
        } else {
          setForm(prev => ({ ...prev, selectedTier: invData.proposedTier || 'GOLD' }));
        }
      } catch {
        setError('Erro ao carregar convite');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const trackCta = () => { fetch(`${API_URL_BASE}/public/sponsor-invites/${encodeURIComponent(token)}/cta-click`, { method: 'POST' }).catch(() => {}); };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      trackCta();
      const body: Record<string, unknown> = {
        companyName: form.companyName, contactName: form.contactName, contactEmail: form.contactEmail,
        selectedTier: form.selectedTier, selectedType: form.selectedType, durationMonths: form.durationMonths,
        acceptedTerms: true, signedByName: form.contactName,
      };
      if (form.contactPhone) body.contactPhone = form.contactPhone;
      if (form.companyDocument) body.companyDocument = form.companyDocument;
      if (form.companyAddress) body.companyAddress = form.companyAddress;
      if (form.websiteUrl) body.websiteUrl = form.websiteUrl;
      if (form.description) body.description = form.description;
      if (form.selectedTier === 'DIAMOND' && form.password) body.password = form.password;

      const res = await fetch(`${API_URL_BASE}/public/sponsor-invites/${encodeURIComponent(token)}/self-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setResult({ contractNumber: data.contractNumber, isDiamond: data.isDiamond, pendingPayment: data.pendingPayment, payment: data.payment, paymentId: data.paymentId });
        if (data.pendingPayment && data.payment) setPaymentInfo(data.payment);
        setStep(data.pendingPayment ? 'payment' : 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Erro ao processar cadastro');
      }
    } catch { alert('Erro de conexão. Tente novamente.'); }
    finally { setSubmitting(false); }
  };

  const inputS: React.CSSProperties = {
    width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)',
    border: `1.5px solid ${C.border}`, borderRadius: 12, color: C.textPrimary,
    fontSize: 14, transition: 'border-color 0.2s', fontFamily: FONT.sans,
  };
  const labelS: React.CSSProperties = {
    color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.8px',
    textTransform: 'uppercase' as const, marginBottom: 8, display: 'block',
  };

  // ===== SSR GUARD — prevents hydration mismatch =====
  if (!mounted) {
    return <div style={{ minHeight: '100vh', background: '#050505' }} />;
  }

  // ===== LOADING =====
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: `3px solid ${C.borderGold}`, borderTopColor: C.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
          <p style={{ color: C.textMuted, fontFamily: FONT.sans }}>Carregando convite...</p>
        </div>
      </div>
    );
  }

  // ===== ERROR =====
  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>⚠️</div>
          <h2 style={{ color: C.textPrimary, fontFamily: FONT.serif, fontSize: 28, marginBottom: 12 }}>Convite Indisponível</h2>
          <p style={{ color: C.textMuted, fontSize: 15 }}>{error}</p>
        </div>
      </div>
    );
  }

  // ===== EXPIRED =====
  if (expired) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 500 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>⏰</div>
          <h2 style={{ color: C.textPrimary, fontFamily: FONT.serif, fontSize: 28, marginBottom: 12 }}>Convite Expirado</h2>
          <p style={{ color: C.textSecondary, fontSize: 15, lineHeight: 1.7 }}>Este convite de parceria não está mais disponível. Entre em contato conosco para solicitar um novo.</p>
        </div>
      </div>
    );
  }

  // ===== SUCCESS =====
  if (step === 'success' && result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
        <div style={{ textAlign: 'center', padding: 48, maxWidth: 640, animation: 'celebrate 0.6s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div style={{ fontSize: 80, marginBottom: 24, animation: 'float 3s ease-in-out infinite' }}>🎉</div>
          <h2 style={{ fontFamily: FONT.serif, fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, marginBottom: 16, letterSpacing: '-1px' }}>
            <span className="gold-text">Cadastro Concluído!</span>
          </h2>
          <p style={{ color: C.textSecondary, fontSize: 17, lineHeight: 1.8, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
            Bem-vindo à família <strong style={{ color: C.textPrimary }}>Bela Pro</strong>! Seu cadastro como patrocinador foi realizado com sucesso.
          </p>
          <div style={{ display: 'inline-block', padding: '16px 32px', borderRadius: 14, background: C.bgGlass, border: `1px solid ${C.borderGold}`, marginBottom: 28 }}>
            <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Número do Contrato</div>
            <div style={{ color: C.gold, fontSize: 20, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px' }}>{result.contractNumber}</div>
          </div>
          {result.isDiamond && (
            <div style={{ padding: '20px 28px', borderRadius: 14, background: C.diamondBg, border: '1px solid rgba(167,139,250,0.25)', marginBottom: 28, maxWidth: 440, margin: '0 auto 28px' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💎</div>
              <p style={{ color: C.diamond, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Você é Diamond!</p>
              <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
                Acesse seu painel exclusivo em <a href="/parceiro/login" style={{ color: C.diamond, textDecoration: 'underline' }}>/parceiro/login</a> com o email e senha cadastrados.
              </p>
            </div>
          )}
          <div style={{ width: 80, height: 2, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, margin: '24px auto' }} />
          <p style={{ color: C.textMuted, fontSize: 12 }}>Nossa equipe entrará em contato para alinhar os detalhes da parceria.</p>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  const selectedTier = TIER_META[form.selectedTier] || TIER_META.GOLD;
  const currentTierDetail = tierDetails?.[form.selectedTier];
  const isUniversal = invite.isUniversal;
  const recipientFirst = invite.contactName ? invite.contactName.split(' ')[0] : '';
  const daysLeft = mounted ? Math.max(0, Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / 86400000)) : 0;
  const contractStartDate = mounted ? new Date() : new Date(0);
  const contractEndDate = mounted ? new Date() : new Date(0);
  if (mounted) contractEndDate.setMonth(contractEndDate.getMonth() + form.durationMonths);

  const scrollToPlans = () => {
    document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const goToForm = () => {
    trackCta();
    setStep('form');
  };

  // ===== STEP INDICATOR =====
  const renderStepIndicator = () => {
    if (step === 'landing') return null;
    const steps = [
      { key: 'tier', label: '1. Plano', num: 1 },
      { key: 'form', label: '2. Dados', num: 2 },
      { key: 'contract', label: '3. Contrato', num: 3 },
      { key: 'payment', label: '4. Pagamento', num: 4 },
    ];
    const currentIdx = steps.findIndex(s => s.key === step);
    return (
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 100, padding: '16px 32px', background: `${C.bg}ee`, backdropFilter: 'blur(16px)', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 0 }}>
          {steps.map((s, i) => (
            <div key={s.key} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i <= currentIdx ? 1 : 0.35 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: i <= currentIdx ? C.gold : 'transparent', border: `2px solid ${i <= currentIdx ? C.gold : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: i <= currentIdx ? C.bg : C.textMuted, transition: 'all 0.3s' }}>
                  {i < currentIdx ? '✓' : s.num}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: i <= currentIdx ? C.textPrimary : C.textMuted, whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div style={{ flex: 1, height: 2, margin: '0 12px', background: i < currentIdx ? C.gold : C.border, borderRadius: 1, transition: 'background 0.3s' }} />}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, fontFamily: FONT.sans, overflowX: 'hidden' }}>
      <link rel="stylesheet" href={FONT_URL} />
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* Ambient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '10%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${C.goldMuted} 0%, transparent 70%)`, filter: 'blur(100px)' }} />
      </div>

      {/* ===== NAV ===== */}
      {step === 'landing' && (
        <nav className="nav-fixed">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: FONT.serif, fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold}, ${C.goldDark})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Bela Pro</span>
            <span style={{ color: C.textMuted, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Programa de Parceria</span>
          </div>
          <button onClick={scrollToPlans} className="cta-btn nav-cta" style={{ padding: '10px 24px', fontSize: 13, animation: 'none' }}>Quero ser parceiro →</button>
        </nav>
      )}

      {step !== 'landing' && (
        <>
          <header className="no-print" style={{ position: 'relative', zIndex: 10, padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: FONT.serif, fontSize: 24, fontWeight: 800, background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold}, ${C.goldDark})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Bela Pro</span>
            <span style={{ color: C.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>Cadastro de Parceiro</span>
          </header>
          {renderStepIndicator()}
        </>
      )}

      {/* ============================== */}
      {/* STEP: LANDING (CRO)            */}
      {/* ============================== */}
      {step === 'landing' && (
        <>
          {/* HERO */}
          <section style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 24px 80px', background: 'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(201,165,92,0.1) 0%, transparent 60%)' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', width: '100%' }}>
              <div className="anim-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 40, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', marginBottom: 28 }}>
                <span style={{ fontSize: 16 }}>💎</span>
                <span style={{ color: C.diamond, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>PROGRAMA DE PARCERIA — VAGAS LIMITADAS</span>
              </div>

              <h1 className="anim-up-d1" style={{ fontSize: 'clamp(32px, 5.5vw, 64px)', fontWeight: 900, fontFamily: FONT.serif, lineHeight: 1.08, marginBottom: 28, letterSpacing: '-2px' }}>
                {isUniversal ? (
                  <>Coloque sua marca na mão de quem <span className="gold-text">realmente usa seus produtos.</span> Todos os dias.</>
                ) : (
                  <>{recipientFirst}, sua marca <span className="gold-text">merece destaque.</span></>
                )}
              </h1>

              <p className="anim-up-d2" style={{ color: C.textSecondary, fontSize: 'clamp(16px, 2vw, 19px)', lineHeight: 1.8, maxWidth: 680, margin: '0 auto 20px' }}>
                O Bela Pro é a agenda digital usada por <strong style={{ color: C.textPrimary }}>centenas de profissionais da beleza</strong> no Brasil.
                Sua marca aparece dentro da plataforma que elas abrem <strong style={{ color: C.gold }}>8-12 vezes por dia</strong> para gerenciar clientes, cobrar via Pix e organizar o negócio.
              </p>

              {!isUniversal && invite.personalMessage && (
                <div className="anim-up-d3" style={{ maxWidth: 560, margin: '24px auto 0', padding: '20px 28px', background: C.bgGlass, border: `1px solid ${C.borderGold}`, borderRadius: 16, borderLeft: `3px solid ${C.gold}` }}>
                  <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.8, fontStyle: 'italic' }}>&ldquo;{invite.personalMessage}&rdquo;</p>
                  <p style={{ color: C.gold, fontSize: 11, marginTop: 10, letterSpacing: 1 }}>— Equipe Bela Pro</p>
                </div>
              )}

              <div className="anim-up-d4" style={{ marginTop: 36, display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
                <button onClick={scrollToPlans} className="cta-btn" style={{ fontSize: 17, padding: '22px 48px' }}>Conhecer os planos de parceria →</button>
              </div>

              {/* Metrics */}
              <div className="anim-up-d5" style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 48, flexWrap: 'wrap' }}>
                {[{ val: '200+', label: 'Profissionais ativas', icon: '👩‍💼' }, { val: '5.000+', label: 'Agendamentos/mês', icon: '📅' }, { val: '8-12x/dia', label: 'Frequência de uso', icon: '📱' }].map((m, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>{m.icon}</div>
                    <div className="gold-text" style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, fontFamily: FONT.serif }}>{m.val}</div>
                    <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {daysLeft > 0 && daysLeft <= 30 && (
                <div className="anim-up-d5" style={{ marginTop: 24 }}>
                  <span style={{ color: C.textMuted, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: daysLeft <= 7 ? '#ef4444' : C.gold, animation: daysLeft <= 3 ? 'pulse 1.5s infinite' : 'none' }} />
                    Convite válido por {daysLeft} dia{daysLeft !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* PROBLEM */}
          <section style={{ padding: '100px 24px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 60 }}>
                <div style={{ fontSize: 12, color: C.danger, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>O PROBLEMA</div>
                <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 700, fontFamily: FONT.serif, letterSpacing: '-1px', marginBottom: 16 }}>
                  Marketing para o mercado beauty tá cada vez mais <span style={{ color: C.danger }}>caro</span> e cada vez menos <span style={{ color: C.danger }}>eficiente.</span>
                </h2>
              </div>
              <div className="problems-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {SPONSOR_PROBLEMS.map((p, i) => (
                  <div key={i} className="problem-card">
                    <div style={{ fontSize: 28, marginBottom: 12 }}>{p.icon}</div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.danger, fontFamily: FONT.serif, marginBottom: 8 }}>{p.title}</h3>
                    <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.65 }}>{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* OPPORTUNITY */}
          <section style={{ padding: '100px 24px', background: '#030303' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 60 }}>
                <div style={{ fontSize: 12, color: C.success, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>A OPORTUNIDADE</div>
                <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 700, fontFamily: FONT.serif, letterSpacing: '-1px', marginBottom: 16 }}>
                  E se sua marca aparecesse dentro da <span className="gold-text">ferramenta que a profissional já usa todo dia?</span>
                </h2>
                <p style={{ color: C.textSecondary, fontSize: 16, maxWidth: 650, margin: '0 auto', lineHeight: 1.7 }}>
                  Quando sua marca está dentro do Bela Pro, você não está competindo por atenção em um feed lotado. Você está dentro da <strong style={{ color: C.textPrimary }}>ferramenta de trabalho</strong> dela. É como ter seu produto na bancada do salão — mas digital.
                </p>
              </div>
              <div className="benefits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {SPONSOR_OPPORTUNITIES.map((o, i) => (
                  <div key={i} className="opportunity-card">
                    <div style={{ fontSize: 28, marginBottom: 12 }}>{o.icon}</div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.success, fontFamily: FONT.serif, marginBottom: 8 }}>{o.title}</h3>
                    <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.65 }}>{o.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* DIAMOND HERO */}
          <section style={{ padding: '100px 24px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <div style={{ fontSize: 12, color: C.diamond, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>EXCLUSIVO — PAINEL DIAMOND</div>
                <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 700, fontFamily: FONT.serif, letterSpacing: '-1px', marginBottom: 16 }}>
                  Diamond Partners ganham um <span style={{ color: C.diamond }}>painel completo</span> para gerenciar sua presença.
                </h2>
                <p style={{ color: C.textSecondary, fontSize: 16, maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                  Não é só um logo numa página. É uma central de comando com analytics em tempo real, gestão de postagens e controle total da sua estratégia dentro do Bela Pro.
                </p>
              </div>

              <div className="diamond-hero-card" style={{ marginBottom: 32 }}>
                <div style={{ display: 'grid', gap: 16 }}>
                  {DIAMOND_FEATURES.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.diamondBg, border: '1px solid rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{f.icon}</div>
                      <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.6 }}>{f.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-block', padding: '16px 28px', borderRadius: 14, background: C.diamondBg, border: '1px solid rgba(167,139,250,0.2)' }}>
                  <span style={{ color: C.diamond, fontSize: 28, fontWeight: 800, fontFamily: FONT.serif }}>R$ 299,90</span>
                  <span style={{ color: C.textMuted, fontSize: 14 }}>/mês</span>
                  <p style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>Menos que 1 post de micro-influenciador. Com alcance diário garantido.</p>
                </div>
              </div>
            </div>
          </section>

          {/* PLANS COMPARISON */}
          <section id="plans-section" style={{ padding: '100px 24px', background: '#030303' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 60 }}>
                <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>PLANOS DE PARCERIA</div>
                <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 700, fontFamily: FONT.serif, letterSpacing: '-1px', marginBottom: 16 }}>
                  Escolha o nível ideal para o <span className="gold-text">seu momento.</span>
                </h2>
              </div>

              {/* Tier cards */}
              {tierDetails && (
                <div className="tier-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 48 }}>
                  {(['DIAMOND', 'GOLD', 'SILVER', 'BRONZE'] as const).map((tierKey, i) => {
                    const td = tierDetails[tierKey];
                    const tm = TIER_META[tierKey];
                    const isSelected = form.selectedTier === tierKey;
                    const isDiamond = tierKey === 'DIAMOND';

                    return (
                      <div key={tierKey}
                        onClick={() => setForm(prev => ({ ...prev, selectedTier: tierKey }))}
                        style={{
                          background: isSelected ? tm.glow.replace('0.3', '0.08') : C.bgGlass,
                          border: `2px solid ${isSelected ? tm.color : C.border}`,
                          borderRadius: 20, padding: isDiamond ? '32px 20px' : '28px 20px',
                          cursor: 'pointer', transition: 'all 0.3s', position: 'relative',
                          transform: isSelected ? 'scale(1.02)' : isDiamond ? 'scale(1.04)' : 'scale(1)',
                          boxShadow: isSelected ? `0 8px 40px ${tm.glow}` : isDiamond ? `0 4px 20px ${tm.glow.replace('0.3', '0.15')}` : 'none',
                        }}
                      >
                        {isDiamond && (
                          <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', padding: '4px 14px', borderRadius: 20, background: C.diamond, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>MAIS COMPLETO</div>
                        )}
                        <div style={{ fontSize: 36, marginBottom: 12 }}>{tm.icon}</div>
                        <h3 style={{ color: tm.color, fontSize: 17, fontWeight: 700, fontFamily: FONT.serif, marginBottom: 8 }}>{td?.name || tm.name}</h3>

                        {td?.pricing && td.pricing[6] && (
                          <div style={{ marginBottom: 16 }}>
                            <p style={{ color: C.gold, fontSize: 20, fontWeight: 800, marginBottom: 2 }}>{td.pricing[6].perMonth}</p>
                            {td.pricing[6].discount && (
                              <span style={{ display: 'inline-block', marginTop: 4, padding: '3px 8px', borderRadius: 8, background: `${C.success}15`, color: C.success, fontSize: 9, fontWeight: 700 }}>{td.pricing[6].discount}</span>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                          {td?.highlights.slice(0, isDiamond ? 6 : 4).map((h, j) => (
                            <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tm.color} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
                              <span style={{ color: C.textSecondary, fontSize: 11, lineHeight: 1.4 }}>{h}</span>
                            </div>
                          ))}
                          {(td?.highlights.length ?? 0) > (isDiamond ? 6 : 4) && (
                            <span style={{ color: C.textMuted, fontSize: 10, marginLeft: 22 }}>+{(td?.highlights.length ?? 0) - (isDiamond ? 6 : 4)} mais...</span>
                          )}
                        </div>

                        <div style={{ padding: '8px 14px', borderRadius: 8, background: isSelected ? tm.color : 'transparent', border: `1px solid ${isSelected ? tm.color : C.border}`, color: isSelected ? C.bg : C.textMuted, fontSize: 12, fontWeight: 700, textAlign: 'center', transition: 'all 0.3s' }}>
                          {isSelected ? '✓ Selecionado' : 'Selecionar'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Value anchoring */}
              <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px', borderRadius: 20, background: C.bgGlass, border: `1px solid ${C.border}` }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.gold, marginBottom: 20, fontFamily: FONT.serif }}>📊 Comparação real de custo por alcance qualificado:</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Google Ads para profissionais de beleza', price: '~R$ 3.000-5.000/mês', strike: true },
                    { label: 'Influenciadores do segmento', price: '~R$ 2.000-10.000/post', strike: true },
                    { label: 'Eventos e feiras de beleza', price: '~R$ 5.000-15.000/participação', strike: true },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.04)' }}>
                      <span style={{ color: C.textMuted, fontSize: 13 }}>{item.label}</span>
                      <span style={{ color: C.danger, fontSize: 13, fontWeight: 600, textDecoration: 'line-through' }}>{item.price}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 10, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                    <span style={{ color: C.success, fontSize: 14, fontWeight: 600 }}>Bela Pro Diamond — presença diária</span>
                    <span style={{ color: C.success, fontSize: 16, fontWeight: 700 }}>R$ 299,90/mês</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PROJECTION */}
          <section style={{ padding: '80px 24px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
              <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, fontFamily: FONT.serif, letterSpacing: '-1px', marginBottom: 24 }}>
                Imagine sua marca na frente de <span className="gold-text">profissionais reais, todo dia.</span>
              </h2>
              <p style={{ color: C.textSecondary, fontSize: 15, lineHeight: 1.7, marginBottom: 28, maxWidth: 560, margin: '0 auto 28px' }}>
                Com a base crescendo, projetamos para os próximos 6 meses:
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginBottom: 28 }}>
                {[{ val: '500+', label: 'Profissionais ativas', icon: '📈' }, { val: '15.000+', label: 'Agendamentos/mês', icon: '📅' }, { val: '20+', label: 'Cidades brasileiras', icon: '🏙️' }].map((m, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>{m.icon}</div>
                    <div className="gold-text" style={{ fontSize: 28, fontWeight: 800, fontFamily: FONT.serif }}>{m.val}</div>
                    <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 24px', borderRadius: 12, background: C.bgGlass, border: `1px solid ${C.borderGold}`, display: 'inline-block' }}>
                <span style={{ color: C.gold, fontSize: 13, fontWeight: 500 }}>
                  🔒 Parceiros que entrarem agora terão <strong>grandfathering de preço</strong> — valor mantido mesmo quando a base crescer.
                </span>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section style={{ padding: '100px 24px', background: '#030303' }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 60 }}>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, fontFamily: FONT.serif, letterSpacing: '-1px' }}>Perguntas frequentes</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SPONSOR_FAQS.map((faq, i) => (
                  <div key={i} className="faq-item" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: 0 }}>{faq.q}</h3>
                      <span style={{ color: C.gold, fontSize: 20, fontWeight: 300, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 12 }}>+</span>
                    </div>
                    {openFaq === i && (
                      <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.7, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, marginBottom: 0 }}>{faq.a}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA FINAL */}
          <section style={{ position: 'relative', padding: '120px 24px', textAlign: 'center', overflow: 'hidden', borderTop: `1px solid ${C.border}` }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,165,92,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 2, maxWidth: 640, margin: '0 auto' }}>
              <h2 style={{ fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 800, fontFamily: FONT.serif, marginBottom: 20, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
                Sua marca merece estar onde as profissionais <span className="gold-text">realmente estão.</span>
              </h2>
              <p style={{ color: C.textSecondary, fontSize: 17, marginBottom: 44, lineHeight: 1.7, maxWidth: 520, margin: '0 auto 44px' }}>
                Vagas para Diamond Partner são limitadas por trimestre para garantir exclusividade. Não perca a oportunidade de entrar como early adopter com preço travado.
              </p>

              <button onClick={goToForm} className="cta-btn" style={{ fontSize: 17, padding: '22px 48px' }}>Quero ser parceiro →</button>

              <div style={{ marginTop: 28, padding: '12px 20px', borderRadius: 10, background: C.diamondBg, border: '1px solid rgba(167,139,250,0.2)', display: 'inline-block' }}>
                <span style={{ color: C.diamond, fontSize: 13, fontWeight: 600 }}>
                  💎 Apenas 3 vagas Diamond disponíveis neste trimestre. Preço de early adopter: R$ 299,90/mês
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 36, flexWrap: 'wrap' }}>
                {['🔒 Pagamento seguro via Pix', '📄 Contrato digital válido', '🤝 Suporte dedicado'].map((item, i) => (
                  <span key={i} style={{ color: C.textMuted, fontSize: 12 }}>{item}</span>
                ))}
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer style={{ borderTop: `1px solid ${C.border}`, padding: '40px 24px', textAlign: 'center' }}>
            <span style={{ fontFamily: FONT.serif, fontSize: 24, fontWeight: 800, background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold}, ${C.goldDark})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', opacity: 0.6 }}>Bela Pro</span>
            <p style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>Plataforma de gestão para profissionais da beleza</p>
            <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 11, marginTop: 12 }}>© 2026 Bela Pro. Todos os direitos reservados.</p>
          </footer>

          {/* MOBILE CTA BAR */}
          <div className="mobile-cta-bar">
            <button onClick={scrollToPlans} className="cta-btn" style={{ width: '100%', justifyContent: 'center', padding: '16px 24px', fontSize: 15, animation: 'none' }}>Quero ser parceiro →</button>
          </div>
        </>
      )}

      {/* ============================== */}
      {/* STEP: CHOOSE TIER              */}
      {/* ============================== */}
      {step === 'tier' && tierDetails && (
        <section style={{ position: 'relative', zIndex: 1, padding: '48px 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
          <div className="anim-up" style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>PASSO 1 DE 4</p>
            <h2 style={{ fontFamily: FONT.serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 12 }}>
              Escolha o <span className="gold-text">nível de parceria</span>
            </h2>
          </div>

          <div className="tier-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {(['DIAMOND', 'GOLD', 'SILVER', 'BRONZE'] as const).map((tierKey, i) => {
              const td = tierDetails[tierKey];
              const tm = TIER_META[tierKey];
              const isSelected = form.selectedTier === tierKey;
              return (
                <div key={tierKey} className={`anim-up-d${i + 1}`}
                  onClick={() => setForm(prev => ({ ...prev, selectedTier: tierKey }))}
                  style={{ background: isSelected ? tm.glow.replace('0.3', '0.08') : C.bgGlass, border: `2px solid ${isSelected ? tm.color : C.border}`, borderRadius: 20, padding: '28px 20px', cursor: 'pointer', transition: 'all 0.3s', position: 'relative', transform: isSelected ? 'scale(1.02)' : 'scale(1)', boxShadow: isSelected ? `0 8px 40px ${tm.glow}` : 'none' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{tm.icon}</div>
                  <h3 style={{ color: tm.color, fontSize: 18, fontWeight: 700, fontFamily: FONT.serif, marginBottom: 8 }}>{td?.name}</h3>
                  {td?.pricing?.[form.durationMonths] && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ color: C.gold, fontSize: 20, fontWeight: 800, marginBottom: 2 }}>{td.pricing[form.durationMonths].priceLabel}</p>
                      <p style={{ color: C.textMuted, fontSize: 11 }}>{td.pricing[form.durationMonths].perMonth}</p>
                      {td.pricing[form.durationMonths].discount && <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 8px', borderRadius: 8, background: `${C.success}15`, color: C.success, fontSize: 9, fontWeight: 700 }}>{td.pricing[form.durationMonths].discount}</span>}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {td?.highlights.slice(0, 5).map((h, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tm.color} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
                        <span style={{ color: C.textSecondary, fontSize: 12, lineHeight: 1.4 }}>{h}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '6px 14px', borderRadius: 8, background: isSelected ? tm.color : 'transparent', border: `1px solid ${isSelected ? tm.color : C.border}`, color: isSelected ? C.bg : C.textMuted, fontSize: 12, fontWeight: 700, textAlign: 'center', transition: 'all 0.3s' }}>{isSelected ? '✓ Selecionado' : 'Selecionar'}</div>
                </div>
              );
            })}
          </div>

          {/* Duration */}
          <div className="anim-up-d5" style={{ marginTop: 48, textAlign: 'center' }}>
            <p style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>Duração do contrato</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              {DURATION_OPTIONS.map(d => (
                <button key={d.months} onClick={() => setForm(prev => ({ ...prev, durationMonths: d.months }))}
                  style={{ padding: '16px 28px', borderRadius: 14, cursor: 'pointer', background: form.durationMonths === d.months ? C.goldMuted : C.bgGlass, border: `2px solid ${form.durationMonths === d.months ? C.gold : C.border}`, color: form.durationMonths === d.months ? C.gold : C.textSecondary, fontFamily: FONT.sans, transition: 'all 0.3s', position: 'relative' }}>
                  {d.featured && form.durationMonths === d.months && <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', padding: '2px 10px', borderRadius: 10, background: C.gold, color: C.bg, fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>MAIS POPULAR</div>}
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{d.label}</div>
                  <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="anim-up-d6" style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 48 }}>
            <button onClick={() => setStep('landing')} style={{ padding: '14px 32px', borderRadius: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontFamily: FONT.sans, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>← Voltar</button>
            <button onClick={() => setStep('form')} style={{ padding: '14px 40px', borderRadius: 12, background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`, border: 'none', color: C.bg, fontFamily: FONT.sans, cursor: 'pointer', fontSize: 14, fontWeight: 700, boxShadow: `0 4px 20px ${C.goldMuted}` }}>Continuar →</button>
          </div>
        </section>
      )}

      {/* ============================== */}
      {/* STEP: FORM                     */}
      {/* ============================== */}
      {step === 'form' && (
        <section style={{ position: 'relative', zIndex: 1, padding: '48px 24px 80px', maxWidth: 680, margin: '0 auto' }}>
          <div className="anim-up" style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>PASSO 2 DE 4</p>
            <h2 style={{ fontFamily: FONT.serif, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>
              Dados da <span className="gold-text">empresa</span>
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 14 }}>Preencha as informações para gerar o contrato</p>
          </div>

          <div className="anim-up-d1" style={{ background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`, padding: '36px 32px' }}>
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ padding: '16px 0 8px', borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
                <span style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Dados da Empresa</span>
              </div>
              <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelS}>Nome da empresa *</label>
                  <input type="text" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Ex: Marca de Cosméticos" style={inputS} />
                </div>
                <div>
                  <label style={labelS}>CNPJ / CPF</label>
                  <input type="text" value={form.companyDocument} onChange={e => setForm({ ...form, companyDocument: e.target.value })} placeholder="00.000.000/0000-00" style={inputS} />
                </div>
              </div>
              <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelS}>Website</label>
                  <input type="url" value={form.websiteUrl} onChange={e => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://www.empresa.com" style={inputS} />
                </div>
                <div>
                  <label style={labelS}>Tipo de parceria</label>
                  <select value={form.selectedType} onChange={e => setForm({ ...form, selectedType: e.target.value })} style={{ ...inputS, cursor: 'pointer' }}>
                    {TYPE_OPTIONS.map(t => <option key={t.key} value={t.key}>{t.label} — {t.desc}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ padding: '16px 0 8px', borderBottom: `1px solid ${C.border}`, marginTop: 8, marginBottom: 4 }}>
                <span style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Dados do Contato</span>
              </div>
              <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelS}>Nome do responsável *</label>
                  <input type="text" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} placeholder="Nome completo" style={inputS} />
                </div>
                <div>
                  <label style={labelS}>Email *</label>
                  <input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} placeholder="contato@empresa.com" style={inputS} />
                </div>
              </div>
              <div>
                <label style={labelS}>WhatsApp</label>
                <input type="tel" value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="(11) 99999-0000" style={inputS} />
              </div>

              {form.selectedTier === 'DIAMOND' && (
                <>
                  <div style={{ padding: '16px 0 8px', borderBottom: '1px solid rgba(167,139,250,0.2)', marginTop: 8, marginBottom: 4 }}>
                    <span style={{ color: C.diamond, fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>💎 Acesso Diamond Panel</span>
                  </div>
                  <div style={{ padding: '14px 16px', borderRadius: 10, background: C.diamondBg, border: '1px solid rgba(167,139,250,0.2)', fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>
                    Como parceiro Diamond, você terá acesso a um painel exclusivo para gerenciar postagens, acompanhar métricas e controlar seus anúncios.
                  </div>
                  <div>
                    <label style={labelS}>Senha do painel Diamond *</label>
                    <input type="password" value={form.password} minLength={6} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" style={inputS} />
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
              <button onClick={() => setStep('tier')} style={{ padding: '14px 28px', borderRadius: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontFamily: FONT.sans, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>← Voltar</button>
              <button onClick={() => {
                if (!form.companyName || !form.contactName || !form.contactEmail) { alert('Preencha todos os campos obrigatórios'); return; }
                if (form.selectedTier === 'DIAMOND' && (!form.password || form.password.length < 6)) { alert('A senha do painel Diamond deve ter no mínimo 6 caracteres'); return; }
                setStep('contract');
              }} style={{ padding: '14px 36px', borderRadius: 12, background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`, border: 'none', color: C.bg, fontFamily: FONT.sans, cursor: 'pointer', fontSize: 14, fontWeight: 700, boxShadow: `0 4px 20px ${C.goldMuted}` }}>
                Revisar Contrato →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============================== */}
      {/* STEP: CONTRACT                 */}
      {/* ============================== */}
      {step === 'contract' && tierDetails && (
        <section style={{ position: 'relative', zIndex: 1, padding: '48px 24px 80px', maxWidth: 800, margin: '0 auto' }}>
          <div className="anim-up" style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>PASSO 3 DE 4</p>
            <h2 style={{ fontFamily: FONT.serif, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-1px' }}>
              Revise o <span className="gold-text">contrato</span>
            </h2>
          </div>

          <div className="anim-up-d1" style={{ background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`, padding: '32px', marginBottom: 32 }}>
            {/* Contract summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${C.border}` }}>
              <div>
                <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Plano</p>
                <p style={{ color: TIER_META[form.selectedTier as keyof typeof TIER_META]?.color || C.gold, fontSize: 18, fontWeight: 700 }}>{TIER_META[form.selectedTier as keyof typeof TIER_META]?.icon} {tierDetails[form.selectedTier as keyof typeof tierDetails]?.name}</p>
              </div>
              <div>
                <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Empresa</p>
                <p style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600 }}>{form.companyName}</p>
              </div>
              <div>
                <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Duração</p>
                <p style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600 }}>{DURATION_OPTIONS.find(d => d.months === form.durationMonths)?.label}</p>
              </div>
              <div>
                <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Valor</p>
                <p style={{ color: C.gold, fontSize: 18, fontWeight: 700 }}>{tierDetails[form.selectedTier as keyof typeof tierDetails]?.pricing?.[form.durationMonths]?.priceLabel}</p>
              </div>
            </div>

            {/* Contract text */}
            <div style={{ maxHeight: 350, overflowY: 'auto', padding: '20px', borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, marginBottom: 24 }}>
              <h3 style={{ fontFamily: FONT.serif, fontSize: 18, fontWeight: 700, marginBottom: 16, color: C.gold }}>CONTRATO DE PARCERIA COMERCIAL</h3>
              <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.8 }}>
                <p style={{ marginBottom: 12 }}><strong style={{ color: C.textPrimary }}>CONTRATANTE:</strong> Bela Pro &mdash; Plataforma de gestão para profissionais de beleza</p>
                <p style={{ marginBottom: 12 }}><strong style={{ color: C.textPrimary }}>CONTRATADA:</strong> {form.companyName} {form.companyDocument ? `(${form.companyDocument})` : ''}</p>
                <p style={{ marginBottom: 12 }}><strong style={{ color: C.textPrimary }}>PLANO:</strong> {tierDetails[form.selectedTier as keyof typeof tierDetails]?.name} &mdash; {DURATION_OPTIONS.find(d => d.months === form.durationMonths)?.label}</p>
                <p style={{ marginBottom: 20 }}><strong style={{ color: C.textPrimary }}>VALOR:</strong> {tierDetails[form.selectedTier as keyof typeof tierDetails]?.pricing?.[form.durationMonths]?.priceLabel}</p>

                <p style={{ marginBottom: 12 }}><strong style={{ color: C.textPrimary }}>1. OBJETO:</strong> O presente contrato tem por objeto a prestação de serviços de publicidade e exposição de marca na plataforma Bela Pro, conforme o plano de parceria selecionado.</p>
                <p style={{ marginBottom: 12 }}><strong style={{ color: C.textPrimary }}>2. BENEFÍCIOS:</strong> A CONTRATADA terá acesso a todos os benefícios descritos no plano {tierDetails[form.selectedTier as keyof typeof tierDetails]?.name}, conforme apresentado na página de parceria.</p>
                <p style={{ marginBottom: 12 }}><strong style={{ color: C.textPrimary }}>3. VIGÊNCIA:</strong> O contrato terá vigência de {form.durationMonths} {form.durationMonths === 1 ? 'mês' : 'meses'} a partir da confirmação do pagamento.</p>
                <p style={{ marginBottom: 12 }}><strong style={{ color: C.textPrimary }}>4. PAGAMENTO:</strong> O pagamento será realizado via Pix no ato da assinatura deste contrato.</p>
                <p style={{ marginBottom: 12 }}><strong style={{ color: C.textPrimary }}>5. RESCISÃO:</strong> Qualquer das partes poderá rescindir este contrato mediante notificação prévia de 30 dias.</p>
                <p style={{ marginBottom: 12 }}><strong style={{ color: C.textPrimary }}>6. FORO:</strong> Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer questões decorrentes deste contrato.</p>
              </div>
            </div>

            {/* Checkbox */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '16px', borderRadius: 12, background: contractAccepted ? `${C.gold}08` : 'transparent', border: `1px solid ${contractAccepted ? C.gold : C.border}`, transition: 'all 0.3s' }}>
              <input type="checkbox" checked={contractAccepted} onChange={e => setContractAccepted(e.target.checked)} style={{ marginTop: 2, width: 20, height: 20, accentColor: C.gold, cursor: 'pointer' }} />
              <span style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
                Li e concordo com todos os termos do contrato de parceria. Declaro que as informações fornecidas são verdadeiras e que estou autorizado(a) a representar a empresa <strong style={{ color: C.gold }}>{form.companyName}</strong>.
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep('form')} style={{ padding: '14px 28px', borderRadius: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontFamily: FONT.sans, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>← Voltar</button>
            <button onClick={() => { if (!contractAccepted) { alert('Você precisa aceitar os termos do contrato'); return; } handleSubmit(); }}
              disabled={submitting}
              style={{ padding: '14px 36px', borderRadius: 12, background: contractAccepted ? `linear-gradient(135deg, ${C.gold}, ${C.goldDark})` : C.bgGlass, border: 'none', color: contractAccepted ? C.bg : C.textMuted, fontFamily: FONT.sans, cursor: contractAccepted && !submitting ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700, opacity: submitting ? 0.7 : 1, boxShadow: contractAccepted ? `0 4px 20px ${C.goldMuted}` : 'none' }}>
              {submitting ? 'Processando...' : 'Assinar e Pagar →'}
            </button>
          </div>
        </section>
      )}

      {/* ============================== */}
      {/* STEP: PAYMENT                  */}
      {/* ============================== */}
      {step === 'payment' && paymentInfo && (
        <section style={{ position: 'relative', zIndex: 1, padding: '48px 24px 80px', maxWidth: 600, margin: '0 auto' }}>
          <div className="anim-up" style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>PASSO 4 DE 4</p>
            <h2 style={{ fontFamily: FONT.serif, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>
              Pagamento via <span className="gold-text">Pix</span>
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 14 }}>Escaneie o QR Code ou copie o código Pix</p>
          </div>

          <div className="anim-up-d1" style={{ background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`, padding: '40px 32px', textAlign: 'center' }}>
            {/* Amount */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Valor total</p>
              <p style={{ color: C.gold, fontSize: 32, fontWeight: 800 }}>{paymentInfo.amountFormatted}</p>
            </div>

            {/* Copy code */}
            {paymentInfo.pixCode && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: '12px 16px', marginBottom: 8 }}>
                  <input type="text" readOnly value={paymentInfo.pixCode} style={{ flex: 1, background: 'none', border: 'none', color: C.textSecondary, fontFamily: 'monospace', fontSize: 11, outline: 'none' }} />
                  <button onClick={() => { navigator.clipboard.writeText(paymentInfo.pixCode); alert('Código Pix copiado!'); }}
                    style={{ padding: '8px 16px', borderRadius: 8, background: C.gold, border: 'none', color: C.bg, fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: FONT.sans }}>Copiar</button>
                </div>
              </div>
            )}

            {/* Status */}
            <div style={{ padding: '16px', borderRadius: 12, background: `${C.gold}08`, border: `1px solid ${C.gold}20` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div className="pulse-dot" />
                <span style={{ color: C.gold, fontSize: 13, fontWeight: 600 }}>Aguardando confirmação do pagamento...</span>
              </div>
              <p style={{ color: C.textMuted, fontSize: 11, marginTop: 8 }}>O pagamento será confirmado automaticamente em até 2 minutos</p>
            </div>
          </div>

          {/* Status checks */}
          <div className="anim-up-d2" style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ color: C.textMuted, fontSize: 12 }}>Após o pagamento, você será redirecionado automaticamente</p>
          </div>
        </section>
      )}

      {/* RESPONSIVE STYLES */}
      <style>{`
        @media (max-width: 900px) {
          .tier-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .tier-grid { grid-template-columns: 1fr !important; }
          .form-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
