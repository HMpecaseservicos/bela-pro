// Types para a página de agendamento público

// ============================================
// TEMAS
// ============================================

export type ThemePreset = 'rose_gold' | 'burgundy' | 'olive_green' | 'classic_dark' | 'ocean_blue' | 'custom';

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
// WORKSPACE
// ============================================

export interface Workspace {
  id: string;
  name: string;
  slug: string;
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
}

export interface ProfessionalProfile {
  displayName: string;
  addressLine: string | null;
  phoneE164: string | null;
}

// ============================================
// SERVIÇOS
// ============================================

export interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  sortOrder?: number;
  showInBooking?: boolean;
  imageUrl?: string | null;
  badgeText?: string | null;
  categoryTag?: string | null;
}

export interface TimeSlot {
  startAt: string;
  endAt: string;
  available: boolean;
}

export interface BookingData {
  workspaceId: string;
  serviceId: string;
  startAt: string;
  clientName: string;
  clientPhone: string;
}

export interface BookingState {
  // Data
  workspace: Workspace | null;
  services: Service[];
  availableDays: string[];
  availableSlots: TimeSlot[];
  
  // Seleções
  selectedService: Service | null;
  selectedDate: string | null;
  selectedSlot: string | null;
  
  // Cliente
  clientName: string;
  clientPhone: string;
  
  // UI State
  step: BookingStep;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export type BookingStep = 1 | 2 | 3 | 4;

export interface StepConfig {
  number: BookingStep;
  label: string;
  shortLabel: string;
}

export interface TrustBadge {
  icon: string;
  text: string;
}
