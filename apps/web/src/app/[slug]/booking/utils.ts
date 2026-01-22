// Funções utilitárias para a página de agendamento
import { SERVICE_EMOJI_MAP } from './constants';

/**
 * Formata valor em centavos para moeda brasileira
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

/**
 * Formata ISO string para horário (HH:mm)
 */
export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formata data completa (ex: "terça-feira, 21 de janeiro")
 */
export function formatDateFull(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Formata data curta para cards (dia, dia da semana, mês)
 */
export function formatDateShort(dateString: string): {
  day: number;
  weekday: string;
  month: string;
} {
  const date = new Date(dateString + 'T12:00:00');
  return {
    day: date.getDate(),
    weekday: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
    month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
  };
}

/**
 * Ajusta cor hex para mais clara ou mais escura
 */
export function adjustColor(hex: string, amount: number): string {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Gera gradiente a partir de cor primária
 */
export function createGradient(primaryColor: string): string {
  return `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -40)} 100%)`;
}

/**
 * Infere emoji do serviço baseado no nome
 */
export function getServiceEmoji(serviceName: string): string {
  const nameLower = serviceName.toLowerCase();
  
  // Busca por palavra-chave no nome do serviço
  for (const [keyword, emoji] of Object.entries(SERVICE_EMOJI_MAP)) {
    if (nameLower.includes(keyword)) {
      return emoji;
    }
  }
  
  return SERVICE_EMOJI_MAP['default'];
}

/**
 * Gera avatar com inicial do nome
 */
export function getInitials(name: string): string {
  return (name || 'B').charAt(0).toUpperCase();
}

/**
 * Formata número de telefone para exibição
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
}

/**
 * Limpa telefone para envio à API
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Valida telefone brasileiro
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = cleanPhone(phone);
  return cleaned.length >= 10 && cleaned.length <= 11;
}

/**
 * Valida nome (mínimo 3 caracteres, pelo menos 2 palavras para nome completo)
 */
export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 3;
}

/**
 * Gera cor primária com opacidade
 */
export function withOpacity(hex: string, opacity: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Duração formatada (ex: "1h 30min" ou "45 min")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}min`;
}
