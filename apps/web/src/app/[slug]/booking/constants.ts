// Constantes e configurações default para a página de agendamento
import { StepConfig, TrustBadge, ThemeColors, ThemePreset, ThemeConfig, Workspace } from './types';

// ============================================
// PRESETS DE TEMAS
// ============================================

export const THEME_PRESETS: Record<ThemePreset, ThemeColors> = {
  rose_gold: {
    primary: '#D4A574',
    accent: '#B8860B',
    background: '#FDF8F5',
    surface: '#FFFFFF',
    text: '#3D3D3D',
    textSecondary: '#6B6B6B',
    gradient: 'linear-gradient(135deg, #D4A574 0%, #E8C5A5 50%, #F5DFC5 100%)',
  },
  burgundy: {
    primary: '#722F37',
    accent: '#C41E3A',
    background: '#FBF7F7',
    surface: '#FFFFFF',
    text: '#2D2D2D',
    textSecondary: '#5C5C5C',
    gradient: 'linear-gradient(135deg, #722F37 0%, #8B3A42 50%, #A54D55 100%)',
  },
  olive_green: {
    primary: '#6B7B3C',
    accent: '#8FA344',
    background: '#F9FAF5',
    surface: '#FFFFFF',
    text: '#2E3318',
    textSecondary: '#5C6445',
    gradient: 'linear-gradient(135deg, #6B7B3C 0%, #8FA344 50%, #A8B86E 100%)',
  },
  classic_dark: {
    primary: '#1A1A2E',
    accent: '#E94560',
    background: '#0F0F1A',
    surface: '#1A1A2E',
    text: '#FFFFFF',
    textSecondary: '#A0A0B0',
    gradient: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
  },
  ocean_blue: {
    primary: '#1E3A5F',
    accent: '#3498DB',
    background: '#F5F9FC',
    surface: '#FFFFFF',
    text: '#1A1A2E',
    textSecondary: '#5A6C7D',
    gradient: 'linear-gradient(135deg, #1E3A5F 0%, #2E5077 50%, #3498DB 100%)',
  },
  custom: {
    primary: '#6366f1',
    accent: '#8B5CF6',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8B5CF6 50%, #A78BFA 100%)',
  },
};

/**
 * Retorna o tema baseado nas configurações do workspace
 */
export function getThemeFromWorkspace(workspace: Workspace | null): ThemeConfig {
  if (!workspace) {
    return { preset: 'custom', colors: THEME_PRESETS.custom };
  }

  const preset = workspace.themePreset || 'custom';
  
  // Se for custom, usa as cores definidas no workspace
  if (preset === 'custom' && workspace.primaryColorHex) {
    return {
      preset: 'custom',
      colors: {
        ...THEME_PRESETS.custom,
        primary: workspace.primaryColorHex,
        accent: workspace.accentColorHex || workspace.primaryColorHex,
        gradient: `linear-gradient(135deg, ${workspace.primaryColorHex} 0%, ${workspace.accentColorHex || workspace.primaryColorHex} 100%)`,
      },
    };
  }

  // Usa preset definido
  return {
    preset: preset as ThemePreset,
    colors: THEME_PRESETS[preset as ThemePreset] || THEME_PRESETS.custom,
  };
}

// ============================================
// DESIGN TOKENS
// ============================================

export const COLORS = {
  background: '#f9fafb',
  surface: '#ffffff',
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  success: '#10b981',
  successLight: '#d1fae5',
  error: '#ef4444',
  errorLight: '#fef2f2',
  primaryFallback: '#6366f1',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ============================================
// TEXTOS DEFAULT (COPY)
// ============================================

export const DEFAULT_COPY = {
  // Boas-vindas
  bookingTitle: 'Agende seu horário',
  bookingSubtitle: 'Escolha o serviço ideal para você e reserve em menos de 1 minuto',
  
  // Confirmação
  confirmationTitle: 'Agendamento confirmado!',
  confirmationSubtitle: 'Você receberá uma confirmação em breve',
  
  // Estados vazios
  noServices: 'Este estabelecimento ainda está configurando a agenda',
  noDates: 'Nenhuma data disponível no momento',
  noSlots: 'Nenhum horário disponível neste dia. Tente outra data.',
  
  // Erros
  notFound: 'Estabelecimento não encontrado',
  requiredFields: 'Preencha todos os campos',
  genericError: 'Ocorreu um erro. Tente novamente.',
  
  // Formulário
  nameLabel: 'Nome completo',
  namePlaceholder: 'Seu nome',
  phoneLabel: 'WhatsApp',
  phonePlaceholder: '(11) 99999-9999',
  
  // Resumo
  summaryLabel: 'Resumo do agendamento',
} as const;

// ============================================
// ETAPAS DO WIZARD
// ============================================

export const STEPS: StepConfig[] = [
  { number: 1, label: 'Serviço', shortLabel: 'Serviço' },
  { number: 2, label: 'Data', shortLabel: 'Data' },
  { number: 3, label: 'Horário', shortLabel: 'Horário' },
  { number: 4, label: 'Seus dados', shortLabel: 'Dados' },
];

// Labels dos CTAs por etapa
export const CTA_LABELS: Record<number, string> = {
  1: 'Escolher data',
  2: 'Ver horários',
  3: 'Preencher dados',
  4: 'Confirmar agendamento',
};

// ============================================
// BADGES DE CONFIANÇA
// ============================================

export const TRUST_BADGES: TrustBadge[] = [
  { icon: '✓', text: 'Confirmação automática' },
  { icon: '✓', text: 'Horários em tempo real' },
  { icon: '✓', text: 'Cancelamento fácil' },
];

// ============================================
// EMOJIS POR CATEGORIA DE SERVIÇO
// ============================================

export const SERVICE_EMOJI_MAP: Record<string, string> = {
  // Cabelo
  'corte': '✂️',
  'cabelo': '💇',
  'escova': '💇‍♀️',
  'penteado': '👰',
  'alisamento': '✨',
  'progressiva': '✨',
  'hidratação': '💧',
  'hidratacao': '💧',
  'tratamento': '🧴',
  'cauterização': '💎',
  'cauterizacao': '💎',
  'reconstrução': '🔧',
  'reconstrucao': '🔧',
  
  // Coloração
  'coloração': '🎨',
  'coloracao': '🎨',
  'tintura': '🎨',
  'mechas': '🌟',
  'luzes': '💡',
  'balayage': '🌈',
  'ombré': '🌅',
  'ombre': '🌅',
  'platinado': '⚪',
  'retoque': '🖌️',
  
  // Unhas
  'manicure': '💅',
  'pedicure': '🦶',
  'unhas': '💅',
  'alongamento': '💅',
  'gel': '✨',
  'esmaltação': '💅',
  'esmaltacao': '💅',
  
  // Corpo
  'massagem': '💆',
  'relaxante': '🧘',
  'drenagem': '💧',
  'modeladora': '✨',
  
  // Depilação
  'depilação': '✨',
  'depilacao': '✨',
  'cera': '🍯',
  'laser': '⚡',
  
  // Rosto
  'maquiagem': '💄',
  'make': '💄',
  'sobrancelha': '👁️',
  'design': '✏️',
  'micropigmentação': '✒️',
  'micropigmentacao': '✒️',
  'limpeza de pele': '🧖',
  'peeling': '✨',
  'botox': '💉',
  'preenchimento': '💋',
  
  // Barba
  'barba': '🧔',
  'bigode': '👨',
  'barbear': '🪒',
  
  // Spa
  'spa': '🧖‍♀️',
  'day spa': '🌺',
  'banho': '🛁',
  
  // Especiais
  'noiva': '👰',
  'festa': '🎉',
  'formatura': '🎓',
  'casamento': '💒',
  
  // Default
  'default': '💇',
};

// ============================================
// API
// ============================================

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
