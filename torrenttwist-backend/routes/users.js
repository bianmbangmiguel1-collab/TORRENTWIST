// torrenttwist-backend/routes/users.js
const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const jwt = require('jsonwebtoken');

// ============================================================
// MIDDLEWARE : Vérifier l'authentification depuis le cookie
// ============================================================
const authenticate = async (req, res, next) => {
  try {
    // 🔥 Récupérer le token depuis les cookies
    const token = req.cookies.user_session || req.cookies.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Non authentifié'
      });
    }

    // 🔥 Vérifier le JWT
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026');
      req.userId = decoded.id || decoded.userId;
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Token invalide'
      });
    }
  } catch (error) {
    console.error('❌ Erreur authenticate:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
};

// ============================================================
// GET /api/users/stats - Statistiques de l'utilisateur
// ============================================================
router.get('/stats', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;

    // 🔥 Récupérer les statistiques en snake_case
    const stats = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE user_id = ?) as total_purchases,
        (SELECT COUNT(*) FROM orders WHERE user_id = ? AND status = 'completed') as completed_orders,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = ? AND status = 'completed') as total_spent,
        (SELECT COUNT(*) FROM user_favorites WHERE user_id = ?) as total_favorites,
        (SELECT COUNT(*) FROM reviews WHERE user_id = ?) as total_reviews,
        (SELECT COUNT(*) FROM user_cart WHERE user_id = ?) as cart_items,
        (SELECT COUNT(*) FROM orders WHERE user_id = ? AND status = 'pending') as pending_orders,
        (SELECT COALESCE(engagement_score, 0) FROM users WHERE id = ?) as engagement_score
    `, [userId, userId, userId, userId, userId, userId, userId, userId]);

    res.json({
      success: true,
      stats: {
        total_purchases: stats?.total_purchases || 0,
        completed_orders: stats?.completed_orders || 0,
        total_spent: stats?.total_spent || 0,
        total_favorites: stats?.total_favorites || 0,
        total_reviews: stats?.total_reviews || 0,
        cart_items: stats?.cart_items || 0,
        pending_orders: stats?.pending_orders || 0,
        engagement_score: stats?.engagement_score || 0,
      }
    });

  } catch (error) {
    console.error('❌ Erreur /api/users/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// ============================================================
// GET /api/users/recommendations - Recommandations personnalisées
// ============================================================
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;

    // 🔥 Récupérer les intérêts de l'utilisateur
    const user = await db.get(
      'SELECT interests, main_goal FROM users WHERE id = ?',
      [userId]
    );

    let categoryFilter = '';
    let params = [];

    // 🔥 Si l'utilisateur a des intérêts, filtrer par catégorie
    if (user?.interests) {
      try {
        const interests = JSON.parse(user.interests);
        if (interests && interests.length > 0) {
          const placeholders = interests.map(() => '?').join(',');
          categoryFilter = `AND p.category_id IN (SELECT id FROM categories WHERE name IN (${placeholders}))`;
          params = interests;
        }
      } catch (e) {
        if (user.interests) {
          categoryFilter = 'AND p.category_id = (SELECT id FROM categories WHERE name = ?)';
          params = [user.interests];
        }
      }
    }

    // 🔥 Récupérer les recommandations
    const recommendations = await db.all(`
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.description,
        p.price,
        p.compare_price,
        p.avg_rating,
        p.sales,
        p.badge,
        c.name as category,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published' 
        AND p.is_active = 1
        ${categoryFilter}
      ORDER BY 
        CASE 
          WHEN p.featured = 1 THEN 0 
          ELSE 1 
        END,
        p.sales DESC,
        p.avg_rating DESC
      LIMIT 8
    `, params);

    // 🔥 Si pas assez de recommandations, compléter avec des produits populaires
    if (recommendations.length < 4) {
      const ids = recommendations.map(p => p.id).join(',') || '0';
      const popular = await db.all(`
        SELECT 
          p.id,
          p.title,
          p.slug,
          p.description,
          p.price,
          p.compare_price,
          p.avg_rating,
          p.sales,
          p.badge,
          c.name as category,
          (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as image
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'published' 
          AND p.is_active = 1
          AND p.id NOT IN (${ids})
        ORDER BY p.sales DESC, p.avg_rating DESC
        LIMIT ?
      `, [8 - recommendations.length]);
      
      recommendations.push(...popular);
    }

    res.json({
      success: true,
      recommendations: recommendations.slice(0, 8).map(p => ({
        ...p,
        image: p.image || '/images/placeholder.png',
        description: p.description?.substring(0, 150) || ''
      }))
    });

  } catch (error) {
    console.error('❌ Erreur /api/users/recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des recommandations'
    });
  }
});

// ============================================================
// GET /api/users/favorites - Favoris de l'utilisateur
// ============================================================
router.get('/favorites', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;

    // 🔥 Récupérer les favoris
    const favorites = await db.all(`
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.description,
        p.price,
        p.compare_price,
        p.avg_rating,
        p.sales,
        p.badge,
        c.name as category,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as image,
        f.created_at as favorited_at
      FROM user_favorites f
      JOIN products p ON f.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT 10
    `, [userId]);

    res.json({
      success: true,
      favorites: favorites.map(p => ({
        ...p,
        image: p.image || '/images/placeholder.png'
      }))
    });

  } catch (error) {
    console.error('❌ Erreur /api/users/favorites:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des favoris'
    });
  }
});

// ============================================================
// POST /api/users/favorites - Ajouter un favori
// ============================================================
router.post('/favorites', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: 'ID produit requis'
      });
    }

    // Vérifier si le produit existe
    const product = await db.get(
      'SELECT id FROM products WHERE id = ? AND status = "published"',
      [product_id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produit non trouvé'
      });
    }

    // Vérifier si déjà en favori
    const existing = await db.get(
      'SELECT id FROM user_favorites WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Déjà dans les favoris'
      });
    }

    // Ajouter aux favoris
    await db.run(
      `INSERT INTO user_favorites (user_id, product_id, created_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [userId, product_id]
    );

    res.json({
      success: true,
      message: 'Ajouté aux favoris'
    });

  } catch (error) {
    console.error('❌ Erreur POST /api/users/favorites:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout aux favoris'
    });
  }
});

// ============================================================
// DELETE /api/users/favorites/:product_id - Retirer un favori
// ============================================================
router.delete('/favorites/:product_id', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;
    const productId = parseInt(req.params.product_id);

    if (isNaN(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'ID produit invalide'
      });
    }

    await db.run(
      'DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    res.json({
      success: true,
      message: 'Retiré des favoris'
    });

  } catch (error) {
    console.error('❌ Erreur DELETE /api/users/favorites:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du retrait des favoris'
    });
  }
});

// ============================================================
// GET /api/users/activities - Activités récentes
// ============================================================
router.get('/activities', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 10;

    const activities = [];

    // 1. 🔥 Commandes récentes
    const orders = await db.all(`
      SELECT 
        'purchase' as action_type,
        order_number as product_title,
        total as metadata,
        created_at
      FROM orders 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [userId, Math.ceil(limit / 2)]);

    for (const order of orders) {
      activities.push({
        id: `order_${Date.now()}_${Math.random()}`,
        action_type: 'purchase',
        product_title: `Commande #${order.product_title}`,
        metadata: { total: order.metadata },
        created_at: order.created_at
      });
    }

    // 2. 🔥 Favoris récents
    const favorites = await db.all(`
      SELECT 
        'favorite_add' as action_type,
        p.title as product_title,
        f.created_at
      FROM user_favorites f
      JOIN products p ON f.product_id = p.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT ?
    `, [userId, Math.ceil(limit / 3)]);

    for (const fav of favorites) {
      activities.push({
        id: `fav_${Date.now()}_${Math.random()}`,
        action_type: 'favorite_add',
        product_title: fav.product_title,
        created_at: fav.created_at
      });
    }

    // 3. 🔥 Vues de produits (si table existe)
    try {
      const views = await db.all(`
        SELECT 
          'view' as action_type,
          p.title as product_title,
          uv.viewed_at as created_at
        FROM user_product_views uv
        JOIN products p ON uv.product_id = p.id
        WHERE uv.user_id = ?
        ORDER BY uv.viewed_at DESC
        LIMIT ?
      `, [userId, Math.ceil(limit / 3)]);

      for (const view of views) {
        activities.push({
          id: `view_${Date.now()}_${Math.random()}`,
          action_type: 'view',
          product_title: view.product_title,
          created_at: view.created_at
        });
      }
    } catch (e) {
      // Table user_product_views n'existe pas encore
    }

    // 🔥 Trier par date et limiter
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const limitedActivities = activities.slice(0, limit);

    res.json({
      success: true,
      activities: limitedActivities
    });

  } catch (error) {
    console.error('❌ Erreur /api/users/activities:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des activités'
    });
  }
});

// ============================================================
// GET /api/users/profile - Profil utilisateur
// ============================================================
router.get('/profile', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;

    // 🔥 Récupérer le profil en snake_case
    const user = await db.get(`
      SELECT 
        id,
        name,
        email,
        phone,
        bio,
        address,
        city,
        country,
        postal_code,
        avatar,
        role,
        is_admin,
        is_verified,
        engagement_score,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('❌ Erreur /api/users/profile:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du profil'
    });
  }
});

// ============================================================
// PUT /api/users/profile - Mettre à jour le profil
// ============================================================
router.put('/profile', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;
    const { name, phone, bio, address, city, country, postal_code, avatar } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // 🔥 Mettre à jour en snake_case
    await db.run(`
      UPDATE users 
      SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        bio = COALESCE(?, bio),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        country = COALESCE(?, country),
        postal_code = COALESCE(?, postal_code),
        avatar = COALESCE(?, avatar),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, phone, bio, address, city, country, postal_code, avatar, userId]);

    // 🔥 Récupérer l'utilisateur mis à jour
    const updatedUser = await db.get(`
      SELECT 
        id,
        name,
        email,
        phone,
        bio,
        address,
        city,
        country,
        postal_code,
        avatar,
        role,
        is_admin,
        is_verified,
        engagement_score,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
    `, [userId]);

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Erreur PUT /api/users/profile:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du profil'
    });
  }
});

// ============================================================
// GET /api/users/purchases - Historique des achats
// ============================================================
router.get('/purchases', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 20;

    // 🔥 Récupérer les achats en snake_case
    const purchases = await db.all(`
      SELECT 
        o.id,
        o.order_number,
        o.total,
        o.status,
        o.created_at as purchase_date,
        oi.product_id,
        oi.product_title,
        oi.price,
        oi.quantity,
        (SELECT url FROM product_images WHERE product_id = oi.product_id AND is_main = 1 LIMIT 1) as image
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ? AND o.status = 'completed'
      ORDER BY o.created_at DESC
      LIMIT ?
    `, [userId, limit]);

    res.json({
      success: true,
      purchases: purchases.map(p => ({
        ...p,
        image: p.image || '/images/placeholder.png'
      }))
    });

  } catch (error) {
    console.error('❌ Erreur /api/users/purchases:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des achats'
    });
  }
});

module.exports = router;