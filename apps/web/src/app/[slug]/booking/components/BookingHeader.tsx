'use client';

import { Workspace } from '../types';
import { COLORS, RADIUS } from '../constants';
import { getInitials } from '../utils';

interface BookingHeaderProps {
  workspace: Workspace;
  primaryColor?: string;
}

export function BookingHeader({ workspace, primaryColor = COLORS.primaryFallback }: BookingHeaderProps) {
  const gradientBg = `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColorSimple(primaryColor, -40)} 100%)`;
  const displayName = workspace.brandName || workspace.name;
  const address = workspace.profile?.addressLine;

  return (
    <header
      style={{
        background: gradientBg,
        padding: '24px 20px 60px',
        color: 'white',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* Logo + Nome */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 20,
          }}
        >
          {/* Avatar/Logo */}
          {workspace.logoUrl ? (
            <img
              src={workspace.logoUrl}
              alt={displayName}
              style={{
                width: 56,
                height: 56,
                borderRadius: RADIUS.md,
                objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: RADIUS.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700,
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            >
              {getInitials(displayName)}
            </div>
          )}

          {/* Textos */}
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              {displayName}
            </h1>
            {address && (
              <p
                style={{
                  fontSize: 14,
                  opacity: 0.9,
                  margin: '4px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>📍</span>
                {address}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
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
