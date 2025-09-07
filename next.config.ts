import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Only ignore ESLint errors outside CI
    ignoreDuringBuilds: !process.env.CI,
  },
  typescript: {
    // Only ignore type-checking errors outside CI
    ignoreBuildErrors: !process.env.CI,
  },
};

export default nextConfig;
