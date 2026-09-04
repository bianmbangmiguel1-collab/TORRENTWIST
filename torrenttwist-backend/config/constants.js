// config/constants.js
module.exports = {
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026',
  TOKEN_DURATION_YEARS: 100000,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Uploads
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_PRODUCT_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100,
  AUTH_RATE_LIMIT_MAX: 20,
  
  // Devises
  DEFAULT_CURRENCY: 'FCFA',
  SUPPORTED_CURRENCIES: ['FCFA', 'USD', 'EUR', 'GBP', 'NGN', 'KES'],
  
  // Pays par défaut
  DEFAULT_COUNTRY: 'Cameroun',
  DEFAULT_COUNTRY_CODE: '+237',
  
  // CORS
  ALLOWED_ORIGINS: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
  ],
  
  // Upload directories
  UPLOAD_DIRS: [
    'uploads',
    'uploads/avatars',
    'uploads/products',
    'uploads/temp'
  ]
};