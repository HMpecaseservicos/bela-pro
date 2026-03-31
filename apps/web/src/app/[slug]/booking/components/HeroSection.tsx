// ULTRA PREMIUM UPGRADE — HeroSection com CTAs de ação e link de login
'use client';

import { Workspace, ThemeConfig } from '../types';
import { SPACING, RADIUS } from '../constants';
import { getImageUrl } from '@/lib/utils';

interface HeroSectionProps {
  workspace: Workspace;
  theme: ThemeConfig;
  // ULTRA PREMIUM UPGRADE: callbacks de ação
  shopEnabled?: boolean;
  businessMode?: 'BOOKING' | 'SHOP' | 'HYBRID';
  onAction?: (tab: 'services' | 'shop') => void;
  onLoginClick?: () => void;
  clientName?: string | null;
  ctaText?: string | null;
}

export function HeroSection({ workspace, theme, shopEnabled, businessMode = 'BOOKING', onAction, onLoginClick, clientName, ctaText }: HeroSectionProps) {
  const { colors } = theme;
  const hasCover = !!workspace.coverImageUrl;
  const hasLogo = !!workspace.logoUrl;
  
  const brandName = workspace.brandName || workspace.name;
  const welcomeText = workspace.welcomeText || 'Agende seu horário';
  const description = workspace.description;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: hasCover ? 340 : 280,
        background: hasCover 
          ? `url(${getImageUrl(workspace.coverImageUrl)}) center/cover no-repeat`
          : colors.gradient,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${SPACING.xl}px ${SPACING.lg}px 52px`,
        overflow: 'hidden',
      }}
    >
      {/* Overlay escuro para melhor legibilidade */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: hasCover 
            ? 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 100%)',
          zIndex: 1,
        }}
      />

      {/* Conteúdo */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: 420,
          width: '100%',
        }}
      >
        {/* Logo */}
        {hasLogo ? (
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: RADIUS.full,
              overflow: 'hidden',
              marginBottom: 16,
              boxShadow: '0 6px 28px rgba(0,0,0,0.35)',
              border: '3px solid rgba(255,255,255,0.95)',
              background: '#fff',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getImageUrl(workspace.logoUrl)}
              alt={brandName}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: RADIUS.full,
              background: 'rgba(255,255,255,0.97)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 6px 28px rgba(0,0,0,0.35)',
              fontSize: 36,
              fontWeight: 800,
              color: colors.primary,
              letterSpacing: -1,
            }}
          >
            {brandName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Nome do estabelecimento */}
        <h1
          style={{
            margin: '0 0 6px',
            fontSize: 28,
            fontWeight: 800,
            color: '#FFFFFF',
            textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            letterSpacing: -0.5,
            lineHeight: 1.2,
          }}
        >
          {brandName}
        </h1>

        {/* Texto de boas-vindas */}
        <p
          style={{
            margin: '0 0 4px',
            fontSize: 16,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.92)',
            textShadow: '0 1px 6px rgba(0,0,0,0.35)',
          }}
        >
          {welcomeText}
        </p>

        {/* Descrição (se houver) */}
        {description && (
          <p
            style={{
              margin: '0 0 4px',
              fontSize: 14,
              color: 'rgba(255,255,255,0.75)',
              textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              lineHeight: 1.5,
              maxWidth: 320,
            }}
          >
            {description}
          </p>
        )}

        {/* Endereço (se houver) */}
        {workspace.profile?.addressLine && (
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>{workspace.profile.addressLine}</span>
          </div>
        )}

        {/* CTAs compactos + Galeria */}
        {onAction && (
          <div style={{
            display: 'flex',
            gap: 8,
            marginTop: 16,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {businessMode !== 'SHOP' && (
            <button
              onClick={() => onAction('services')}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.95)',
                border: 'none',
                borderRadius: 50,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
                {ctaText || 'Agendar'}
              </span>
            </button>
            )}

            {businessMode !== 'BOOKING' && (
              <button
                onClick={() => onAction('shop')}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.95)',
                  border: 'none',
                  borderRadius: 50,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
                  Produtos
                </span>
              </button>
            )}
          </div>
        )}

        {/* ULTRA PREMIUM UPGRADE: Link "Já sou cliente" / Saudação */}
        {onLoginClick && (
          <div style={{ marginTop: 16 }}>
            {clientName ? (
              <span style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
                Olá, {clientName.split(' ')[0]} ✨
              </span>
            ) : (
              <button
                onClick={onLoginClick}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 12,
                  padding: '10px 20px',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
                </svg>
                Já sou cliente → Entrar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
