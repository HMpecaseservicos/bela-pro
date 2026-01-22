'use client';

import { useState } from 'react';
import { Service } from '../types';
import { COLORS, RADIUS } from '../constants';
import { formatPrice, formatDuration } from '../utils';

interface ServiceCardProps {
  service: Service;
  isSelected?: boolean;
  primaryColor?: string;
  onClick: () => void;
}

export function ServiceCard({
  service,
  isSelected = false,
  primaryColor = COLORS.primaryFallback,
  onClick,
}: ServiceCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hasImage = !!service.imageUrl;
  const initials = service.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const borderColor = isSelected
    ? primaryColor
    : isHovered
      ? `${primaryColor}66`
      : COLORS.border;

  const backgroundColor = isSelected
    ? `${primaryColor}08`
    : COLORS.surface;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      style={{
        border: `2px solid ${borderColor}`,
        borderRadius: RADIUS.lg,
        padding: 20,
        marginBottom: 12,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        backgroundColor,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 4px 12px rgba(0, 0, 0, 0.08)'
          : '0 1px 3px rgba(0, 0, 0, 0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Indicador de seleção */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ✓
        </div>
      )}

      {/* Conteúdo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, paddingRight: isSelected ? 40 : 16 }}>
          {/* Imagem/Iniciais + Nome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            {hasImage ? (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: RADIUS.md,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <img
                  src={service.imageUrl!}
                  alt={service.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: RADIUS.md,
                  background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}10 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: `1px solid ${primaryColor}20`,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: primaryColor,
                    letterSpacing: -0.5,
                  }}
                >
                  {initials}
                </span>
              </div>
            )}
            <h3
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: COLORS.textPrimary,
                margin: 0,
              }}
            >
              {service.name}
            </h3>
          </div>

          {/* Descrição */}
          {service.description && (
            <p
              style={{
                fontSize: 14,
                color: COLORS.textSecondary,
                margin: '0 0 10px',
                lineHeight: 1.4,
              }}
            >
              {service.description}
            </p>
          )}

          {/* Duração */}
          <span
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
              display: 'inline-flex',
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

        {/* Preço */}
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: primaryColor,
            whiteSpace: 'nowrap',
          }}
        >
          {formatPrice(service.priceCents)}
        </span>
      </div>
    </div>
  );
}

// Versão compacta para mobile
interface ServiceCardCompactProps {
  service: Service;
  isSelected?: boolean;
  primaryColor?: string;
  onClick: () => void;
}

export function ServiceCardCompact({
  service,
  isSelected = false,
  primaryColor = COLORS.primaryFallback,
  onClick,
}: ServiceCardCompactProps) {
  const initials = service.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        border: `2px solid ${isSelected ? primaryColor : COLORS.border}`,
        borderRadius: RADIUS.md,
        marginBottom: 8,
        cursor: 'pointer',
        backgroundColor: isSelected ? `${primaryColor}08` : COLORS.surface,
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isSelected ? (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: RADIUS.sm,
              backgroundColor: primaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 12,
            }}
          >
            ✓
          </div>
        ) : (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: RADIUS.sm,
              background: `${primaryColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: primaryColor }}>{initials}</span>
          </div>
        )}
        <div>
          <span style={{ fontWeight: 600, color: COLORS.textPrimary }}>{service.name}</span>
          <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 8 }}>
            {formatDuration(service.durationMinutes)}
          </span>
        </div>
      </div>
      <span style={{ fontWeight: 700, color: primaryColor }}>
        {formatPrice(service.priceCents)}
      </span>
    </div>
  );
}
