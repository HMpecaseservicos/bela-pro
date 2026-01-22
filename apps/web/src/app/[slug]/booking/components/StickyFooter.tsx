'use client';

import { Service, BookingStep } from '../types';
import { CTA_LABELS, COLORS, RADIUS } from '../constants';
import { formatPrice, getServiceEmoji } from '../utils';

interface StickyFooterProps {
  selectedService: Service | null;
  currentStep: BookingStep;
  canProceed: boolean;
  loading: boolean;
  primaryColor?: string;
  onContinue: () => void;
}

export function StickyFooter({
  selectedService,
  currentStep,
  canProceed,
  loading,
  primaryColor = COLORS.primaryFallback,
  onContinue,
}: StickyFooterProps) {
  // Não mostrar na etapa 1 até selecionar um serviço
  // Na etapa 4, o botão está no formulário
  if (!selectedService || currentStep === 4) {
    return null;
  }

  const emoji = getServiceEmoji(selectedService.name);
  const ctaLabel = CTA_LABELS[currentStep] || 'Continuar';
  const gradientBg = `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColorSimple(primaryColor, -40)} 100%)`;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        padding: '16px 20px',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
        zIndex: 100,
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* Info do serviço selecionado */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{emoji}</span>
            <span 
              style={{ 
                fontSize: 14, 
                fontWeight: 600, 
                color: COLORS.textPrimary,
              }}
            >
              {selectedService.name}
            </span>
          </div>
          <span 
            style={{ 
              fontSize: 16, 
              fontWeight: 700, 
              color: primaryColor,
            }}
          >
            {formatPrice(selectedService.priceCents)}
          </span>
        </div>

        {/* Botão CTA */}
        <button
          onClick={onContinue}
          disabled={!canProceed || loading}
          style={{
            width: '100%',
            padding: 16,
            background: canProceed ? gradientBg : COLORS.border,
            color: canProceed ? 'white' : COLORS.textMuted,
            border: 'none',
            borderRadius: RADIUS.md,
            fontSize: 16,
            fontWeight: 600,
            cursor: canProceed && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            opacity: loading ? 0.7 : 1,
            boxShadow: canProceed ? `0 4px 15px ${primaryColor}44` : 'none',
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span 
                className="spinner-small"
                style={{
                  width: 18,
                  height: 18,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              Carregando...
            </span>
          ) : (
            ctaLabel
          )}
        </button>
      </div>
    </div>
  );
}

// Helper inline
function adjustColorSimple(hex: string, amount: number): string {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
