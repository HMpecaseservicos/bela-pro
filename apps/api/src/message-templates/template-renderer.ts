/**
 * Template Renderer - Motor de substituição de variáveis
 * 
 * Apenas substituição de texto, sem execução dinâmica.
 * Nenhuma lógica de negócio.
 * 
 * @module message-templates
 */

/**
 * Contexto com variáveis para renderização
 */
export interface TemplateContext {
  clientName?: string;
  serviceName?: string;
  date?: string;
  time?: string;
  workspaceName?: string;
  [key: string]: string | undefined;
}

/**
 * Renderiza um template substituindo variáveis no formato {{variavel}}
 * 
 * @param template - Texto do template com variáveis
 * @param context - Objeto com valores das variáveis
 * @returns Texto renderizado
 * 
 * @example
 * renderTemplate('Olá {{clientName}}!', { clientName: 'Maria' })
 * // => 'Olá Maria!'
 */
export function renderTemplate(template: string, context: TemplateContext): string {
  if (!template) return '';
  
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key];
    // Se não encontrar a variável, mantém o placeholder
    return value !== undefined ? value : match;
  });
}

/**
 * Gera link do WhatsApp para envio manual
 * 
 * @param phone - Telefone no formato E.164 (ex: 5511999999999) ou apenas números
 * @param message - Mensagem já renderizada
 * @returns URL do WhatsApp pronta para abrir
 * 
 * @example
 * generateWhatsAppLink('5511999999999', 'Olá!')
 * // => 'https://wa.me/5511999999999?text=Ol%C3%A1!'
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  // Remove caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Adiciona código do Brasil se não tiver
  const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  
  // Encode da mensagem para URL
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${phoneWithCountry}?text=${encodedMessage}`;
}

/**
 * Formata data para exibição no template
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formata horário para exibição no template
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
