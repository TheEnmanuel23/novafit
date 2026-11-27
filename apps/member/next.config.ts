import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@novafit/ui', '@novafit/supabase', '@novafit/types'],
  // Allows Next.js to resolve workspace dependencies from the monorepo root
  turbopack: {
    root: path.join(__dirname, '../../'),
  },
  async redirects() {
    return [
      { source: '/perfil', destination: '/profile', permanent: false },
      { source: '/planes', destination: '/plans', permanent: false },
      { source: '/visitas', destination: '/attendances', permanent: false },
    ]
  },
}

export default nextConfig
