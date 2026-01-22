'use client';

import { Service, ThemeConfig } from '../types';
import { COLORS, DEFAULT_COPY } from '../constants';
import { ServiceCard } from './ServiceCard';
import { ServiceCardPremium } from './ServiceCardPremium';
import { SkeletonServiceCard } from './Skeleton';

interface ServiceListProps {
  services: Service[];
  selectedService: Service | null;
  loading: boolean;
  primaryColor?: string;
  onSelect: (service: Service) => void;
  usePremiumLayout?: boolean;
  theme?: ThemeConfig;
}

export function ServiceList({
  services,
  selectedService,
  loading,
  primaryColor = COLORS.primaryFallback,
  onSelect,
  usePremiumLayout = false,
  theme,
}: ServiceListProps) {
  // Loading state
  if (loading && services.length === 0) {
    return (
      <div style={usePremiumLayout ? { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
        gap: 16 
      } : undefined}>
        <SkeletonServiceCard primaryColor={primaryColor} />
        <SkeletonServiceCard primaryColor={primaryColor} />
        <SkeletonServiceCard primaryColor={primaryColor} />
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
          color: COLORS.textSecondary,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <p style={{ fontSize: 15, margin: 0 }}>{DEFAULT_COPY.noServices}</p>
      </div>
    );
  }

  // Premium layout - Grid com cards maiores
  if (usePremiumLayout && theme) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
        gap: 16,
      }}>
        {services.map((service) => (
          <ServiceCardPremium
            key={service.id}
            service={service}
            theme={theme}
            selected={selectedService?.id === service.id}
            onSelect={() => onSelect(service)}
          />
        ))}
      </div>
    );
  }

  // Layout padrão - Lista vertical
  return (
    <div>
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          isSelected={selectedService?.id === service.id}
          primaryColor={primaryColor}
          onClick={() => onSelect(service)}
        />
      ))}
    </div>
  );
}
