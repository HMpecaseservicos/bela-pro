/**
 * Normaliza telefone para formato E.164 brasileiro consistente.
 * 
 * Exemplos de entrada → saída:
 * - "+5511999999999" → "5511999999999"
 * - "5511999999999" → "5511999999999"
 * - "11999999999" → "5511999999999"
 * - "(11) 99999-9999" → "5511999999999"
 * - "11 99999-9999" → "5511999999999"
 * 
 * @param phone - Telefone em qualquer formato
 * @returns Telefone normalizado (apenas dígitos, com código país 55)
 */
export function normalizePhoneE164(phone: string): string {
  // Remove tudo que não é dígito
  let digits = phone.replace(/\D/g, '');
  
  // Se começa com + (caso já foi removido, verifica se tinha 55 no início)
  // Se tem 12-13 dígitos e começa com 55, já está ok
  // Se tem 10-11 dígitos, adiciona 55
  
  if (digits.length === 13 && digits.startsWith('55')) {
    // 55 + DDD (2) + celular (9) = 13 dígitos - formato correto
    return digits;
  }
  
  if (digits.length === 12 && digits.startsWith('55')) {
    // 55 + DDD (2) + fixo (8) = 12 dígitos - formato correto
    return digits;
  }
  
  if (digits.length === 11) {
    // DDD (2) + celular (9) - falta código país
    return `55${digits}`;
  }
  
  if (digits.length === 10) {
    // DDD (2) + fixo (8) - falta código país
    return `55${digits}`;
  }
  
  // Outros casos: retorna como está (pode ser inválido)
  // Mas pelo menos garante só dígitos
  return digits;
}
