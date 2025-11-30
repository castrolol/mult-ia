/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@workspace/ui'],
  
  // Configuração do webpack
  webpack: (config) => {
    // Evitar erro de canvas no SSR
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
