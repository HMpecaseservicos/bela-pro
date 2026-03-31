'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

// Hooks
import { useBooking } from './hooks/useBooking';

// Components
import {
  BookingHeader,
  WelcomeSection,
  ProgressBar,
  DatePicker,
  TimeSlots,
  ClientForm,
  ConfirmationScreen,
  PixPaymentScreen,
  Spinner,
  skeletonStyles,
  HeroSection,
  GalleryLightbox,
} from './components';
import { ServiceListPro } from './components/ServiceListPro';

// Constants
import { COLORS, API_URL } from './constants';
import { formatDateFull, formatPrice } from './utils';
import { getImageUrl } from '@/lib/utils';

// ============================================
// TIPOS LOCAIS
// ============================================
type ActiveTab = 'home' | 'services' | 'shop' | 'account';

interface SponsorBrief { id: string; name: string; tier?: string; logoLightUrl?: string; logoDarkUrl?: string; websiteUrl?: string; ctaUrl?: string; ctaLabel?: string; isFeatured?: boolean; description?: string; }

// ============================================
// CONSTANTES DE ESTILO
// ============================================
const BOTTOM_NAV_HEIGHT = 64;
const SAFE_AREA_BOTTOM = 20;

// ============================================
// SVG Icons para BottomNav (outline / filled)
// ============================================
const NavIcons = {
  home: (active: boolean, color: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={active ? color : '#9ca3af'} strokeWidth={active ? 1.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      {!active && <path d="M9 21V12h6v9" />}
    </svg>
  ),
  services: (active: boolean, color: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={active ? color : '#9ca3af'} strokeWidth={active ? 1.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      {active && <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />}
    </svg>
  ),
  shop: (active: boolean, color: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={active ? color : '#9ca3af'} strokeWidth={active ? 1.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  account: (active: boolean, color: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={active ? color : '#9ca3af'} strokeWidth={active ? 1.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  ),
  gallery: (_active: boolean, _color: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={_active ? _color : '#9ca3af'} strokeWidth={_active ? 1.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  ),
};

// ============================================
// COMPONENTE: Bottom Navigation Bar
// ============================================
function BottomNav({
  activeTab,
  onTabChange,
  shopEnabled,
  cartItemCount,
  primaryColor,
  hasGallery,
  onGalleryOpen,
}: {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  shopEnabled: boolean;
  cartItemCount: number;
  primaryColor: string;
  hasGallery?: boolean;
  onGalleryOpen?: () => void;
}) {
  const tabs: { id: string; label: string; show: boolean; isGallery?: boolean }[] = [
    { id: 'home', label: 'Início', show: true },
    { id: 'services', label: 'Agendar', show: true },
    { id: 'gallery', label: 'Galeria', show: !!hasGallery, isGallery: true },
    { id: 'shop', label: 'Loja', show: shopEnabled },
    { id: 'account', label: 'Conta', show: true },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  return (
    <nav
      aria-label="Navegação principal"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: BOTTOM_NAV_HEIGHT + SAFE_AREA_BOTTOM,
        paddingBottom: SAFE_AREA_BOTTOM,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 1000,
        boxShadow: '0 -1px 20px rgba(0,0,0,0.05)',
      }}
    >
      {visibleTabs.map(tab => {
        const isActive = !tab.isGallery && activeTab === tab.id;
        const renderIcon = NavIcons[tab.id as keyof typeof NavIcons];
        return (
          <button
            key={tab.id}
            onClick={() => tab.isGallery ? onGalleryOpen?.() : onTabChange(tab.id as ActiveTab)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              height: BOTTOM_NAV_HEIGHT,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Indicador ativo */}
            <div style={{
              position: 'absolute',
              top: 0,
              width: 24,
              height: 2.5,
              borderRadius: '0 0 2px 2px',
              background: primaryColor,
              opacity: isActive ? 1 : 0,
              transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
            <span style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s ease',
              transform: isActive ? 'scale(1.08)' : 'scale(1)',
            }}>
              {renderIcon(isActive, primaryColor)}
              {/* Badge do carrinho */}
              {tab.id === 'shop' && cartItemCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -5,
                  right: -9,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  border: '2px solid #fff',
                  lineHeight: 1,
                  animation: 'badgePop 0.3s ease',
                }}>
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? primaryColor : '#9ca3af',
              letterSpacing: 0.1,
              transition: 'color 0.2s ease',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ============================================
// COMPONENTE: Seção de Início (Home)
// ============================================
function HomeSection({
  workspace,
  services,
  primaryColor,
  theme,
  shopEnabled,
  onNavigate,
  hideQuickActions,
}: {
  workspace: any;
  services: any[];
  primaryColor: string;
  theme: any;
  shopEnabled: boolean;
  onNavigate: (tab: ActiveTab) => void;
  hideQuickActions?: boolean;
}) {
  const popularServices = services.filter(s => s.itemType !== 'PRODUCT').slice(0, 3);
  const featuredProducts = services.filter(s => s.itemType === 'PRODUCT').slice(0, 4);
  
  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Quick Actions — oculto quando HeroSection já mostra CTAs */}
      {!hideQuickActions && <div style={{
        display: 'grid',
        gridTemplateColumns: shopEnabled ? '1fr 1fr' : '1fr',
        gap: 12,
        marginBottom: 32,
      }}>
        <button
          onClick={() => onNavigate('services')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '20px',
            background: `linear-gradient(135deg, ${primaryColor}0D 0%, ${primaryColor}05 100%)`,
            border: `1.5px solid ${primaryColor}18`,
            borderRadius: 18,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${primaryColor}30`,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, letterSpacing: -0.2 }}>
              Agendar
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.3 }}>
              Escolha serviço e horário
            </p>
          </div>
        </button>
        
        {shopEnabled && (
          <button
            onClick={() => onNavigate('shop')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '20px',
              background: 'linear-gradient(135deg, #ecfdf50D 0%, #ecfdf505 100%)',
              border: '1.5px solid #10b98118',
              borderRadius: 18,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, letterSpacing: -0.2 }}>
                Loja
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.3 }}>
                Produtos disponíveis
              </p>
            </div>
          </button>
        )}
      </div>}

      {/* Serviços populares */}
      {popularServices.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: COLORS.textPrimary, letterSpacing: -0.3 }}>
              Serviços em destaque
            </h3>
            <button
              onClick={() => onNavigate('services')}
              style={{ background: 'none', border: 'none', color: primaryColor, fontSize: 13, fontWeight: 600, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
            >
              Ver todos →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {popularServices.map(service => (
              <button
                key={service.id}
                onClick={() => onNavigate('services')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #f0f1f3',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  textAlign: 'left',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  background: `${primaryColor}0A`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {service.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: COLORS.textSecondary }}>
                    {service.durationMinutes} min
                  </p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: primaryColor, flexShrink: 0 }}>
                  {formatPrice(service.priceCents)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Produtos em destaque */}
      {shopEnabled && featuredProducts.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: COLORS.textPrimary, letterSpacing: -0.3 }}>
              Produtos
            </h3>
            <button
              onClick={() => onNavigate('shop')}
              style={{ background: 'none', border: 'none', color: primaryColor, fontSize: 13, fontWeight: 600, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
            >
              Ver todos →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {featuredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => onNavigate('shop')}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  border: '1px solid #f0f1f3',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  textAlign: 'left',
                  padding: 0,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {product.imageUrl ? (
                  <div style={{ width: '100%', height: 110, background: '#f9fafb', position: 'relative', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getImageUrl(product.imageUrl)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: '100%', height: 90, background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </div>
                )}
                <div style={{ padding: '10px 12px 12px' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product.name}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 800, color: '#059669' }}>
                    {formatPrice(product.priceCents)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE: Cart Panel (Slide-up)
// ============================================
function CartPanel({
  cart,
  totalCartPrice,
  primaryColor,
  onRemove,
  onUpdateQty,
  onCheckout,
  onClose,
}: {
  cart: any[];
  totalCartPrice: number;
  primaryColor: string;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onCheckout: () => void;
  onClose: () => void;
}) {
  if (cart.length === 0) return null;

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 1100,
          animation: 'fadeIn 0.2s ease',
          WebkitTapHighlightColor: 'transparent',
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '80vh',
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 20px 16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: COLORS.textPrimary, letterSpacing: -0.3 }}>
              Meu Carrinho
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: COLORS.textSecondary }}>
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar carrinho"
            style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid #e5e7eb',
              background: '#fafafa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: COLORS.textSecondary, WebkitTapHighlightColor: 'transparent',
            }}
          >
            ✕
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#f3f4f6', marginInline: 20 }} />

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px', WebkitOverflowScrolling: 'touch' }}>
          {cart.map((item, idx) => (
            <div key={item.service.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '16px 0',
              borderBottom: idx < cart.length - 1 ? '1px solid #f5f5f5' : 'none',
            }}>
              {/* Image */}
              <div style={{
                width: 60,
                height: 60,
                borderRadius: 14,
                overflow: 'hidden',
                background: '#f9fafb',
                flexShrink: 0,
                border: '1px solid #f0f0f0',
              }}>
                {item.service.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getImageUrl(item.service.imageUrl)} alt={item.service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.service.name}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: COLORS.textSecondary }}>
                  {formatPrice(item.service.priceCents)} un.
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: primaryColor }}>
                  {formatPrice(item.service.priceCents * item.quantity)}
                </p>
              </div>

              {/* Qty controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, background: '#f9fafb', borderRadius: 10, border: '1px solid #f0f1f3', overflow: 'hidden' }}>
                <button
                  onClick={() => item.quantity <= 1 ? onRemove(item.service.id) : onUpdateQty(item.service.id, item.quantity - 1)}
                  aria-label={item.quantity <= 1 ? 'Remover item' : 'Diminuir quantidade'}
                  style={{
                    width: 34, height: 34, border: 'none',
                    background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: item.quantity <= 1 ? '#ef4444' : COLORS.textPrimary,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {item.quantity <= 1 ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  ) : '−'}
                </button>
                <span style={{ width: 32, textAlign: 'center', fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQty(item.service.id, item.quantity + 1)}
                  aria-label="Aumentar quantidade"
                  style={{
                    width: 34, height: 34, border: 'none',
                    background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: primaryColor,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          paddingBottom: 16 + SAFE_AREA_BOTTOM,
          borderTop: '1px solid #f0f1f3',
          background: '#fafafa',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.textSecondary }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: COLORS.textPrimary, letterSpacing: -0.5 }}>{formatPrice(totalCartPrice)}</span>
          </div>
          <button
            onClick={onCheckout}
            style={{
              width: '100%',
              padding: '16px',
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}DD)`,
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              boxShadow: `0 4px 16px ${primaryColor}40`,
              letterSpacing: -0.2,
            }}
          >
            Finalizar Pedido →
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================
// COMPONENTE: Account Section (Login + Portal inline)
// ============================================
function AccountSection({
  slug,
  primaryColor,
  clientSession,
  onLogout,
  onLogin,
}: {
  slug: string;
  primaryColor: string;
  clientSession?: { name: string; phone: string } | null;
  onLogout?: () => void;
  onLogin?: (data: { name: string; phone: string }) => void;
}) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [clientName, setClientName] = useState('');
  const [activePortalTab, setActivePortalTab] = useState<'appointments' | 'orders'>('appointments');

  // Auto-login quando houver sessão ativa
  const sessionApplied = useRef(false);
  useEffect(() => {
    if (clientSession && !loggedIn && !sessionApplied.current) {
      sessionApplied.current = true;
      const cleaned = clientSession.phone.replace(/\D/g, '');
      setPhone(cleaned);
      setClientName(clientSession.name);
      // Buscar dados automaticamente
      (async () => {
        setLoading(true);
        try {
          const [aptsRes, ordersRes] = await Promise.all([
            fetch(`${API_URL}/public-booking/appointments?phone=${encodeURIComponent(cleaned)}&slug=${encodeURIComponent(slug)}`),
            fetch(`${API_URL}/public-booking/orders?phone=${encodeURIComponent(cleaned)}&slug=${encodeURIComponent(slug)}`),
          ]);
          const aptsData = aptsRes.ok ? await aptsRes.json() : [];
          const ordersData = ordersRes.ok ? await ordersRes.json() : [];
          const apts = Array.isArray(aptsData) ? aptsData : [];
          const ords = Array.isArray(ordersData) ? ordersData : [];
          if (apts.length > 0 || ords.length > 0) {
            setAppointments(apts);
            setOrders(ords);
            if (apts.length > 0 && apts[0].client?.name) setClientName(apts[0].client.name);
            setLoggedIn(true);
            setActivePortalTab(apts.length > 0 ? 'appointments' : 'orders');
          }
        } catch { /* silent */ }
        setLoading(false);
      })();
    }
  }, [clientSession, loggedIn, slug]);

  const formatPhoneInput = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  };

  const handleLogin = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('Digite um telefone válido com DDD');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [aptsRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/public-booking/appointments?phone=${encodeURIComponent(cleaned)}&slug=${encodeURIComponent(slug)}`),
        fetch(`${API_URL}/public-booking/orders?phone=${encodeURIComponent(cleaned)}&slug=${encodeURIComponent(slug)}`),
      ]);

      const aptsData = aptsRes.ok ? await aptsRes.json() : [];
      const ordersData = ordersRes.ok ? await ordersRes.json() : [];

      const apts = Array.isArray(aptsData) ? aptsData : [];
      const ords = Array.isArray(ordersData) ? ordersData : [];

      if (apts.length === 0 && ords.length === 0) {
        setError('Nenhum registro encontrado para este número');
        setLoading(false);
        return;
      }

      setAppointments(apts);
      setOrders(ords);
      if (apts.length > 0 && apts[0].client?.name) {
        setClientName(apts[0].client.name);
      }
      setLoggedIn(true);
      setActivePortalTab(apts.length > 0 ? 'appointments' : 'orders');
      // Persistir sessão
      const loginName = (apts.length > 0 && apts[0].client?.name) ? apts[0].client.name : cleaned;
      onLogin?.({ name: loginName, phone: cleaned });
    } catch {
      setError('Não foi possível conectar. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setAppointments([]);
    setOrders([]);
    setClientName('');
    setPhone('');
    setError(null);
    sessionApplied.current = false;
    if (onLogout) onLogout();
  };

  const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
    PENDING: { label: 'Pendente', bg: '#fef9c3', color: '#854d0e', icon: '○' },
    PENDING_PAYMENT: { label: 'Aguardando pgto', bg: '#ffedd5', color: '#9a3412', icon: '$' },
    CONFIRMED: { label: 'Confirmado', bg: '#dbeafe', color: '#1d4ed8', icon: '✓' },
    COMPLETED: { label: 'Concluído', bg: '#dcfce7', color: '#166534', icon: '✓' },
    CANCELLED: { label: 'Cancelado', bg: '#fef2f2', color: '#b91c1c', icon: '✕' },
    NO_SHOW: { label: 'Não compareceu', bg: '#f3f4f6', color: '#4b5563', icon: '—' },
    PREPARING: { label: 'Em preparo', bg: '#ede9fe', color: '#6d28d9', icon: '◦' },
    READY: { label: 'Pronto p/ retirada', bg: '#cffafe', color: '#0e7490', icon: '✓' },
    DELIVERED: { label: 'Entregue', bg: '#dcfce7', color: '#166534', icon: '✓' },
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const phoneValid = phone.replace(/\D/g, '').length >= 10;

  // ---- Login screen ----
  if (!loggedIn) {
    return (
      <div style={{ padding: '8px 0 24px' }}>
        {/* Ilustração */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${primaryColor}12 0%, ${primaryColor}06 100%)`,
            border: `1.5px solid ${primaryColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 1 0-16 0" />
            </svg>
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: COLORS.textPrimary, letterSpacing: -0.5 }}>
            Área do Cliente
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.5, maxWidth: 280, marginInline: 'auto' }}>
            Consulte seus agendamentos e pedidos com o telefone cadastrado
          </p>
        </div>

        {/* Form */}
        <div style={{
          background: '#fff',
          borderRadius: 20,
          padding: '28px 24px',
          border: '1px solid #f0f1f3',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8, letterSpacing: 0.2 }}>
            Seu telefone
          </label>
          <div style={{ position: 'relative', marginBottom: error ? 12 : 20 }}>
            <div style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 14, color: COLORS.textSecondary, pointerEvents: 'none',
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>🇧🇷</span>
              <span style={{ fontWeight: 500, fontSize: 15 }}>+55</span>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(formatPhoneInput(e.target.value)); setError(null); }}
              placeholder="(11) 99999-9999"
              onKeyDown={e => e.key === 'Enter' && phoneValid && handleLogin()}
              autoComplete="tel"
              style={{
                width: '100%',
                padding: '16px 16px 16px 80px',
                border: `2px solid ${error ? '#fca5a5' : '#e5e7eb'}`,
                borderRadius: 14,
                fontSize: 17,
                fontWeight: 500,
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                background: '#fafafa',
                letterSpacing: 0.5,
              }}
              onFocus={e => { e.target.style.borderColor = primaryColor; e.target.style.background = '#fff'; e.target.style.boxShadow = `0 0 0 3px ${primaryColor}12`; }}
              onBlur={e => { e.target.style.borderColor = error ? '#fca5a5' : '#e5e7eb'; e.target.style.background = '#fafafa'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '11px 14px',
              borderRadius: 12,
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 500,
              border: '1px solid #fecaca',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !phoneValid}
            style={{
              width: '100%',
              padding: '16px',
              background: phoneValid ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}DD)` : '#e5e7eb',
              color: phoneValid ? '#fff' : '#9ca3af',
              border: 'none',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              cursor: loading || !phoneValid ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.25s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: phoneValid ? `0 4px 14px ${primaryColor}30` : 'none',
              letterSpacing: -0.2,
            }}
          >
            {loading ? (
              <>
                <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                Consultando...
              </>
            ) : 'Acessar minha conta'}
          </button>
        </div>

        {/* Privacy hint */}
        <p style={{ textAlign: 'center', fontSize: 11, color: COLORS.textMuted, marginTop: 16, lineHeight: 1.5 }}>
          Seus dados são consultados de forma segura e não são compartilhados.
        </p>
      </div>
    );
  }

  // ---- Portal do cliente ----
  return (
    <div style={{ padding: '4px 0 24px' }}>
      {/* Perfil */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '18px 20px',
        background: `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}03 100%)`,
        borderRadius: 18,
        border: `1px solid ${primaryColor}10`,
        marginBottom: 24,
      }}>
        <div style={{
          width: 50,
          height: 50,
          borderRadius: 15,
          background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}10 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 800,
          color: primaryColor,
          flexShrink: 0,
        }}>
          {clientName ? clientName.charAt(0).toUpperCase() : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clientName || 'Cliente'}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: COLORS.textSecondary }}>
            {phone}
          </p>
        </div>
        <button
          onClick={handleLogout}
          aria-label="Sair"
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: 12,
            color: COLORS.textSecondary,
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Sair
        </button>
      </div>

      {/* Portal tabs */}
      <div style={{
        display: 'flex',
        background: '#f5f5f5',
        borderRadius: 14,
        padding: 3,
        marginBottom: 24,
      }}>
        {[
          { id: 'appointments' as const, label: 'Agendamentos', count: appointments.length },
          { id: 'orders' as const, label: 'Pedidos', count: orders.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActivePortalTab(tab.id)}
            style={{
              flex: 1,
              padding: '11px 12px',
              background: activePortalTab === tab.id ? '#fff' : 'transparent',
              border: 'none',
              borderRadius: 11,
              fontSize: 14,
              fontWeight: activePortalTab === tab.id ? 700 : 500,
              color: activePortalTab === tab.id ? COLORS.textPrimary : COLORS.textSecondary,
              cursor: 'pointer',
              boxShadow: activePortalTab === tab.id ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {tab.id === 'appointments' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            )}
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                background: activePortalTab === tab.id ? `${primaryColor}15` : '#e5e7eb',
                color: activePortalTab === tab.id ? primaryColor : COLORS.textMuted,
                padding: '1px 6px',
                borderRadius: 6,
                lineHeight: '16px',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Agendamentos */}
      {activePortalTab === 'appointments' && (
        <div>
          {appointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18, background: '#f5f5f5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, margin: '0 0 6px' }}>Nenhum agendamento</p>
              <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0, lineHeight: 1.5 }}>
                Quando você agendar um serviço,<br />ele aparecerá aqui.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {appointments.map((apt: any) => {
                const status = STATUS_CONFIG[apt.status] || STATUS_CONFIG.PENDING;
                const isPast = new Date(apt.startAt) < new Date();
                const isUpcoming = ['PENDING', 'CONFIRMED', 'PENDING_PAYMENT'].includes(apt.status) && !isPast;
                return (
                  <div
                    key={apt.id}
                    style={{
                      background: '#fff',
                      borderRadius: 18,
                      border: isUpcoming ? `1.5px solid ${primaryColor}15` : '1px solid #f0f1f3',
                      padding: '18px 18px 16px',
                      opacity: isPast && !['CONFIRMED', 'PENDING'].includes(apt.status) ? 0.65 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {/* Top: service name + status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, flex: 1, lineHeight: 1.3 }}>
                        {apt.services?.map((s: any) => s.service.name).join(', ')}
                      </p>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        background: status.bg,
                        color: status.color,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        letterSpacing: 0.1,
                      }}>
                        {status.label}
                      </span>
                    </div>

                    {/* Date/time row */}
                    <div style={{
                      display: 'flex', gap: 16, fontSize: 13, color: COLORS.textSecondary,
                      padding: '10px 14px', background: '#fafafa', borderRadius: 10, marginBottom: 10,
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        {formatDate(apt.startAt)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        {formatTime(apt.startAt)}
                      </span>
                    </div>

                    {/* Price */}
                    {apt.totalPriceCents > 0 && (
                      <p style={{ margin: '0 0 0', fontSize: 15, fontWeight: 700, color: primaryColor }}>
                        {formatPrice(apt.totalPriceCents)}
                      </p>
                    )}

                    {/* Action */}
                    {isUpcoming && (
                      <a
                        href={`/${slug}/gerenciar?id=${apt.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          marginTop: 14,
                          padding: '11px 16px',
                          background: `${primaryColor}08`,
                          color: primaryColor,
                          border: `1.5px solid ${primaryColor}18`,
                          borderRadius: 12,
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: 'none',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        Gerenciar agendamento
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pedidos */}
      {activePortalTab === 'orders' && (
        <div>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18, background: '#f5f5f5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, margin: '0 0 6px' }}>Nenhum pedido</p>
              <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0, lineHeight: 1.5 }}>
                Quando você fizer uma compra,<br />o pedido aparecerá aqui.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.map((order: any, orderIdx: number) => {
                const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                return (
                  <div
                    key={order.id}
                    style={{
                      background: '#fff',
                      borderRadius: 18,
                      border: '1px solid #f0f1f3',
                      padding: '18px 18px 16px',
                    }}
                  >
                    {/* Header: date + status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: COLORS.textMuted, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                          Pedido #{orders.length - orderIdx}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: COLORS.textSecondary }}>
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        background: status.bg,
                        color: status.color,
                        whiteSpace: 'nowrap',
                        letterSpacing: 0.1,
                      }}>
                        {status.label}
                      </span>
                    </div>

                    {/* Items */}
                    <div style={{ background: '#fafafa', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                      {order.items?.map((item: any, i: number) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '6px 0',
                          borderBottom: i < (order.items?.length || 0) - 1 ? '1px solid #f0f0f0' : 'none',
                        }}>
                          <span style={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: 500 }}>
                            {item.quantity}× {item.service?.name || item.productName}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, flexShrink: 0 }}>
                            {formatPrice(item.priceCents * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary }}>Total</span>
                      <span style={{ fontSize: 17, fontWeight: 800, color: primaryColor, letterSpacing: -0.3 }}>
                        {formatPrice(order.totalCents)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE: Modal de Login/Cadastro Premium
// ULTRA PREMIUM UPGRADE
// ============================================
function LoginModal({
  slug,
  primaryColor,
  onClose,
  onLogin,
}: {
  slug: string;
  primaryColor: string;
  onClose: () => void;
  onLogin: (data: { name: string; phone: string }) => void;
}) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'phone' | 'name'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);

  const formatPhoneInput = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  };

  const phoneClean = phone.replace(/\D/g, '');
  const phoneValid = phoneClean.length >= 10;

  const handleLookup = async () => {
    if (!phoneValid) return;
    setLoading(true);
    setError(null);

    try {
      // Tenta buscar cliente existente pelos endpoints públicos
      const res = await fetch(
        `${API_URL}/public-booking/appointments?phone=${encodeURIComponent(phoneClean)}&slug=${encodeURIComponent(slug)}`
      );
      const data = res.ok ? await res.json() : [];
      const apts = Array.isArray(data) ? data : [];

      if (apts.length > 0 && apts[0].client?.name) {
        // Cliente já conhecido — login direto
        const clientName = apts[0].client.name;
        finishLogin(clientName, phoneClean);
      } else {
        // Primeiro acesso — pedir nome
        setStep('name');
      }
    } catch {
      // Erro de rede — permitir continuar com nome
      setStep('name');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitName = () => {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError('Digite seu nome completo');
      return;
    }
    finishLogin(trimmed, phoneClean);
  };

  const finishLogin = (clientName: string, clientPhone: string) => {
    if (remember) {
      try {
        localStorage.setItem(`bela-pro-client-${slug}`, JSON.stringify({
          name: clientName,
          phone: clientPhone,
          ts: Date.now(),
        }));
      } catch { /* ignore */ }
    }
    onLogin({ name: clientName, phone: clientPhone });
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 2000,
          animation: 'fadeIn 0.2s ease',
        }}
      />
      {/* Modal */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '85vh',
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        zIndex: 2100,
        animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
        </div>

        <div style={{ padding: '8px 24px 32px', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1f2937', letterSpacing: -0.5 }}>
                {step === 'phone' ? 'Entrar na sua conta' : 'Bem-vindo!'}
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: '#6b7280', lineHeight: 1.4 }}>
                {step === 'phone'
                  ? 'Acesse seus agendamentos e pedidos'
                  : 'Precisamos do seu nome para continuar'}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              style={{
                width: 36, height: 36, borderRadius: 10, border: '1px solid #e5e7eb',
                background: '#fafafa', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 16,
                color: '#6b7280', flexShrink: 0, marginTop: 2,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              ✕
            </button>
          </div>

          {/* Ilustração */}
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 24px',
            background: `linear-gradient(135deg, ${primaryColor}12, ${primaryColor}06)`,
            border: `1.5px solid ${primaryColor}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {step === 'phone' ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
              </svg>
            )}
          </div>

          {/* Step: Phone */}
          {step === 'phone' && (
            <>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8, letterSpacing: 0.2 }}>
                Seu telefone
              </label>
              <div style={{ position: 'relative', marginBottom: error ? 12 : 16 }}>
                <div style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none',
                }}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>🇧🇷</span>
                  <span style={{ fontWeight: 500, fontSize: 15, color: '#6b7280' }}>+55</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => { setPhone(formatPhoneInput(e.target.value)); setError(null); }}
                  placeholder="(11) 99999-9999"
                  onKeyDown={e => e.key === 'Enter' && phoneValid && handleLookup()}
                  autoComplete="tel"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '16px 16px 16px 80px',
                    border: `2px solid ${error ? '#fca5a5' : '#e5e7eb'}`,
                    borderRadius: 14,
                    fontSize: 17,
                    fontWeight: 500,
                    background: '#fafafa',
                    letterSpacing: 0.5,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = primaryColor; e.target.style.background = '#fff'; e.target.style.boxShadow = `0 0 0 3px ${primaryColor}12`; }}
                  onBlur={e => { e.target.style.borderColor = error ? '#fca5a5' : '#e5e7eb'; e.target.style.background = '#fafafa'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {error && (
                <div style={{
                  background: '#fef2f2', color: '#dc2626', padding: '11px 14px', borderRadius: 12,
                  fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
                  fontWeight: 500, border: '1px solid #fecaca',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  {error}
                </div>
              )}

              {/* Lembrar */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
                <div
                  onClick={() => setRemember(!remember)}
                  style={{
                    width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                    border: `2px solid ${remember ? primaryColor : '#d1d5db'}`,
                    background: remember ? primaryColor : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {remember && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  )}
                </div>
                <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
                  Lembrar meu telefone neste dispositivo
                </span>
              </label>

              <button
                onClick={handleLookup}
                disabled={loading || !phoneValid}
                style={{
                  width: '100%', padding: '16px',
                  background: phoneValid ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}DD)` : '#e5e7eb',
                  color: phoneValid ? '#fff' : '#9ca3af',
                  border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700,
                  cursor: loading || !phoneValid ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1, transition: 'all 0.25s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: phoneValid ? `0 4px 14px ${primaryColor}30` : 'none',
                  letterSpacing: -0.2,
                }}
              >
                {loading ? (
                  <>
                    <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                    Consultando...
                  </>
                ) : 'Continuar →'}
              </button>
            </>
          )}

          {/* Step: Name */}
          {step === 'name' && (
            <>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16, textAlign: 'center' }}>
                Primeira vez por aqui? Informe seu nome para criarmos sua conta.
              </p>

              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8, letterSpacing: 0.2 }}>
                Nome completo
              </label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError(null); }}
                placeholder="Maria Silva"
                onKeyDown={e => e.key === 'Enter' && handleSubmitName()}
                autoFocus
                autoComplete="name"
                style={{
                  width: '100%', padding: '16px',
                  border: `2px solid ${error ? '#fca5a5' : '#e5e7eb'}`,
                  borderRadius: 14, fontSize: 16, fontWeight: 500,
                  background: '#fafafa', marginBottom: error ? 12 : 20,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = primaryColor; e.target.style.background = '#fff'; e.target.style.boxShadow = `0 0 0 3px ${primaryColor}12`; }}
                onBlur={e => { e.target.style.borderColor = error ? '#fca5a5' : '#e5e7eb'; e.target.style.background = '#fafafa'; e.target.style.boxShadow = 'none'; }}
              />

              {error && (
                <div style={{
                  background: '#fef2f2', color: '#dc2626', padding: '11px 14px', borderRadius: 12,
                  fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
                  fontWeight: 500, border: '1px solid #fecaca',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setStep('phone')}
                  style={{
                    padding: '16px', border: `1.5px solid #e5e7eb`, borderRadius: 14,
                    background: '#fff', fontSize: 15, fontWeight: 600, color: '#6b7280',
                    cursor: 'pointer', flex: 1, WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Voltar
                </button>
                <button
                  onClick={handleSubmitName}
                  style={{
                    flex: 2, padding: '16px',
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}DD)`,
                    color: '#fff', border: 'none', borderRadius: 14,
                    fontSize: 16, fontWeight: 700, cursor: 'pointer',
                    boxShadow: `0 4px 14px ${primaryColor}30`,
                    letterSpacing: -0.2, WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Criar conta →
                </button>
              </div>
            </>
          )}

          {/* Privacy hint */}
          <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 16, lineHeight: 1.5 }}>
            Seus dados são consultados de forma segura e não são compartilhados.
          </p>
        </div>
      </div>
    </>
  );
}

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  // Hydration fix
  const [mounted, setMounted] = useState(false);
  const [sponsors, setSponsors] = useState<SponsorBrief[]>([]);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [showCartPanel, setShowCartPanel] = useState(false);

  // ULTRA PREMIUM UPGRADE: Login modal + client session
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [clientSession, setClientSession] = useState<{ name: string; phone: string } | null>(null);
  const [galleryLightboxOpen, setGalleryLightboxOpen] = useState(false);

  // Hook com toda a lógica de booking
  const booking = useBooking({ slug });

  useEffect(() => {
    setMounted(true);
    // ULTRA PREMIUM UPGRADE: Restaurar sessão do localStorage
    try {
      const saved = localStorage.getItem(`bela-pro-client-${slug}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Cookie de 30 dias
        if (parsed.name && parsed.phone && Date.now() - (parsed.ts || 0) < 30 * 24 * 60 * 60 * 1000) {
          setClientSession({ name: parsed.name, phone: parsed.phone });
        } else {
          localStorage.removeItem(`bela-pro-client-${slug}`);
        }
      }
    } catch { /* ignore */ }
  }, [slug]);

  // Fechar CartPanel automaticamente quando carrinho esvaziar
  useEffect(() => {
    if (booking.cart.length === 0) setShowCartPanel(false);
  }, [booking.cart.length]);

  // Busca sponsors quando workspace estiver disponível
  useEffect(() => {
    if (!booking.workspace?.id) return;
    
    fetch(`${API_URL}/public/booking/workspace/${booking.workspace.id}/sponsors`)
      .then(r => r.ok ? r.json() : { sponsors: [] })
      .then(data => setSponsors(data.sponsors || []))
      .catch(() => {
        fetch(`${API_URL}/public/sponsors?placement=PUBLIC_BOOKING`)
          .then(r => r.ok ? r.json() : [])
          .then(setSponsors)
          .catch(() => {});
      });
    
  }, [booking.workspace?.id]);

  // Navegação entre tabs
  const handleTabChange = useCallback((tab: ActiveTab) => {
    // Se estiver no meio de um fluxo de agendamento (step > 1), confirmar saída
    if (activeTab === 'services' && booking.step > 1 && tab !== 'services') {
      // Permita apenas se o fluxo não tiver progredido significativamente
      if (booking.step >= 4) return; // Não interromper no formulário
    }
    setActiveTab(tab);
    if (tab === 'shop') setShowCartPanel(false);
    // Scroll suave ao topo ao trocar de tab
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, booking.step]);

  // Checkout de produtos via carrinho
  const handleCartCheckout = useCallback(() => {
    setShowCartPanel(false);
    setActiveTab('services');
    booking.proceedToDateSelection();
  }, [booking.proceedToDateSelection]);

  // Login do cliente via modal
  const handleLogin = useCallback((data: { name: string; phone: string }) => {
    setClientSession(data);
    setShowLoginModal(false);
    booking.setClientName(data.name);
    booking.setClientPhone(data.phone);
    // Persistir sessão no localStorage
    try {
      localStorage.setItem(`bela-pro-client-${slug}`, JSON.stringify({
        name: data.name,
        phone: data.phone,
        ts: Date.now(),
      }));
    } catch { /* ignore */ }
  }, [booking, slug]);

  // Auto-preencher dados do cliente quando sessão restaurada do localStorage
  useEffect(() => {
    if (clientSession && booking.workspace) {
      booking.setClientName(clientSession.name);
      booking.setClientPhone(clientSession.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSession?.name, clientSession?.phone, booking.workspace?.id]);

  // CSS global + animações
  const globalStyles = `
    ${skeletonStyles}
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    button { font-family: inherit; }
    input { font-family: inherit; }
    input:focus { outline: none; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes badgePop { 0% { transform: scale(0.5); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
  `;

  if (!mounted) return null;

  // Loading inicial
  if (booking.loading && !booking.workspace) {
    return (
      <div style={{ minHeight: '100vh', background: booking.gradientBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{globalStyles}</style>
        <Spinner size={50} color="white" />
      </div>
    );
  }

  // Erro
  if (booking.error && !booking.workspace) {
    return (
      <div style={{ minHeight: '100vh', background: booking.gradientBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <style>{globalStyles}</style>
        <div style={{ background: COLORS.surface, borderRadius: 24, padding: 40, textAlign: 'center', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          </div>
          <h2 style={{ marginBottom: 8, color: COLORS.textPrimary, fontSize: 20, fontWeight: 800 }}>Ops!</h2>
          <p style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 1.5 }}>{booking.error}</p>
        </div>
      </div>
    );
  }

  // Step 5 - PIX (fullscreen)
  if (booking.step === 5 && booking.paymentInfo && booking.workspace && (booking.selectedServices.length > 0 || booking.cart.length > 0)) {
    return (
      <>
        <style>{globalStyles}</style>
        <PixPaymentScreen
          workspace={booking.workspace}
          services={booking.selectedServices}
          selectedDate={booking.selectedDate}
          selectedSlot={booking.selectedSlot}
          paymentInfo={booking.paymentInfo}
          primaryColor={booking.primaryColor}
          cart={booking.cart}
        />
      </>
    );
  }

  // Sucesso (fullscreen)
  if (booking.success && booking.workspace && (booking.selectedServices.length > 0 || booking.cart.length > 0)) {
    return (
      <>
        <style>{globalStyles}</style>
        <ConfirmationScreen
          workspace={booking.workspace}
          services={booking.selectedServices}
          selectedDate={booking.selectedDate}
          selectedSlot={booking.selectedSlot}
          primaryColor={booking.primaryColor}
          onNewBooking={() => { booking.resetBooking(); setActiveTab('home'); }}
          cart={booking.cart}
          orderResult={booking.orderResult}
        />
      </>
    );
  }

  if (!booking.workspace) return null;

  const usePremiumLayout = !!(booking.workspace.coverImageUrl || booking.workspace.themePreset);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.background }}>
      <style>{globalStyles}</style>

      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      {usePremiumLayout ? (
        <HeroSection
          workspace={booking.workspace}
          theme={booking.theme}
          shopEnabled={booking.shopEnabled}
          onAction={handleTabChange}
          onLoginClick={() => setShowLoginModal(true)}
          clientName={clientSession?.name}
        />
      ) : (
        <BookingHeader workspace={booking.workspace} primaryColor={booking.primaryColor} />
      )}

      {/* ============================================ */}
      {/* MAIN CONTENT */}
      {/* ============================================ */}
      <div style={{
        background: COLORS.surface,
        marginTop: -40,
        borderRadius: '20px 20px 0 0',
        maxWidth: 560,
        marginInline: 'auto',
        position: 'relative',
        zIndex: 1,
        boxShadow: usePremiumLayout ? '0 -4px 20px rgba(0,0,0,0.1)' : 'none',
        minHeight: `calc(100vh - 200px)`,
        paddingBottom: BOTTOM_NAV_HEIGHT + SAFE_AREA_BOTTOM + 20,
      }}>
        <div style={{ padding: '28px 20px' }}>

          {/* ======== TAB: HOME ======== */}
          {activeTab === 'home' && (
            <>
              {/* Welcome */}
              {!usePremiumLayout && (
                <WelcomeSection workspace={booking.workspace} primaryColor={booking.primaryColor} showBadges={true} />
              )}
              {usePremiumLayout && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                  {['✓ Confirmação automática', '✓ Horários em tempo real', '✓ Cancelamento fácil'].map((badge, i) => (
                    <span key={i} style={{ fontSize: 12, color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {badge}
                    </span>
                  ))}
                </div>
              )}
              <HomeSection
                workspace={booking.workspace}
                services={booking.services}
                primaryColor={booking.primaryColor}
                theme={booking.theme}
                shopEnabled={booking.shopEnabled}
                onNavigate={handleTabChange}
                hideQuickActions={usePremiumLayout}
              />
            </>
          )}

          {/* ======== TAB: SERVICES (Booking Flow) ======== */}
          {activeTab === 'services' && (
            <>
              {/* Progress */}
              <ProgressBar currentStep={booking.step} primaryColor={booking.primaryColor} />

              {/* Erro inline */}
              {booking.error && booking.step !== 4 && (
                <div style={{
                  background: COLORS.errorLight,
                  border: `1px solid ${COLORS.error}33`,
                  color: COLORS.error,
                  padding: '12px 14px',
                  borderRadius: 12,
                  marginBottom: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  {booking.error}
                </div>
              )}

              {/* Voltar */}
              {booking.step > 1 && (
                <button
                  onClick={booking.goBack}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: booking.primaryColor,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: 16,
                    padding: '6px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Voltar
                </button>
              )}

              {/* STEP 1: Catálogo */}
              {booking.step === 1 && (
                <>
                  <ServiceListPro
                    services={booking.services}
                    categories={booking.categories}
                    selectedServices={booking.selectedServices}
                    loading={booking.loading}
                    primaryColor={booking.primaryColor}
                    onSelect={booking.toggleService}
                    theme={booking.theme}
                    shopEnabled={booking.shopEnabled}
                    itemFilter={booking.itemFilter}
                    onItemFilterChange={booking.setItemFilter}
                    cart={booking.cart}
                    onAddToCart={booking.addToCart}
                    onRemoveFromCart={booking.removeFromCart}
                    onUpdateCartQuantity={booking.updateCartQuantity}
                  />
                  
                  {/* Resumo + CTA */}
                  {(booking.selectedServices.length > 0 || booking.cart.length > 0) && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{
                        padding: 16,
                        background: `${booking.primaryColor}08`,
                        borderRadius: 14,
                        border: `1px solid ${booking.primaryColor}15`,
                        marginBottom: 12,
                      }}>
                        {booking.selectedServices.length > 0 && (
                          <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: '0 0 4px' }}>
                            {booking.selectedServices.length} serviço{booking.selectedServices.length > 1 ? 's' : ''} • {booking.totalDuration} min
                          </p>
                        )}
                        {booking.cart.length > 0 && (
                          <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: '0 0 4px' }}>
                            {booking.cartItemCount} produto{booking.cartItemCount > 1 ? 's' : ''} no carrinho
                          </p>
                        )}
                        <p style={{ fontSize: 17, fontWeight: 800, color: COLORS.textPrimary, margin: 0 }}>
                          {formatPrice(booking.totalCombinedPrice)}
                        </p>
                      </div>
                      <button
                        onClick={booking.proceedToDateSelection}
                        disabled={booking.loading}
                        style={{
                          width: '100%',
                          padding: '16px 24px',
                          background: `linear-gradient(135deg, ${booking.primaryColor}, ${booking.primaryColor}DD)`,
                          color: 'white',
                          border: 'none',
                          borderRadius: 14,
                          fontSize: 16,
                          fontWeight: 700,
                          cursor: booking.loading ? 'wait' : 'pointer',
                          opacity: booking.loading ? 0.7 : 1,
                          transition: 'opacity 0.2s',
                          boxShadow: `0 4px 16px ${booking.primaryColor}40`,
                          letterSpacing: -0.2,
                        }}
                      >
                        {booking.loading ? 'Carregando...' : 
                          booking.selectedServices.length > 0 ? 'Escolher Data e Horário →' : 'Finalizar Pedido →'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* STEP 2: Data */}
              {booking.step === 2 && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 21, fontWeight: 800, color: COLORS.textPrimary, margin: '0 0 8px', letterSpacing: -0.3 }}>
                      Escolha uma data
                    </h2>
                    <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: 0 }}>
                      {booking.selectedServices.map(s => s.name).join(' + ')} • {booking.totalDuration} min
                    </p>
                  </div>
                  <DatePicker
                    availableDays={booking.availableDays}
                    selectedDate={booking.selectedDate}
                    loading={booking.loading}
                    primaryColor={booking.primaryColor}
                    onSelect={booking.selectDate}
                  />
                </>
              )}

              {/* STEP 3: Horário */}
              {booking.step === 3 && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 21, fontWeight: 800, color: COLORS.textPrimary, margin: '0 0 8px', letterSpacing: -0.3 }}>
                      Escolha um horário
                    </h2>
                    <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: 0 }}>
                      {booking.selectedDate && formatDateFull(booking.selectedDate)}
                    </p>
                  </div>
                  <TimeSlots
                    slots={booking.availableSlots}
                    selectedSlot={booking.selectedSlot}
                    loading={booking.loading}
                    primaryColor={booking.primaryColor}
                    onSelect={booking.selectSlot}
                  />
                </>
              )}

              {/* STEP 4: Dados cliente */}
              {booking.step === 4 && (booking.selectedServices.length > 0 || booking.cart.length > 0) && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 21, fontWeight: 800, color: COLORS.textPrimary, margin: '0 0 4px', letterSpacing: -0.3 }}>
                      Seus dados
                    </h2>
                    <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>
                      Para confirmar {booking.selectedServices.length > 0 && booking.cart.length > 0 ? 'seu agendamento e pedido' : booking.selectedServices.length > 0 ? 'seu agendamento' : 'seu pedido'}
                    </p>
                  </div>
                  <ClientForm
                    services={booking.selectedServices}
                    selectedDate={booking.selectedDate}
                    selectedSlot={booking.selectedSlot}
                    clientName={booking.clientName}
                    clientPhone={booking.clientPhone}
                    loading={booking.loading}
                    error={booking.error}
                    primaryColor={booking.primaryColor}
                    onNameChange={booking.setClientName}
                    onPhoneChange={booking.setClientPhone}
                    onSubmit={booking.confirmBooking}
                    cart={booking.cart}
                    totalCombinedPrice={booking.totalCombinedPrice}
                  />
                </>
              )}
            </>
          )}

          {/* ======== TAB: SHOP ======== */}
          {activeTab === 'shop' && booking.shopEnabled && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(16,185,129,0.25)',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary, margin: 0, letterSpacing: -0.3 }}>
                    Loja
                  </h2>
                  <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>
                    Produtos disponíveis
                  </p>
                </div>
              </div>

              <ServiceListPro
                services={booking.services}
                categories={booking.categories}
                selectedServices={[]}
                loading={booking.loading}
                primaryColor={booking.primaryColor}
                onSelect={() => {}}
                theme={booking.theme}
                shopEnabled={true}
                itemFilter="product"
                onItemFilterChange={() => {}}
                cart={booking.cart}
                onAddToCart={booking.addToCart}
                onRemoveFromCart={booking.removeFromCart}
                onUpdateCartQuantity={booking.updateCartQuantity}
              />
            </>
          )}

          {/* ======== TAB: ACCOUNT ======== */}
          {activeTab === 'account' && (
            <AccountSection
              slug={slug}
              primaryColor={booking.primaryColor}
              clientSession={clientSession}
              onLogin={handleLogin}
              onLogout={() => {
                setClientSession(null);
                localStorage.removeItem(`bela-pro-client-${slug}`);
              }}
            />
          )}

        </div>
      </div>

      {/* ============================================ */}
      {/* SPONSORS (na home) */}
      {/* ============================================ */}
      {activeTab === 'home' && sponsors.length > 0 && (
        <section style={{
          padding: '48px 20px 40px',
          background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)',
          borderTop: '1px solid #e5e5e5',
          paddingBottom: BOTTOM_NAV_HEIGHT + SAFE_AREA_BOTTOM + 40,
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* Diamond */}
            {(() => {
              const diamonds = sponsors.filter(s => s.tier === 'DIAMOND');
              if (diamonds.length === 0) return null;
              return (
                <div style={{ marginBottom: 40 }}>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '8px 20px', borderRadius: 30,
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(168,85,247,0.05) 100%)',
                      border: '1px solid rgba(139,92,246,0.2)',
                    }}>
                      <span style={{ fontSize: 16 }}>💎</span>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Parceiro Diamond
                      </span>
                    </div>
                  </div>
                  {diamonds.map(d => (
                    <a key={d.id} href={d.ctaUrl || d.websiteUrl || '#'} target="_blank" rel="noopener noreferrer"
                      onClick={() => { fetch(`${API_URL}/public/sponsors/${d.id}/click`, { method: 'POST' }).catch(() => {}); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px',
                        background: '#fff', borderRadius: 20,
                        border: '2px solid transparent',
                        backgroundImage: 'linear-gradient(#fff, #fff), linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%)',
                        backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box',
                        boxShadow: '0 8px 32px rgba(139,92,246,0.15)',
                        textDecoration: 'none', marginBottom: 16,
                      }}>
                      {d.logoLightUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.logoLightUrl} alt={d.name} style={{ height: 48, maxWidth: 140, objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>{d.name}</span>
                      )}
                      <div style={{ flex: 1 }} />
                      <span style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                        {d.ctaLabel || 'Conhecer'} →
                      </span>
                    </a>
                  ))}
                </div>
              );
            })()}

            {/* Gold */}
            {(() => {
              const golds = sponsors.filter(s => s.tier === 'GOLD');
              if (golds.length === 0) return null;
              return (
                <div style={{ marginBottom: 32 }}>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#b45309' }}>🥇 Parceiros Gold</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    {golds.map(g => (
                      <a key={g.id} href={g.ctaUrl || g.websiteUrl || '#'} target="_blank" rel="noopener noreferrer"
                        onClick={() => { fetch(`${API_URL}/public/sponsors/${g.id}/click`, { method: 'POST' }).catch(() => {}); }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          padding: '24px 20px', background: '#fff', borderRadius: 16, border: '2px solid #fcd34d',
                          boxShadow: '0 4px 16px rgba(217,119,6,0.08)', textDecoration: 'none', minHeight: 100,
                        }}>
                        {g.logoLightUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={g.logoLightUrl} alt={g.name} style={{ height: 36, maxWidth: 120, objectFit: 'contain', marginBottom: 8 }} />
                        ) : (
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>{g.name}</span>
                        )}
                        <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>{g.ctaLabel || 'Ver mais'}</span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Silver & Bronze */}
            {(() => {
              const silvers = sponsors.filter(s => s.tier === 'SILVER');
              const bronzes = sponsors.filter(s => s.tier === 'BRONZE');
              if (silvers.length === 0 && bronzes.length === 0) return null;
              return (
                <div style={{ textAlign: 'center' }}>
                  {silvers.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af', letterSpacing: 1.5, textTransform: 'uppercase' }}>Parceiros Silver</span>
                      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                        {silvers.map(s => (
                          <a key={s.id} href={s.ctaUrl || s.websiteUrl || '#'} target="_blank" rel="noopener noreferrer"
                            onClick={() => { fetch(`${API_URL}/public/sponsors/${s.id}/click`, { method: 'POST' }).catch(() => {}); }}
                            style={{ padding: '10px 18px', borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {s.logoLightUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.logoLightUrl} alt={s.name} style={{ height: 20, maxWidth: 80, objectFit: 'contain' }} />
                            ) : (
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#4b5563' }}>{s.name}</span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {bronzes.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: '#a1a1aa', letterSpacing: 1.5, textTransform: 'uppercase' }}>Bronze</span>
                      <div style={{ marginTop: 8 }}>
                        {bronzes.map((s, i) => (
                          <span key={s.id}>
                            <a href={s.ctaUrl || s.websiteUrl || '#'} target="_blank" rel="noopener noreferrer"
                              onClick={() => { fetch(`${API_URL}/public/sponsors/${s.id}/click`, { method: 'POST' }).catch(() => {}); }}
                              style={{ color: '#9ca3af', fontSize: 11, textDecoration: 'none' }}>
                              {s.name}
                            </a>
                            {i < bronzes.length - 1 && <span style={{ color: '#d1d5db', margin: '0 8px' }}>•</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* Footer branding */}
      {activeTab === 'home' && (
        <footer style={{ textAlign: 'center', padding: '28px 20px 44px', paddingBottom: BOTTOM_NAV_HEIGHT + SAFE_AREA_BOTTOM + 28, background: '#f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Powered by</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="BELA PRO" style={{ height: 22, width: 'auto', opacity: 0.8 }} />
          </div>
          <p style={{ color: COLORS.textMuted, fontSize: 10, margin: 0, opacity: 0.6 }}>Sistema de agendamento profissional</p>
        </footer>
      )}

      {/* ============================================ */}
      {/* FLOATING CART BAR (global — visível em todas as tabs) */}
      {/* ============================================ */}
      {booking.cart.length > 0 && !showCartPanel && (
        <div style={{
          position: 'fixed',
          bottom: BOTTOM_NAV_HEIGHT + SAFE_AREA_BOTTOM + 8,
          left: 0,
          right: 0,
          zIndex: 900,
          animation: 'slideUp 0.25s ease',
        }}>
          <div style={{
            maxWidth: 560,
            marginInline: 'auto',
            padding: '0 16px',
          }}>
            <button
              onClick={() => setShowCartPanel(true)}
              style={{
                width: '100%',
                padding: '15px 20px',
                background: `linear-gradient(135deg, ${booking.primaryColor}, ${booking.primaryColor}DD)`,
                color: '#fff',
                border: 'none',
                borderRadius: 16,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: `0 6px 24px ${booking.primaryColor}40`,
                WebkitTapHighlightColor: 'transparent',
              }}
              aria-label="Abrir carrinho"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/></svg>
                Ver Carrinho ({booking.cartItemCount})
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>{formatPrice(booking.totalCartPrice)}</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* LOGIN MODAL */}
      {/* ============================================ */}
      {showLoginModal && booking.workspace && (
        <LoginModal
          slug={slug}
          primaryColor={booking.primaryColor}
          onLogin={handleLogin}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* ============================================ */}
      {/* CART PANEL (Slide-up) */}
      {/* ============================================ */}
      {showCartPanel && (
        <CartPanel
          cart={booking.cart}
          totalCartPrice={booking.totalCartPrice}
          primaryColor={booking.primaryColor}
          onRemove={booking.removeFromCart}
          onUpdateQty={booking.updateCartQuantity}
          onCheckout={handleCartCheckout}
          onClose={() => setShowCartPanel(false)}
        />
      )}

      {/* ============================================ */}
      {/* BOTTOM NAVIGATION */}
      {/* ============================================ */}
      {!showCartPanel && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          shopEnabled={booking.shopEnabled}
          cartItemCount={booking.cartItemCount}
          primaryColor={booking.primaryColor}
          hasGallery={!!(booking.workspace.galleryUrls && booking.workspace.galleryUrls.length > 0)}
          onGalleryOpen={() => setGalleryLightboxOpen(true)}
        />
      )}

      {/* Gallery Lightbox */}
      {galleryLightboxOpen && booking.workspace.galleryUrls && booking.workspace.galleryUrls.length > 0 && (
        <GalleryLightbox
          images={booking.workspace.galleryUrls}
          initialIndex={0}
          onClose={() => setGalleryLightboxOpen(false)}
        />
      )}
    </div>
  );
}
