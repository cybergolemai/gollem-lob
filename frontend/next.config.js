/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    
    // API routes configuration
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
        }
      ]
    },
  
    // Asset optimization
    images: {
      domains: [],
      unoptimized: process.env.NODE_ENV === 'development'
    },
  
    // Build configuration
    poweredByHeader: false,
    generateEtags: true,
    compress: true,
    
    // Environment specific settings
    env: {
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
    },
  
    // Webpack configuration
    webpack: (config, { dev, isServer }) => {
      // Add any custom webpack configurations here
      config.module.rules.push({
        test: /\.svg$/,
        use: ['@svgr/webpack']
      });
  
      return config;
    },
  
    // Headers configuration for security
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'X-DNS-Prefetch-Control',
              value: 'on'
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block'
            },
            {
              key: 'X-Frame-Options',
              value: 'SAMEORIGIN'
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff'
            },
            {
              key: 'Referrer-Policy',
              value: 'origin-when-cross-origin'
            }
          ]
        }
      ]
    },
  
    // Redirects configuration
    async redirects() {
      return [
        {
          source: '/home',
          destination: '/',
          permanent: true
        }
      ]
    },
  
    // TypeScript configuration
    typescript: {
      ignoreBuildErrors: false
    },
  
    // Experimental features
    experimental: {
      // Enable modern JavaScript features
      esmExternals: true,
      // Optimize server components
      serverComponents: false,
      // Enable new image optimization
      images: {
        allowFutureImage: true
      }
    }
  }
  
  module.exports = nextConfig