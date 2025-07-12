/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add webpack configuration to handle dynamic imports
  webpack: (config, { isServer }) => {
    // Handle dynamic imports more reliably
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    
    // Fix for dynamic imports in API routes
    if (isServer) {
      config.externals = [...config.externals, 'pg'];
    }
    
    return config;
  },
  
  // Ensure proper handling of dynamic imports
  experimental: {
    esmExternals: 'loose',
  },
  
  // Add output configuration for better stability
  output: 'standalone',
}

module.exports = nextConfig
