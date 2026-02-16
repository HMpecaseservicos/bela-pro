'use client';

import { useState, useEffect, useCallback } from 'react';
import { RADIUS } from '../constants';
import { getImageUrl } from '@/lib/utils';

interface GalleryLightboxProps {
  images: string[];
  onClose: () => void;
  initialIndex?: number;
}

export function GalleryLightbox({ images, onClose, initialIndex = 0 }: GalleryLightboxProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [current]);

  // Bloquear scroll do body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrent((c) => (c - 1 + images.length) % images.length);
  }, [images.length]);

  // Swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) goNext();
    if (isRightSwipe) goPrev();
  };

  const buttonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 50,
    height: 50,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: 24,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    zIndex: 10,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.95)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={onClose}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
          📷 {current + 1} / {images.length}
        </div>
        <button
          onClick={onClose}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            fontSize: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      {/* Main Image Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '0 60px',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Prev Button */}
        {images.length > 1 && (
          <button
            onClick={goPrev}
            style={{ ...buttonStyle, left: 10 }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          >
            ‹
          </button>
        )}

        {/* Image */}
        <div
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isZoomed ? 'zoom-out' : 'zoom-in',
          }}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <img
            src={getImageUrl(images[current])}
            alt={`Imagem ${current + 1}`}
            style={{
              maxWidth: isZoomed ? '150%' : '100%',
              maxHeight: isZoomed ? '150%' : 'calc(100vh - 200px)',
              objectFit: 'contain',
              borderRadius: RADIUS.md,
              transition: 'transform 0.3s ease',
              transform: isZoomed ? 'scale(1.5)' : 'scale(1)',
            }}
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={goNext}
            style={{ ...buttonStyle, right: 10 }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          >
            ›
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            padding: '16px 20px 24px',
            overflowX: 'auto',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: 60,
                height: 60,
                borderRadius: RADIUS.sm,
                overflow: 'hidden',
                border: i === current ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                padding: 0,
                cursor: 'pointer',
                opacity: i === current ? 1 : 0.6,
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
            >
              <img
                src={getImageUrl(url)}
                alt={`Thumb ${i + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Swipe hint on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .lightbox-nav-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// Preview component para ser usado no HeroSection
interface GalleryPreviewProps {
  images: string[];
  onOpen: (index: number) => void;
  primaryColor?: string;
}

export function GalleryPreview({ images, onOpen, primaryColor = '#f59e0b' }: GalleryPreviewProps) {
  if (!images || images.length === 0) return null;

  const displayCount = Math.min(4, images.length);
  const hasMore = images.length > 4;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        zIndex: 5,
      }}
    >
      {/* Thumbnails */}
      <div style={{ display: 'flex', gap: 4 }}>
        {images.slice(0, displayCount).map((url, i) => (
          <button
            key={i}
            onClick={() => onOpen(i)}
            style={{
              width: 52,
              height: 52,
              borderRadius: RADIUS.sm,
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.9)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              padding: 0,
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <img
              src={getImageUrl(url)}
              alt={`Galeria ${i + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </button>
        ))}
      </div>

      {/* Ver mais badge */}
      {hasMore && (
        <button
          onClick={() => onOpen(0)}
          style={{
            height: 52,
            padding: '0 14px',
            borderRadius: RADIUS.md,
            background: primaryColor,
            border: 'none',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span style={{ fontSize: 16 }}>📸</span>
          +{images.length - displayCount}
        </button>
      )}

      {/* Single "Ver galeria" button if 4 or fewer images */}
      {!hasMore && images.length > 0 && (
        <button
          onClick={() => onOpen(0)}
          style={{
            height: 36,
            padding: '0 12px',
            borderRadius: RADIUS.full,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Ver galeria
        </button>
      )}
    </div>
  );
}
