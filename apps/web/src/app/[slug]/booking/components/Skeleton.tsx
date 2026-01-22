'use client';

import { COLORS, RADIUS } from '../constants';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({ 
  width = '100%', 
  height = 20, 
  borderRadius = RADIUS.sm,
  className = '' 
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius,
        background: `linear-gradient(90deg, ${COLORS.borderLight} 25%, ${COLORS.border} 50%, ${COLORS.borderLight} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

interface SkeletonServiceCardProps {
  primaryColor?: string;
}

export function SkeletonServiceCard({ primaryColor = COLORS.primaryFallback }: SkeletonServiceCardProps) {
  return (
    <div
      style={{
        border: `2px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg,
        padding: 20,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Skeleton width={32} height={32} borderRadius={RADIUS.sm} />
            <Skeleton width="60%" height={20} />
          </div>
          <Skeleton width="80%" height={16} />
          <div style={{ marginTop: 12 }}>
            <Skeleton width={80} height={14} />
          </div>
        </div>
        <Skeleton width={80} height={24} />
      </div>
    </div>
  );
}

export function SkeletonDateGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton 
          key={i} 
          height={80} 
          borderRadius={RADIUS.md} 
        />
      ))}
    </div>
  );
}

export function SkeletonTimeSlots() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton 
          key={i} 
          height={48} 
          borderRadius={RADIUS.sm} 
        />
      ))}
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Skeleton width={56} height={56} borderRadius={RADIUS.md} />
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height={22} />
        <div style={{ marginTop: 8 }}>
          <Skeleton width="40%" height={14} />
        </div>
      </div>
    </div>
  );
}

// Spinner simples
interface SpinnerProps {
  size?: number;
  color?: string;
  borderWidth?: number;
}

export function Spinner({ 
  size = 40, 
  color = COLORS.primaryFallback,
  borderWidth = 4 
}: SpinnerProps) {
  return (
    <div
      className="spinner"
      style={{
        width: size,
        height: size,
        border: `${borderWidth}px solid ${COLORS.border}`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  );
}

// CSS global para animações (injetado uma vez)
export const skeletonStyles = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
