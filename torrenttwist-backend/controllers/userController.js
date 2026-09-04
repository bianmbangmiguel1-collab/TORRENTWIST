const User = require('../models/User');
const Product = require('../models/Product');

// Récupérer les statistiques utilisateur
exports.getUserStats = async (req, res) => {
  try {
    const stats = await User.getStats(req.user.id);
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Récupérer les recommandations
exports.getRecommendations = async (req, res) => {
  try {
    const recommendations = await User.getRecommendations(req.user.id, 8);
    res.status(200).json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Erreur récupération recommandations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Récupérer les favoris
exports.getFavorites = async (req, res) => {
  try {
    const favorites = await User.getFavorites(req.user.id);
    res.status(200).json({
      success: true,
      favorites
    });
  } catch (error) {
    console.error('Erreur récupération favoris:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Ajouter/Retirer des favoris
exports.toggleFavorite = async (req, res) => {
  try {
    const { productId } = req.body;
    const result = await User.toggleFavorite(req.user.id, productId);
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Erreur favoris:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Récupérer l'historique des achats
exports.getPurchaseHistory = async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const purchases = await User.getPurchaseHistory(req.user.id, limit, offset);
    res.status(200).json({
      success: true,
      purchases
    });
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Récupérer les activités récentes
exports.getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const activities = await User.getActivities(req.user.id, limit);
    res.status(200).json({
      success: true,
      activities
    });
  } catch (error) {
    console.error('Erreur récupération activités:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};