'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// =============================================================================
// TYPES
// =============================================================================

interface InviteData {
  companyName: string;
  contactName: string;
  personalMessage?: string;
  proposedTier: 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE';
  proposedType: string;
  proposedBenefits: string[];
  expiresAt: string;
}

// =============================================================================
// DESIGN TOKENS — Ultra Premium Dark + Gold
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

// =============================================================================
// GLOBAL CSS
// =============================================================================

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: ${C.bg}; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
  @keyframes glowPulse { 0%,100% { box-shadow: 0 0 40px rgba(201,165,92,0.15); } 50% { box-shadow: 0 0 80px rgba(201,165,92,0.35); } }
  @keyframes borderGlow { 0%,100% { border-color: rgba(201,165,92,0.15); } 50% { border-color: rgba(201,165,92,0.4); } }
  @keyframes countUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

  .anim-up { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-up-d1 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
  .anim-up-d2 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
  .anim-up-d3 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
  .anim-up-d4 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
  .anim-up-d5 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.5s both; }
  .anim-up-d6 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.6s both; }
  .anim-scale { animation: scaleIn 0.7s cubic-bezier(0.16,1,0.3,1) both; }

  .gold-text {
    background: linear-gradient(135deg, #e3cc8e 0%, #c9a55c 40%, #a07a35 70%, #c9a55c 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite;
  }

  .cta-btn {
    display: inline-flex; align-items: center; gap: 12px;
    padding: 22px 52px;
    background: linear-gradient(135deg, #c9a55c 0%, #a07a35 100%);
    border: none; border-radius: 60px;
    color: #050505; font-weight: 800; font-size: 17px;
    font-family: ${FONT.sans};
    cursor: pointer; text-decoration: none; letter-spacing: 0.5px;
    transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
    box-shadow: 0 8px 40px rgba(201,165,92,0.35);
  }
  .cta-btn:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 16px 60px rgba(201,165,92,0.5);
  }

  .glass-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    transition: all 0.4s ease;
  }
  .glass-card:hover {
    border-color: rgba(201,165,92,0.25);
    background: rgba(255,255,255,0.05);
    transform: translateY(-4px);
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }

  .tier-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 24px; border-radius: 40px;
    font-weight: 700; font-size: 13px; letter-spacing: 2px;
    text-transform: uppercase;
    animation: glowPulse 3s ease-in-out infinite;
  }

  .section-divider {
    height: 1px; width: 80px; margin: 0 auto;
    background: linear-gradient(90deg, transparent, ${C.gold}, transparent);
    opacity: 0.4;
  }

  .stat-number {
    font-family: ${FONT.serif};
    font-weight: 800;
    font-size: clamp(36px, 5vw, 52px);
    letter-spacing: -1px;
    line-height: 1;
  }

  @media (max-width: 768px) {
    .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
    .benefits-grid { grid-template-columns: 1fr !important; }
    .stats-grid { grid-template-columns: 1fr 1fr !important; }
    .cta-btn { padding: 18px 36px; font-size: 15px; }
  }
`;

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
  const [accepted, setAccepted] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/public/sponsor-invites/${token}`);
        const data = await res.json();
        if (data.expired) { setExpired(true); return; }
        if (!data.companyName) { setError('Convite não encontrado'); return; }
        setInvite(data);
      } catch {
        setError('Erro ao carregar convite');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, API_URL]);

  const handleAccept = async () => {
    try {
      await fetch(`${API_URL}/public/sponsor-invites/${token}/cta-click`, { method: 'POST' });
      await fetch(`${API_URL}/public/sponsor-invites/${token}/accept`, { method: 'POST' });
      setAccepted(true);
    } catch { /* silencioso */ }
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

  // ===== ACCEPTED =====
  if (accepted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <style>{GLOBAL_CSS}</style>
        <div className="anim-scale" style={{ textAlign: 'center', padding: 60, maxWidth: 600 }}>
          <div style={{ fontSize: 80, marginBottom: 24, animation: 'float 3s ease-in-out infinite' }}>🤝</div>
          <h2 style={{ fontFamily: FONT.serif, fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, marginBottom: 16, letterSpacing: '-1px' }}>
            <span className="gold-text">Parceria Confirmada!</span>
          </h2>
          <p style={{ color: C.textSecondary, fontSize: 18, lineHeight: 1.8, marginBottom: 32, maxWidth: 460, margin: '0 auto' }}>
            Bem-vindo à família <strong style={{ color: C.textPrimary }}>Bela Pro</strong>.
            Nossa equipe entrará em contato em breve para finalizar os detalhes da sua parceria.
          </p>
          <div style={{ width: 80, height: 2, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, margin: '32px auto' }} />
          <p style={{ color: C.textMuted, fontSize: 13 }}>Você receberá um email com os próximos passos.</p>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  const tier = TIER_META[invite.proposedTier] || TIER_META.GOLD;
  const typeLabel = TYPE_LABELS[invite.proposedType] || 'Parceiro';
  const daysLeft = Math.max(0, Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / 86400000));

  // ===== MAIN PAGE =====
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, fontFamily: FONT.sans, overflowX: 'hidden' }}>
      <style>{GLOBAL_CSS}</style>

      {/* ===== AMBIENT LIGHT ===== */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '10%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${C.goldMuted} 0%, transparent 70%)`, filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, rgba(201,165,92,0.08) 0%, transparent 70%)`, filter: 'blur(80px)' }} />
      </div>

      {/* ===== HEADER BAR ===== */}
      <header style={{ position: 'relative', zIndex: 10, padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
        <span style={{
          fontFamily: FONT.serif, fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px',
          background: `linear-gradient(135deg, ${C.goldLight} 0%, ${C.gold} 50%, ${C.goldDark} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Bela Pro</span>
        <span style={{ color: C.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>Convite Exclusivo</span>
      </header>

      {/* ===== HERO ===== */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(60px, 10vw, 120px) 32px clamp(40px, 8vw, 80px)', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
        {/* Tier Badge */}
        <div className="anim-up" style={{ marginBottom: 32 }}>
          <span className="tier-badge" style={{
            background: `${tier.glow.replace('0.3', '0.1')}`,
            border: `1px solid ${tier.glow.replace('0.3', '0.3')}`,
            color: tier.color,
          }}>
            <span style={{ fontSize: 20 }}>{tier.icon}</span>
            {tier.name}
          </span>
        </div>

        {/* Headline */}
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

        {/* Personal message */}
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

        {/* Urgency */}
        <div className="anim-up-d4" style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 24 }}>
          <span style={{ color: C.textMuted, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: daysLeft <= 7 ? '#ef4444' : C.gold, animation: daysLeft <= 3 ? 'pulse 1.5s infinite' : 'none' }} />
            Convite válido por {daysLeft} dia{daysLeft !== 1 ? 's' : ''}
          </span>
        </div>
      </section>

      {/* ===== DIVIDER ===== */}
      <div className="section-divider" />

      {/* ===== STATS ===== */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 32px', maxWidth: 1000, margin: '0 auto' }}>
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {[
            { value: '2.500+', label: 'Profissionais ativas' },
            { value: '85K+', label: 'Agendamentos/mês' },
            { value: '98%', label: 'Taxa de satisfação' },
            { value: '340K+', label: 'Impressões mensais' },
          ].map((stat, i) => (
            <div key={i} className={`anim-up-d${i + 1}`} style={{ textAlign: 'center', padding: 24 }}>
              <div className="stat-number gold-text">{stat.value}</div>
              <p style={{ color: C.textMuted, fontSize: 13, marginTop: 8, letterSpacing: 0.5 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DIVIDER ===== */}
      <div className="section-divider" />

      {/* ===== BENEFITS ===== */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 32px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p className="anim-up" style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>
            O QUE SUA MARCA GANHA
          </p>
          <h2 className="anim-up-d1" style={{ fontFamily: FONT.serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1px' }}>
            Benefícios <span className="gold-text">exclusivos</span>
          </h2>
        </div>

        <div className="benefits-grid" style={{ display: 'grid', gridTemplateColumns: invite.proposedBenefits.length > 3 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {(invite.proposedBenefits.length > 0 ? invite.proposedBenefits : [
            'Logo na landing page premium',
            'Destaque na página de agendamento',
            'Relatório de impressões e cliques',
            'Badge exclusiva de parceiro verificado',
          ]).map((benefit, i) => (
            <div key={i} className={`glass-card anim-up-d${Math.min(i + 1, 6)}`} style={{ padding: '28px 24px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `linear-gradient(135deg, ${C.goldMuted} 0%, transparent 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${C.borderGold}`,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{benefit}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DIVIDER ===== */}
      <div className="section-divider" />

      {/* ===== HOW IT WORKS ===== */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 32px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p className="anim-up" style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>
            COMO FUNCIONA
          </p>
          <h2 className="anim-up-d1" style={{ fontFamily: FONT.serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1px' }}>
            Simples e <span className="gold-text">transparente</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gap: 0 }}>
          {[
            { step: '01', title: 'Aceite o convite', desc: 'Clique em "Aceitar Parceria" para confirmar seu interesse.' },
            { step: '02', title: 'Nossa equipe entra em contato', desc: 'Alinhamos detalhes, enviamos o contrato e definimos o escopo da parceria.' },
            { step: '03', title: 'Sua marca brilha', desc: 'Seu logo aparece para milhares de profissionais e clientes em toda a plataforma.' },
          ].map((item, i) => (
            <div key={i} className={`anim-up-d${i + 1}`} style={{
              display: 'flex', gap: 24, padding: '32px 0',
              borderBottom: i < 2 ? `1px solid ${C.border}` : 'none',
              alignItems: 'flex-start',
            }}>
              <span style={{
                fontFamily: FONT.serif, fontSize: 48, fontWeight: 800,
                color: C.gold, opacity: 0.25, lineHeight: 1, flexShrink: 0, width: 60,
              }}>{item.step}</span>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: C.textPrimary }}>{item.title}</h3>
                <p style={{ color: C.textSecondary, fontSize: 15, lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DIVIDER ===== */}
      <div className="section-divider" />

      {/* ===== DASHBOARD PREVIEW ===== */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 32px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p className="anim-up" style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>
            PAINEL DO PARCEIRO
          </p>
          <h2 className="anim-up-d1" style={{ fontFamily: FONT.serif, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-1px' }}>
            Acompanhe seus <span className="gold-text">resultados</span>
          </h2>
        </div>

        <div className="glass-card anim-up-d2" style={{ padding: 32, animation: 'borderGlow 4s ease-in-out infinite' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 24 }}>
            {[
              { label: 'Impressões', value: '12.847', change: '+23%', icon: '👁️' },
              { label: 'Cliques', value: '1.293', change: '+18%', icon: '🖱️' },
              { label: 'CTR', value: '10.1%', change: '+5%', icon: '📈' },
            ].map((m, i) => (
              <div key={i} style={{
                background: C.bgGlass, borderRadius: 14, padding: 20,
                border: `1px solid ${C.border}`, textAlign: 'center',
              }}>
                <span style={{ fontSize: 24 }}>{m.icon}</span>
                <div style={{ fontFamily: FONT.serif, fontSize: 28, fontWeight: 800, color: C.gold, marginTop: 8 }}>{m.value}</div>
                <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>{m.label}</div>
                <div style={{ color: '#5a9e6f', fontSize: 11, marginTop: 4 }}>{m.change} este mês</div>
              </div>
            ))}
          </div>
          <div style={{ height: 120, background: `linear-gradient(135deg, ${C.bgGlass} 0%, rgba(201,165,92,0.05) 100%)`, borderRadius: 12, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: C.textMuted, fontSize: 13, letterSpacing: 1 }}>📊 Gráfico de performance em tempo real</p>
          </div>
        </div>
      </section>

      {/* ===== DIVIDER ===== */}
      <div className="section-divider" />

      {/* ===== FINAL CTA ===== */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(60px, 10vw, 120px) 32px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <div className="anim-up" style={{
          display: 'inline-block', padding: '6px 20px', borderRadius: 40,
          background: C.goldMuted, border: `1px solid ${C.borderGold}`,
          color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: 3,
          textTransform: 'uppercase', marginBottom: 28,
        }}>
          CONVITE EXCLUSIVO
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
          Junte-se à plataforma que está revolucionando o mercado de beleza
          e conecte sua marca a milhares de profissionais.
        </p>

        <div className="anim-up-d3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <button onClick={handleAccept} className="cta-btn" style={{ fontSize: 18, padding: '24px 56px' }}>
            Aceitar Parceria {tier.icon}
          </button>
          <span style={{ color: C.textMuted, fontSize: 12 }}>
            Sem compromisso financeiro imediato. Nossa equipe entrará em contato.
          </span>
        </div>

        {/* Trust signals */}
        <div className="anim-up-d4" style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 48, flexWrap: 'wrap' }}>
          {['Sem taxas ocultas', 'Cancelamento flexível', 'Relatórios mensais', 'Suporte dedicado'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ color: C.textMuted, fontSize: 13 }}>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '48px 32px', textAlign: 'center' }}>
        <span style={{
          fontFamily: FONT.serif, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px',
          background: `linear-gradient(135deg, ${C.goldLight} 0%, ${C.gold} 50%, ${C.goldDark} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          opacity: 0.5,
        }}>Bela Pro</span>
        <p style={{ color: C.textMuted, fontSize: 12, marginTop: 12 }}>Plataforma de gestão para profissionais de beleza</p>
        <p style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11, marginTop: 16 }}>© 2026 Bela Pro. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
