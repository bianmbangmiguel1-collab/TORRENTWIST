/** @type {import('next').NextConfig} */
const nextConfig = {
  // ============================================================
  // IMAGES
  // ============================================================
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // ============================================================
  // EXPERIMENTAL - Server Components External Packages
  // ============================================================
  experimental: {
    serverComponentsExternalPackages: ['sqlite3', 'better-sqlite3', 'bcryptjs', 'jsonwebtoken', 'jose'],
  },

  // ============================================================
  // WEBPACK - Fallback pour les modules Node.js côté client
  // ============================================================
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        path: false,
        stream: false,
        crypto: false,
        os: false,
        http: false,
        https: false,
        zlib: false,
        ...config.resolve.fallback,
      };
    }
    return config;
  },

  // ============================================================
  // ⭐ PROXY - Rediriger les requêtes API vers le backend
  // ============================================================
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },

  // ============================================================
  // HEADERS - CSP COMPLET AVEC TOUTES LES SOURCES AUTORISÉES
  // ============================================================
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'production'
              ? [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://leekpay.fr https://js.stripe.com",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: https: blob:",
                  "font-src 'self' data:",
                  "media-src 'self' data: blob: https:",
                  "connect-src 'self' https://leekpay.fr https://api.leekpay.fr https://ipapi.co https://ipinfo.io https://api.ipapi.co https://js.stripe.com https://api.stripe.com",
                  "frame-src 'self' https://leekpay.fr https://js.stripe.com",
                  "object-src 'none'",
                  "base-uri 'self'",
                  "form-action 'self'",
                ].join('; ')
              : [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://leekpay.fr https://js.stripe.com",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: https: blob:",
                  "font-src 'self' data:",
                  "media-src 'self' data: blob: https:",
                  "connect-src 'self' http://localhost:5000 https://leekpay.fr https://api.leekpay.fr https://ipapi.co https://ipinfo.io https://api.ipapi.co https://js.stripe.com https://api.stripe.com",
                  "frame-src 'self' https://leekpay.fr https://js.stripe.com",
                  "object-src 'none'",
                  "base-uri 'self'",
                  "form-action 'self'",
                ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=()',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
    ];
  },

  // ============================================================
  // AUTRES CONFIGURATIONS
  // ============================================================
  reactStrictMode: true,
  swcMinify: true,
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // ============================================================
  // ENVIRONNEMENT - Variables exposées côté client
  // ============================================================
  env: {
    NEXT_PUBLIC_API_URL: process.env.NODE_ENV === 'production' 
      ? 'https://api.torrenttwist.com' 
      : 'http://localhost:5000',
    NEXT_PUBLIC_APP_URL: process.env.NODE_ENV === 'production'
      ? 'https://torrenttwist.com'
      : 'http://localhost:3000',
  },

  // ============================================================
  // TRAILING SLASH
  // ============================================================
  trailingSlash: false,

  // ============================================================
  // POWERED BY HEADER - Désactiver pour la sécurité
  // ============================================================
  poweredByHeader: false,

  // ============================================================
  // COMPRESSION
  // ============================================================
  compress: true,

  // ============================================================
  // GENERATE ETAGS
  // ============================================================
  generateEtags: true,

  // ============================================================
  // ON ERROR - Gestion des erreurs
  // ============================================================
  onError: (err, req, res) => {
    console.error('❌ Erreur Next.js:', err);
    res.statusCode = 500;
    res.end('Erreur interne du serveur');
  },

  // ============================================================
  // REDIRECTS
  // ============================================================
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/signin',
        destination: '/login',
        permanent: true,
      },
      {
        source: '/register',
        destination: '/signup',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;