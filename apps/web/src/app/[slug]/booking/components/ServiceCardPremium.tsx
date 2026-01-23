import { Service, ThemeConfig } from '../types';
import { SPACING, RADIUS } from '../constants';
import { getImageUrl } from '@/lib/utils';

interface ServiceCardPremiumProps {
  service: Service;
  theme: ThemeConfig;
  selected: boolean;
  onSelect: () => void;
}

// Ícone SVG profissional de tesoura
function ScissorsIcon({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3"/>
      <circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/>
      <line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>
  );
}

// Ícone de serviço genérico (mãos/spa)
function ServiceIcon({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M12 8v4"/>
      <path d="M12 16h.01"/>
    </svg>
  );
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export function ServiceCardPremium({ service, theme, selected, onSelect }: ServiceCardPremiumProps) {
  const { colors } = theme;
  const hasImage = !!service.imageUrl;

  // Gera iniciais do serviço para fallback
  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div
      onClick={onSelect}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: colors.surface,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: selected 
          ? `2px solid ${colors.primary}` 
          : '2px solid transparent',
        boxShadow: selected
          ? `0 4px 20px ${colors.primary}30`
          : '0 2px 8px rgba(0,0,0,0.08)',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {/* Badge (se houver) */}
      {service.badgeText && (
        <div
          style={{
            position: 'absolute',
            top: SPACING.sm,
            right: SPACING.sm,
            background: colors.accent,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 700,
            padding: `${SPACING.xs}px ${SPACING.sm}px`,
            borderRadius: RADIUS.full,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {service.badgeText}
        </div>
      )}

      {/* Imagem ou Placeholder profissional */}
      {hasImage ? (
        <div
          style={{
            width: '100%',
            height: 140,
            overflow: 'hidden',
          }}
        >
          <img
            src={getImageUrl(service.imageUrl)}
            alt={service.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            height: 100,
            background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {/* Ícone SVG profissional */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: `${colors.primary}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${colors.primary}30`,
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: colors.primary,
                letterSpacing: -1,
              }}
            >
              {getInitials(service.name)}
            </span>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div style={{ padding: SPACING.md }}>
        {/* Categoria (se houver) */}
        {service.categoryTag && (
          <span
            style={{
              display: 'inline-block',
              fontSize: 10,
              fontWeight: 600,
              color: colors.primary,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: SPACING.xs,
            }}
          >
            {service.categoryTag}
          </span>
        )}

        {/* Nome */}
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: colors.text,
            marginBottom: SPACING.xs,
          }}
        >
          {service.name}
        </h3>

        {/* Descrição */}
        {service.description && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: colors.textSecondary,
              lineHeight: 1.4,
              marginBottom: SPACING.sm,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {service.description}
          </p>
        )}

        {/* Preço e Duração */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: SPACING.sm,
            paddingTop: SPACING.sm,
            borderTop: `1px solid ${colors.primary}15`,
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: colors.primary,
            }}
          >
            {formatPrice(service.priceCents)}
          </span>
          <span
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {formatDuration(service.durationMinutes)}
          </span>
        </div>
      </div>

      {/* Indicador de seleção */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: SPACING.sm,
            left: SPACING.sm,
            width: 24,
            height: 24,
            borderRadius: RADIUS.full,
            background: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: 14,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          ✓
        </div>
      )}
    </div>
  );
}
