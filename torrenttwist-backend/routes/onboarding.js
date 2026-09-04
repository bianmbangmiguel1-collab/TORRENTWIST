const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkUserState } = require('../middleware/auth');
const onboardingController = require('../controllers/onboardingController');

// Toutes les routes protégées
router.use(protect);

// Routes d'onboarding
router.get('/status', onboardingController.getStatus);
router.post('/step1-goal', onboardingController.step1Goal);
router.post('/step2-interests', onboardingController.step2Interests);
router.post('/step3-experience', onboardingController.step3Experience);
router.post('/skip', onboardingController.skipOnboarding);

module.exports = router;