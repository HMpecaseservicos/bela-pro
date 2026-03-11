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

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap');

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

  .section-divider {
    height: 1px; width: 80px; margin: 0 auto;
    background: linear-gradient(90deg, transparent, ${C.gold}, transparent);
    opacity: 0.4;
  }

  input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
  input:focus, textarea:focus, select:focus { border-color: ${C.gold} !important; outline: none; }

  @media (max-width: 768px) {
    .tier-grid { grid-template-columns: 1fr !important; }
    .stats-grid { grid-template-columns: 1fr 1fr !important; }
    .benefits-grid { grid-template-columns: 1fr !important; }
    .form-2col { grid-template-columns: 1fr !important; }
  }

  @media print {
    .no-print { display: none !important; }
    body { background: white !important; color: #111 !important; }
  }
`;

const API_URL_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// COMPONENT
// =============================================================================

export default function SponsorInviteLandingPage() {
  const params = useParams();
  const token = params.token as string;

  // Core state
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  // Registration flow
  const [step, setStep] = useState<'landing' | 'tier' | 'form' | 'contract' | 'payment' | 'success'>('landing');
  const [tierDetails, setTierDetails] = useState<Record<string, TierDetail> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ contractNumber: string; isDiamond: boolean; pendingPayment?: boolean; payment?: PaymentInfo; paymentId?: string } | null>(null);

  // Form
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

  // Load invite
  useEffect(() => {
    async function load() {
      try {
        const [invRes, tierRes] = await Promise.all([
          fetch(`${API_URL_BASE}/public/sponsor-invites/${encodeURIComponent(token)}`),
          fetch(`${API_URL_BASE}/public/sponsor-invites/tier-details`),
        ]);
        const invData = await invRes.json();
        if (invData.expired) { setExpired(true); setLoading(false); return; }
        // Universal invites have no companyName; directed invites do
        if (!invData.isUniversal && !invData.companyName) { setError('Convite não encontrado'); setLoading(false); return; }
        setInvite(invData);

        if (tierRes.ok) {
          setTierDetails(await tierRes.json());
        }

        // Pre-fill form (only for directed invites)
        if (!invData.isUniversal) {
          setForm(prev => ({
            ...prev,
            companyName: invData.companyName,
            contactName: invData.contactName,
            selectedTier: invData.proposedTier,
            selectedType: invData.proposedType || 'BRAND',
          }));
        } else {
          // Universal: just set default tier
          setForm(prev => ({
            ...prev,
            selectedTier: invData.proposedTier || 'GOLD',
          }));
          // Universal goes straight to tier selection
          setStep('tier');
        }
      } catch {
        setError('Erro ao carregar convite');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  // Track CTA click
  const trackCta = () => {
    fetch(`${API_URL_BASE}/public/sponsor-invites/${encodeURIComponent(token)}/cta-click`, { method: 'POST' }).catch(() => {});
  };

  // Submit registration
  const handleSubmit = async () => {
    if (!form.acceptedTerms || !form.signedByName) return;
    setSubmitting(true);
    try {
      trackCta();
      const body: Record<string, unknown> = {
        companyName: form.companyName,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        selectedTier: form.selectedTier,
        selectedType: form.selectedType,
        durationMonths: form.durationMonths,
        acceptedTerms: form.acceptedTerms,
        signedByName: form.signedByName,
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
        setResult({
          contractNumber: data.contractNumber,
          isDiamond: data.isDiamond,
          pendingPayment: data.pendingPayment,
          payment: data.payment,
          paymentId: data.paymentId,
        });
        // Se há pagamento pendente, vai para tela de pagamento; senão, sucesso direto
        setStep(data.pendingPayment ? 'payment' : 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Erro ao processar cadastro');
      }
    } catch {
      alert('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Input style helpers
  const inputS: React.CSSProperties = {
    width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)',
    border: `1.5px solid ${C.border}`, borderRadius: 12, color: C.textPrimary,
    fontSize: 14, transition: 'border-color 0.2s', fontFamily: FONT.sans,
  };

  const labelS: React.CSSProperties = {
    color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.8px',
    textTransform: 'uppercase' as const, marginBottom: 8, display: 'block',
  };

  // ===== LOADING =====
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <style>{GLOBAL_CSS}</style>
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
        <style>{GLOBAL_CSS}</style>
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
        <style>{GLOBAL_CSS}</style>
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 500 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>⏰</div>
          <h2 style={{ color: C.textPrimary, fontFamily: FONT.serif, fontSize: 28, marginBottom: 12 }}>Convite Expirado</h2>
          <p style={{ color: C.textSecondary, fontSize: 15, lineHeight: 1.7 }}>
            Este convite de parceria não está mais disponível. Entre em contato conosco para solicitar um novo.
          </p>
        </div>
      </div>
    );
  }

  // ===== SUCCESS =====
  if (step === 'success' && result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ textAlign: 'center', padding: 48, maxWidth: 640, animation: 'celebrate 0.6s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div style={{ fontSize: 80, marginBottom: 24, animation: 'float 3s ease-in-out infinite' }}>🎉</div>
          <h2 style={{ fontFamily: FONT.serif, fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, marginBottom: 16, letterSpacing: '-1px' }}>
            <span className="gold-text">Cadastro Concluído!</span>
          </h2>
          <p style={{ color: C.textSecondary, fontSize: 17, lineHeight: 1.8, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
            Bem-vindo à família <strong style={{ color: C.textPrimary }}>Bela Pro</strong>!
            Seu cadastro como patrocinador foi realizado com sucesso e seu contrato já está ativo.
          </p>

          {/* Contract number */}
          <div style={{
            display: 'inline-block', padding: '16px 32px', borderRadius: 14,
            background: C.bgGlass, border: `1px solid ${C.borderGold}`,
            marginBottom: 28,
          }}>
            <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>
              Número do Contrato
            </div>
            <div style={{ color: C.gold, fontSize: 20, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px' }}>
              {result.contractNumber}
            </div>
          </div>

          <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7, marginBottom: 32, maxWidth: 440, margin: '0 auto 32px' }}>
            Guarde este número para consultar seu contrato a qualquer momento.
          </p>

          {result.isDiamond && (
            <div style={{
              padding: '20px 28px', borderRadius: 14,
              background: C.diamondBg, border: `1px solid rgba(167,139,250,0.25)`,
              marginBottom: 28, maxWidth: 440, margin: '0 auto 28px',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💎</div>
              <p style={{ color: C.diamond, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Você é Diamond!</p>
              <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
                Acesse seu painel exclusivo em{' '}
                <a href="/parceiro/login" style={{ color: C.diamond, textDecoration: 'underline' }}>/parceiro/login</a>{' '}
                com o email e senha cadastrados.
              </p>
            </div>
          )}

          <div style={{ width: 80, height: 2, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, margin: '24px auto' }} />
          <p style={{ color: C.textMuted, fontSize: 12 }}>
            Nossa equipe entrará em contato para alinhar os detalhes da parceria.
          </p>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  const tier = TIER_META[invite.proposedTier] || TIER_META.GOLD;
  const selectedTier = TIER_META[form.selectedTier] || TIER_META.GOLD;
  const typeLabel = TYPE_LABELS[invite.proposedType] || 'Parceiro';
  const daysLeft = Math.max(0, Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / 86400000));

  // Current tier details from API
  const currentTierDetail = tierDetails?.[form.selectedTier];

  // Contract preview date calc
  const contractStartDate = new Date();
  const contractEndDate = new Date();
  contractEndDate.setMonth(contractEndDate.getMonth() + form.durationMonths);

  // ===== RENDER STEP INDICATOR =====
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
      <div className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 100, padding: '16px 32px',
        background: `${C.bg}ee`, backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 0 }}>
          {steps.map((s, i) => (
            <div key={s.key} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                opacity: i <= currentIdx ? 1 : 0.35,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: i <= currentIdx ? C.gold : 'transparent',
                  border: `2px solid ${i <= currentIdx ? C.gold : C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: i <= currentIdx ? C.bg : C.textMuted,
                  transition: 'all 0.3s',
                }}>
                  {i < currentIdx ? '✓' : s.num}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: i <= currentIdx ? C.textPrimary : C.textMuted, whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: '0 12px',
                  background: i < currentIdx ? C.gold : C.border,
                  borderRadius: 1, transition: 'background 0.3s',
                }} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ===== MAIN RENDER =====
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, fontFamily: FONT.sans, overflowX: 'hidden' }}>
      <style>{GLOBAL_CSS}</style>

      {/* Ambient light */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '10%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${C.goldMuted} 0%, transparent 70%)`, filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,165,92,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Header */}
      <header className="no-print" style={{ position: 'relative', zIndex: 10, padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
        <span style={{
          fontFamily: FONT.serif, fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px',
          background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold}, ${C.goldDark})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Bela Pro</span>
        <span style={{ color: C.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>
          {step === 'landing' ? 'Convite Exclusivo' : 'Cadastro de Parceiro'}
        </span>
      </header>

      {renderStepIndicator()}

      {/* ============================== */}
      {/* STEP: LANDING                  */}
      {/* ============================== */}
      {step === 'landing' && (
        <>
          {/* Hero */}
          <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(60px, 10vw, 120px) 32px clamp(40px, 8vw, 80px)', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
            <div className="anim-up" style={{ marginBottom: 32 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 24px', borderRadius: 40,
                background: tier.glow.replace('0.3', '0.1'),
                border: `1px solid ${tier.glow.replace('0.3', '0.3')}`,
                color: tier.color, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase',
                animation: 'glowPulse 3s ease-in-out infinite',
              }}>
                <span style={{ fontSize: 20 }}>{tier.icon}</span> {tier.name}
              </span>
            </div>

            <h1 className="anim-up-d1" style={{
              fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 900, fontFamily: FONT.serif,
              letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 28,
            }}>
              {invite.contactName.split(' ')[0]}, sua marca{' '}
              <span className="gold-text">merece destaque.</span>
            </h1>

            <p className="anim-up-d2" style={{
              color: C.textSecondary, fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.8,
              maxWidth: 640, margin: '0 auto 20px',
            }}>
              A <strong style={{ color: C.textPrimary }}>Bela Pro</strong> convida a{' '}
              <strong style={{ color: C.gold }}>{invite.companyName}</strong> para uma parceria exclusiva
              como <strong style={{ color: C.textPrimary }}>{typeLabel}</strong>.
            </p>

            {invite.personalMessage && (
              <div className="anim-up-d3" style={{
                maxWidth: 560, margin: '32px auto 0', padding: '24px 32px',
                background: C.bgGlass, border: `1px solid ${C.borderGold}`,
                borderRadius: 16, borderLeft: `3px solid ${C.gold}`,
              }}>
                <p style={{ color: C.textSecondary, fontSize: 15, lineHeight: 1.8, fontStyle: 'italic' }}>
                  &ldquo;{invite.personalMessage}&rdquo;
                </p>
                <p style={{ color: C.gold, fontSize: 12, marginTop: 12, letterSpacing: 1 }}>— Equipe Bela Pro</p>
              </div>
            )}

            <div className="anim-up-d4" style={{ marginTop: 32 }}>
              <span style={{ color: C.textMuted, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: daysLeft <= 7 ? '#ef4444' : C.gold, animation: daysLeft <= 3 ? 'pulse 1.5s infinite' : 'none' }} />
                Convite válido por {daysLeft} dia{daysLeft !== 1 ? 's' : ''}
              </span>
            </div>
          </section>

          <div className="section-divider" />

          {/* Stats */}
          <section style={{ position: 'relative', zIndex: 1, padding: '80px 32px', maxWidth: 1000, margin: '0 auto' }}>
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
              {[
                { value: '2.500+', label: 'Profissionais ativas' },
                { value: '85K+', label: 'Agendamentos/mês' },
                { value: '98%', label: 'Taxa de satisfação' },
                { value: '340K+', label: 'Impressões mensais' },
              ].map((stat, i) => (
                <div key={i} className={`anim-up-d${i + 1}`} style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ fontFamily: FONT.serif, fontWeight: 800, fontSize: 'clamp(32px, 5vw, 48px)', letterSpacing: '-1px', lineHeight: 1 }}>
                    <span className="gold-text">{stat.value}</span>
                  </div>
                  <p style={{ color: C.textMuted, fontSize: 13, marginTop: 8 }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="section-divider" />

          {/* Benefits */}
          <section style={{ position: 'relative', zIndex: 1, padding: '80px 32px', maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p className="anim-up" style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>O QUE SUA MARCA GANHA</p>
              <h2 className="anim-up-d1" style={{ fontFamily: FONT.serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1px' }}>
                Benefícios <span className="gold-text">exclusivos</span>
              </h2>
            </div>
            <div className="benefits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {(invite.proposedBenefits.length > 0 ? invite.proposedBenefits : ['Logo na landing page premium', 'Destaque na página de agendamento', 'Relatório de impressões e cliques', 'Badge exclusiva de parceiro verificado']).map((b, i) => (
                <div key={i} className={`glass-card anim-up-d${Math.min(i + 1, 6)}`} style={{ padding: '24px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${C.goldMuted}, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${C.borderGold}`,
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <p style={{ color: C.textPrimary, fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{b}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="section-divider" />

          {/* How it works */}
          <section style={{ position: 'relative', zIndex: 1, padding: '80px 32px', maxWidth: 900, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p className="anim-up" style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>COMO FUNCIONA</p>
              <h2 className="anim-up-d1" style={{ fontFamily: FONT.serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1px' }}>
                Simples e <span className="gold-text">transparente</span>
              </h2>
            </div>
            {[
              { num: '01', title: 'Escolha seu plano', desc: 'Selecione o nível de parceria que melhor se encaixa com seus objetivos. Cada tier oferece benefícios diferentes.' },
              { num: '02', title: 'Preencha seus dados', desc: 'Informe os dados da sua empresa. Rápido, seguro e sem complicação. Tudo online, sem burocracia.' },
              { num: '03', title: 'Contrato automático', desc: 'Um contrato digital é gerado automaticamente com todos os termos, benefícios e vigência. Assine digitalmente e pronto!' },
            ].map((item, i) => (
              <div key={i} className={`anim-up-d${i + 1}`} style={{
                display: 'flex', gap: 24, padding: '32px 0',
                borderBottom: i < 2 ? `1px solid ${C.border}` : 'none', alignItems: 'flex-start',
              }}>
                <span style={{ fontFamily: FONT.serif, fontSize: 48, fontWeight: 800, color: C.gold, opacity: 0.25, lineHeight: 1, flexShrink: 0, width: 60 }}>{item.num}</span>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{item.title}</h3>
                  <p style={{ color: C.textSecondary, fontSize: 15, lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </section>

          <div className="section-divider" />

          {/* CTA */}
          <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(60px, 10vw, 120px) 32px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
            <div className="anim-up" style={{
              display: 'inline-block', padding: '6px 20px', borderRadius: 40,
              background: C.goldMuted, border: `1px solid ${C.borderGold}`,
              color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 28,
            }}>
              CADASTRE-SE AGORA
            </div>

            <h2 className="anim-up-d1" style={{
              fontFamily: FONT.serif, fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900,
              letterSpacing: '-2px', lineHeight: 1.1, marginBottom: 24,
            }}>
              Pronto para posicionar a{' '}
              <span className="gold-text">{invite.companyName}</span>{' '}
              ao lado das maiores?
            </h2>

            <p className="anim-up-d2" style={{ color: C.textSecondary, fontSize: 18, lineHeight: 1.8, maxWidth: 520, margin: '0 auto 48px' }}>
              Cadastre-se diretamente e receba seu contrato digital automaticamente.
              Sem burocracia, sem espera.
            </p>

            <div className="anim-up-d3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <button onClick={() => { trackCta(); setStep('tier'); }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '24px 56px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
                border: 'none', borderRadius: 60, color: C.bg, fontWeight: 800, fontSize: 18,
                fontFamily: FONT.sans, cursor: 'pointer', letterSpacing: '0.5px',
                boxShadow: `0 8px 40px rgba(201,165,92,0.35)`,
                transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 16px 60px rgba(201,165,92,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(201,165,92,0.35)'; }}
              >
                Quero ser Parceiro {tier.icon}
              </button>
              <span style={{ color: C.textMuted, fontSize: 12 }}>
                Contrato digital gerado automaticamente · Sem compromisso imediato
              </span>
            </div>

            <div className="anim-up-d4" style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 48, flexWrap: 'wrap' }}>
              {['Sem taxas ocultas', 'Cancelamento flexível', 'Contrato transparente', 'Suporte dedicado'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  <span style={{ color: C.textMuted, fontSize: 13 }}>{item}</span>
                </div>
              ))}
            </div>
          </section>
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
            <p style={{ color: C.textSecondary, fontSize: 16, maxWidth: 560, margin: '0 auto' }}>
              {invite?.isUniversal ? (
                'Selecione o nível de parceria ideal para o seu negócio. Cada tier oferece benefícios exclusivos.'
              ) : (
                <>Cada tier oferece benefícios exclusivos. O tier <strong style={{ color: TIER_META[invite!.proposedTier].color }}>{TIER_META[invite!.proposedTier].name}</strong> foi sugerido para você.</>
              )}
            </p>
          </div>

          <div className="tier-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {(['DIAMOND', 'GOLD', 'SILVER', 'BRONZE'] as const).map((tierKey, i) => {
              const td = tierDetails[tierKey];
              const tm = TIER_META[tierKey];
              const isSelected = form.selectedTier === tierKey;
              const isSuggested = invite.proposedTier === tierKey;

              return (
                <div key={tierKey} className={`anim-up-d${i + 1}`}
                  onClick={() => setForm(prev => ({ ...prev, selectedTier: tierKey }))}
                  style={{
                    background: isSelected ? tm.glow.replace('0.3', '0.08') : C.bgGlass,
                    border: `2px solid ${isSelected ? tm.color : C.border}`,
                    borderRadius: 20, padding: '28px 20px', cursor: 'pointer',
                    transition: 'all 0.3s', position: 'relative', overflow: 'hidden',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isSelected ? `0 8px 40px ${tm.glow}` : 'none',
                  }}
                >
                  {isSuggested && (
                    <div style={{
                      position: 'absolute', top: 12, right: 12,
                      padding: '3px 10px', borderRadius: 20,
                      background: `${C.gold}20`, border: `1px solid ${C.gold}40`,
                      fontSize: 9, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      Sugerido
                    </div>
                  )}

                  <div style={{ fontSize: 40, marginBottom: 12 }}>{tm.icon}</div>
                  <h3 style={{ color: tm.color, fontSize: 18, fontWeight: 700, fontFamily: FONT.serif, marginBottom: 8 }}>{td?.name}</h3>
                  
                  {/* Pricing display */}
                  {td?.pricing && td.pricing[form.durationMonths] && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ color: C.gold, fontSize: 20, fontWeight: 800, marginBottom: 2 }}>
                        {td.pricing[form.durationMonths].priceLabel}
                      </p>
                      <p style={{ color: C.textMuted, fontSize: 11 }}>
                        {td.pricing[form.durationMonths].perMonth}
                      </p>
                      {td.pricing[form.durationMonths].discount && (
                        <span style={{
                          display: 'inline-block', marginTop: 6, padding: '3px 8px',
                          borderRadius: 8, background: `${C.success}15`, color: C.success,
                          fontSize: 9, fontWeight: 700,
                        }}>
                          {td.pricing[form.durationMonths].discount}
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {td?.highlights.slice(0, 5).map((h, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tm.color} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span style={{ color: C.textSecondary, fontSize: 12, lineHeight: 1.4 }}>{h}</span>
                      </div>
                    ))}
                    {(td?.highlights.length ?? 0) > 5 && (
                      <span style={{ color: C.textMuted, fontSize: 11, marginLeft: 22 }}>+{(td?.highlights.length ?? 0) - 5} mais...</span>
                    )}
                  </div>

                  <div style={{
                    padding: '6px 14px', borderRadius: 8,
                    background: isSelected ? tm.color : 'transparent',
                    border: `1px solid ${isSelected ? tm.color : C.border}`,
                    color: isSelected ? C.bg : C.textMuted,
                    fontSize: 12, fontWeight: 700, textAlign: 'center',
                    transition: 'all 0.3s',
                  }}>
                    {isSelected ? '✓ Selecionado' : 'Selecionar'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Duration selection */}
          <div className="anim-up-d5" style={{ marginTop: 48, textAlign: 'center' }}>
            <p style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
              Duração do contrato
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              {DURATION_OPTIONS.map(d => (
                <button key={d.months} onClick={() => setForm(prev => ({ ...prev, durationMonths: d.months }))}
                  style={{
                    padding: '16px 28px', borderRadius: 14, cursor: 'pointer',
                    background: form.durationMonths === d.months ? C.goldMuted : C.bgGlass,
                    border: `2px solid ${form.durationMonths === d.months ? C.gold : C.border}`,
                    color: form.durationMonths === d.months ? C.gold : C.textSecondary,
                    fontFamily: FONT.sans, transition: 'all 0.3s', position: 'relative',
                  }}
                >
                  {d.featured && form.durationMonths === d.months && (
                    <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', padding: '2px 10px', borderRadius: 10, background: C.gold, color: C.bg, fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      MAIS POPULAR
                    </div>
                  )}
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{d.label}</div>
                  <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Nav */}
          <div className="anim-up-d6" style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 48 }}>
            {!invite?.isUniversal && (
              <button onClick={() => setStep('landing')} style={{
                padding: '14px 32px', borderRadius: 12, background: 'transparent',
                border: `1px solid ${C.border}`, color: C.textSecondary,
                fontFamily: FONT.sans, cursor: 'pointer', fontSize: 14, fontWeight: 500,
              }}>
                ← Voltar
              </button>
            )}
            <button onClick={() => setStep('form')} style={{
              padding: '14px 40px', borderRadius: 12,
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
              border: 'none', color: C.bg, fontFamily: FONT.sans, cursor: 'pointer',
              fontSize: 14, fontWeight: 700, boxShadow: `0 4px 20px ${C.goldMuted}`,
            }}>
              Continuar →
            </button>
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
            <p style={{ color: C.textSecondary, fontSize: 14 }}>
              Preencha as informações para gerar o contrato
            </p>
          </div>

          <div className="anim-up-d1" style={{
            background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`,
            padding: '36px 32px',
          }}>
            <div style={{ display: 'grid', gap: 20 }}>
              {/* Company heading */}
              <div style={{ padding: '16px 0 8px', borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
                <span style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Dados da Empresa</span>
              </div>

              <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelS}>Nome da empresa *</label>
                  <input type="text" value={form.companyName}
                    onChange={e => setForm({ ...form, companyName: e.target.value })}
                    placeholder="Ex: L'Oréal Brasil" style={inputS} />
                </div>
                <div>
                  <label style={labelS}>CNPJ / CPF</label>
                  <input type="text" value={form.companyDocument}
                    onChange={e => setForm({ ...form, companyDocument: e.target.value })}
                    placeholder="00.000.000/0000-00" style={inputS} />
                </div>
              </div>

              <div>
                <label style={labelS}>Endereço</label>
                <input type="text" value={form.companyAddress}
                  onChange={e => setForm({ ...form, companyAddress: e.target.value })}
                  placeholder="Rua, número, bairro, cidade - UF" style={inputS} />
              </div>

              <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelS}>Website</label>
                  <input type="url" value={form.websiteUrl}
                    onChange={e => setForm({ ...form, websiteUrl: e.target.value })}
                    placeholder="https://www.empresa.com" style={inputS} />
                </div>
                <div>
                  <label style={labelS}>Tipo de parceria</label>
                  <select value={form.selectedType} onChange={e => setForm({ ...form, selectedType: e.target.value })}
                    style={{ ...inputS, cursor: 'pointer' }}>
                    {TYPE_OPTIONS.map(t => <option key={t.key} value={t.key}>{t.label} — {t.desc}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelS}>Descrição breve</label>
                <textarea value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Conte-nos sobre sua empresa..." rows={2}
                  style={{ ...inputS, resize: 'vertical' }} />
              </div>

              {/* Contact heading */}
              <div style={{ padding: '16px 0 8px', borderBottom: `1px solid ${C.border}`, marginTop: 8, marginBottom: 4 }}>
                <span style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Dados do Contato</span>
              </div>

              <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelS}>Nome do responsável *</label>
                  <input type="text" value={form.contactName}
                    onChange={e => setForm({ ...form, contactName: e.target.value })}
                    placeholder="Nome completo" style={inputS} />
                </div>
                <div>
                  <label style={labelS}>Email *</label>
                  <input type="email" value={form.contactEmail}
                    onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                    placeholder="contato@empresa.com" style={inputS} />
                </div>
              </div>

              <div>
                <label style={labelS}>Telefone</label>
                <input type="tel" value={form.contactPhone}
                  onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                  placeholder="(11) 99999-0000" style={inputS} />
              </div>

              {/* Diamond password */}
              {form.selectedTier === 'DIAMOND' && (
                <>
                  <div style={{ padding: '16px 0 8px', borderBottom: `1px solid rgba(167,139,250,0.2)`, marginTop: 8, marginBottom: 4 }}>
                    <span style={{ color: C.diamond, fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                      💎 Acesso Diamond Panel
                    </span>
                  </div>
                  <div style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: C.diamondBg, border: `1px solid rgba(167,139,250,0.2)`,
                    fontSize: 12, color: C.textSecondary, lineHeight: 1.6,
                  }}>
                    Como parceiro Diamond, você terá acesso a um painel exclusivo para gerenciar postagens, acompanhar métricas e controlar seus anúncios.
                  </div>
                  <div>
                    <label style={labelS}>Senha do painel Diamond *</label>
                    <input type="password"
                      value={form.password} minLength={6}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres" style={inputS} />
                  </div>
                </>
              )}
            </div>

            {/* Nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
              <button onClick={() => setStep('tier')} style={{
                padding: '14px 28px', borderRadius: 12, background: 'transparent',
                border: `1px solid ${C.border}`, color: C.textSecondary,
                fontFamily: FONT.sans, cursor: 'pointer', fontSize: 14, fontWeight: 500,
              }}>
                ← Voltar
              </button>
              <button onClick={() => {
                if (!form.companyName || !form.contactName || !form.contactEmail) {
                  alert('Preencha todos os campos obrigatórios');
                  return;
                }
                if (form.selectedTier === 'DIAMOND' && (!form.password || form.password.length < 6)) {
                  alert('A senha do painel Diamond deve ter no mínimo 6 caracteres');
                  return;
                }
                setStep('contract');
              }} style={{
                padding: '14px 36px', borderRadius: 12,
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
                border: 'none', color: C.bg, fontFamily: FONT.sans, cursor: 'pointer',
                fontSize: 14, fontWeight: 700, boxShadow: `0 4px 20px ${C.goldMuted}`,
              }}>
                Revisar Contrato →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============================== */}
      {/* STEP: CONTRACT PREVIEW + SIGN  */}
      {/* ============================== */}
      {step === 'contract' && (
        <section style={{ position: 'relative', zIndex: 1, padding: '48px 24px 80px', maxWidth: 800, margin: '0 auto' }}>
          <div className="anim-up" style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>PASSO 3 DE 4</p>
            <h2 style={{ fontFamily: FONT.serif, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>
              Revise e <span className="gold-text">assine o contrato</span>
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 14 }}>
              Leia atentamente todos os termos antes de confirmar
            </p>
          </div>

          {/* Contract body */}
          <div className="anim-up-d1" style={{
            background: '#0a0a0c',
            borderRadius: 20, border: `1px solid ${C.borderGold}`,
            padding: '48px 40px', overflow: 'hidden', position: 'relative',
          }}>
            {/* Top accent */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: `linear-gradient(90deg, ${C.gold}, ${selectedTier.color}, ${C.gold})`,
            }} />

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{
                fontFamily: FONT.serif, fontSize: 32, fontWeight: 800, letterSpacing: '-1px',
                background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold}, ${C.goldDark})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                marginBottom: 8,
              }}>
                Bela Pro
              </div>
              <h3 style={{ fontFamily: FONT.serif, fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
                Contrato de Parceria — {selectedTier.icon} {selectedTier.name}
              </h3>
              <div style={{ width: 60, height: 2, background: C.gold, margin: '16px auto', opacity: 0.3 }} />
            </div>

            {/* 1. Partes */}
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
                1. Partes Contratantes
              </h4>
              <div style={{ background: C.bgGlass, borderRadius: 12, padding: '16px 20px', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'grid', gap: 12, fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
                  <p><strong style={{ color: C.textPrimary }}>CONTRATANTE:</strong> Bela Pro — Plataforma de Gestão para Profissionais de Beleza</p>
                  <p><strong style={{ color: C.textPrimary }}>CONTRATADA:</strong> {form.companyName}
                    {form.companyDocument && <span> — {form.companyDocument}</span>}
                  </p>
                  <p><strong style={{ color: C.textPrimary }}>Responsável:</strong> {form.contactName}
                    {form.contactEmail && <span> — {form.contactEmail}</span>}
                  </p>
                  {form.companyAddress && <p><strong style={{ color: C.textPrimary }}>Endereço:</strong> {form.companyAddress}</p>}
                </div>
              </div>
            </div>

            {/* 2. Objeto */}
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
                2. Objeto do Contrato
              </h4>
              <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.8 }}>
                O presente contrato estabelece os termos e condições da parceria entre a Bela Pro e{' '}
                <strong style={{ color: C.textPrimary }}>{form.companyName}</strong>, na modalidade{' '}
                <strong style={{ color: selectedTier.color }}>{selectedTier.name}</strong>, tipo{' '}
                <strong style={{ color: C.textPrimary }}>{TYPE_LABELS[form.selectedType] || form.selectedType}</strong>.
              </p>
            </div>

            {/* 3. Vigência */}
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
                3. Vigência
              </h4>
              <div style={{ background: C.bgGlass, borderRadius: 12, padding: '16px 20px', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, textAlign: 'center' }}>
                  <div>
                    <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Início</div>
                    <div style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600 }}>{contractStartDate.toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div>
                    <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Duração</div>
                    <div style={{ color: C.gold, fontSize: 15, fontWeight: 600 }}>{form.durationMonths} meses</div>
                  </div>
                  <div>
                    <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Término</div>
                    <div style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600 }}>{contractEndDate.toLocaleDateString('pt-BR')}</div>
                  </div>
                </div>
              </div>
              <p style={{ color: C.textMuted, fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>
                O contrato poderá ser renovado mediante acordo expresso entre as partes antes da data de término.
                Caso não haja manifestação de nenhuma das partes em até 15 dias antes do vencimento, o contrato será encerrado automaticamente.
              </p>
            </div>

            {/* 4. Benefícios */}
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
                4. Benefícios Concedidos à Contratada
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(currentTierDetail?.highlights || []).map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.5 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Obrigações */}
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
                5. Obrigações da Contratada
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'Manter informações de contato atualizadas',
                  'Não utilizar a marca Bela Pro sem autorização prévia por escrito',
                  'Respeitar os termos de uso da plataforma',
                  'Não veicular conteúdo ofensivo, discriminatório ou ilegal',
                  ...(form.selectedTier === 'DIAMOND' || form.selectedTier === 'GOLD' ? [
                    'Fornecer materiais de marca (logo em alta resolução) em até 7 dias úteis',
                    'Manter conteúdo de postagens em conformidade com as diretrizes da plataforma',
                  ] : []),
                ].map((o, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
                    <span style={{ color: C.gold, fontSize: 14, fontWeight: 700, flexShrink: 0, width: 20, textAlign: 'center' }}>{i + 1}.</span>
                    <span style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.5 }}>{o}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Rescisão */}
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
                6. Rescisão e Cancelamento
              </h4>
              <div style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p>6.1. Qualquer das partes poderá rescindir o presente contrato mediante comunicação escrita com antecedência mínima de <strong style={{ color: C.textPrimary }}>15 (quinze) dias</strong>.</p>
                <p>6.2. Em caso de violação de qualquer cláusula, a parte prejudicada poderá rescindir imediatamente o contrato.</p>
                <p>6.3. Após o cancelamento, a exposição da marca da Contratada será removida da plataforma em até <strong style={{ color: C.textPrimary }}>5 (cinco) dias úteis</strong>.</p>
                <p>6.4. Não haverá multa rescisória para parcerias sem valor monetário acordado.</p>
              </div>
            </div>

            {/* 7. Confidencialidade */}
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
                7. Confidencialidade e Dados
              </h4>
              <div style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p>7.1. As partes se comprometem a manter em sigilo todas as informações confidenciais compartilhadas durante a vigência deste contrato.</p>
                <p>7.2. Os dados de performance (impressões, cliques, CTR) são disponibilizados apenas às partes envolvidas e não serão compartilhados com terceiros sem consentimento prévio.</p>
                <p>7.3. A Bela Pro se compromete a tratar os dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>
              </div>
            </div>

            {/* 8. Disposições gerais */}
            <div style={{ marginBottom: 40 }}>
              <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
                8. Disposições Gerais
              </h4>
              <div style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p>8.1. Este contrato representa o acordo completo entre as partes quanto ao seu objeto, substituindo quaisquer entendimentos anteriores.</p>
                <p>8.2. Alterações neste contrato somente serão válidas se feitas por escrito e assinadas por ambas as partes.</p>
                <p>8.3. Fica eleito o Foro da comarca de domicílio da Contratante para dirimir quaisquer questões oriundas deste instrumento.</p>
                <p>8.4. E por estarem assim justas e contratadas, as partes assinam digitalmente o presente instrumento.</p>
              </div>
            </div>

            {/* Signature area */}
            <div style={{ borderTop: `1px solid ${C.borderGold}`, paddingTop: 32 }}>
              <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 20 }}>
                Assinatura Digital
              </h4>

              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={labelS}>Nome completo (assinatura) *</label>
                  <input type="text" value={form.signedByName}
                    onChange={e => setForm({ ...form, signedByName: e.target.value })}
                    placeholder="Seu nome completo como assinatura"
                    style={{ ...inputS, fontFamily: "'Playfair Display', serif", fontSize: 16, fontStyle: 'italic' }} />
                </div>

                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
                  padding: '16px 20px', borderRadius: 12,
                  background: form.acceptedTerms ? C.successBg : C.bgGlass,
                  border: `1.5px solid ${form.acceptedTerms ? C.success + '40' : C.border}`,
                  transition: 'all 0.3s',
                }}>
                  <input type="checkbox" checked={form.acceptedTerms}
                    onChange={e => setForm({ ...form, acceptedTerms: e.target.checked })}
                    style={{ width: 20, height: 20, accentColor: C.success, marginTop: 2, flexShrink: 0 }} />
                  <span style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
                    Li e aceito todas as cláusulas, termos e condições deste contrato de parceria.
                    Confirmo que tenho poderes para representar a empresa{' '}
                    <strong style={{ color: C.textPrimary }}>{form.companyName}</strong>{' '}
                    e que as informações fornecidas são verídicas.
                  </span>
                </label>

                <div style={{ textAlign: 'center', color: C.textMuted, fontSize: 11, marginTop: 8 }}>
                  Data: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <div className="anim-up-d2 no-print" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <button onClick={() => setStep('form')} style={{
              padding: '14px 28px', borderRadius: 12, background: 'transparent',
              border: `1px solid ${C.border}`, color: C.textSecondary,
              fontFamily: FONT.sans, cursor: 'pointer', fontSize: 14, fontWeight: 500,
            }}>
              ← Voltar
            </button>
            <button onClick={handleSubmit}
              disabled={!form.acceptedTerms || !form.signedByName || submitting}
              style={{
                padding: '16px 48px', borderRadius: 14,
                background: (!form.acceptedTerms || !form.signedByName || submitting)
                  ? C.textMuted
                  : `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
                border: 'none', color: C.bg,
                fontFamily: FONT.sans,
                cursor: (!form.acceptedTerms || !form.signedByName || submitting) ? 'not-allowed' : 'pointer',
                fontSize: 15, fontWeight: 800, letterSpacing: '0.3px',
                boxShadow: (form.acceptedTerms && form.signedByName && !submitting) ? `0 6px 30px rgba(201,165,92,0.35)` : 'none',
                transition: 'all 0.3s',
              }}>
              {submitting ? 'Processando...' : '✍️ Assinar e Continuar'}
            </button>
          </div>
        </section>
      )}

      {/* ============================== */}
      {/* STEP: PAYMENT (PIX)            */}
      {/* ============================== */}
      {step === 'payment' && result?.pendingPayment && result.payment && (
        <section style={{ position: 'relative', zIndex: 1, padding: '48px 24px 80px', maxWidth: 700, margin: '0 auto' }}>
          <div className="anim-up" style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>PASSO 4 DE 4</p>
            <h2 style={{ fontFamily: FONT.serif, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>
              Realize o <span className="gold-text">pagamento</span>
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 14 }}>
              Seu cadastro foi registrado! Complete o pagamento via PIX para ativar a parceria.
            </p>
          </div>

          {/* Payment card */}
          <div className="anim-up-d1" style={{
            background: C.bgCard, borderRadius: 24, border: `1px solid ${C.borderGold}`,
            padding: '40px 36px', textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}>
            {/* Top accent */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: `linear-gradient(90deg, ${C.gold}, ${selectedTier.color}, ${C.gold})`,
            }} />

            {/* Amount */}
            <div style={{ marginBottom: 32 }}>
              <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                Valor Total — {result.payment.durationMonths} meses
              </p>
              <p style={{
                fontFamily: FONT.serif, fontSize: 'clamp(40px, 8vw, 60px)', fontWeight: 900,
                background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                letterSpacing: '-2px', lineHeight: 1,
              }}>
                {result.payment.amountFormatted}
              </p>
              <p style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>
                Plano {selectedTier.name} {selectedTier.icon}
              </p>
            </div>

            {/* PIX QR Code section */}
            <div style={{
              background: '#fff', borderRadius: 16, padding: '24px',
              marginBottom: 24, display: 'inline-block',
            }}>
              <div style={{
                width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f3f4f6', borderRadius: 8,
              }}>
                {/* QR Code placeholder - in production, use a QR library */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.payment.pixCode)}`}
                  alt="QR Code PIX"
                  style={{ width: 200, height: 200, borderRadius: 8 }}
                />
              </div>
            </div>

            <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 24 }}>
              Escaneie o QR Code acima com o app do seu banco
            </p>

            {/* Copy PIX code */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                Ou copie o código PIX
              </p>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: C.bgGlass, borderRadius: 12, padding: '12px 16px',
                border: `1px solid ${C.border}`, maxWidth: 500, margin: '0 auto',
              }}>
                <input
                  type="text"
                  readOnly
                  value={result.payment.pixCode}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    color: C.textSecondary, fontSize: 11, fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.payment!.pixCode);
                    alert('Código PIX copiado!');
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: 8,
                    background: C.gold, border: 'none', color: C.bg,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: FONT.sans,
                  }}
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Timer */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 20,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <span style={{ fontSize: 16 }}>⏳</span>
              <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>
                Válido até {new Date(result.payment.pixExpiresAt).toLocaleString('pt-BR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>

            {/* Contract number */}
            <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
              <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>
                Contrato Nº
              </p>
              <p style={{ color: C.gold, fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>
                {result.contractNumber}
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="anim-up-d2" style={{
            marginTop: 32, padding: '24px 28px', borderRadius: 16,
            background: C.bgGlass, border: `1px solid ${C.border}`,
          }}>
            <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
              📋 Próximos passos
            </h4>
            <ol style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
              <li>Realize o pagamento PIX usando o QR Code ou código acima</li>
              <li>Aguarde a confirmação do pagamento (processamento manual em até 24h úteis)</li>
              <li>Após confirmação, sua parceria será ativada automaticamente</li>
              <li>Você receberá um email com os detalhes de acesso</li>
            </ol>

            {result.isDiamond && (
              <div style={{
                marginTop: 20, padding: '16px 20px', borderRadius: 12,
                background: C.diamondBg, border: '1px solid rgba(167,139,250,0.2)',
              }}>
                <p style={{ color: C.diamond, fontSize: 12, fontWeight: 600 }}>
                  💎 Como Diamond, após a ativação você terá acesso ao painel exclusivo em{' '}
                  <strong>/parceiro/login</strong>
                </p>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="anim-up-d3" style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ color: C.textMuted, fontSize: 12 }}>
              Dúvidas? Entre em contato: <a href="mailto:contato@belapro.com.br" style={{ color: C.gold }}>contato@belapro.com.br</a>
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      {step === 'landing' && (
        <footer style={{ borderTop: `1px solid ${C.border}`, padding: '48px 32px', textAlign: 'center' }}>
          <span style={{
            fontFamily: FONT.serif, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px',
            background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold}, ${C.goldDark})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', opacity: 0.5,
          }}>Bela Pro</span>
          <p style={{ color: C.textMuted, fontSize: 12, marginTop: 12 }}>Plataforma de gestão para profissionais de beleza</p>
          <p style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11, marginTop: 16 }}>© 2026 Bela Pro. Todos os direitos reservados.</p>
        </footer>
      )}
    </div>
  );
}
