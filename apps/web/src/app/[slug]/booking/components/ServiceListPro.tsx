'use client';

import { useState, useMemo } from 'react';
import { Service, ServiceCategory, ThemeConfig, CartItem } from '../types';
import { ServiceSearchInput } from './ServiceSearchInput';
import { CategoryTabs } from './CategoryTabs';
import { ServiceCardCompact } from './ServiceCardCompact';
import { formatPrice } from '../utils';
import { getImageUrl } from '@/lib/utils';

interface ServiceListProProps {
  services: Service[];
  categories: ServiceCategory[];
  selectedServices: Service[];
  onToggleService?: (service: Service) => void;
  onSelect?: (service: Service) => void; // Alias for onToggleService
  theme?: ThemeConfig;
  loading?: boolean;
  primaryColor?: string; // Fallback if no theme
  // LOJA UNIFICADA
  shopEnabled?: boolean;
  itemFilter?: 'all' | 'service' | 'product';
  onItemFilterChange?: (filter: 'all' | 'service' | 'product') => void;
  cart?: CartItem[];
  onAddToCart?: (service: Service) => void;
  onRemoveFromCart?: (serviceId: string) => void;
  onUpdateCartQuantity?: (serviceId: string, quantity: number) => void;
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
  // LOJA UNIFICADA
  shopEnabled = false,
  itemFilter = 'all',
  onItemFilterChange,
  cart = [],
  onAddToCart,
  onRemoveFromCart,
  onUpdateCartQuantity,
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
      // LOJA UNIFICADA: Filtro por tipo de item
      if (shopEnabled && itemFilter !== 'all') {
        const serviceType = (service as any).itemType || 'SERVICE';
        if (itemFilter === 'service' && serviceType !== 'SERVICE') return false;
        if (itemFilter === 'product' && serviceType !== 'PRODUCT') return false;
      }

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
  }, [services, categories, searchQuery, selectedCategoryId, shopEnabled, itemFilter]);

  // Filtra categorias visíveis baseado no filtro de tipo (serviço/produto)
  const filteredCategories = useMemo(() => {
    if (!shopEnabled || itemFilter === 'all') return categories;

    return categories.filter(cat => {
      // 1. Checar categoryType da própria categoria
      if (cat.categoryType) {
        if (itemFilter === 'service' && cat.categoryType === 'SERVICE') return true;
        if (itemFilter === 'product' && cat.categoryType === 'PRODUCT') return true;
      }
      // 2. Fallback: checar se a categoria tem itens do tipo selecionado
      const hasMatchingItems = services.some(s => {
        if (s.categoryId !== cat.id) return false;
        const sType = (s as any).itemType || 'SERVICE';
        return itemFilter === 'service' ? sType === 'SERVICE' : sType === 'PRODUCT';
      });
      return hasMatchingItems;
    });
  }, [categories, services, shopEnabled, itemFilter]);

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
          Nenhum item disponível no momento.
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

      {/* Tabs de categoria (filtradas por tipo) */}
      <CategoryTabs
        categories={filteredCategories}
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
            ? 'Nenhum item encontrado'
            : `${totalFiltered} item${totalFiltered > 1 ? 's' : ''} encontrado${totalFiltered > 1 ? 's' : ''}`}
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
                {group.services.length} {(() => {
                  const isProduct = group.category?.categoryType === 'PRODUCT' ||
                    group.services.every(s => (s as any).itemType === 'PRODUCT');
                  return isProduct
                    ? `produto${group.services.length > 1 ? 's' : ''}`
                    : `serviço${group.services.length > 1 ? 's' : ''}`;
                })()}
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
          {group.services.map((service) => {
            const isProduct = shopEnabled && (service as any).itemType === 'PRODUCT';
            const stock = (service as any).stock;
            const isOutOfStock = isProduct && stock !== null && stock !== undefined && stock <= 0;
            const cartItem = cart.find(item => item.service.id === service.id);

            if (isProduct) {
              // LOJA UNIFICADA: Card de produto
              const productImageUrl = (service as any).imageUrl ? getImageUrl((service as any).imageUrl) : '';
              return (
                <div
                  key={service.id}
                  style={{
                    background: surfaceColor,
                    borderRadius: 12,
                    border: `1px solid ${cartItem ? (theme?.colors.primary || '#a07a45') : (textSecondary + '20')}`,
                    padding: 0,
                    marginBottom: 10,
                    opacity: isOutOfStock ? 0.5 : 1,
                    transition: 'border-color 0.2s',
                    overflow: 'hidden',
                  }}
                >
                  {/* Imagem do produto */}
                  {productImageUrl && (
                    <div style={{
                      width: '100%',
                      height: 180,
                      overflow: 'hidden',
                      background: '#f5f0eb',
                    }}>
                      <img
                        src={productImageUrl}
                        alt={service.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  )}
                  <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: theme?.colors.text || '#2f2a24' }}>
                          {service.name}
                        </span>
                        {isOutOfStock && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#ef4444',
                            background: '#fef2f2',
                            padding: '2px 8px',
                            borderRadius: 10,
                            textTransform: 'uppercase',
                          }}>
                            Esgotado
                          </span>
                        )}
                        {!isOutOfStock && stock !== null && stock !== undefined && stock <= 5 && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#f59e0b',
                            background: '#fffbeb',
                            padding: '2px 8px',
                            borderRadius: 10,
                          }}>
                            Últimas {stock}un
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <p style={{ fontSize: 13, color: textSecondary, margin: '4px 0 0', lineHeight: 1.3 }}>
                          {service.description}
                        </p>
                      )}
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: theme?.colors.primary || '#a07a45', whiteSpace: 'nowrap', marginLeft: 12 }}>
                      {formatPrice(service.priceCents)}
                    </span>
                  </div>

                  {/* Botão add-to-cart / controle de quantidade */}
                  {!isOutOfStock && (
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                      {cartItem ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0,
                          border: `1.5px solid ${theme?.colors.primary || '#a07a45'}`,
                          borderRadius: 10,
                          overflow: 'hidden',
                        }}>
                          <button
                            onClick={() => onUpdateCartQuantity?.(service.id, cartItem.quantity - 1)}
                            style={{
                              width: 36,
                              height: 36,
                              background: 'transparent',
                              border: 'none',
                              fontSize: 18,
                              fontWeight: 600,
                              color: theme?.colors.primary || '#a07a45',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            −
                          </button>
                          <span style={{
                            width: 36,
                            textAlign: 'center',
                            fontSize: 15,
                            fontWeight: 700,
                            color: theme?.colors.text || '#2f2a24',
                          }}>
                            {cartItem.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateCartQuantity?.(service.id, cartItem.quantity + 1)}
                            disabled={stock !== null && stock !== undefined && cartItem.quantity >= stock}
                            style={{
                              width: 36,
                              height: 36,
                              background: 'transparent',
                              border: 'none',
                              fontSize: 18,
                              fontWeight: 600,
                              color: theme?.colors.primary || '#a07a45',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: (stock !== null && stock !== undefined && cartItem.quantity >= stock) ? 0.3 : 1,
                            }}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddToCart?.(service)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 10,
                            background: theme?.colors.primary || '#a07a45',
                            color: '#fff',
                            border: 'none',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          <span>🛒</span> Adicionar
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              );
            }

            // Card padrão de serviço (existente)
            return (
              <ServiceCardCompact
                key={service.id}
                service={service}
                isSelected={selectedServices.some((s) => s.id === service.id)}
                onClick={() => handleToggle(service)}
                theme={theme}
              />
            );
          })}
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
