'use client';

import { useRef, useEffect } from 'react';
import { ServiceCategory, ThemeConfig } from '../types';

interface CategoryTabsProps {
  categories: ServiceCategory[];
  selectedCategoryId: string | null; // null = "Todos"
  onSelect: (categoryId: string | null) => void;
  theme?: ThemeConfig;
}

export function CategoryTabs({
  categories,
  selectedCategoryId,
  onSelect,
  theme,
}: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const primaryColor = theme?.colors.primary || '#a07a45';
  const surfaceColor = theme?.colors.surface || '#fff';
  const textColor = theme?.colors.text || '#2f2a24';
  const textSecondary = theme?.colors.textSecondary || '#6e6256';

  // Scroll para tab ativa quando selecionada
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeTab = scrollRef.current.querySelector('[data-active="true"]');
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedCategoryId]);

  if (categories.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 8,
        marginBottom: 16,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Tab "Todos" */}
      <TabButton
        label="Todos"
        emoji="📋"
        isActive={selectedCategoryId === null}
        onClick={() => onSelect(null)}
        primaryColor={primaryColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondary={textSecondary}
      />

      {/* Tabs de categorias */}
      {categories.map((cat) => (
        <TabButton
          key={cat.id}
          label={cat.name}
          emoji={cat.iconEmoji || undefined}
          color={cat.color || undefined}
          isActive={selectedCategoryId === cat.id}
          onClick={() => onSelect(cat.id)}
          primaryColor={primaryColor}
          surfaceColor={surfaceColor}
          textColor={textColor}
          textSecondary={textSecondary}
        />
      ))}
    </div>
  );
}

interface TabButtonProps {
  label: string;
  emoji?: string;
  color?: string;
  isActive: boolean;
  onClick: () => void;
  primaryColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondary: string;
}

function TabButton({
  label,
  emoji,
  color,
  isActive,
  onClick,
  primaryColor,
  surfaceColor,
  textColor,
  textSecondary,
}: TabButtonProps) {
  return (
    <button
      data-active={isActive}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 16px',
        borderRadius: 20,
        border: 'none',
        background: isActive
          ? primaryColor
          : surfaceColor,
        color: isActive ? '#fff' : textSecondary,
        fontSize: 14,
        fontWeight: isActive ? 600 : 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s ease',
        boxShadow: isActive
          ? `0 4px 12px ${primaryColor}40`
          : `0 2px 6px rgba(0,0,0,0.06)`,
        flexShrink: 0,
      }}
    >
      {emoji && (
        <span style={{ fontSize: 16 }}>{emoji}</span>
      )}
      <span>{label}</span>
    </button>
  );
}
