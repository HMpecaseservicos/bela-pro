/**
 * BELA PRO - Tema Elegante Premium
 * Paleta de cores sofisticada com tons dourados, bege e creme
 * Desenvolvido para profissionais que agendam serviços
 */

export const THEME = {
  // Cores Principais - Dourado
  gold: '#9a7b4f',
  goldLight: '#c9a66c',
  goldDark: '#7a5f3d',
  goldHover: '#b8956b',
  goldGradient: 'linear-gradient(135deg, #c9a66c 0%, #9a7b4f 100%)',
  
  // Backgrounds
  bgCream: '#faf8f5',
  bgBeige: '#f5f0e8',
  bgWarm: '#ede5d8',
  bgCard: '#ffffff',
  
  // Textos
  textPrimary: '#3d3d3d',
  textSecondary: '#6b5b4f',
  textMuted: '#9a8b7a',
  textLight: '#bfad99',
  
  // Bordas e sombras
  borderLight: '#e8dfd3',
  borderGold: 'rgba(154, 123, 79, 0.2)',
  shadowSoft: '0 2px 12px rgba(154, 123, 79, 0.08)',
  shadowCard: '0 4px 20px rgba(154, 123, 79, 0.1)',
  shadowHover: '0 8px 30px rgba(154, 123, 79, 0.15)',
  
  // Sidebar elegante
  sidebarBg: 'linear-gradient(180deg, #2c2620 0%, #1f1b17 100%)',
  sidebarText: '#e8dfd3',
  sidebarActive: 'rgba(201, 166, 108, 0.15)',
  sidebarBorder: 'rgba(201, 166, 108, 0.15)',
  
  // Status colors - tons suaves e elegantes
  status: {
    pending: { bg: '#fef7e6', text: '#c9a66c' },
    confirmed: { bg: '#e8f4ec', text: '#5a9e6f' },
    completed: { bg: '#e6f0f5', text: '#5a8fa8' },
    cancelled: { bg: '#fceaea', text: '#c9756c' },
    noShow: { bg: '#f5f0e8', text: '#9a8b7a' },
  },
  
  // Gradientes premium
  gradients: {
    gold: 'linear-gradient(135deg, #c9a66c 0%, #9a7b4f 100%)',
    warmDark: 'linear-gradient(180deg, #2c2620 0%, #1f1b17 100%)',
    cream: 'linear-gradient(180deg, #faf8f5 0%, #f5f0e8 100%)',
    elegant: 'linear-gradient(135deg, #d4c5b0 0%, #c9a66c 50%, #9a7b4f 100%)',
  },
  
  // Transições suaves
  transition: {
    fast: 'all 0.15s ease',
    normal: 'all 0.2s ease',
    slow: 'all 0.3s ease',
  },
  
  // Border radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    round: '50%',
  },
  
  // Fontes
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

// Estilos de status pré-definidos
export const STATUS_STYLES = {
  PENDING: { bg: THEME.status.pending.bg, text: THEME.status.pending.text, label: 'Pendente' },
  CONFIRMED: { bg: THEME.status.confirmed.bg, text: THEME.status.confirmed.text, label: 'Confirmado' },
  COMPLETED: { bg: THEME.status.completed.bg, text: THEME.status.completed.text, label: 'Concluído' },
  CANCELLED: { bg: THEME.status.cancelled.bg, text: THEME.status.cancelled.text, label: 'Cancelado' },
  NO_SHOW: { bg: THEME.status.noShow.bg, text: THEME.status.noShow.text, label: 'Não compareceu' },
};

// Estilos de card padrão
export const cardStyle = {
  background: THEME.bgCard,
  borderRadius: THEME.radius.lg,
  border: `1px solid ${THEME.borderLight}`,
  boxShadow: THEME.shadowSoft,
};

// Estilos de botão primário
export const buttonPrimaryStyle = {
  background: THEME.goldGradient,
  color: '#1f1b17',
  border: 'none',
  borderRadius: THEME.radius.md,
  fontWeight: 600,
  cursor: 'pointer',
  transition: THEME.transition.normal,
};

// Estilos de botão secundário
export const buttonSecondaryStyle = {
  background: 'transparent',
  color: THEME.gold,
  border: `1px solid ${THEME.borderGold}`,
  borderRadius: THEME.radius.md,
  fontWeight: 500,
  cursor: 'pointer',
  transition: THEME.transition.normal,
};

// Estilos de input
export const inputStyle = {
  background: THEME.bgCard,
  border: `1px solid ${THEME.borderLight}`,
  borderRadius: THEME.radius.md,
  color: THEME.textPrimary,
  fontSize: 14,
  padding: '12px 16px',
  outline: 'none',
  transition: THEME.transition.normal,
};

export default THEME;
