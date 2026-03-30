// ============================================
// Primitivos
// ============================================

export type Id = string;
export type PublicSlug = string;
export type MoneyCents = number;
export type IsoDate = string; // YYYY-MM-DD

// ============================================
// Enums (espelham Prisma, usáveis no frontend)
// ============================================

export type UserRole = 'OWNER' | 'STAFF';

export type AppointmentStatus =
  | 'PENDING'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type ClientStatus = 'NORMAL' | 'PONTUAL' | 'ATRASOU' | 'FALTOU';

export type CancelledBy = 'CLIENT' | 'PROFESSIONAL' | 'SYSTEM';

export type PaymentType = 'NONE' | 'FULL' | 'PARTIAL_PERCENT' | 'PARTIAL_FIXED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export type PaymentIntentStatus = 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';

export type WorkspacePlan = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';

export type PlanTier = 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'TRIAL'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'SUSPENDED';

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type TransactionType = 'INCOME' | 'EXPENSE';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export type PaymentMethod =
  | 'PIX'
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'TRANSFER'
  | 'OTHER';

export type ChatConversationState =
  | 'START'
  | 'CHOOSE_SERVICE'
  | 'CHOOSE_DATE'
  | 'CHOOSE_TIME'
  | 'CONFIRM'
  | 'DONE'
  | 'HUMAN_HANDOFF';

export type SponsorTier = 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE';

// LOJA UNIFICADA
export type ServiceItemType = 'SERVICE' | 'PRODUCT';

export type OrderStatus =
  | 'PENDING'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export type BusinessInviteStatus =
  | 'PENDING'
  | 'VIEWED'
  | 'CLICKED_CTA'
  | 'REGISTERED'
  | 'ACTIVATED'
  | 'EXPIRED'
  | 'CANCELLED';

export type ThemePreset =
  | 'rose_gold'
  | 'burgundy'
  | 'olive_green'
  | 'classic_dark'
  | 'ocean_blue'
  | 'custom';

// ============================================
// Interfaces de domínio (shapes compartilhados)
// ============================================

export interface ProfessionalProfile {
  displayName: string;
  addressLine: string | null;
  phoneE164: string | null;
}

export interface WorkspacePublic {
  id: Id;
  name: string;
  slug: PublicSlug;
  brandName: string | null;
  primaryColorHex: string | null;
  accentColorHex: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  galleryUrls: string[];
  themePreset: ThemePreset | null;
  welcomeText: string | null;
  description: string | null;
  profile: ProfessionalProfile | null;
  shopEnabled?: boolean; // LOJA UNIFICADA
}

export interface ServiceCategory {
  id: Id;
  name: string;
  iconEmoji: string | null;
  color: string | null;
  sortOrder: number;
  categoryType?: ServiceItemType; // LOJA UNIFICADA
}

export interface ServicePublic {
  id: Id;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: MoneyCents;
  sortOrder?: number;
  showInBooking?: boolean;
  imageUrl?: string | null;
  badgeText?: string | null;
  categoryTag?: string | null;
  categoryId?: string | null;
  category?: ServiceCategory | null;
  // LOJA UNIFICADA
  itemType?: ServiceItemType;
  stock?: number;
  isPhysical?: boolean;
}

export interface TimeSlot {
  startAt: string;
  endAt: string;
  available: boolean;
}

export interface BookingRequest {
  workspaceId: Id;
  serviceIds: Id[];
  startAt: string;
  clientName: string;
  clientPhone: string;
}

export interface PaymentInfo {
  paymentId: Id;
  appointmentId: Id;
  orderId?: Id; // LOJA UNIFICADA
  amount: number;
  amountCents: MoneyCents;
  pixQrCode: string;
  pixCode: string;
  pixCopyPaste: string;
  pixRecipientName?: string;
  pixKeyMasked?: string;
  expiresAt: string;
  instructions?: string;
}

export interface JwtPayload {
  userId: Id;
  workspaceId: Id;
  role: UserRole;
  isSuperAdmin?: boolean;
}

// ============================================
// LOJA UNIFICADA: Interfaces de checkout
// ============================================

export interface UnifiedCheckoutRequest {
  workspaceId: Id;
  clientName: string;
  clientPhone: string;
  serviceIds: Id[];
  startAt?: string;
  products: Array<{
    serviceId: Id;
    quantity: number;
  }>;
}

export interface OrderItemPublic {
  id: Id;
  serviceId: Id;
  quantity: number;
  priceCents: MoneyCents;
  totalCents: MoneyCents;
  service: {
    id: Id;
    name: string;
    imageUrl: string | null;
    priceCents: MoneyCents;
  };
}

export interface OrderPublic {
  id: Id;
  status: OrderStatus;
  totalProductsCents: MoneyCents;
  totalServicesCents: MoneyCents;
  totalCents: MoneyCents;
  items: OrderItemPublic[];
  createdAt: string;
  linkedAppointment?: {
    id: Id;
    startAt: string;
    status: AppointmentStatus;
  } | null;
}

export interface UnifiedCheckoutResponse {
  appointment: any | null;
  order: OrderPublic | null;
  paymentInfo: PaymentInfo | null;
  requiresPayment: boolean;
}
