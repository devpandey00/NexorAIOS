import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@nexor/ai',
    '@nexor/core',
    '@nexor/database',
    '@nexor/logger',
    '@nexor/research',
    '@nexor/search',
    '@nexor/shared',
    '@nexor/tools',
  ],
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;
