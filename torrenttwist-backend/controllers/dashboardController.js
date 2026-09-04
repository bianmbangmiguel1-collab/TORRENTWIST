const User = require('../models/User');
const Product = require('../models/Product');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    // Récupérer toutes les données en parallèle
    const [
      recommendations,
      stats,
      favorites,
      cart,
      recentActivities,
      trendingProducts,
      newProducts,
      popularProducts
    ] = await Promise.all([
      User.getRecommendations(userId, 8),
      User.getStats(userId),
      User.getFavorites(userId),
      User.getCart(userId),
      getRecentActivities(userId, 5),
      Product.findAll({ featured: 'true', limit: 4 }),
      Product.findAll({ limit: 4, sort: 'newest' }),
      Product.getPopularProducts(4)
    ]);
    
    // Construire le dashboard personnalisé
    const dashboardData = {
      user: {
        name: user.name,
        mainGoal: user.mainGoal,
        interests: user.interests ? JSON.parse(user.interests) : [],
        experienceLevel: user.experienceLevel,
        profileCompleteness: user.profileCompleteness,
        memberSince: user.createdAt
      },
      welcome: {
        message: getWelcomeMessage(user),
        suggestion: getSuggestionMessage(user)
      },
      recommendations: recommendations.map(r => ({
        ...r,
        isFavorite: favorites.some(f => f.id === r.id),
        isInCart: cart.some(c => c.id === r.id)
      })),
      stats: {
        totalPurchases: stats.totalPurchases || 0,
        totalFavorites: stats.totalFavorites || 0,
        totalReviews: stats.totalReviews || 0,
        totalViews: stats.totalViews || 0,
        engagementScore: stats.engagementScore || 0,
        memberSince: user.createdAt
      },
      favorites: favorites.slice(0, 4),
      cart: cart.slice(0, 4),
      recentActivities: recentActivities,
      trending: trendingProducts,
      newArrivals: newProducts,
      popular: popularProducts,
      // Messages contextuels
      notifications: getNotifications(user, stats)
    };
    
    res.status(200).json({
      success: true,
      dashboard: dashboardData
    });
  } catch (error) {
    console.error('Erreur dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtenir les activités récentes
async function getRecentActivities(userId, limit = 10) {
  const db = getDB();
  return await db.all(
    `SELECT a.*, p.title as productTitle
     FROM user_activities a
     LEFT JOIN products p ON p.id = a.productId
     WHERE a.userId = ?
     ORDER BY a.createdAt DESC
     LIMIT ?`,
    [userId, limit]
  );
}

// Messages personnalisés
function getWelcomeMessage(user) {
  const names = {
    'apprendre': 'prêt à apprendre',
    'business': 'prêt à développer votre business',
    'outils': 'à la recherche d\'outils puissants',
    'contenu': 'prêt à créer du contenu',
    'explorer': 'explorateur curieux'
  };
  
  const goal = user.mainGoal || 'explorer';
  const goalText = names[goal] || 'explorer';
  const firstName = user.name.split(' ')[0];
  
  const timeBasedGreeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();
  
  return `${timeBasedGreeting} ${firstName} ! Vous êtes ${goalText} aujourd'hui.`;
}

function getSuggestionMessage(user) {
  if (!user.interests) {
    return '💡 Découvrez nos catégories pour personnaliser votre expérience.';
  }
  
  const interests = JSON.parse(user.interests);
  if (interests.length === 0) {
    return '💡 Explorez nos produits pour affiner vos recommandations.';
  }
  
  const interestList = interests.join(', ');
  return `🎯 Basé sur vos intérêts pour ${interestList}, voici ce que nous vous suggérons.`;
}

function getNotifications(user, stats) {
  const notifications = [];
  
  // Si l'utilisateur n'a pas encore acheté
  if (stats.totalPurchases === 0) {
    notifications.push({
      type: 'info',
      message: '🌟 Découvrez notre sélection de produits premium !'
    });
  }
  
  // Si l'utilisateur a des favoris mais n'a pas acheté
  if (stats.totalFavorites > 0 && stats.totalPurchases === 0) {
    notifications.push({
      type: 'promo',
      message: '💫 Profitez de -10% sur vos articles favoris avec le code TORRENT10'
    });
  }
  
  // Si l'utilisateur est engagé
  if (stats.engagementScore > 20) {
    notifications.push({
      type: 'achievement',
      message: '🏆 Vous faites partie des utilisateurs les plus actifs !'
    });
  }
  
  return notifications;
}