const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const userController = require('../controllers/userController');

// Toutes les routes protégées
router.use(protect);

router.get('/stats', userController.getUserStats);
router.get('/recommendations', userController.getRecommendations);
router.get('/favorites', userController.getFavorites);
router.post('/favorites/toggle', userController.toggleFavorite);
router.get('/purchases', userController.getPurchaseHistory);
router.get('/activities', userController.getRecentActivities);

module.exports = router;