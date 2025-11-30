/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@workspace/ui'],
  
  // Configuração do webpack
  webpack: (config, { isServer, webpack }) => {
    // Ignorar o módulo canvas completamente (usado pelo pdfjs-dist mas não necessário no browser)
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^canvas$/,
      })
    )
    
    // Alias para evitar resolução do canvas
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }
    
    // Fallback para módulos Node.js no cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
      }
    }
    
    return config
  },
}

export default nextConfig
