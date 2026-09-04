const User = require('../models/User');
const Product = require('../models/Product');

// ============ CACHE POUR ÉVITER LES DOUBLONS ============
const requestCache = new Map();

// Nettoyer le cache toutes les 5 secondes
setInterval(() => {
  requestCache.clear();
}, 5000);

// ============ ÉTAPE 1: OBJECTIF PRINCIPAL ============
exports.step1Goal = async (req, res) => {
  try {
    const { mainGoal } = req.body;
    const validGoals = ['apprendre', 'business', 'outils', 'contenu', 'autre'];
    const userId = req.user.id;
    
    const cacheKey = `${userId}:step1`;
    if (requestCache.has(cacheKey)) {
      console.log('⏳ step1 déjà en cours, ignore...');
      return res.status(429).json({
        success: false,
        message: 'Requête déjà en cours, veuillez patienter',
        code: 'DUPLICATE_REQUEST'
      });
    }
    requestCache.set(cacheKey, true);
    
    if (!mainGoal || !validGoals.includes(mainGoal)) {
      requestCache.delete(cacheKey);
      return res.status(400).json({
        success: false,
        message: 'Objectif invalide. Choisissez parmi: ' + validGoals.join(', '),
        code: 'INVALID_GOAL'
      });
    }
    
    const user = await User.findById(userId);
    if (user && user.onboardingStep >= 1) {
      requestCache.delete(cacheKey);
      return res.status(200).json({
        success: true,
        alreadyDone: true,
        nextStep: '/onboarding/interests',
        message: 'Étape déjà complétée'
      });
    }
    
    await User.recordActivity(userId, {
      actionType: 'onboarding_goal',
      metadata: { mainGoal }
    });
    
    await User.updateOnboarding(userId, {
      mainGoal,
      step: 1
    });
    
    requestCache.delete(cacheKey);
    
    res.status(200).json({
      success: true,
      nextStep: '/onboarding/interests',
      message: 'Objectif enregistré avec succès',
      data: { mainGoal, currentStep: 1 }
    });
  } catch (error) {
    const cacheKey = `${req.user?.id}:step1`;
    requestCache.delete(cacheKey);
    console.error('Erreur step1Goal:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'enregistrement de l\'objectif',
      code: 'STEP1_ERROR'
    });
  }
};

// ============ ÉTAPE 2: CENTRES D'INTÉRÊT ============
exports.step2Interests = async (req, res) => {
  try {
    const { interests } = req.body;
    const validCategories = ['ebooks', 'formations', 'logiciels', 'design', 'videos', 'packs'];
    const userId = req.user.id;
    
    const cacheKey = `${userId}:step2`;
    if (requestCache.has(cacheKey)) {
      console.log('⏳ step2 déjà en cours, ignore...');
      return res.status(429).json({
        success: false,
        message: 'Requête déjà en cours, veuillez patienter',
        code: 'DUPLICATE_REQUEST'
      });
    }
    requestCache.set(cacheKey, true);
    
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      requestCache.delete(cacheKey);
      return res.status(400).json({
        success: false,
        message: 'Veuillez sélectionner au moins un centre d\'intérêt',
        code: 'INVALID_INTERESTS'
      });
    }
    
    const invalid = interests.filter(i => !validCategories.includes(i));
    if (invalid.length > 0) {
      requestCache.delete(cacheKey);
      return res.status(400).json({
        success: false,
        message: `Catégories invalides: ${invalid.join(', ')}`,
        code: 'INVALID_CATEGORIES'
      });
    }
    
    const user = await User.findById(userId);
    if (user && user.onboardingStep >= 2) {
      requestCache.delete(cacheKey);
      return res.status(200).json({
        success: true,
        alreadyDone: true,
        nextStep: '/onboarding/experience',
        message: 'Étape déjà complétée'
      });
    }
    
    await User.updateOnboarding(userId, {
      interests,
      step: 2
    });
    
    await User.recordActivity(userId, {
      actionType: 'onboarding_interests',
      metadata: { interests }
    });
    
    let recommendations = [];
    let popularCategories = [];
    
    // ⚠️ GÉRER LES ERREURS SÉPARÉMENT
    try {
      recommendations = await User.getRecommendations(userId, 6) || [];
    } catch (error) {
      console.warn('⚠️ Erreur recommandations:', error.message);
      recommendations = [];
    }
    
    try {
      // Vérifier si la méthode existe avant de l'appeler
      if (typeof Product.getPopularCategories === 'function') {
        popularCategories = await Product.getPopularCategories(6) || [];
      } else {
        console.warn('⚠️ Product.getPopularCategories n\'existe pas');
        popularCategories = [];
      }
    } catch (error) {
      console.warn('⚠️ Erreur catégories populaires:', error.message);
      popularCategories = [];
    }
    
    requestCache.delete(cacheKey);
    
    res.status(200).json({
      success: true,
      nextStep: '/onboarding/experience',
      recommendations,
      popularCategories: popularCategories.map(c => c.category) || [],
      message: 'Intérêts enregistrés avec succès',
      data: { interests, currentStep: 2 }
    });
  } catch (error) {
    const cacheKey = `${req.user?.id}:step2`;
    requestCache.delete(cacheKey);
    console.error('Erreur step2Interests:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'enregistrement des intérêts',
      code: 'STEP2_ERROR'
    });
  }
};

// ============ ÉTAPE 3: NIVEAU D'EXPÉRIENCE ============
exports.step3Experience = async (req, res) => {
  try {
    const { experienceLevel } = req.body;
    const validLevels = ['débutant', 'intermédiaire', 'expert'];
    const userId = req.user.id;
    
    const cacheKey = `${userId}:step3`;
    if (requestCache.has(cacheKey)) {
      console.log('⏳ step3 déjà en cours, ignore...');
      return res.status(429).json({
        success: false,
        message: 'Requête déjà en cours, veuillez patienter',
        code: 'DUPLICATE_REQUEST'
      });
    }
    requestCache.set(cacheKey, true);
    
    if (!experienceLevel || !validLevels.includes(experienceLevel)) {
      requestCache.delete(cacheKey);
      return res.status(400).json({
        success: false,
        message: 'Niveau invalide. Choisissez parmi: ' + validLevels.join(', '),
        code: 'INVALID_LEVEL'
      });
    }
    
    const user = await User.findById(userId);
    if (user && user.onboardingCompleted) {
      requestCache.delete(cacheKey);
      return res.status(200).json({
        success: true,
        alreadyDone: true,
        redirectTo: '/dashboard',
        message: 'Onboarding déjà terminé'
      });
    }
    
    await User.updateOnboarding(userId, {
      experienceLevel,
      step: 3
    });
    
    await User.recordActivity(userId, {
      actionType: 'onboarding_completed',
      metadata: { experienceLevel }
    });
    
    requestCache.delete(cacheKey);
    
    res.status(200).json({
      success: true,
      redirectTo: '/dashboard',
      message: 'Onboarding terminé ! Bienvenue sur TorrentTwist',
      data: {
        experienceLevel,
        currentStep: 3,
        onboardingCompleted: true
      }
    });
  } catch (error) {
    const cacheKey = `${req.user?.id}:step3`;
    requestCache.delete(cacheKey);
    console.error('Erreur step3Experience:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'enregistrement du niveau',
      code: 'STEP3_ERROR'
    });
  }
};

// ============ STATUT ONBOARDING ============
exports.getStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      });
    }
    
    let nextStep = null;
    if (!user.onboardingCompleted) {
      if (user.onboardingStep === 0) nextStep = '/onboarding/goal';
      else if (user.onboardingStep === 1) nextStep = '/onboarding/interests';
      else if (user.onboardingStep === 2) nextStep = '/onboarding/experience';
    }
    
    res.status(200).json({
      success: true,
      data: {
        onboardingCompleted: user.onboardingCompleted === 1,
        onboardingStep: user.onboardingStep || 0,
        profileCompleteness: user.profileCompleteness || 0,
        mainGoal: user.mainGoal || null,
        interests: user.interests ? JSON.parse(user.interests) : [],
        experienceLevel: user.experienceLevel || null,
        nextStep
      }
    });
  } catch (error) {
    console.error('Erreur getStatus:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération du statut',
      code: 'STATUS_ERROR'
    });
  }
};

// ============ SAUTER L'ONBOARDING ============
exports.skipOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await User.updateOnboarding(userId, {
      step: 3,
      mainGoal: 'explorer',
      interests: ['ebooks', 'formations', 'logiciels'],
      experienceLevel: 'débutant'
    });
    
    await User.recordActivity(userId, {
      actionType: 'onboarding_skipped',
      metadata: { reason: req.body.reason || 'non spécifié' }
    });
    
    res.status(200).json({
      success: true,
      redirectTo: '/dashboard',
      message: 'Onboarding ignoré avec succès'
    });
  } catch (error) {
    console.error('Erreur skipOnboarding:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors du skip',
      code: 'SKIP_ERROR'
    });
  }
};

// ============ RÉINITIALISER L'ONBOARDING ============
exports.resetOnboarding = async (req, res) => {
  try {
    await User.updateOnboarding(req.user.id, {
      step: 0,
      mainGoal: null,
      interests: null,
      experienceLevel: null
    });
    
    res.status(200).json({
      success: true,
      message: 'Onboarding réinitialisé avec succès'
    });
  } catch (error) {
    console.error('Erreur resetOnboarding:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la réinitialisation',
      code: 'RESET_ERROR'
    });
  }
};

// ============ OBTENIR TOUTES LES ÉTAPES ============
exports.getSteps = async (req, res) => {
  try {
    const steps = [
      {
        id: 1,
        title: 'Objectif principal',
        description: 'Dites-nous ce que vous voulez accomplir',
        icon: '🎯',
        fields: ['mainGoal'],
        options: [
          { value: 'apprendre', label: 'Apprendre de nouvelles compétences' },
          { value: 'business', label: 'Développer mon business' },
          { value: 'outils', label: 'Trouver des outils professionnels' },
          { value: 'contenu', label: 'Créer du contenu' },
          { value: 'autre', label: 'Autre' }
        ]
      },
      {
        id: 2,
        title: 'Centres d\'intérêt',
        description: 'Sélectionnez les catégories qui vous intéressent',
        icon: '📚',
        fields: ['interests'],
        options: [
          { value: 'ebooks', label: 'Ebooks' },
          { value: 'formations', label: 'Formations' },
          { value: 'logiciels', label: 'Logiciels' },
          { value: 'design', label: 'Design' },
          { value: 'videos', label: 'Vidéos' },
          { value: 'packs', label: 'Packs' }
        ]
      },
      {
        id: 3,
        title: 'Niveau d\'expérience',
        description: 'Quel est votre niveau actuel ?',
        icon: '⭐',
        fields: ['experienceLevel'],
        options: [
          { value: 'débutant', label: 'Débutant', description: 'Je découvre le domaine' },
          { value: 'intermédiaire', label: 'Intermédiaire', description: 'J\'ai quelques connaissances' },
          { value: 'expert', label: 'Expert', description: 'Je maîtrise le sujet' }
        ]
      }
    ];
    
    res.status(200).json({
      success: true,
      steps
    });
  } catch (error) {
    console.error('Erreur getSteps:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des étapes',
      code: 'STEPS_ERROR'
    });
  }
};

// ============ COMPLÉTER L'ONBOARDING ============
exports.completeOnboarding = async (req, res) => {
  try {
    await User.updateOnboarding(req.user.id, {
      step: 3
    });
    
    res.status(200).json({
      success: true,
      message: 'Onboarding marqué comme terminé'
    });
  } catch (error) {
    console.error('Erreur completeOnboarding:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la complétion',
      code: 'COMPLETE_ERROR'
    });
  }
};