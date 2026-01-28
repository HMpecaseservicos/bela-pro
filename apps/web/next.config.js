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
    ],
    // Netlify usa loader externo para otimização de imagens
    unoptimized: process.env.NETLIFY === 'true',
  },
};

module.exports = nextConfig;
