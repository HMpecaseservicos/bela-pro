/**
 * Converte URL relativa de imagem para URL absoluta
 * URLs relativas são salvas no banco (/api/v1/upload/files/...)
 * e convertidas para absolutas apenas na exibição
 */
export function getImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Se já é uma URL absoluta, retorna como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Se é localhost em produção, converte para a URL da API
    if (typeof window !== 'undefined' && url.includes('localhost:3001')) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';
      return url.replace(/http:\/\/localhost:3001/g, apiBase);
    }
    return url;
  }
  
  // Se é URL relativa, adiciona a base da API
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';
  return `${apiBase}${url}`;
}

/**
 * Formata telefone para exibição
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Formata data para exibição
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata moeda para exibição
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
