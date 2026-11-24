/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
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