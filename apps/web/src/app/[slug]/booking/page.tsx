'use client';

import { useEffect, useState, useCallback } from 'react';
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
} from './components';
import { ServiceListPro } from './components/ServiceListPro';

// Constants
import { COLORS, API_URL } from './constants';
import { formatDateFull, formatPrice } from './utils';

// ============================================
// TIPOS LOCAIS
// ============================================
type ActiveTab = 'home' | 'services' | 'shop' | 'account';

interface SponsorBrief { id: string; name: string; tier?: string; logoLightUrl?: string; logoDarkUrl?: string; websiteUrl?: string; ctaUrl?: string; ctaLabel?: string; isFeatured?: boolean; description?: string; }
interface SponsorPost { id: string; title: string; description?: string; imageUrl?: string; ctaLabel?: string; ctaUrl?: string; sponsor: { id: string; name: string; logoLightUrl?: string; }; }

// ============================================
// CONSTANTES DE ESTILO
// ============================================
const BOTTOM_NAV_HEIGHT = 64;
const SAFE_AREA_BOTTOM = 20;

// ============================================
// COMPONENTE: Bottom Navigation Bar
// ============================================
function BottomNav({
  activeTab,
  onTabChange,
  shopEnabled,
  cartItemCount,
  primaryColor,
}: {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  shopEnabled: boolean;
  cartItemCount: number;
  primaryColor: string;
}) {
  const tabs: { id: ActiveTab; label: string; icon: string; show: boolean }[] = [
    { id: 'home', label: 'Início', icon: '🏠', show: true },
    { id: 'services', label: 'Agendar', icon: '📅', show: true },
    { id: 'shop', label: 'Loja', icon: '🛍️', show: shopEnabled },
    { id: 'account', label: 'Minha Conta', icon: '👤', show: true },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: BOTTOM_NAV_HEIGHT + SAFE_AREA_BOTTOM,
      paddingBottom: SAFE_AREA_BOTTOM,
      background: '#ffffff',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 1000,
      boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
    }}>
      {visibleTabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              height: BOTTOM_NAV_HEIGHT,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Indicador ativo */}
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 0,
                width: 32,
                height: 3,
                borderRadius: '0 0 3px 3px',
                background: primaryColor,
              }} />
            )}
            <span style={{
              fontSize: 20,
              lineHeight: 1,
              position: 'relative',
            }}>
              {tab.icon}
              {/* Badge do carrinho */}
              {tab.id === 'shop' && cartItemCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -6,
                  right: -10,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff',
                }}>
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? primaryColor : '#9ca3af',
              letterSpacing: 0.2,
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
}: {
  workspace: any;
  services: any[];
  primaryColor: string;
  theme: any;
  shopEnabled: boolean;
  onNavigate: (tab: ActiveTab) => void;
}) {
  const brandName = workspace.brandName || workspace.name;
  const popularServices = services.filter(s => s.itemType !== 'PRODUCT').slice(0, 3);
  const featuredProducts = services.filter(s => s.itemType === 'PRODUCT').slice(0, 4);
  
  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Quick Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: shopEnabled ? '1fr 1fr' : '1fr',
        gap: 12,
        marginBottom: 28,
      }}>
        <button
          onClick={() => onNavigate('services')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '18px 20px',
            background: `linear-gradient(135deg, ${primaryColor}12 0%, ${primaryColor}06 100%)`,
            border: `1px solid ${primaryColor}20`,
            borderRadius: 16,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}>
            📅
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>
              Agendar
            </p>
            <p style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary }}>
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
              padding: '18px 20px',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #f0fdf406 100%)',
              border: '1px solid #bbf7d020',
              borderRadius: 16,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}>
              🛍️
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>
                Loja
              </p>
              <p style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary }}>
                Produtos disponíveis
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Serviços populares */}
      {popularServices.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.textPrimary }}>
              Serviços em destaque
            </h3>
            <button
              onClick={() => onNavigate('services')}
              style={{ background: 'none', border: 'none', color: primaryColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Ver todos →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {popularServices.map(service => (
              <div
                key={service.id}
                onClick={() => onNavigate('services')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${primaryColor}10`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}>
                  ✂️
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {service.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary }}>
                    {service.durationMinutes} min
                  </p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: primaryColor, flexShrink: 0 }}>
                  {formatPrice(service.priceCents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Produtos em destaque */}
      {shopEnabled && featuredProducts.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.textPrimary }}>
              Produtos
            </h3>
            <button
              onClick={() => onNavigate('shop')}
              style={{ background: 'none', border: 'none', color: primaryColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Ver todos →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {featuredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => onNavigate('shop')}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #f3f4f6',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                {product.imageUrl ? (
                  <div style={{ width: '100%', height: 100, background: '#f9fafb' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: '100%', height: 80, background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                    🛍️
                  </div>
                )}
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product.name}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                    {formatPrice(product.priceCents)}
                  </p>
                </div>
              </div>
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

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 1100,
          animation: 'fadeIn 0.2s ease',
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '75vh',
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.3s ease',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d1d5db' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 16px' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>
            Meu Carrinho
          </h3>
          <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
            {cart.reduce((s, i) => s + i.quantity, 0)} {cart.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {cart.map((item, idx) => (
            <div key={item.service.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 0',
              borderTop: idx > 0 ? '1px solid #f3f4f6' : 'none',
            }}>
              {/* Image */}
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                overflow: 'hidden',
                background: '#f9fafb',
                flexShrink: 0,
              }}>
                {item.service.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.service.imageUrl} alt={item.service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🛍️</div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.service.name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: primaryColor, fontWeight: 600 }}>
                  {formatPrice(item.service.priceCents)}
                </p>
              </div>

              {/* Qty controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
                <button
                  onClick={() => item.quantity <= 1 ? onRemove(item.service.id) : onUpdateQty(item.service.id, item.quantity - 1)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb',
                    background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: item.quantity <= 1 ? '#ef4444' : COLORS.textPrimary,
                  }}
                >
                  {item.quantity <= 1 ? '🗑' : '−'}
                </button>
                <span style={{ width: 36, textAlign: 'center', fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQty(item.service.id, item.quantity + 1)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: `1px solid ${primaryColor}30`,
                    background: `${primaryColor}08`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: primaryColor,
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
          borderTop: '1px solid #f3f4f6',
          background: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: COLORS.textSecondary }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary }}>{formatPrice(totalCartPrice)}</span>
          </div>
          <button
            onClick={onCheckout}
            style={{
              width: '100%',
              padding: '16px',
              background: primaryColor,
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            Finalizar Pedido
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
}: {
  slug: string;
  primaryColor: string;
}) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [clientName, setClientName] = useState('');
  const [activePortalTab, setActivePortalTab] = useState<'appointments' | 'orders'>('appointments');

  const formatPhoneInput = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  };

  const handleLogin = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('Digite um telefone válido');
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
        setError('Nenhum registro encontrado para este telefone');
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
    } catch {
      setError('Erro ao buscar dados. Tente novamente.');
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
  };

  const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    PENDING: { label: 'Aguardando', bg: '#fef3c7', color: '#92400e' },
    PENDING_PAYMENT: { label: 'Aguardando pagamento', bg: '#ffedd5', color: '#9a3412' },
    CONFIRMED: { label: 'Confirmado', bg: '#dbeafe', color: '#1e40af' },
    COMPLETED: { label: 'Concluído', bg: '#d1fae5', color: '#065f46' },
    CANCELLED: { label: 'Cancelado', bg: '#fee2e2', color: '#991b1b' },
    NO_SHOW: { label: 'Não compareceu', bg: '#f3f4f6', color: '#374151' },
    PREPARING: { label: 'Em preparo', bg: '#ede9fe', color: '#5b21b6' },
    READY: { label: 'Pronto', bg: '#cffafe', color: '#155e75' },
    DELIVERED: { label: 'Entregue', bg: '#d1fae5', color: '#065f46' },
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // ---- Login screen ----
  if (!loggedIn) {
    return (
      <div style={{ padding: '0 0 24px' }}>
        {/* Ilustração */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background: `${primaryColor}10`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 36,
          }}>
            👤
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: COLORS.textPrimary }}>
            Minha Conta
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.5 }}>
            Acesse seus agendamentos e pedidos usando o telefone cadastrado
          </p>
        </div>

        {/* Form */}
        <div style={{
          background: '#fff',
          borderRadius: 20,
          padding: 24,
          border: '1px solid #f3f4f6',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 8 }}>
            Telefone / WhatsApp
          </label>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🇧🇷</span>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(formatPhoneInput(e.target.value))}
              placeholder="(11) 99999-9999"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%',
                padding: '16px 16px 16px 44px',
                border: `2px solid ${error ? '#ef4444' : '#e5e7eb'}`,
                borderRadius: 14,
                fontSize: 17,
                fontWeight: 500,
                outline: 'none',
                transition: 'border-color 0.2s',
                background: '#fafafa',
              }}
              onFocus={e => { e.target.style.borderColor = primaryColor; e.target.style.background = '#fff'; }}
              onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#fafafa'; }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || phone.replace(/\D/g, '').length < 10}
            style={{
              width: '100%',
              padding: '16px',
              background: phone.replace(/\D/g, '').length >= 10 ? primaryColor : '#d1d5db',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                Buscando...
              </>
            ) : 'Acessar minha conta'}
          </button>
        </div>
      </div>
    );
  }

  // ---- Portal do cliente ----
  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Perfil */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `${primaryColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: primaryColor,
          }}>
            {clientName ? clientName.charAt(0).toUpperCase() : '👤'}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>
              {clientName || 'Cliente'}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: COLORS.textSecondary }}>
              {phone}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: 12,
            color: COLORS.textSecondary,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Sair
        </button>
      </div>

      {/* Portal tabs */}
      <div style={{
        display: 'flex',
        background: '#f3f4f6',
        borderRadius: 14,
        padding: 4,
        marginBottom: 20,
      }}>
        {[
          { id: 'appointments' as const, label: '📅 Agendamentos', count: appointments.length },
          { id: 'orders' as const, label: '🛍️ Pedidos', count: orders.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActivePortalTab(tab.id)}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: activePortalTab === tab.id ? '#fff' : 'transparent',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: activePortalTab === tab.id ? COLORS.textPrimary : COLORS.textSecondary,
              cursor: 'pointer',
              boxShadow: activePortalTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {tab.label} {tab.count > 0 && <span style={{ fontSize: 11, opacity: 0.6 }}>({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Agendamentos */}
      {activePortalTab === 'appointments' && (
        <div>
          {appointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary, margin: '0 0 4px' }}>Nenhum agendamento</p>
              <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>Seus agendamentos aparecerão aqui</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {appointments.map((apt: any) => {
                const status = STATUS_CONFIG[apt.status] || STATUS_CONFIG.PENDING;
                const isPast = new Date(apt.startAt) < new Date();
                return (
                  <div
                    key={apt.id}
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      border: '1px solid #f3f4f6',
                      padding: 18,
                      opacity: isPast && apt.status !== 'CONFIRMED' ? 0.7 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>
                          {apt.services?.map((s: any) => s.service.name).join(', ')}
                        </p>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        background: status.bg,
                        color: status.color,
                        flexShrink: 0,
                      }}>
                        {status.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: COLORS.textSecondary }}>
                      <span>📅 {formatDate(apt.startAt)}</span>
                      <span>⏰ {formatTime(apt.startAt)}</span>
                    </div>
                    {apt.totalPriceCents > 0 && (
                      <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 700, color: primaryColor }}>
                        {formatPrice(apt.totalPriceCents)}
                      </p>
                    )}
                    {/* Actions */}
                    {['PENDING', 'CONFIRMED', 'PENDING_PAYMENT'].includes(apt.status) && !isPast && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <a
                          href={`/${slug}/gerenciar?id=${apt.id}`}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            background: `${primaryColor}10`,
                            color: primaryColor,
                            border: `1px solid ${primaryColor}20`,
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 600,
                            textAlign: 'center',
                            textDecoration: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Gerenciar
                        </a>
                      </div>
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
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary, margin: '0 0 4px' }}>Nenhum pedido</p>
              <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>Seus pedidos aparecerão aqui</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.map((order: any) => {
                const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                return (
                  <div
                    key={order.id}
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      border: '1px solid #f3f4f6',
                      padding: 18,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <p style={{ margin: 0, fontSize: 13, color: COLORS.textSecondary }}>
                        {formatDate(order.createdAt)}
                      </p>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        background: status.bg,
                        color: status.color,
                      }}>
                        {status.label}
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      {order.items?.map((item: any, i: number) => (
                        <p key={i} style={{ margin: '0 0 2px', fontSize: 14, color: COLORS.textPrimary }}>
                          {item.quantity}x {item.service?.name || item.productName} — {formatPrice(item.priceCents * item.quantity)}
                        </p>
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: primaryColor }}>
                      Total: {formatPrice(order.totalCents)}
                    </p>
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

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  // Hydration fix
  const [mounted, setMounted] = useState(false);
  const [sponsors, setSponsors] = useState<SponsorBrief[]>([]);
  const [sponsorPosts, setSponsorPosts] = useState<SponsorPost[]>([]);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [showCartPanel, setShowCartPanel] = useState(false);

  // Hook com toda a lógica de booking
  const booking = useBooking({ slug });

  useEffect(() => {
    setMounted(true);
  }, []);

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
    
    fetch(`${API_URL}/public/sponsors/posts?limit=5`)
      .then(r => r.ok ? r.json() : []).then(setSponsorPosts).catch(() => {});
  }, [booking.workspace?.id]);

  // Auto-rotate posts
  useEffect(() => {
    if (sponsorPosts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPostIndex(i => (i + 1) % sponsorPosts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [sponsorPosts.length]);

  // Navegação entre tabs
  const handleTabChange = useCallback((tab: ActiveTab) => {
    // Se estiver no meio de um fluxo de agendamento (step > 1), confirmar saída
    if (activeTab === 'services' && booking.step > 1 && tab !== 'services') {
      // Permita apenas se o fluxo não tiver progredido significativamente
      if (booking.step >= 4) return; // Não interromper no formulário
    }
    setActiveTab(tab);
    if (tab === 'shop') setShowCartPanel(false);
  }, [activeTab, booking.step]);

  // Checkout de produtos via carrinho
  const handleCartCheckout = useCallback(() => {
    setShowCartPanel(false);
    // Se tem serviços selecionados, manter na tab services
    if (booking.selectedServices.length > 0) {
      setActiveTab('services');
      booking.proceedToDateSelection();
    } else {
      // Produto puro: ir para step 4 diretamente
      setActiveTab('services');
      booking.proceedToDateSelection();
    }
  }, [booking]);

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
        <div style={{ background: COLORS.surface, borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>😕</div>
          <h2 style={{ marginBottom: 10, color: COLORS.textPrimary }}>Ops!</h2>
          <p style={{ color: COLORS.textSecondary }}>{booking.error}</p>
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

  // Determinar se o fluxo de serviço/agendamento está em andamento (step > 1)
  const isBookingFlow = activeTab === 'services' && booking.step > 1;

  return (
    <div style={{ minHeight: '100vh', background: COLORS.background }}>
      <style>{globalStyles}</style>

      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      {usePremiumLayout ? (
        <HeroSection workspace={booking.workspace} theme={booking.theme} />
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
                  padding: 14,
                  borderRadius: 12,
                  marginBottom: 20,
                  fontSize: 14,
                }}>
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
                    cursor: 'pointer',
                    marginBottom: 16,
                    padding: '4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  ← Voltar
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
                          background: booking.primaryColor,
                          color: 'white',
                          border: 'none',
                          borderRadius: 14,
                          fontSize: 16,
                          fontWeight: 700,
                          cursor: booking.loading ? 'wait' : 'pointer',
                          opacity: booking.loading ? 0.7 : 1,
                          transition: 'opacity 0.2s',
                        }}
                      >
                        {booking.loading ? 'Carregando...' : 
                          booking.selectedServices.length > 0 ? 'Escolher Data e Horário' : 'Finalizar Pedido'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* STEP 2: Data */}
              {booking.step === 2 && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, margin: '0 0 6px' }}>
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
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, margin: '0 0 6px' }}>
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
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>
                      Seus dados
                    </h2>
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
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary, margin: '0 0 6px' }}>
                  Loja
                </h2>
                <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: 0 }}>
                  Produtos disponíveis para compra
                </p>
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

              {/* Cart summary bar */}
              {booking.cart.length > 0 && (
                <div style={{
                  position: 'fixed',
                  bottom: BOTTOM_NAV_HEIGHT + SAFE_AREA_BOTTOM,
                  left: 0,
                  right: 0,
                  zIndex: 900,
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
                        padding: '14px 20px',
                        background: booking.primaryColor,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 14,
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      }}
                    >
                      <span>🛒 Ver Carrinho ({booking.cartItemCount})</span>
                      <span style={{ fontSize: 16, fontWeight: 800 }}>{formatPrice(booking.totalCartPrice)}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ======== TAB: ACCOUNT ======== */}
          {activeTab === 'account' && (
            <AccountSection slug={slug} primaryColor={booking.primaryColor} />
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
        />
      )}
    </div>
  );
}
