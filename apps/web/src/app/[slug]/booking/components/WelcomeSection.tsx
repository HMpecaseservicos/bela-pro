'use client';

import { Workspace } from '../types';
import { DEFAULT_COPY, TRUST_BADGES, COLORS } from '../constants';

interface WelcomeSectionProps {
  workspace: Workspace;
  primaryColor?: string;
  showBadges?: boolean;
}

export function WelcomeSection({ 
  workspace, 
  primaryColor = COLORS.primaryFallback,
  showBadges = true 
}: WelcomeSectionProps) {
  // Usa campos do workspace ou defaults
  const title = workspace.welcomeText || DEFAULT_COPY.bookingTitle;
  const subtitle = workspace.description || DEFAULT_COPY.bookingSubtitle;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Título e Subtítulo */}
      <div style={{ textAlign: 'center', marginBottom: showBadges ? 20 : 0 }}>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: COLORS.textPrimary,
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 15,
            color: COLORS.textSecondary,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Badges de Confiança */}
      {showBadges && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
            marginTop: 16,
          }}
        >
          {TRUST_BADGES.map((badge, index) => (
            <TrustBadge 
              key={index} 
              icon={badge.icon} 
              text={badge.text} 
              primaryColor={primaryColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TrustBadgeProps {
  icon: string;
  text: string;
  primaryColor?: string;
}

function TrustBadge({ icon, text, primaryColor = COLORS.primaryFallback }: TrustBadgeProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        backgroundColor: `${primaryColor}08`,
        borderRadius: 20,
        fontSize: 12,
        color: COLORS.textSecondary,
      }}
    >
      <span
        style={{
          color: primaryColor,
          fontWeight: 600,
          fontSize: 11,
        }}
      >
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}
