'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// Hooks
import { useBooking } from './hooks/useBooking';

// Components
import {
  BookingHeader,
  WelcomeSection,
  ProgressBar,
  ServiceList,
  DatePicker,
  TimeSlots,
  ClientForm,
  ConfirmationScreen,
  PixPaymentScreen,
  StickyFooter,
  Spinner,
  skeletonStyles,
  HeroSection,
  ServiceCardPremium,
} from './components';
import { ServiceListPro } from './components/ServiceListPro';
import { FloatingCartBadge } from './components/FloatingCartBadge';

// Constants
import { COLORS, API_URL } from './constants';
import { formatDateFull } from './utils';

interface SponsorBrief { id: string; name: string; tier?: string; logoLightUrl?: string; logoDarkUrl?: string; websiteUrl?: string; ctaUrl?: string; ctaLabel?: string; isFeatured?: boolean; description?: string; }
interface SponsorPost { id: string; title: string; description?: string; imageUrl?: string; ctaLabel?: string; ctaUrl?: string; sponsor: { id: string; name: string; logoLightUrl?: string; }; }

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  // Hydration fix
  const [mounted, setMounted] = useState(false);
  const [sponsors, setSponsors] = useState<SponsorBrief[]>([]);
  const [sponsorPosts, setSponsorPosts] = useState<SponsorPost[]>([]);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);

  // Hook com toda a lógica de booking (deve ser declarado antes de useEffect)
  const booking = useBooking({ slug });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Busca sponsors quando workspace estiver disponível
  useEffect(() => {
    if (!booking.workspace?.id) return;
    
    // Busca sponsors combinados (locais + globais se habilitado)
    fetch(`${API_URL}/public/booking/workspace/${booking.workspace.id}/sponsors`)
      .then(r => r.ok ? r.json() : { sponsors: [] })
      .then(data => setSponsors(data.sponsors || []))
      .catch(() => {
        // Fallback para endpoint global antigo
        fetch(`${API_URL}/public/sponsors?placement=PUBLIC_BOOKING`)
          .then(r => r.ok ? r.json() : [])
          .then(setSponsors)
          .catch(() => {});
      });
    
    // Busca postagens Diamond (sempre global)
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

  // CSS global
  const globalStyles = `
    ${skeletonStyles}
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    button {
      font-family: inherit;
    }
    
    input {
      font-family: inherit;
    }
    
    input:focus {
      outline: none;
    }
  `;

  // Prevent hydration mismatch
  if (!mounted) return null;

  // Loading inicial (sem workspace)
  if (booking.loading && !booking.workspace) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: booking.gradientBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <style>{globalStyles}</style>
        <Spinner size={50} color="white" />
      </div>
    );
  }

  // Erro (workspace não encontrado)
  if (booking.error && !booking.workspace) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: booking.gradientBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <style>{globalStyles}</style>
        <div
          style={{
            background: COLORS.surface,
            borderRadius: 20,
            padding: 40,
            textAlign: 'center',
            maxWidth: 400,
          }}
        >
          <div style={{ fontSize: 60, marginBottom: 20 }}>😕</div>
          <h2 style={{ marginBottom: 10, color: COLORS.textPrimary }}>Ops!</h2>
          <p style={{ color: COLORS.textSecondary }}>{booking.error}</p>
        </div>
      </div>
    );
  }

  // Step 5 - Tela de pagamento PIX
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

  // Sucesso - Tela de confirmação
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
          onNewBooking={booking.resetBooking}
          cart={booking.cart}
          orderResult={booking.orderResult}
        />
      </>
    );
  }

  // Workspace não carregado ainda
  if (!booking.workspace) return null;

  // Handler para continuar para próxima etapa (usado pelo StickyFooter)
  const handleContinue = () => {
    // As transições já acontecem automaticamente ao selecionar
    // Este handler é para o botão do StickyFooter
  };

  // Determinar se usar o layout premium (com HeroSection)
  const usePremiumLayout = !!(booking.workspace.coverImageUrl || booking.workspace.themePreset);

  return (
    <div style={{ minHeight: '100vh', background: booking.theme.colors.background }}>
      <style>{globalStyles}</style>

      {/* Header - Premium ou Padrão */}
      {usePremiumLayout ? (
        <HeroSection workspace={booking.workspace} theme={booking.theme} />
      ) : (
        <BookingHeader workspace={booking.workspace} primaryColor={booking.primaryColor} />
      )}

      {/* Main Content Card */}
      <div
        style={{
          background: booking.theme.colors.surface,
          marginTop: usePremiumLayout ? -40 : -40,
          marginLeft: 20,
          marginRight: 20,
          borderRadius: '20px 20px 0 0',
          maxWidth: 560,
          marginInline: 'auto',
          position: 'relative',
          zIndex: 1,
          boxShadow: usePremiumLayout ? '0 -4px 20px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        {/* Card interno com padding */}
        <div style={{ padding: '28px 24px' }}>
          
          {/* Welcome Section - só na etapa 1 e se NÃO usar layout premium (HeroSection já tem isso) */}
          {booking.step === 1 && !usePremiumLayout && (
            <WelcomeSection
              workspace={booking.workspace}
              primaryColor={booking.primaryColor}
              showBadges={true}
            />
          )}

          {/* Badges de confiança - mostrar na etapa 1 se usar premium layout */}
          {booking.step === 1 && usePremiumLayout && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 16, 
              marginBottom: 20,
              flexWrap: 'wrap',
            }}>
              {['✓ Confirmação automática', '✓ Horários em tempo real', '✓ Cancelamento fácil'].map((badge, i) => (
                <span 
                  key={i} 
                  style={{ 
                    fontSize: 12, 
                    color: booking.theme.colors.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          {/* Progress Bar */}
          <ProgressBar currentStep={booking.step} primaryColor={booking.primaryColor} />

          {/* Link para área do cliente */}
          {booking.step === 1 && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <a
                href={`/${slug}/gerenciar`}
                style={{
                  fontSize: 13,
                  color: booking.primaryColor,
                  textDecoration: 'none',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 20,
                  background: `${booking.primaryColor}10`,
                  border: `1px solid ${booking.primaryColor}25`,
                  transition: 'background 0.2s',
                }}
              >
                <span>👤</span> Já é cliente? Acompanhe seus agendamentos
              </a>
            </div>
          )}

          {/* Botão Voltar */}
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

          {/* Erro inline */}
          {booking.error && booking.step !== 4 && (
            <div
              style={{
                background: COLORS.errorLight,
                border: `1px solid ${COLORS.error}33`,
                color: COLORS.error,
                padding: 14,
                borderRadius: 12,
                marginBottom: 20,
                fontSize: 14,
              }}
            >
              {booking.error}
            </div>
          )}

          {/* STEP 1: Serviços */}
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
                // LOJA UNIFICADA
                shopEnabled={booking.shopEnabled}
                itemFilter={booking.itemFilter}
                onItemFilterChange={booking.setItemFilter}
                cart={booking.cart}
                onAddToCart={booking.addToCart}
                onRemoveFromCart={booking.removeFromCart}
                onUpdateCartQuantity={booking.updateCartQuantity}
              />
              
              {/* Resumo dos serviços selecionados e carrinho */}
              {(booking.selectedServices.length > 0 || booking.cart.length > 0) && (
                <div style={{
                  marginTop: 20,
                  padding: 16,
                  background: `${booking.primaryColor}10`,
                  borderRadius: 12,
                  border: `1px solid ${booking.primaryColor}30`,
                }}>
                  {booking.selectedServices.length > 0 && (
                    <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: '0 0 4px' }}>
                      {booking.selectedServices.length} serviço{booking.selectedServices.length > 1 ? 's' : ''} selecionado{booking.selectedServices.length > 1 ? 's' : ''}
                    </p>
                  )}
                  {booking.cart.length > 0 && (
                    <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: '0 0 4px' }}>
                      {booking.cartItemCount} produto{booking.cartItemCount > 1 ? 's' : ''} no carrinho
                    </p>
                  )}
                  <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
                    {booking.selectedServices.length > 0 ? `${booking.totalDuration} min • ` : ''}
                    R$ {(booking.totalCombinedPrice / 100).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              )}
              
              {/* Botão para prosseguir */}
              {(booking.selectedServices.length > 0 || booking.cart.length > 0) && (
                <button
                  onClick={booking.proceedToDateSelection}
                  disabled={booking.loading}
                  style={{
                    width: '100%',
                    marginTop: 16,
                    padding: '14px 24px',
                    background: booking.primaryColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: booking.loading ? 'wait' : 'pointer',
                    opacity: booking.loading ? 0.7 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {booking.loading ? 'Carregando...' : 'Continuar'}
                </button>
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

          {/* STEP 4: Dados do cliente */}
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
        </div>
      </div>

      {/* Spacer para o footer sticky */}
      {(booking.selectedServices.length > 0 || booking.cart.length > 0) && booking.step < 4 && (
        <div style={{ height: 100 }} />
      )}

      {/* Footer sticky (passos 2 e 3 apenas) */}
      <StickyFooter
        selectedServices={booking.selectedServices}
        totalDuration={booking.totalDuration}
        totalPrice={booking.totalPrice}
        currentStep={booking.step}
        canProceed={booking.canProceed}
        loading={booking.loading}
        primaryColor={booking.primaryColor}
        onContinue={handleContinue}
        cart={booking.cart}
        totalCombinedPrice={booking.totalCombinedPrice}
        cartItemCount={booking.cartItemCount}
      />

      {/* Carrinho flutuante (aparece quando há produtos no carrinho) */}
      {booking.shopEnabled && booking.step < 4 && (
        <FloatingCartBadge
          cart={booking.cart}
          totalCartPrice={booking.totalCartPrice}
          cartItemCount={booking.cartItemCount}
          theme={booking.theme}
          primaryColor={booking.primaryColor}
          onRemoveFromCart={booking.removeFromCart}
          onUpdateCartQuantity={booking.updateCartQuantity}
        />
      )}

      {/* ============================================================= */}
      {/* SEÇÃO PATROCINADORES — DESIGN PROFISSIONAL COM HIERARQUIA */}
      {/* ============================================================= */}
      {sponsors.length > 0 && (
        <section style={{
          padding: '48px 20px 40px',
          background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)',
          borderTop: '1px solid #e5e5e5',
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>

            {/* ========== DIAMOND SPOTLIGHT ========== */}
            {(() => {
              const diamonds = sponsors.filter(s => s.tier === 'DIAMOND');
              if (diamonds.length === 0) return null;

              return (
                <div style={{ marginBottom: 40 }}>
                  {/* Header Diamond */}
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '8px 20px', borderRadius: 30,
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(168,85,247,0.05) 100%)',
                      border: '1px solid rgba(139,92,246,0.2)',
                    }}>
                      <span style={{ fontSize: 16 }}>💎</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: 2,
                        textTransform: 'uppercase',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      }}>
                        Parceiro Diamond
                      </span>
                    </div>
                  </div>

                  {/* Diamond Cards */}
                  {diamonds.map(diamond => (
                    <div key={diamond.id} style={{
                      background: '#ffffff',
                      borderRadius: 20,
                      border: '2px solid transparent',
                      backgroundImage: 'linear-gradient(#fff, #fff), linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      boxShadow: '0 8px 32px rgba(139,92,246,0.15), 0 2px 8px rgba(0,0,0,0.04)',
                      overflow: 'hidden',
                      marginBottom: 16,
                    }}>
                      {/* Diamond Header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '20px 24px',
                        borderBottom: '1px solid rgba(139,92,246,0.1)',
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.03) 0%, rgba(168,85,247,0.01) 100%)',
                      }}>
                        {diamond.logoLightUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={diamond.logoLightUrl} alt={diamond.name}
                            style={{ height: 48, maxWidth: 140, objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: 20, fontWeight: 700, color: '#1f2937' }}>{diamond.name}</span>
                        )}
                        <div style={{ flex: 1 }} />
                        <a
                          href={diamond.ctaUrl || diamond.websiteUrl || '#'}
                          target="_blank" rel="noopener noreferrer"
                          onClick={() => { fetch(`${API_URL}/public/sponsors/${diamond.id}/click`, { method: 'POST' }).catch(() => {}); }}
                          style={{
                            padding: '10px 20px', borderRadius: 10,
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                            color: '#fff', fontSize: 13, fontWeight: 600,
                            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 4px 14px rgba(139,92,246,0.3)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(139,92,246,0.4)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(139,92,246,0.3)'; }}
                        >
                          {diamond.ctaLabel || 'Conhecer'} 
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </a>
                      </div>

                      {/* Diamond Posts Carousel */}
                      {sponsorPosts.filter(p => p.sponsor.id === diamond.id).length > 0 && (
                        <div style={{ padding: '20px 24px' }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                            📢 Ofertas & Novidades
                          </p>
                          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                            {sponsorPosts.filter(p => p.sponsor.id === diamond.id).map(post => (
                              <a
                                key={post.id}
                                href={post.ctaUrl || '#'}
                                target="_blank" rel="noopener noreferrer"
                                onClick={() => { fetch(`${API_URL}/public/sponsors/posts/${post.id}/click`, { method: 'POST' }).catch(() => {}); }}
                                style={{
                                  flex: '0 0 260px',
                                  background: '#f9fafb',
                                  borderRadius: 12,
                                  overflow: 'hidden',
                                  textDecoration: 'none',
                                  border: '1px solid #e5e7eb',
                                  transition: 'transform 0.2s, box-shadow 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                              >
                                {post.imageUrl && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={post.imageUrl} alt={post.title}
                                    style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                                )}
                                <div style={{ padding: 14 }}>
                                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1f2937', lineHeight: 1.3 }}>
                                    {post.title}
                                  </h4>
                                  {post.description && (
                                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7280', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                      {post.description}
                                    </p>
                                  )}
                                  {post.ctaLabel && (
                                    <span style={{ display: 'inline-block', marginTop: 10, fontSize: 12, fontWeight: 600, color: '#8b5cf6' }}>
                                      {post.ctaLabel} →
                                    </span>
                                  )}
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* ========== GOLD PARTNERS ========== */}
            {(() => {
              const golds = sponsors.filter(s => s.tier === 'GOLD');
              if (golds.length === 0) return null;

              return (
                <div style={{ marginBottom: 32 }}>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 2,
                      textTransform: 'uppercase', color: '#b45309',
                    }}>
                      🥇 Parceiros Gold
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 16,
                  }}>
                    {golds.map(gold => (
                      <a
                        key={gold.id}
                        href={gold.ctaUrl || gold.websiteUrl || '#'}
                        target="_blank" rel="noopener noreferrer"
                        onClick={() => { fetch(`${API_URL}/public/sponsors/${gold.id}/click`, { method: 'POST' }).catch(() => {}); }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          padding: '24px 20px',
                          background: '#fff',
                          borderRadius: 16,
                          border: '2px solid #fcd34d',
                          boxShadow: '0 4px 16px rgba(217,119,6,0.08)',
                          textDecoration: 'none',
                          transition: 'all 0.3s',
                          minHeight: 100,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(217,119,6,0.15)'; e.currentTarget.style.borderColor = '#f59e0b'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(217,119,6,0.08)'; e.currentTarget.style.borderColor = '#fcd34d'; }}
                      >
                        {gold.logoLightUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={gold.logoLightUrl} alt={gold.name}
                            style={{ height: 36, maxWidth: 120, objectFit: 'contain', marginBottom: 8 }} />
                        ) : (
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>{gold.name}</span>
                        )}
                        <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>
                          {gold.ctaLabel || 'Ver mais'}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ========== SILVER & BRONZE ========== */}
            {(() => {
              const silvers = sponsors.filter(s => s.tier === 'SILVER');
              const bronzes = sponsors.filter(s => s.tier === 'BRONZE');
              if (silvers.length === 0 && bronzes.length === 0) return null;

              return (
                <div style={{ textAlign: 'center' }}>
                  {silvers.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        Parceiros Silver
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                        {silvers.map(s => (
                          <a
                            key={s.id}
                            href={s.ctaUrl || s.websiteUrl || '#'}
                            target="_blank" rel="noopener noreferrer"
                            onClick={() => { fetch(`${API_URL}/public/sponsors/${s.id}/click`, { method: 'POST' }).catch(() => {}); }}
                            style={{
                              padding: '10px 18px', borderRadius: 10,
                              background: '#fff', border: '1px solid #e5e7eb',
                              textDecoration: 'none',
                              display: 'flex', alignItems: 'center', gap: 8,
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#9ca3af'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                          >
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
                      <span style={{ fontSize: 9, fontWeight: 600, color: '#a1a1aa', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        Bronze
                      </span>
                      <div style={{ marginTop: 8 }}>
                        {bronzes.map((s, i) => (
                          <span key={s.id}>
                            <a
                              href={s.ctaUrl || s.websiteUrl || '#'}
                              target="_blank" rel="noopener noreferrer"
                              onClick={() => { fetch(`${API_URL}/public/sponsors/${s.id}/click`, { method: 'POST' }).catch(() => {}); }}
                              style={{ color: '#9ca3af', fontSize: 11, textDecoration: 'none' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.textDecoration = 'underline'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.textDecoration = 'none'; }}
                            >
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

      {/* Footer branding BELA PRO */}
      <footer
        style={{
          textAlign: 'center',
          padding: '28px 20px 44px',
          background: '#f3f4f6',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Powered by</span>
          <img
            src="/logo.png"
            alt="BELA PRO"
            style={{
              height: 22,
              width: 'auto',
              opacity: 0.8,
            }}
          />
        </div>
        <p
          style={{
            color: COLORS.textMuted,
            fontSize: 10,
            margin: 0,
            opacity: 0.6,
          }}
        >
          Sistema de agendamento profissional
        </p>
      </footer>
    </div>
  );
}
