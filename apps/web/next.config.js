/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Output standalone para melhor compatibilidade com Netlify
  // output: 'standalone', // Descomente se necessário
  
  // Proxy para API - em dev usa localhost, em prod o Netlify faz o proxy
  async rewrites() {
    // Em produção (Netlify), os redirects no netlify.toml fazem o proxy
    // Em dev, usa rewrite local
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const apiBase = apiUrl.replace('/api/v1', '');
    
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBase}/api/v1/:path*`,
      },
    ];
  },
  
  // Headers HTTP para controle de cache
  // IMPORTANTE: Página de booking nunca deve ser cacheada para sempre mostrar versão atualizada
  async headers() {
    return [
      {
        // Páginas de booking público - NUNCA cachear
        source: '/:slug/booking',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        // API routes - não cachear
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
  
  // Permite imagens de qualquer domínio
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.fly.dev',
      },
      {
        protocol: 'https',
        hostname: '**.netlify.app',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'videos.pexels.com',
      },
    ],
    // Netlify usa loader externo para otimização de imagens
    unoptimized: process.env.NETLIFY === 'true',
  },
};

module.exports = nextConfig;
