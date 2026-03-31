'use client';

import { Service, Workspace, CartItem, OrderPublic } from '../types';
import { COLORS, RADIUS, DEFAULT_COPY } from '../constants';
import { formatPrice, formatDateFull, formatTime } from '../utils';
import { getImageUrl } from '@/lib/utils';

interface ConfirmationScreenProps {
  workspace: Workspace;
  services: Service[];
  selectedDate: string | null;
  selectedSlot: string | null;
  primaryColor?: string;
  onNewBooking: () => void;
  // LOJA UNIFICADA
  cart?: CartItem[];
  orderResult?: OrderPublic | null;
}

export function ConfirmationScreen({
  workspace,
  services,
  selectedDate,
  selectedSlot,
  primaryColor = COLORS.primaryFallback,
  onNewBooking,
  // LOJA UNIFICADA
  cart = [],
  orderResult,
}: ConfirmationScreenProps) {
  const hasServices = services.length > 0;
  const hasProducts = cart.length > 0 || !!orderResult;
  const totalServicePrice = services.reduce((sum, s) => sum + s.priceCents, 0);
  const totalCartPrice = cart.reduce((sum, item) => sum + item.service.priceCents * item.quantity, 0);
  const totalPrice = totalServicePrice + totalCartPrice;
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
          {hasServices && hasProducts ? 'Agendamento e pedido confirmados!' :
           hasProducts ? 'Pedido confirmado!' :
           DEFAULT_COPY.confirmationTitle}
        </h1>

        <p
          style={{
            fontSize: 15,
            color: COLORS.textSecondary,
            margin: '0 0 24px',
          }}
        >
          {hasServices ? DEFAULT_COPY.confirmationSubtitle : 'Obrigado pela sua compra!'}
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
          {hasServices && (
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
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${primaryColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              </div>
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
                  {formatPrice(totalServicePrice)}
                </p>
              </div>
            </div>
          )}

          {/* LOJA UNIFICADA: Produtos do pedido */}
          {hasProducts && (
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
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#10b98112', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    margin: 0,
                  }}
                >
                  Produtos
                </p>
                <div style={{ marginTop: 4 }}>
                  {cart.map(item => {
                    const imgUrl = (item.service as any).imageUrl ? getImageUrl((item.service as any).imageUrl) : '';
                    return (
                      <div key={item.service.id} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                        {imgUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgUrl}
                            alt={item.service.name}
                            style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }}
                          />
                        )}
                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                          {item.service.name} × {item.quantity} — {formatPrice(item.service.priceCents * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: primaryColor,
                    margin: '4px 0 0',
                  }}
                >
                  {formatPrice(totalCartPrice)}
                </p>
              </div>
            </div>
          )}

          {/* Total combinado se ambos */}
          {hasServices && hasProducts && (
            <div style={{ 
              textAlign: 'right', 
              marginBottom: 16, 
              paddingBottom: 16, 
              borderBottom: `1px solid ${COLORS.border}` 
            }}>
              <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Total: </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: primaryColor }}>
                {formatPrice(totalPrice)}
              </span>
            </div>
          )}

          {/* Data e horário (condicional) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.textSecondary} strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                <span style={{ fontSize: 14, color: COLORS.textSecondary }}>
                  {formatDateFull(selectedDate)}
                </span>
              </div>
            )}

            {selectedSlot && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.textSecondary} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <span style={{ fontSize: 14, color: COLORS.textSecondary }}>
                  {formatTime(selectedSlot)}
                </span>
              </div>
            )}

            {address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.textSecondary} strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style={{ fontSize: 14, color: COLORS.textSecondary }}>
                  {address}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Botões de ação */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Adicionar ao calendário (Google Calendar) - só quando tem serviço agendado */}
          {hasServices && selectedSlot && (
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
          )}

          {/* Link para gerenciar agendamento - só quando tem serviço */}
          {hasServices && (
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
          )}

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
