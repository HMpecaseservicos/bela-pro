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
  StickyFooter,
  Spinner,
  skeletonStyles,
  HeroSection,
  ServiceCardPremium,
} from './components';

// Constants
import { COLORS } from './constants';
import { formatDateFull } from './utils';

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  // Hydration fix
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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

      {/* Footer branding BELA PRO */}
      <footer
        style={{
          textAlign: 'center',
          padding: '32px 20px 48px',
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.02) 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Powered by</span>
          <img
            src="/logo.png"
            alt="BELA PRO"
            style={{
              height: 24,
              width: 'auto',
              opacity: 0.85,
            }}
          />
        </div>
        <p
          style={{
            color: COLORS.textMuted,
            fontSize: 11,
            margin: 0,
            opacity: 0.7,
          }}
        >
          Sistema de agendamento profissional
        </p>
      </footer>
    </div>
  );
}
