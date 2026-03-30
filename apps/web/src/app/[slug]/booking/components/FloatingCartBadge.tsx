'use client';

import { useState } from 'react';
import { CartItem, ThemeConfig } from '../types';
import { formatPrice } from '../utils';
import { getImageUrl } from '@/lib/utils';

interface FloatingCartBadgeProps {
  cart: CartItem[];
  totalCartPrice: number;
  cartItemCount: number;
  theme?: ThemeConfig;
  primaryColor?: string;
  onRemoveFromCart?: (serviceId: string) => void;
  onUpdateCartQuantity?: (serviceId: string, quantity: number) => void;
}

export function FloatingCartBadge({
  cart,
  totalCartPrice,
  cartItemCount,
  theme,
  primaryColor = '#a07a45',
  onRemoveFromCart,
  onUpdateCartQuantity,
}: FloatingCartBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  if (cart.length === 0) return null;

  const color = theme?.colors.primary || primaryColor;

  return (
    <>
      {/* Overlay */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 998,
          }}
        />
      )}

      {/* Painel expandido do carrinho */}
      {expanded && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            left: 16,
            maxWidth: 400,
            marginInline: 'auto',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            zIndex: 999,
            padding: 20,
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#2f2a24' }}>
              🛒 Carrinho
            </h3>
            <button
              onClick={() => setExpanded(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: '#999',
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>

          {cart.map(item => {
            const imgUrl = (item.service as any).imageUrl ? getImageUrl((item.service as any).imageUrl) : '';
            return (
              <div
                key={item.service.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid #f0ebe5',
                }}
              >
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={item.service.name}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    background: '#f5f0eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}>
                    🛍️
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#2f2a24',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.service.name}
                  </p>
                  <p style={{ fontSize: 13, color: '#9b8e81', margin: '2px 0 0' }}>
                    {formatPrice(item.service.priceCents)} × {item.quantity}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: `1.5px solid ${color}`, borderRadius: 8, overflow: 'hidden' }}>
                  <button
                    onClick={() => onUpdateCartQuantity?.(item.service.id, item.quantity - 1)}
                    style={{
                      width: 30,
                      height: 30,
                      background: 'transparent',
                      border: 'none',
                      fontSize: 16,
                      fontWeight: 600,
                      color,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    −
                  </button>
                  <span style={{ width: 24, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#2f2a24' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateCartQuantity?.(item.service.id, item.quantity + 1)}
                    style={{
                      width: 30,
                      height: 30,
                      background: 'transparent',
                      border: 'none',
                      fontSize: 16,
                      fontWeight: 600,
                      color,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}

          <div style={{
            marginTop: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 14, color: '#6e6256' }}>Total produtos:</span>
            <span style={{ fontSize: 18, fontWeight: 700, color }}>
              {formatPrice(totalCartPrice)}
            </span>
          </div>
        </div>
      )}

      {/* Badge flutuante */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          width: expanded ? 56 : 'auto',
          minWidth: 56,
          height: 56,
          borderRadius: 28,
          background: color,
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: expanded ? 0 : '0 20px 0 16px',
          transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: 22 }}>🛒</span>
        {!expanded && (
          <>
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {cartItemCount}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {formatPrice(totalCartPrice)}
            </span>
          </>
        )}
        {/* Contador badge */}
        <span style={{
          position: 'absolute',
          top: -4,
          right: -4,
          width: 22,
          height: 22,
          borderRadius: 11,
          background: '#ef4444',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #fff',
        }}>
          {cartItemCount}
        </span>
      </button>
    </>
  );
}
