// Types para a página de agendamento público
// Tipos de domínio vêm do pacote compartilhado
import type {
  ThemePreset,
  WorkspacePublic as Workspace,
  ProfessionalProfile,
  ServiceCategory,
  ServicePublic as Service,
  TimeSlot,
  BookingRequest as BookingData,
  PaymentInfo,
  ServiceItemType, // LOJA UNIFICADA
  OrderPublic,     // LOJA UNIFICADA
} from '@bela-pro/shared';

// Re-export para manter compatibilidade com imports existentes
export type { ThemePreset, Workspace, ProfessionalProfile, ServiceCategory, Service, TimeSlot, BookingData, PaymentInfo, ServiceItemType, OrderPublic };

// ============================================
// TEMAS (UI-only, ficam aqui)
// ============================================

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  gradient: string;
}

export interface ThemeConfig {
  preset: ThemePreset;
  colors: ThemeColors;
}

// ============================================
// ESTADO DO BOOKING (UI-only)
// ============================================

export interface BookingState {
  // Data
  workspace: Workspace | null;
  services: Service[];
  categories: ServiceCategory[];
  availableDays: string[];
  availableSlots: TimeSlot[];
  
  // Seleções
  selectedServices: Service[];
  selectedDate: string | null;
  selectedSlot: string | null;
  
  // LOJA UNIFICADA: carrinho de produtos
  cart: CartItem[];
  
  // Cliente
  clientName: string;
  clientPhone: string;

  // Método de entrega (para pedidos com produtos)
  deliveryMethod: 'PICKUP' | 'DELIVERY' | null;
  
  // UI State
  step: BookingStep;
  loading: boolean;
  error: string | null;
  success: boolean;
  
  // Payment (quando pagamento PIX é exigido)
  paymentInfo: PaymentInfo | null;
  
  // LOJA UNIFICADA: resultado do checkout
  orderResult: OrderPublic | null;
  
  // LOJA UNIFICADA: filtro ativo
  itemFilter: 'all' | 'service' | 'product';
}

// LOJA UNIFICADA: item no carrinho de produtos
export interface CartItem {
  service: Service;
  quantity: number;
}

export type BookingStep = 1 | 2 | 3 | 4 | 5;

export interface StepConfig {
  number: number;
  title?: string;
  label: string;
  shortLabel: string;
  icon?: string;
}

export interface TrustBadge {
  icon: string;
  text: string;
}
