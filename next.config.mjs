/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-dev',
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  webpack(config, { dev }) {
    if (dev) {
      // Keep webpack module graph in memory during dev to prevent missing vendor-chunks on Windows
      config.cache = { type: 'memory' };
    }
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/.git/**', '**/.next/**', '**/.next-dev/**', '**/node_modules/**'],
    };
    return config;
  },
  async redirects() {
    return [
      {
        source: '/farmer',
        destination: '/farmer/dashboard',
        permanent: false,
      },
      {
        source: '/buyer',
        destination: '/buyer/dashboard',
        permanent: false,
      },
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
      {
        source: '/logistics',
        destination: '/logistics/dashboard',
        permanent: false,
      },
      {
        source: '/auth',
        destination: '/login',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
