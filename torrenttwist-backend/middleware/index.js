// middleware/index.js
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Rate Limiter
 */
const rateLimiter = ({ windowMs = 60 * 1000, max = 10 }) => {
  return rateLimit({
    windowMs,
    max,
    handler: (req, res) => {
      logger.warn(`⚠️ Rate limit exceeded: ${req.ip}`);
      res.status(429).json({
        error: 'Trop de requêtes, veuillez réessayer plus tard'
      });
    }
  });
};

/**
 * Authentification
 */
const authenticate = async (req, res, next) => {
  try {
    // Votre logique d'auth
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    
    // Vérifier le token...
    req.user = { id: 3 }; // Exemple
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

/**
 * Gestionnaire d'erreurs global
 */
const errorHandler = (err, req, res, next) => {
  logger.error('❌ Erreur globale:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Erreur interne du serveur'
      : err.message,
    code: err.code || 'INTERNAL_ERROR'
  });
};

module.exports = {
  rateLimiter,
  authenticate,
  errorHandler
};