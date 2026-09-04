const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ============ AUTHENTIFICATION PRINCIPALE ============

const protect = async (req, res, next) => {
  try {
    let token;

    // Récupérer le token du header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Vérifier aussi dans les cookies (optionnel)
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé. Token manquant.',
        code: 'TOKEN_MISSING'
      });
    }

    try {
      // Vérifier et décoder le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Récupérer l'utilisateur
      req.user = await User.findById(decoded.id);
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND'
        });
      }

      // Vérifier si le compte est actif (non verrouillé)
      if (req.user.lockUntil && new Date(req.user.lockUntil) > new Date()) {
        const remainingTime = Math.ceil((new Date(req.user.lockUntil) - new Date()) / (60 * 1000));
        return res.status(403).json({
          success: false,
          message: `Compte verrouillé. Réessayez dans ${remainingTime} minutes`,
          code: 'ACCOUNT_LOCKED',
          remainingMinutes: remainingTime
        });
      }

      // Ajouter l'utilisateur à la requête
      req.userId = req.user.id;
      req.userRole = req.user.role;
      
      // Enregistrer l'activité de connexion (optionnel)
      if (User.recordActivity) {
        await User.recordActivity(req.user.id, {
          actionType: 'auth',
          metadata: { 
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
          }
        });
      }

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expirée. Veuillez vous reconnecter.',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Token invalide',
        code: 'TOKEN_INVALID'
      });
    }
  } catch (error) {
    console.error('Erreur authentification:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'authentification',
      code: 'AUTH_ERROR'
    });
  }
};

// ============ VÉRIFICATION ADMIN ============

const admin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Accès refusé. Droits administrateur requis.',
      code: 'ADMIN_REQUIRED'
    });
  }
};

// ============ VÉRIFICATION UTILISATEUR (Propriétaire) ============

const owner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise',
      code: 'AUTH_REQUIRED'
    });
  }

  const userId = parseInt(req.params.userId) || parseInt(req.params.id) || req.body.userId;
  
  if (req.user.role === 'admin' || req.user.id === userId) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Accès refusé. Vous n\'êtes pas le propriétaire.',
      code: 'NOT_OWNER'
    });
  }
};

// ============ VÉRIFICATION DE L'ÉTAT UTILISATEUR ============

const checkUserState = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Ajouter les données utilisateur à req
    req.userData = {
      ...user,
      onboardingCompleted: user.onboardingCompleted === 1
    };
    
    next();
  } catch (error) {
    console.error('Erreur checkUserState:', error);
    next();
  }
};

// ============ VÉRIFICATION EMAIL ============

const isVerified = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise',
        code: 'AUTH_REQUIRED'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Veuillez vérifier votre email avant de continuer.',
        code: 'EMAIL_NOT_VERIFIED',
        resendUrl: '/api/auth/resend-verification'
      });
    }

    next();
  } catch (error) {
    console.error('Erreur vérification email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification',
      code: 'VERIFICATION_ERROR'
    });
  }
};

// ============ VÉRIFICATION ONBOARDING ============

const onboardingCompleted = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise',
        code: 'AUTH_REQUIRED'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Veuillez compléter votre onboarding',
        code: 'ONBOARDING_REQUIRED',
        redirect: '/onboarding',
        step: user.onboardingStep || 0
      });
    }

    next();
  } catch (error) {
    console.error('Erreur vérification onboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification',
      code: 'ONBOARDING_ERROR'
    });
  }
};

// ============ VÉRIFICATION DES PERMISSIONS (modulaire) ============

const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise',
        code: 'AUTH_REQUIRED'
      });
    }

    const userPermissions = req.user.permissions || [];
    if (req.user.role === 'admin' || userPermissions.includes(permission)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: `Permission '${permission}' requise`,
        code: 'PERMISSION_DENIED'
      });
    }
  };
};

// ============ RATELIMIT PAR UTILISATEUR ============

const userRequests = new Map();

const rateLimitByUser = (maxRequests = 60, windowMs = 60000) => {
  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const key = `${userId}:${req.path}`;
    const now = Date.now();
    
    if (!userRequests.has(key)) {
      userRequests.set(key, []);
    }
    
    const requests = userRequests.get(key);
    const windowStart = now - windowMs;
    
    // Filtrer les requêtes anciennes
    const recentRequests = requests.filter(time => time > windowStart);
    recentRequests.push(now);
    userRequests.set(key, recentRequests);
    
    if (recentRequests.length > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Trop de requêtes. Veuillez ralentir.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    next();
  };
};

// ============ COMPLÉTUDE DU PROFIL ============

const profileComplete = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise',
        code: 'AUTH_REQUIRED'
      });
    }

    const user = await User.findById(req.user.id);
    const requiredFields = ['name', 'email', 'mainGoal', 'interests'];
    const missingFields = requiredFields.filter(field => !user[field]);
    
    if (missingFields.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Veuillez compléter votre profil',
        code: 'PROFILE_INCOMPLETE',
        missingFields,
        completeness: user.profileCompleteness || 0
      });
    }

    next();
  } catch (error) {
    console.error('Erreur vérification profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification',
      code: 'PROFILE_ERROR'
    });
  }
};

// ============ CHECK ACTIVE SESSION ============

const checkActiveSession = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const user = await User.findById(req.user.id);
    const lastActivity = user.lastActivity ? new Date(user.lastActivity) : new Date();
    const now = new Date();
    const inactiveMinutes = (now - lastActivity) / (1000 * 60);
    
    // Si inactif depuis plus de 30 minutes, forcer une reconnexion
    if (inactiveMinutes > 30) {
      return res.status(401).json({
        success: false,
        message: 'Session expirée. Veuillez vous reconnecter.',
        code: 'SESSION_EXPIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Erreur vérification session:', error);
    next();
  }
};

// ============ REFRESH TOKEN ============

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token requis',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Vérifier le refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      });
    }

    // Générer un nouveau token
    const newToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(200).json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Erreur refresh token:', error);
    res.status(401).json({
      success: false,
      message: 'Refresh token invalide',
      code: 'REFRESH_TOKEN_INVALID'
    });
  }
};

// ============ LOGOUT ============

const logout = async (req, res) => {
  try {
    if (req.user) {
      // Enregistrer la déconnexion
      if (User.recordActivity) {
        await User.recordActivity(req.user.id, {
          actionType: 'logout',
          metadata: { 
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion'
    });
  }
};

// ============ EXPORTATION ============

module.exports = {
  protect,
  admin,
  owner,
  isVerified,
  onboardingCompleted,
  hasPermission,
  rateLimitByUser,
  profileComplete,
  checkActiveSession,
  refreshToken,
  logout,
  checkUserState
};