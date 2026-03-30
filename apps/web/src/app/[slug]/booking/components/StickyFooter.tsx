'use client';

import { Service, BookingStep, CartItem } from '../types';
import { CTA_LABELS, COLORS, RADIUS } from '../constants';
import { formatPrice, getServiceEmoji } from '../utils';

interface StickyFooterProps {
  selectedServices: Service[];
  totalDuration: number;
  totalPrice: number;
  currentStep: BookingStep;
  canProceed: boolean;
  loading: boolean;
  primaryColor?: string;
  onContinue: () => void;
  // LOJA UNIFICADA
  cart?: CartItem[];
  totalCombinedPrice?: number;
  cartItemCount?: number;
}

export function StickyFooter({
  selectedServices,
  totalDuration,
  totalPrice,
  currentStep,
  canProceed,
  loading,
  primaryColor = COLORS.primaryFallback,
  onContinue,
  // LOJA UNIFICADA
  cart = [],
  totalCombinedPrice,
  cartItemCount = 0,
}: StickyFooterProps) {
  const hasServices = selectedServices.length > 0;
  const hasProducts = cart.length > 0;
  
  // Não mostrar na etapa 1 (botão inline agora) ou na etapa 4
  if (!hasServices && !hasProducts) return null;
  if (currentStep === 1 || currentStep === 4) return null;

  const emoji = hasServices 
    ? (selectedServices.length === 1 ? getServiceEmoji(selectedServices[0].name) : '✨')
    : '🛍️';
  const serviceLabel = hasServices
    ? (selectedServices.length === 1 
        ? selectedServices[0].name 
        : `${selectedServices.length} serviços`)
    : `${cartItemCount} produto${cartItemCount > 1 ? 's' : ''}`;
  const displayPrice = totalCombinedPrice !== undefined ? totalCombinedPrice : totalPrice;
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
            <div>
              <span 
                style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: COLORS.textPrimary,
                }}
              >
                {serviceLabel}
              </span>
              <span style={{ fontSize: 12, color: COLORS.textSecondary, marginLeft: 8 }}>
                {hasServices ? `• ${totalDuration} min` : ''}
                {hasServices && hasProducts ? ` + ${cartItemCount} produto${cartItemCount > 1 ? 's' : ''}` : ''}
              </span>
            </div>
          </div>
          <span 
            style={{ 
              fontSize: 16, 
              fontWeight: 700, 
              color: primaryColor,
            }}
          >
            {formatPrice(displayPrice)}
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
