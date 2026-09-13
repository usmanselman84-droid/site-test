import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  images: {
    localPatterns: [
      { pathname: '/uploads/**' },
      { pathname: '/covers/**' },
      { pathname: '/brand/**' },
      { pathname: '/icons/**' },
      { pathname: '/media/**' },
    ],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Avoid hard 400s on odd query strings / newly uploaded files
    minimumCacheTTL: 60,
    formats: ['image/avif', 'image/webp'],
  },
  webpack(config, { isServer }) {
    if (!isServer && config.optimization?.splitChunks) {
      const split = config.optimization.splitChunks;
      if (split !== false && typeof split === 'object') {
        split.cacheGroups = {
          ...(split.cacheGroups || {}),
          lucide: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'lucide',
            chunks: 'async',
            reuseExistingChunk: true,
            priority: 20,
          },
        };
      }
    }
    return config;
  },
  async redirects() {
    return [
      { source: '/about', destination: '/p/about', permanent: true },
      // Live catalogs (programs) — CMS intros redirect to them
      { source: '/p/grants', destination: '/grants', permanent: true },
      { source: '/p/dobro', destination: '/dobro', permanent: true },
      { source: '/p/self-gov', destination: '/self-gov', permanent: true },
      // /documents is the file library + viewer (not CMS)
      { source: '/p/documents', destination: '/documents', permanent: true },
      { source: '/scan', destination: '/scanner?tab=pass', permanent: true },
      { source: '/profile', destination: '/dashboard/settings', permanent: false },
      { source: '/profile/:path*', destination: '/dashboard/settings', permanent: false },
      { source: '/cookies', destination: '/privacy', permanent: false },
      { source: '/dashboard/bookings', destination: '/dashboard', permanent: false },
      // Ghost cabinet / public aliases → canonical routes
      { source: '/dashboard/favorites', destination: '/dashboard/me', permanent: false },
      { source: '/dashboard/orders', destination: '/dashboard/shop', permanent: false },
      { source: '/dashboard/points', destination: '/dashboard/shop', permanent: false },
      { source: '/dashboard/profile/edit', destination: '/dashboard/edit', permanent: false },
      { source: '/shop', destination: '/dashboard/shop', permanent: false },
      { source: '/achievements', destination: '/dashboard/achievements', permanent: false },
      { source: '/opportunities', destination: '/grants', permanent: false },
      { source: '/staff', destination: '/admin', permanent: false },
      { source: '/chats', destination: '/dashboard/messages', permanent: true },
      { source: '/chats/:path*', destination: '/dashboard/messages', permanent: true },
      { source: '/messages', destination: '/dashboard/messages', permanent: true },
      { source: '/messages/:path*', destination: '/dashboard/messages', permanent: true },
      { source: '/friends', destination: '/dashboard/friends', permanent: true },
    ];
  },
  async rewrites() {
    return [{ source: '/service-worker.js', destination: '/sw.js' }];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/service-worker.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
      {
        source: '/brand/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/covers/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=2592000' },
        ],
      },
    ];
  },
};

export default nextConfig;
