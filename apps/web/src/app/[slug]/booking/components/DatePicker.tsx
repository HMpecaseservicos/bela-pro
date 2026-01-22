'use client';

import { useState } from 'react';
import { COLORS, RADIUS, DEFAULT_COPY } from '../constants';
import { formatDateShort } from '../utils';
import { SkeletonDateGrid } from './Skeleton';

interface DatePickerProps {
  availableDays: string[];
  selectedDate: string | null;
  loading: boolean;
  primaryColor?: string;
  onSelect: (date: string) => void;
}

export function DatePicker({
  availableDays,
  selectedDate,
  loading,
  primaryColor = COLORS.primaryFallback,
  onSelect,
}: DatePickerProps) {
  // Loading state
  if (loading) {
    return <SkeletonDateGrid />;
  }

  // Empty state
  if (availableDays.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: COLORS.textSecondary,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
        <p style={{ fontSize: 15, margin: 0 }}>{DEFAULT_COPY.noDates}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
      }}
    >
      {availableDays.map((date) => (
        <DateCard
          key={date}
          date={date}
          isSelected={selectedDate === date}
          primaryColor={primaryColor}
          onClick={() => onSelect(date)}
        />
      ))}
    </div>
  );
}

interface DateCardProps {
  date: string;
  isSelected: boolean;
  primaryColor: string;
  onClick: () => void;
}

function DateCard({ date, isSelected, primaryColor, onClick }: DateCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { day, weekday, month } = formatDateShort(date);

  const isToday = date === new Date().toISOString().split('T')[0];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      style={{
        border: `2px solid ${isSelected ? primaryColor : isHovered ? `${primaryColor}66` : COLORS.border}`,
        borderRadius: RADIUS.md,
        padding: '14px 8px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        backgroundColor: isSelected ? primaryColor : COLORS.surface,
        transform: isHovered && !isSelected ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered && !isSelected ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
      }}
    >
      {/* Dia do mês */}
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: isSelected ? 'white' : COLORS.textPrimary,
          lineHeight: 1,
        }}
      >
        {day}
      </div>

      {/* Dia da semana */}
      <div
        style={{
          fontSize: 12,
          color: isSelected ? 'rgba(255,255,255,0.9)' : COLORS.textSecondary,
          textTransform: 'capitalize',
          marginTop: 4,
        }}
      >
        {weekday}
      </div>

      {/* Mês */}
      <div
        style={{
          fontSize: 11,
          color: isSelected ? 'rgba(255,255,255,0.8)' : COLORS.textMuted,
          textTransform: 'capitalize',
          marginTop: 2,
        }}
      >
        {month}
      </div>

      {/* Indicador "Hoje" */}
      {isToday && (
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: isSelected ? 'white' : primaryColor,
            marginTop: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Hoje
        </div>
      )}
    </div>
  );
}
