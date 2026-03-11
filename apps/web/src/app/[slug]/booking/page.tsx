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

// Constants
import { COLORS, API_URL } from './constants';
import { formatDateFull } from './utils';

interface SponsorBrief { id: string; name: string; tier?: string; logoLightUrl?: string; logoDarkUrl?: string; websiteUrl?: string; ctaUrl?: string; ctaLabel?: string; isFeatured?: boolean; }

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  // Hydration fix
  const [mounted, setMounted] = useState(false);
  const [sponsors, setSponsors] = useState<SponsorBrief[]>([]);
  useEffect(() => {
    setMounted(true);
    fetch(`${API_URL}/public/sponsors?placement=PUBLIC_BOOKING`)
      .then(r => r.ok ? r.json() : []).then(setSponsors).catch(() => {});
  }, []);

  // Hook com toda a lógica de booking
  const booking = useBooking({ slug });

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
  if (booking.step === 5 && booking.paymentInfo && booking.workspace && booking.selectedService && booking.selectedDate && booking.selectedSlot) {
    return (
      <>
        <style>{globalStyles}</style>
        <PixPaymentScreen
          workspace={booking.workspace}
          service={booking.selectedService}
          selectedDate={booking.selectedDate}
          selectedSlot={booking.selectedSlot}
          paymentInfo={booking.paymentInfo}
          primaryColor={booking.primaryColor}
        />
      </>
    );
  }

  // Sucesso - Tela de confirmação
  if (booking.success && booking.workspace && booking.selectedService && booking.selectedDate && booking.selectedSlot) {
    return (
      <>
        <style>{globalStyles}</style>
        <ConfirmationScreen
          workspace={booking.workspace}
          service={booking.selectedService}
          selectedDate={booking.selectedDate}
          selectedSlot={booking.selectedSlot}
          primaryColor={booking.primaryColor}
          onNewBooking={booking.resetBooking}
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
            <ServiceList
              services={booking.services}
              selectedService={booking.selectedService}
              loading={booking.loading}
              primaryColor={booking.primaryColor}
              onSelect={booking.selectService}
              usePremiumLayout={usePremiumLayout}
              theme={booking.theme}
            />
          )}

          {/* STEP 2: Data */}
          {booking.step === 2 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, margin: '0 0 6px' }}>
                  Escolha uma data
                </h2>
                <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: 0 }}>
                  {booking.selectedService?.name} • {booking.selectedService?.durationMinutes} min
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
          {booking.step === 4 && booking.selectedService && booking.selectedDate && booking.selectedSlot && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>
                  Seus dados
                </h2>
              </div>
              
              <ClientForm
                service={booking.selectedService}
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
              />
            </>
          )}
        </div>
      </div>

      {/* Spacer para o footer sticky */}
      {booking.selectedService && booking.step < 4 && (
        <div style={{ height: 100 }} />
      )}

      {/* Footer sticky (passos 2 e 3 apenas) */}
      <StickyFooter
        selectedService={booking.selectedService}
        currentStep={booking.step}
        canProceed={booking.canProceed}
        loading={booking.loading}
        primaryColor={booking.primaryColor}
        onContinue={handleContinue}
      />

      {/* Parceiros & Patrocinadores */}
      {sponsors.length > 0 && (
        <section style={{
          padding: '40px 20px 32px',
          background: 'linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)',
          borderTop: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 16px', borderRadius: 20,
                background: 'rgba(0,0,0,0.04)', marginBottom: 10,
              }}>
                <span style={{ fontSize: 12 }}>🤝</span>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: COLORS.textMuted }}>
                  Parceiros Oficiais
                </span>
              </div>
              <p style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5, maxWidth: 400, margin: '0 auto' }}>
                Marcas e fornecedores que confiam na nossa plataforma
              </p>
            </div>

            {/* Sponsors Grid */}
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: 12, flexWrap: 'wrap',
            }}>
              {sponsors.slice(0, 8).map(s => {
                const tierAccent: Record<string, string> = {
                  DIAMOND: '#7c3aed', GOLD: '#d97706', SILVER: '#6b7280', BRONZE: '#92400e',
                };
                const accentColor = tierAccent[s.tier || ''] || COLORS.textMuted;
                const isDiamond = s.tier === 'DIAMOND';
                const isGold = s.tier === 'GOLD';

                return (
                  <a
                    key={s.id}
                    href={s.ctaUrl || s.websiteUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => { fetch(`${API_URL}/public/sponsors/${s.id}/click`, { method: 'POST' }).catch(() => {}); }}
                    title={s.ctaLabel || s.name}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 6, padding: '14px 18px', borderRadius: 14,
                      background: '#ffffff',
                      border: `1.5px solid ${isDiamond ? 'rgba(124,58,237,0.2)' : isGold ? 'rgba(217,119,6,0.15)' : COLORS.border}`,
                      boxShadow: isDiamond
                        ? '0 2px 12px rgba(124,58,237,0.08)'
                        : isGold
                          ? '0 2px 10px rgba(217,119,6,0.06)'
                          : '0 1px 4px rgba(0,0,0,0.04)',
                      minWidth: 100, minHeight: 70,
                      textDecoration: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = isDiamond
                        ? '0 8px 24px rgba(124,58,237,0.15)'
                        : isGold
                          ? '0 8px 20px rgba(217,119,6,0.12)'
                          : '0 6px 16px rgba(0,0,0,0.08)';
                      e.currentTarget.style.borderColor = accentColor;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = isDiamond
                        ? '0 2px 12px rgba(124,58,237,0.08)'
                        : isGold
                          ? '0 2px 10px rgba(217,119,6,0.06)'
                          : '0 1px 4px rgba(0,0,0,0.04)';
                      e.currentTarget.style.borderColor = isDiamond ? 'rgba(124,58,237,0.2)' : isGold ? 'rgba(217,119,6,0.15)' : COLORS.border;
                    }}
                  >
                    {/* Tier badge for Diamond/Gold */}
                    {(isDiamond || isGold) && (
                      <div style={{
                        position: 'absolute', top: -6, right: -4,
                        fontSize: 10, lineHeight: 1,
                      }}>
                        {isDiamond ? '💎' : '🥇'}
                      </div>
                    )}

                    {/* Logo ou Nome */}
                    {s.logoLightUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.logoLightUrl}
                        alt={s.name}
                        style={{
                          height: 28, maxWidth: 90, objectFit: 'contain',
                          filter: 'none',
                        }}
                      />
                    ) : (
                      <span style={{
                        color: COLORS.textPrimary, fontSize: 12, fontWeight: 700,
                        letterSpacing: '-0.2px', textAlign: 'center', lineHeight: 1.3,
                      }}>
                        {s.name}
                      </span>
                    )}

                    {/* Tier label */}
                    <span style={{
                      fontSize: 8, fontWeight: 700, letterSpacing: 1,
                      textTransform: 'uppercase', color: accentColor, opacity: 0.7,
                    }}>
                      {s.tier === 'DIAMOND' ? 'Diamond' : s.tier === 'GOLD' ? 'Gold' : s.tier === 'SILVER' ? 'Silver' : 'Bronze'}
                    </span>
                  </a>
                );
              })}
            </div>
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
