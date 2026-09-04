const express = require('express');
const router = express.Router();
const { protect, checkUserState } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// ============ MIDDLEWARE ============
// Toutes les routes nécessitent une authentification
router.use(protect);

// Vérifier l'état de l'utilisateur (onboarding)
router.use(checkUserState);

// ============ ROUTES DASHBOARD ============

// @route   GET /api/dashboard
// @desc    Obtenir les données du tableau de bord
// @access  Private
router.get('/', dashboardController.getDashboard);

module.exports = router;