'use client';

import { useState, useEffect } from 'react';
import { Service, Workspace, PaymentInfo, CartItem } from '../types';
import { COLORS, RADIUS, DEFAULT_COPY } from '../constants';
import { formatPrice, formatDateFull, formatTime } from '../utils';

interface PixPaymentScreenProps {
  workspace: Workspace;
  services: Service[];
  selectedDate: string | null;
  selectedSlot: string | null;
  paymentInfo: PaymentInfo;
  primaryColor?: string;
  cart?: CartItem[];
}

export function PixPaymentScreen({
  workspace,
  services,
  selectedDate,
  selectedSlot,
  paymentInfo,
  primaryColor = COLORS.primaryFallback,
  cart = [],
}: PixPaymentScreenProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);
  
  const serviceNames = services.map(s => s.name).join(' + ');
  const hasServices = services.length > 0;
  const hasProducts = cart.length > 0;

  // Timer countdown
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expiresAt = new Date(paymentInfo.expiresAt);
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft('Expirado');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [paymentInfo.expiresAt]);

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(paymentInfo.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const openWhatsApp = () => {
    const phone = workspace.profile?.phoneE164?.replace(/\D/g, '') || '';
    if (!phone) {
      alert('Telefone do estabelecimento não encontrado');
      return;
    }
    
    const message = encodeURIComponent(
      hasServices && selectedDate && selectedSlot
        ? `Olá! Acabei de fazer um agendamento em ${workspace.brandName || workspace.name} ` +
          `para ${formatDateFull(selectedDate)} às ${formatTime(selectedSlot)}. ` +
          `Estou enviando o comprovante PIX para confirmação.`
        : `Olá! Acabei de fazer um pedido em ${workspace.brandName || workspace.name}. ` +
          `Estou enviando o comprovante PIX para confirmação.`
    );
    
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const gradientBg = `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColorSimple(primaryColor, -40)} 100%)`;

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
          padding: 24,
          textAlign: 'center',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Ícone PIX */}
        <div
          style={{
            width: 60,
            height: 60,
            background: expired ? '#fee2e2' : '#dcfce7',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28,
          }}
        >
          {expired ? '⏰' : '💳'}
        </div>

        {/* Timer */}
        <div
          style={{
            background: expired ? '#fee2e2' : '#fef3c7',
            color: expired ? '#dc2626' : '#d97706',
            padding: '8px 16px',
            borderRadius: 20,
            display: 'inline-block',
            marginBottom: 16,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {expired ? '⚠️ Tempo expirado' : `⏱️ Expira em: ${timeLeft}`}
        </div>

        {/* Título */}
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.textPrimary,
            margin: '0 0 8px',
          }}
        >
          {expired ? 'Pagamento Expirado' : 'Pague via PIX'}
        </h1>

        <p
          style={{
            fontSize: 14,
            color: COLORS.textSecondary,
            margin: '0 0 20px',
          }}
        >
          {expired
            ? 'O tempo para pagamento expirou. Faça um novo agendamento.'
            : hasServices
              ? 'Para confirmar seu agendamento, realize o pagamento PIX abaixo'
              : 'Para confirmar seu pedido, realize o pagamento PIX abaixo'}
        </p>

        {!expired && (
          <>
            {/* QR Code PIX */}
            {paymentInfo.pixCode && (
              <div
                style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                  border: '2px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                  Escaneie o QR Code com seu app de banco
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentInfo.pixCode)}`}
                    alt="QR Code PIX"
                    style={{
                      width: 200,
                      height: 200,
                      borderRadius: 8,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: '#10b981',
                  }}
                >
                  {formatPrice(paymentInfo.amountCents)}
                </div>
              </div>
            )}

            {/* Detalhes do agendamento */}
            <div
              style={{
                background: COLORS.background,
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                {hasServices && hasProducts ? 'DETALHES DO PEDIDO' : hasProducts ? 'DETALHES DO PEDIDO' : 'DETALHES DO AGENDAMENTO'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
                {hasServices && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Serviço{services.length > 1 ? 's' : ''}:</span>
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>{serviceNames}</span>
                  </div>
                )}
                {hasProducts && (
                  <div>
                    <span style={{ color: '#64748b', fontSize: 14 }}>Produtos:</span>
                    {cart.map(item => (
                      <div key={item.service.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ color: '#64748b', fontSize: 13 }}>• {item.service.name} × {item.quantity}</span>
                        <span style={{ color: '#1e293b', fontWeight: 500, fontSize: 13 }}>{formatPrice(item.service.priceCents * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Data:</span>
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>{formatDateFull(selectedDate)}</span>
                  </div>
                )}
                {selectedSlot && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Horário:</span>
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>{formatTime(selectedSlot)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Dados do PIX */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 12 }}>
                DADOS DO PIX
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Recebedor</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                  {paymentInfo.pixRecipientName}
                </div>
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Chave PIX</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                  {paymentInfo.pixKeyMasked}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  Código PIX Copia e Cola
                </div>
                <div
                  style={{
                    background: 'white',
                    border: '2px dashed #e2e8f0',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 12,
                    color: '#64748b',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                    maxHeight: 80,
                    overflow: 'auto',
                  }}
                >
                  {paymentInfo.pixCode}
                </div>
              </div>
            </div>

            {/* Botão Copiar */}
            <button
              onClick={copyPixCode}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: copied ? '#10b981' : primaryColor,
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {copied ? (
                <>✓ Copiado!</>
              ) : (
                <>📋 Copiar Código PIX</>
              )}
            </button>

            {/* Botão WhatsApp */}
            <button
              onClick={openWhatsApp}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: '#25D366',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              📱 Enviar Comprovante no WhatsApp
            </button>

            {/* Instruções */}
            {paymentInfo.instructions && (
              <div
                style={{
                  marginTop: 20,
                  padding: 14,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 10,
                  fontSize: 13,
                  color: '#1e40af',
                  textAlign: 'left',
                }}
              >
                <strong>ℹ️ Instruções:</strong> {paymentInfo.instructions}
              </div>
            )}

            {/* Aviso */}
            <p
              style={{
                marginTop: 20,
                fontSize: 12,
                color: '#94a3b8',
                textAlign: 'center',
              }}
            >
              Após o pagamento, seu agendamento será confirmado assim que verificarmos o comprovante.
              Você receberá uma confirmação via WhatsApp.
            </p>
          </>
        )}

        {expired && (
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: '14px 32px',
              background: primaryColor,
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Fazer Novo Agendamento
          </button>
        )}
      </div>
    </div>
  );
}

// Helper para ajustar cor
function adjustColorSimple(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}
