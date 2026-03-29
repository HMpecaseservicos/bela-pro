'use client';

import { ThemeConfig } from '../types';

interface ServiceSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  theme?: ThemeConfig;
}

export function ServiceSearchInput({
  value,
  onChange,
  placeholder = 'Buscar serviço...',
  theme,
}: ServiceSearchInputProps) {
  const primaryColor = theme?.colors.primary || '#a07a45';
  const surfaceColor = theme?.colors.surface || '#fff';
  const borderColor = theme?.colors.textSecondary || '#e4dbcf';

  return (
    <div
      style={{
        position: 'relative',
        marginBottom: 16,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 18,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      >
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '14px 14px 14px 44px',
          borderRadius: 12,
          border: `1px solid ${borderColor}40`,
          background: surfaceColor,
          fontSize: 15,
          color: theme?.colors.text || '#2f2a24',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = primaryColor;
          e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = `${borderColor}40`;
          e.target.style.boxShadow = 'none';
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            fontSize: 16,
            opacity: 0.5,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
