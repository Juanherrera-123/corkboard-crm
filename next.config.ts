import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // No bloquees el build por errores de ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // No bloquees el build por errores de type-checking
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
