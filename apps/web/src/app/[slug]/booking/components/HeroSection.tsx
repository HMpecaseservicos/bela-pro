// ULTRA PREMIUM UPGRADE — HeroSection com CTAs de ação e link de login
'use client';

import { useState } from 'react';
import { Workspace, ThemeConfig } from '../types';
import { SPACING, RADIUS } from '../constants';
import { getImageUrl } from '@/lib/utils';
import { GalleryLightbox, GalleryPreview } from './GalleryLightbox';

interface HeroSectionProps {
  workspace: Workspace;
  theme: ThemeConfig;
  // ULTRA PREMIUM UPGRADE: callbacks de ação
  shopEnabled?: boolean;
  onAction?: (tab: 'services' | 'shop') => void;
  onLoginClick?: () => void;
  clientName?: string | null;
}

export function HeroSection({ workspace, theme, shopEnabled, onAction, onLoginClick, clientName }: HeroSectionProps) {
  const { colors } = theme;
  const hasCover = !!workspace.coverImageUrl;
  const hasLogo = !!workspace.logoUrl;
  const hasGallery = workspace.galleryUrls && workspace.galleryUrls.length > 0;
  
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const openGallery = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };
  
  const brandName = workspace.brandName || workspace.name;
  const welcomeText = workspace.welcomeText || 'Agende seu horário';
  const description = workspace.description;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: hasCover ? 380 : 300,
        background: hasCover 
          ? `url(${getImageUrl(workspace.coverImageUrl)}) center/cover no-repeat`
          : colors.gradient,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${SPACING.xl}px ${SPACING.lg}px 60px`,
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

        {/* ULTRA PREMIUM UPGRADE: CTAs de ação */}
        {onAction && (
          <div style={{
            display: 'flex',
            gap: 10,
            marginTop: 20,
            width: '100%',
            maxWidth: 340,
          }}>
            <button
              onClick={() => onAction('services')}
              style={{
                flex: 1,
                padding: '14px 12px',
                background: 'rgba(255,255,255,0.97)',
                border: 'none',
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.15s ease',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primary}CC)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 3px 10px ${colors.primary}40`,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', letterSpacing: -0.2 }}>
                Agendar
              </span>
            </button>

            {shopEnabled && (
              <button
                onClick={() => onAction('shop')}
                style={{
                  flex: 1,
                  padding: '14px 12px',
                  background: 'rgba(255,255,255,0.97)',
                  border: 'none',
                  borderRadius: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', letterSpacing: -0.2 }}>
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

      {/* Galeria preview - Nova versão com Lightbox */}
      {hasGallery && (
        <GalleryPreview
          images={workspace.galleryUrls!}
          onOpen={openGallery}
          primaryColor={colors.primary}
        />
      )}
      
      {/* Lightbox Modal */}
      {lightboxOpen && hasGallery && (
        <GalleryLightbox
          images={workspace.galleryUrls!}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
