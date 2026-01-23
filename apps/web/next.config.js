/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Proxy para API - permite acessar /api/v1/* no mesmo domínio
  async rewrites() {
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
        hostname: '**.railway.app',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
};

module.exports = nextConfig;
