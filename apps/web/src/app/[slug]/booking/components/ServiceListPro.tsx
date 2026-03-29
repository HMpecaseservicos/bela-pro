'use client';

import { useState, useMemo } from 'react';
import { Service, ServiceCategory, ThemeConfig } from '../types';
import { ServiceSearchInput } from './ServiceSearchInput';
import { CategoryTabs } from './CategoryTabs';
import { ServiceCardCompact } from './ServiceCardCompact';

interface ServiceListProProps {
  services: Service[];
  categories: ServiceCategory[];
  selectedServices: Service[];
  onToggleService?: (service: Service) => void;
  onSelect?: (service: Service) => void; // Alias for onToggleService
  theme?: ThemeConfig;
  loading?: boolean;
  primaryColor?: string; // Fallback if no theme
}

export function ServiceListPro({
  services,
  categories,
  selectedServices,
  onToggleService,
  onSelect,
  theme,
  loading = false,
  primaryColor,
}: ServiceListProProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Use onSelect as alias for onToggleService
  const handleToggle = onToggleService || onSelect || (() => {});

  const textSecondary = theme?.colors.textSecondary || '#6e6256';
  const textMuted = theme?.colors.textSecondary || '#9b8e81';
  const surfaceColor = theme?.colors.surface || '#fff';

  // Agrupa serviços por categoria
  const groupedServices = useMemo(() => {
    const filtered = services.filter((service) => {
      // Filtro de busca
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = service.name.toLowerCase().includes(query);
        const matchDesc = service.description?.toLowerCase().includes(query);
        if (!matchName && !matchDesc) return false;
      }

      // Filtro de categoria
      if (selectedCategoryId !== null) {
        if (service.categoryId !== selectedCategoryId) return false;
      }

      return true;
    });

    // Agrupa por categoria
    const groups: { category: ServiceCategory | null; services: Service[] }[] = [];
    const uncategorized: Service[] = [];
    const categoryMap = new Map<string, Service[]>();

    filtered.forEach((service) => {
      if (service.categoryId && service.category) {
        const existing = categoryMap.get(service.categoryId) || [];
        existing.push(service);
        categoryMap.set(service.categoryId, existing);
      } else {
        uncategorized.push(service);
      }
    });

    // Ordena categorias pelo sortOrder
    const sortedCategories = [...categories]
      .filter((cat) => categoryMap.has(cat.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    sortedCategories.forEach((cat) => {
      groups.push({
        category: cat,
        services: categoryMap.get(cat.id) || [],
      });
    });

    // Adiciona serviços sem categoria no final
    if (uncategorized.length > 0) {
      groups.push({
        category: null,
        services: uncategorized,
      });
    }

    return groups;
  }, [services, categories, searchQuery, selectedCategoryId]);

  // Total de serviços filtrados
  const totalFiltered = groupedServices.reduce(
    (sum, group) => sum + group.services.length,
    0
  );

  // Loading state
  if (loading && services.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <SkeletonSearch />
        <SkeletonTabs />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  // Empty state
  if (!loading && services.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: textSecondary,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <p style={{ fontSize: 15, margin: 0 }}>
          Nenhum serviço disponível no momento.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Busca */}
      <ServiceSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        theme={theme}
      />

      {/* Tabs de categoria */}
      <CategoryTabs
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelect={setSelectedCategoryId}
        theme={theme}
      />

      {/* Resultado da busca */}
      {searchQuery && (
        <div
          style={{
            fontSize: 13,
            color: textMuted,
            marginBottom: 12,
          }}
        >
          {totalFiltered === 0
            ? 'Nenhum serviço encontrado'
            : `${totalFiltered} serviço${totalFiltered > 1 ? 's' : ''} encontrado${totalFiltered > 1 ? 's' : ''}`}
        </div>
      )}

      {/* Lista agrupada */}
      {groupedServices.map((group, index) => (
        <div key={group.category?.id || 'uncategorized'} style={{ marginBottom: 20 }}>
          {/* Header da categoria */}
          {group.category && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: `1px solid ${textSecondary}15`,
              }}
            >
              {group.category.iconEmoji && (
                <span style={{ fontSize: 20 }}>{group.category.iconEmoji}</span>
              )}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: theme?.colors.text || '#2f2a24',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                {group.category.name}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: textMuted,
                  marginLeft: 'auto',
                }}
              >
                {group.services.length} serviço{group.services.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Serviços sem categoria */}
          {!group.category && groupedServices.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: `1px solid ${textSecondary}15`,
              }}
            >
              <span style={{ fontSize: 20 }}>📁</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: theme?.colors.text || '#2f2a24',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                Outros
              </span>
            </div>
          )}

          {/* Cards */}
          {group.services.map((service) => (
            <ServiceCardCompact
              key={service.id}
              service={service}
              isSelected={selectedServices.some((s) => s.id === service.id)}
              onClick={() => handleToggle(service)}
              theme={theme}
            />
          ))}
        </div>
      ))}

      {/* Empty filtered state */}
      {totalFiltered === 0 && searchQuery && (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: textMuted,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ margin: 0, fontSize: 14 }}>
            Nenhum serviço corresponde à sua busca.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategoryId(null);
            }}
            style={{
              marginTop: 12,
              padding: '8px 16px',
              border: 'none',
              borderRadius: 8,
              background: theme?.colors.primary || '#a07a45',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}

// Skeleton components
function SkeletonSearch() {
  return (
    <div
      style={{
        height: 48,
        borderRadius: 12,
        background: '#f0ece6',
        marginBottom: 16,
        animation: 'pulse 1.5s infinite',
      }}
    />
  );
}

function SkeletonTabs() {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      {[70, 90, 80].map((w, i) => (
        <div
          key={i}
          style={{
            width: w,
            height: 40,
            borderRadius: 20,
            background: '#f0ece6',
            animation: 'pulse 1.5s infinite',
          }}
        />
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        height: 72,
        borderRadius: 12,
        background: '#f0ece6',
        marginBottom: 8,
        animation: 'pulse 1.5s infinite',
      }}
    />
  );
}
