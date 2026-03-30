'use client';

import { useState } from 'react';
import { Service, CartItem } from '../types';
import { COLORS, RADIUS, DEFAULT_COPY } from '../constants';
import { formatPrice, formatDateFull, formatTime, formatDuration, getServiceEmoji } from '../utils';
import { getImageUrl } from '@/lib/utils';

interface ClientFormProps {
  services: Service[];
  selectedDate: string | null;
  selectedSlot: string | null;
  clientName: string;
  clientPhone: string;
  loading: boolean;
  error: string | null;
  primaryColor?: string;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onSubmit: () => void;
  // LOJA UNIFICADA
  cart?: CartItem[];
  totalCombinedPrice?: number;
}

export function ClientForm({
  services,
  selectedDate,
  selectedSlot,
  clientName,
  clientPhone,
  loading,
  error,
  primaryColor = COLORS.primaryFallback,
  onNameChange,
  onPhoneChange,
  onSubmit,
  // LOJA UNIFICADA
  cart = [],
  totalCombinedPrice,
}: ClientFormProps) {
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalPrice = services.reduce((sum, s) => sum + s.priceCents, 0);
  const totalCartPrice = cart.reduce((sum, item) => sum + item.service.priceCents * item.quantity, 0);
  const displayPrice = totalCombinedPrice !== undefined ? totalCombinedPrice : (totalPrice + totalCartPrice);
  const hasServices = services.length > 0;
  const hasProducts = cart.length > 0;
  const emoji = hasServices 
    ? (services.length === 1 ? getServiceEmoji(services[0].name) : '✨')
    : '🛍️';
  const gradientBg = `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColorSimple(primaryColor, -40)} 100%)`;

  const isNameValid = clientName.trim().length >= 3;
  const isPhoneValid = clientPhone.replace(/\D/g, '').length >= 10;
  const canSubmit = isNameValid && isPhoneValid && !loading;

  // Formatar telefone enquanto digita
  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length >= 2) {
      formatted = `(${cleaned.slice(0, 2)}) `;
      if (cleaned.length >= 7) {
        formatted += `${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
      } else {
        formatted += cleaned.slice(2);
      }
    }

    onPhoneChange(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Card de Resumo */}
      <div
        style={{
          background: gradientBg,
          borderRadius: RADIUS.lg,
          padding: 20,
          color: 'white',
          marginBottom: 24,
        }}
      >
        <p
          style={{
            fontSize: 12,
            opacity: 0.8,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {DEFAULT_COPY.summaryLabel}
        </p>

        <div style={{ marginTop: 12 }}>
          {hasServices && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{emoji}</span>
                <span style={{ fontSize: 18, fontWeight: 700 }}>
                  {services.length === 1 ? services[0].name : `${services.length} serviços`}
                </span>
              </div>
              
              {services.length > 1 && (
                <div style={{ marginTop: 8, paddingLeft: 28 }}>
                  {services.map(s => (
                    <p key={s.id} style={{ fontSize: 13, opacity: 0.9, margin: '2px 0' }}>
                      • {s.name}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}

          {/* LOJA UNIFICADA: Itens do carrinho */}
          {hasProducts && (
            <div style={{ marginTop: hasServices ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🛍️</span>
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} produto{cart.reduce((sum, item) => sum + item.quantity, 0) > 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ marginTop: 6, paddingLeft: 28 }}>
                {cart.map(item => {
                  const imgUrl = (item.service as any).imageUrl ? getImageUrl((item.service as any).imageUrl) : '';
                  return (
                    <div key={item.service.id} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                      {imgUrl && (
                        <img
                          src={imgUrl}
                          alt={item.service.name}
                          style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
                        />
                      )}
                      <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>
                        {item.service.name} × {item.quantity}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedDate && (
              <p style={{ fontSize: 14, opacity: 0.95, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📅</span>
                {formatDateFull(selectedDate)}
              </p>
            )}
            {selectedSlot && (
              <p style={{ fontSize: 14, opacity: 0.95, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🕐</span>
                {formatTime(selectedSlot)}
              </p>
            )}
            {hasServices && totalDuration > 0 && (
              <p style={{ fontSize: 14, opacity: 0.95, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⏱</span>
                {formatDuration(totalDuration)}
              </p>
            )}
          </div>
        </div>

        <p
          style={{
            fontSize: 26,
            fontWeight: 700,
            textAlign: 'right',
            margin: '16px 0 0',
          }}
        >
          {formatPrice(displayPrice)}
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div
          style={{
            background: COLORS.errorLight,
            border: `1px solid ${COLORS.error}33`,
            color: COLORS.error,
            padding: 14,
            borderRadius: RADIUS.md,
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Campo Nome */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 8,
            color: COLORS.textPrimary,
          }}
        >
          {DEFAULT_COPY.nameLabel}
        </label>
        <input
          type="text"
          value={clientName}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={() => setNameTouched(true)}
          placeholder={DEFAULT_COPY.namePlaceholder}
          style={{
            width: '100%',
            padding: 16,
            border: `2px solid ${
              nameTouched && !isNameValid ? COLORS.error : COLORS.border
            }`,
            borderRadius: RADIUS.md,
            fontSize: 16,
            outline: 'none',
            transition: 'border-color 0.2s ease',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = primaryColor;
          }}
          onBlurCapture={(e) => {
            e.target.style.borderColor = nameTouched && !isNameValid ? COLORS.error : COLORS.border;
          }}
        />
        {nameTouched && !isNameValid && (
          <p style={{ color: COLORS.error, fontSize: 12, marginTop: 6 }}>
            Digite seu nome completo
          </p>
        )}
      </div>

      {/* Campo Telefone */}
      <div style={{ marginBottom: 24 }}>
        <label
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 8,
            color: COLORS.textPrimary,
          }}
        >
          {DEFAULT_COPY.phoneLabel}
        </label>
        <input
          type="tel"
          value={clientPhone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          onBlur={() => setPhoneTouched(true)}
          placeholder={DEFAULT_COPY.phonePlaceholder}
          maxLength={16}
          style={{
            width: '100%',
            padding: 16,
            border: `2px solid ${
              phoneTouched && !isPhoneValid ? COLORS.error : COLORS.border
            }`,
            borderRadius: RADIUS.md,
            fontSize: 16,
            outline: 'none',
            transition: 'border-color 0.2s ease',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = primaryColor;
          }}
          onBlurCapture={(e) => {
            e.target.style.borderColor = phoneTouched && !isPhoneValid ? COLORS.error : COLORS.border;
          }}
        />
        {phoneTouched && !isPhoneValid && (
          <p style={{ color: COLORS.error, fontSize: 12, marginTop: 6 }}>
            Digite um número válido com DDD
          </p>
        )}
      </div>

      {/* Botão Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          width: '100%',
          padding: 18,
          background: canSubmit ? gradientBg : COLORS.border,
          color: canSubmit ? 'white' : COLORS.textMuted,
          border: 'none',
          borderRadius: RADIUS.md,
          fontSize: 16,
          fontWeight: 600,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          boxShadow: canSubmit ? `0 4px 15px ${primaryColor}44` : 'none',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span
              style={{
                width: 18,
                height: 18,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            Confirmando...
          </span>
        ) : (
          hasServices && hasProducts ? 'Confirmar agendamento e pedido' :
          hasProducts ? 'Confirmar pedido' :
          'Confirmar agendamento'
        )}
      </button>
    </form>
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
