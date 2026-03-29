'use client';

import { Service, ThemeConfig } from '../types';
import { getImageUrl } from '@/lib/utils';

interface ServiceCardCompactProps {
  service: Service;
  isSelected: boolean;
  onClick: () => void;
  theme?: ThemeConfig;
}

export function ServiceCardCompact({
  service,
  isSelected,
  onClick,
  theme,
}: ServiceCardCompactProps) {
  const primaryColor = theme?.colors.primary || '#a07a45';
  const surfaceColor = theme?.colors.surface || '#fff';
  const textColor = theme?.colors.text || '#2f2a24';
  const textSecondary = theme?.colors.textSecondary || '#6e6256';
  const hasImage = !!service.imageUrl;

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}` : `${h}h`;
  };

  // Gera iniciais do serviço para fallback
  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        marginBottom: 12,
        borderRadius: 16,
        border: isSelected
          ? `2px solid ${primaryColor}`
          : `1px solid ${textSecondary}15`,
        background: surfaceColor,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isSelected
          ? `0 8px 24px ${primaryColor}25`
          : '0 2px 8px rgba(0,0,0,0.06)',
        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
        overflow: 'hidden',
      }}
    >
      {/* Imagem ou Placeholder */}
      <div
        style={{
          width: 100,
          minHeight: 100,
          flexShrink: 0,
          position: 'relative',
          background: hasImage 
            ? 'transparent'
            : `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}08 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {hasImage ? (
          <img
            src={getImageUrl(service.imageUrl)}
            alt={service.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute',
              inset: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: `${primaryColor}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${primaryColor}30`,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: primaryColor,
                letterSpacing: -0.5,
              }}
            >
              {getInitials(service.name)}
            </span>
          </div>
        )}

        {/* Checkbox overlay */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 24,
            height: 24,
            borderRadius: 8,
            border: isSelected
              ? `2px solid ${primaryColor}`
              : `2px solid rgba(255,255,255,0.9)`,
            background: isSelected ? primaryColor : 'rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          {isSelected && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: 15,
              color: textColor,
              lineHeight: 1.3,
            }}
          >
            {service.name}
          </span>
        </div>

        {service.description && (
          <p
            style={{
              fontSize: 13,
              color: textSecondary,
              margin: '4px 0 8px',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {service.description}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: primaryColor,
            }}
          >
            {formatPrice(service.priceCents)}
          </span>
          <span
            style={{
              fontSize: 12,
              color: textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: `${textSecondary}10`,
              padding: '4px 8px',
              borderRadius: 6,
            }}
          >
            ⏱️ {formatDuration(service.durationMinutes)}
          </span>
        </div>
      </div>
    </div>
  );
}
