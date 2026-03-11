'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// =============================================================================
// TYPES
// =============================================================================

interface ContractData {
  id: string;
  contractNumber: string;
  tier: string;
  sponsorType: string;
  contractingParty: string;
  contractedParty: string;
  contractedDocument?: string;
  contractedAddress?: string;
  contactName: string;
  contactEmail: string;
  status: string;
  durationMonths: number;
  startsAt: string;
  endsAt: string;
  benefits: string[];
  obligations: string[];
  terms: string;
  monthlyValue?: number;
  totalValue?: number;
  paymentTerms?: string;
  signedAt?: string;
  signedByName?: string;
  autoRenew: boolean;
  notes?: string;
  sponsor: {
    id: string;
    name: string;
    slug: string;
    tier: string;
    logoLightUrl?: string;
  };
}

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const C = {
  bg: '#050505',
  bgCard: '#0a0a0c',
  bgGlass: 'rgba(255,255,255,0.03)',
  gold: '#c9a55c',
  goldLight: '#e3cc8e',
  goldDark: '#a07a35',
  goldMuted: 'rgba(201,165,92,0.15)',
  textPrimary: '#f5f1eb',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.06)',
  borderGold: 'rgba(201,165,92,0.2)',
  success: '#34d399',
  diamond: '#a78bfa',
};

const FONT = {
  serif: "'Playfair Display', Georgia, serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

const TIER_META: Record<string, { name: string; icon: string; color: string }> = {
  DIAMOND: { name: 'Diamond Partner', icon: '💎', color: '#a78bfa' },
  GOLD: { name: 'Gold Partner', icon: '🥇', color: '#f59e0b' },
  SILVER: { name: 'Silver Partner', icon: '🥈', color: '#94a3b8' },
  BRONZE: { name: 'Bronze Partner', icon: '🥉', color: '#d97706' },
};

const TYPE_LABELS: Record<string, string> = {
  BRAND: 'Marca Parceira',
  SUPPLIER: 'Fornecedor Parceiro',
  OFFICIAL_PARTNER: 'Parceiro Oficial',
  EDUCATIONAL_PARTNER: 'Parceiro Educacional',
  TECH_PARTNER: 'Parceiro de Tecnologia',
  CAMPAIGN_PARTNER: 'Parceiro de Campanha',
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Rascunho', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  ACTIVE: { label: 'Ativo', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  EXPIRED: { label: 'Expirado', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  CANCELLED: { label: 'Cancelado', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  RENEWED: { label: 'Renovado', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  .anim-up { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-up-d1 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
  .gold-text {
    background: linear-gradient(135deg, #e3cc8e 0%, #c9a55c 40%, #a07a35 70%, #c9a55c 100%);
    background-size: 200% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  @media print {
    .no-print { display: none !important; }
    body { background: white !important; color: #111 !important; }
    .contract-body { background: white !important; color: #111 !important; border-color: #ccc !important; }
    .contract-body h4 { color: #8b6914 !important; }
    .contract-body p, .contract-body span { color: #333 !important; }
    .contract-body strong { color: #111 !important; }
  }
`;

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// COMPONENT
// =============================================================================

export default function ContractViewPage() {
  const params = useParams();
  const contractNumber = params.contractNumber as string;

  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/public/sponsor-contracts/${encodeURIComponent(contractNumber)}`)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(setContract)
      .catch(() => setError('Contrato não encontrado'))
      .finally(() => setLoading(false));
  }, [contractNumber]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: `3px solid ${C.borderGold}`, borderTopColor: C.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
          <p style={{ color: C.textMuted, fontFamily: FONT.sans }}>Carregando contrato...</p>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📄</div>
          <h2 style={{ color: C.textPrimary, fontFamily: FONT.serif, fontSize: 28, marginBottom: 12 }}>Contrato não encontrado</h2>
          <p style={{ color: C.textMuted, fontSize: 15 }}>Verifique o número do contrato e tente novamente.</p>
        </div>
      </div>
    );
  }

  const tier = TIER_META[contract.tier] || TIER_META.GOLD;
  const status = STATUS_MAP[contract.status] || STATUS_MAP.ACTIVE;
  const type = TYPE_LABELS[contract.sponsorType] || contract.sponsorType;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, fontFamily: FONT.sans }}>
      <style>{GLOBAL_CSS}</style>

      {/* Ambient light */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '10%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${C.goldMuted} 0%, transparent 70%)`, filter: 'blur(100px)' }} />
      </div>

      {/* Header */}
      <header className="no-print" style={{ position: 'relative', zIndex: 10, padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
        <span style={{
          fontFamily: FONT.serif, fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px',
          background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold}, ${C.goldDark})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Bela Pro</span>
        <button onClick={() => window.print()} style={{
          padding: '8px 20px', borderRadius: 8, background: C.goldMuted,
          border: `1px solid ${C.borderGold}`, color: C.gold,
          fontFamily: FONT.sans, cursor: 'pointer', fontSize: 12, fontWeight: 600,
        }}>
          🖨️ Imprimir / PDF
        </button>
      </header>

      {/* Contract */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Status badge */}
        <div className="anim-up no-print" style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 20,
            background: status.bg, border: `1px solid ${status.color}40`,
            color: status.color, fontSize: 12, fontWeight: 700, letterSpacing: '0.5px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.color }} />
            {status.label}
          </span>
        </div>

        {/* Contract document */}
        <div className="contract-body anim-up-d1" style={{
          background: C.bgCard,
          borderRadius: 20, border: `1px solid ${C.borderGold}`,
          padding: '48px 40px', position: 'relative', overflow: 'hidden',
        }}>
          {/* Top bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 4,
            background: `linear-gradient(90deg, ${C.gold}, ${tier.color}, ${C.gold})`,
          }} />

          {/* Contract header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              fontFamily: FONT.serif, fontSize: 32, fontWeight: 800, letterSpacing: '-1px',
              background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold}, ${C.goldDark})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              marginBottom: 8,
            }}>
              Bela Pro
            </div>
            <h2 style={{ fontFamily: FONT.serif, fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
              Contrato de Parceria — {tier.icon} {tier.name}
            </h2>
            <div style={{
              display: 'inline-block', padding: '6px 16px', borderRadius: 8,
              background: C.bgGlass, border: `1px solid ${C.border}`,
              fontFamily: 'monospace', fontSize: 14, color: C.gold, fontWeight: 600,
            }}>
              Nº {contract.contractNumber}
            </div>
            <div style={{ width: 60, height: 2, background: C.gold, margin: '20px auto', opacity: 0.3 }} />
          </div>

          {/* 1. Partes */}
          <div style={{ marginBottom: 32 }}>
            <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
              1. Partes Contratantes
            </h4>
            <div style={{ background: C.bgGlass, borderRadius: 12, padding: '16px 20px', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'grid', gap: 12, fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
                <p><strong style={{ color: C.textPrimary }}>CONTRATANTE:</strong> {contract.contractingParty}</p>
                <p><strong style={{ color: C.textPrimary }}>CONTRATADA:</strong> {contract.contractedParty}
                  {contract.contractedDocument && <span> — {contract.contractedDocument}</span>}
                </p>
                <p><strong style={{ color: C.textPrimary }}>Responsável:</strong> {contract.contactName}
                  {contract.contactEmail && <span> — {contract.contactEmail}</span>}
                </p>
                {contract.contractedAddress && <p><strong style={{ color: C.textPrimary }}>Endereço:</strong> {contract.contractedAddress}</p>}
              </div>
            </div>
          </div>

          {/* 2. Objeto */}
          <div style={{ marginBottom: 32 }}>
            <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
              2. Objeto do Contrato
            </h4>
            <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.8 }}>
              O presente contrato estabelece os termos e condições da parceria entre{' '}
              <strong style={{ color: C.textPrimary }}>{contract.contractingParty}</strong> e{' '}
              <strong style={{ color: C.textPrimary }}>{contract.contractedParty}</strong>, na modalidade{' '}
              <strong style={{ color: tier.color }}>{tier.name}</strong>, tipo{' '}
              <strong style={{ color: C.textPrimary }}>{type}</strong>.
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
                  <div style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600 }}>{new Date(contract.startsAt).toLocaleDateString('pt-BR')}</div>
                </div>
                <div>
                  <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Duração</div>
                  <div style={{ color: C.gold, fontSize: 15, fontWeight: 600 }}>{contract.durationMonths} meses</div>
                </div>
                <div>
                  <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Término</div>
                  <div style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600 }}>{new Date(contract.endsAt).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            </div>
            <p style={{ color: C.textMuted, fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>
              Renovação automática: <strong style={{ color: C.textPrimary }}>{contract.autoRenew ? 'Sim' : 'Não'}</strong>
            </p>
          </div>

          {/* 4. Valores (if applicable) */}
          {(contract.monthlyValue || contract.totalValue) && (
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
                4. Valores
              </h4>
              <div style={{ background: C.bgGlass, borderRadius: 12, padding: '16px 20px', border: `1px solid ${C.border}`, display: 'grid', gap: 8, fontSize: 14 }}>
                {contract.monthlyValue != null && (
                  <p style={{ color: C.textSecondary }}><strong style={{ color: C.textPrimary }}>Valor mensal:</strong> R$ {contract.monthlyValue.toFixed(2)}</p>
                )}
                {contract.totalValue != null && (
                  <p style={{ color: C.textSecondary }}><strong style={{ color: C.textPrimary }}>Valor total:</strong> R$ {contract.totalValue.toFixed(2)}</p>
                )}
                {contract.paymentTerms && (
                  <p style={{ color: C.textSecondary }}><strong style={{ color: C.textPrimary }}>Condições:</strong> {contract.paymentTerms}</p>
                )}
              </div>
            </div>
          )}

          {/* 5. Benefícios */}
          <div style={{ marginBottom: 32 }}>
            <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
              {(contract.monthlyValue || contract.totalValue) ? '5' : '4'}. Benefícios Concedidos à Contratada
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contract.benefits.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.5 }}>{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Obrigações */}
          <div style={{ marginBottom: 32 }}>
            <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
              {(contract.monthlyValue || contract.totalValue) ? '6' : '5'}. Obrigações da Contratada
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contract.obligations.map((o, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
                  <span style={{ color: C.gold, fontSize: 14, fontWeight: 700, flexShrink: 0, width: 20, textAlign: 'center' }}>{i + 1}.</span>
                  <span style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.5 }}>{o}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Terms text */}
          {contract.terms && (
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
                Termos e Condições Gerais
              </h4>
              <div style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {contract.terms}
              </div>
            </div>
          )}

          {/* Signature */}
          {contract.signedAt && (
            <div style={{ borderTop: `1px solid ${C.borderGold}`, paddingTop: 32 }}>
              <h4 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 20 }}>
                Assinatura Digital
              </h4>
              <div style={{ background: C.bgGlass, borderRadius: 12, padding: '20px', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <span style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assinado por</span>
                    <p style={{ color: C.textPrimary, fontSize: 18, fontFamily: FONT.serif, fontStyle: 'italic', marginTop: 4 }}>{contract.signedByName}</p>
                  </div>
                  <div>
                    <span style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data da assinatura</span>
                    <p style={{ color: C.textPrimary, fontSize: 14, marginTop: 4 }}>
                      {new Date(contract.signedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {contract.notes && (
            <div style={{ marginTop: 24, padding: '14px 18px', borderRadius: 10, background: C.goldMuted, border: `1px solid ${C.borderGold}` }}>
              <p style={{ color: C.gold, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Observações</p>
              <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.6 }}>{contract.notes}</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <span style={{
            fontFamily: FONT.serif, fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px',
            background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold}, ${C.goldDark})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', opacity: 0.5,
          }}>Bela Pro</span>
          <p style={{ color: C.textMuted, fontSize: 11, marginTop: 8 }}>
            Documento gerado automaticamente pela plataforma Bela Pro — © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
