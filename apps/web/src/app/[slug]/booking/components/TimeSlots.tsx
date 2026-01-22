'use client';

import { useState } from 'react';
import { TimeSlot } from '../types';
import { COLORS, RADIUS, DEFAULT_COPY } from '../constants';
import { formatTime } from '../utils';
import { SkeletonTimeSlots } from './Skeleton';

interface TimeSlotsProps {
  slots: TimeSlot[];
  selectedSlot: string | null;
  loading: boolean;
  primaryColor?: string;
  onSelect: (slot: string) => void;
}

export function TimeSlots({
  slots,
  selectedSlot,
  loading,
  primaryColor = COLORS.primaryFallback,
  onSelect,
}: TimeSlotsProps) {
  // Loading state
  if (loading) {
    return <SkeletonTimeSlots />;
  }

  // Empty state
  if (slots.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: COLORS.textSecondary,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
        <p style={{ fontSize: 15, margin: 0 }}>{DEFAULT_COPY.noSlots}</p>
      </div>
    );
  }

  // Agrupar slots por período (manhã, tarde, noite)
  const morning = slots.filter((s) => {
    const hour = new Date(s.startAt).getHours();
    return hour >= 6 && hour < 12;
  });

  const afternoon = slots.filter((s) => {
    const hour = new Date(s.startAt).getHours();
    return hour >= 12 && hour < 18;
  });

  const evening = slots.filter((s) => {
    const hour = new Date(s.startAt).getHours();
    return hour >= 18 || hour < 6;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {morning.length > 0 && (
        <SlotGroup
          label="Manhã"
          icon="🌅"
          slots={morning}
          selectedSlot={selectedSlot}
          primaryColor={primaryColor}
          onSelect={onSelect}
        />
      )}

      {afternoon.length > 0 && (
        <SlotGroup
          label="Tarde"
          icon="☀️"
          slots={afternoon}
          selectedSlot={selectedSlot}
          primaryColor={primaryColor}
          onSelect={onSelect}
        />
      )}

      {evening.length > 0 && (
        <SlotGroup
          label="Noite"
          icon="🌙"
          slots={evening}
          selectedSlot={selectedSlot}
          primaryColor={primaryColor}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

interface SlotGroupProps {
  label: string;
  icon: string;
  slots: TimeSlot[];
  selectedSlot: string | null;
  primaryColor: string;
  onSelect: (slot: string) => void;
}

function SlotGroup({
  label,
  icon,
  slots,
  selectedSlot,
  primaryColor,
  onSelect,
}: SlotGroupProps) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: COLORS.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}
      >
        {slots.map((slot) => (
          <TimeSlotButton
            key={slot.startAt}
            slot={slot}
            isSelected={selectedSlot === slot.startAt}
            primaryColor={primaryColor}
            onClick={() => onSelect(slot.startAt)}
          />
        ))}
      </div>
    </div>
  );
}

interface TimeSlotButtonProps {
  slot: TimeSlot;
  isSelected: boolean;
  primaryColor: string;
  onClick: () => void;
}

function TimeSlotButton({ slot, isSelected, primaryColor, onClick }: TimeSlotButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '12px 8px',
        border: `2px solid ${isSelected ? primaryColor : COLORS.border}`,
        borderRadius: RADIUS.sm,
        backgroundColor: isSelected
          ? primaryColor
          : isHovered
            ? `${primaryColor}11`
            : COLORS.surface,
        color: isSelected ? 'white' : isHovered ? primaryColor : COLORS.textPrimary,
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isHovered && !isSelected ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {formatTime(slot.startAt)}
    </button>
  );
}
