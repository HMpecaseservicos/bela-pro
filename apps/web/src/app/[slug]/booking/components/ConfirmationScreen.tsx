'use client';

import { Service, Workspace } from '../types';
import { COLORS, RADIUS, DEFAULT_COPY } from '../constants';
import { formatPrice, formatDateFull, formatTime, getServiceEmoji } from '../utils';

interface ConfirmationScreenProps {
  workspace: Workspace;
  services: Service[];
  selectedDate: string;
  selectedSlot: string;
  primaryColor?: string;
  onNewBooking: () => void;
}

export function ConfirmationScreen({
  workspace,
  services,
  selectedDate,
  selectedSlot,
  primaryColor = COLORS.primaryFallback,
  onNewBooking,
}: ConfirmationScreenProps) {
  const emoji = services.length === 1 ? getServiceEmoji(services[0].name) : '✨';
  const totalPrice = services.reduce((sum, s) => sum + s.priceCents, 0);
  const gradientBg = `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColorSimple(primaryColor, -40)} 100%)`;
  const address = workspace.profile?.addressLine;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: gradientBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: COLORS.surface,
          borderRadius: RADIUS.xl,
          padding: 32,
          textAlign: 'center',
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Ícone de sucesso */}
        <div
          style={{
            width: 72,
            height: 72,
            background: COLORS.success,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: `0 8px 24px ${COLORS.success}44`,
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Título */}
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: COLORS.textPrimary,
            margin: '0 0 8px',
          }}
        >
          {DEFAULT_COPY.confirmationTitle}
        </h1>

        <p
          style={{
            fontSize: 15,
            color: COLORS.textSecondary,
            margin: '0 0 24px',
          }}
        >
          {DEFAULT_COPY.confirmationSubtitle}
        </p>

        {/* Card com detalhes */}
        <div
          style={{
            background: COLORS.background,
            borderRadius: RADIUS.md,
            padding: 20,
            textAlign: 'left',
            marginBottom: 24,
          }}
        >
          {/* Serviço(s) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 16,
              paddingBottom: 16,
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <span style={{ fontSize: 24 }}>{emoji}</span>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  margin: 0,
                }}
              >
                {services.length === 1 ? services[0].name : `${services.length} serviços`}
              </p>
              {services.length > 1 && (
                <div style={{ marginTop: 4 }}>
                  {services.map(s => (
                    <p key={s.id} style={{ fontSize: 13, color: COLORS.textSecondary, margin: '2px 0' }}>
                      • {s.name}
                    </p>
                  ))}
                </div>
              )}
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: primaryColor,
                  margin: '4px 0 0',
                }}
              >
                {formatPrice(totalPrice)}
              </p>
            </div>
          </div>

          {/* Data e horário */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>📅</span>
              <span style={{ fontSize: 14, color: COLORS.textSecondary }}>
                {formatDateFull(selectedDate)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>⏰</span>
              <span style={{ fontSize: 14, color: COLORS.textSecondary }}>
                {formatTime(selectedSlot)}
              </span>
            </div>

            {address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>📍</span>
                <span style={{ fontSize: 14, color: COLORS.textSecondary }}>
                  {address}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Botões de ação */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Adicionar ao calendário (Google Calendar) */}
          <button
            onClick={() => {
              const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
              const startDate = new Date(selectedSlot);
              const endDate = new Date(startDate.getTime() + totalDuration * 60000);
              const serviceNames = services.map(s => s.name).join(' + ');
              const title = encodeURIComponent(`${serviceNames} - ${workspace.brandName || workspace.name}`);
              const details = encodeURIComponent(`Agendamento via BELA PRO`);
              const location = encodeURIComponent(address || '');
              const dates = `${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
              
              window.open(
                `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`,
                '_blank'
              );
            }}
            style={{
              width: '100%',
              padding: 14,
              background: COLORS.surface,
              color: COLORS.textPrimary,
              border: `2px solid ${COLORS.border}`,
              borderRadius: RADIUS.md,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span>📆</span>
            Adicionar ao calendário
          </button>

          {/* Link para gerenciar agendamento */}
          <a
            href={`/${workspace.slug}/gerenciar`}
            style={{
              width: '100%',
              padding: 14,
              background: COLORS.surface,
              color: COLORS.textSecondary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADIUS.md,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
              textAlign: 'center',
              display: 'block',
            }}
          >
            Precisa remarcar? Gerenciar agendamento
          </a>

          {/* Novo agendamento */}
          <button
            onClick={onNewBooking}
            style={{
              width: '100%',
              padding: 14,
              background: gradientBg,
              color: 'white',
              border: 'none',
              borderRadius: RADIUS.md,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: `0 4px 15px ${primaryColor}44`,
            }}
          >
            Fazer novo agendamento
          </button>
        </div>

        {/* Footer BELA PRO */}
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 11, color: COLORS.textMuted }}>Powered by</span>
          <img
            src="/logo.png"
            alt="BELA PRO"
            style={{
              height: 20,
              width: 'auto',
              opacity: 0.8,
            }}
          />
        </div>
      </div>
    </div>
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
