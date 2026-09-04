const express = require('express');
const router = express.Router();
const { protect, admin, adminProtect } = require('../middleware/auth');
const User = require('../models/User');
const Product = require('../models/Product');
const { getDB } = require('../config/database');

// ============ MIDDLEWARE ADMIN ============
router.use(protect);
router.use(admin);

// ============ DASHBOARD ============

// @desc    Obtenir les statistiques du dashboard
// @route   GET /api/admin/stats
// @access  Private/Admin
router.get('/stats', async (req, res) => {
  try {
    const db = getDB();
    
    const [revenue, orders, customers, conversion, products, pendingOrders] = await Promise.all([
      db.get('SELECT COALESCE(SUM(totalAmount), 0) as total FROM orders WHERE status = "completed"'),
      db.get('SELECT COUNT(*) as count FROM orders'),
      db.get('SELECT COUNT(DISTINCT userId) as count FROM orders'),
      db.get(`
        SELECT 
          (SELECT COUNT(*) FROM orders) as total_orders,
          (SELECT COUNT(*) FROM users) as total_users,
          ROUND((CAST((SELECT COUNT(*) FROM orders) AS FLOAT) / 
                 CAST((SELECT COUNT(*) FROM users) AS FLOAT)) * 100, 2) as rate
      `),
      db.get('SELECT COUNT(*) as count FROM products WHERE isActive = 1'),
      db.get('SELECT COUNT(*) as count FROM orders WHERE status = "pending"')
    ]);

    // Récupérer les revenus par mois
    const monthlyRevenue = await db.all(`
      SELECT 
        strftime('%Y-%m', purchaseDate) as month,
        COALESCE(SUM(amount), 0) as total
      FROM purchases
      WHERE status = 'completed'
      GROUP BY strftime('%Y-%m', purchaseDate)
      ORDER BY month DESC
      LIMIT 12
    `);

    // Récupérer les produits les plus vendus
    const topProducts = await db.all(`
      SELECT 
        p.id,
        p.title,
        COUNT(*) as sales_count,
        COALESCE(SUM(pu.amount), 0) as revenue
      FROM purchases pu
      JOIN products p ON p.id = pu.productId
      WHERE pu.status = 'completed'
      GROUP BY p.id
      ORDER BY sales_count DESC
      LIMIT 5
    `);

    // Récupérer les nouveaux utilisateurs
    const newUsers = await db.all(`
      SELECT 
        id,
        name,
        email,
        createdAt
      FROM users
      ORDER BY createdAt DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        revenue: revenue.total || 0,
        orders: orders.count || 0,
        customers: customers.count || 0,
        conversion: conversion.rate || 0,
        products: products.count || 0,
        pendingOrders: pendingOrders.count || 0,
        monthlyRevenue,
        topProducts,
        newUsers
      }
    });
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ ACTIVITÉS ============

// @desc    Obtenir les activités récentes
// @route   GET /api/admin/activities
// @access  Private/Admin
router.get('/activities', async (req, res) => {
  try {
    const db = getDB();
    const { limit = 20 } = req.query;
    
    const activities = await db.all(`
      SELECT 
        id,
        userId,
        action,
        details,
        ip,
        userAgent,
        createdAt
      FROM admin_activity_logs 
      ORDER BY createdAt DESC 
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.json({
      success: true,
      activities
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ GESTION DES UTILISATEURS ============

// @desc    Liste des utilisateurs
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', async (req, res) => {
  try {
    const db = getDB();
    const { search, limit = 20, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        id, 
        name, 
        email, 
        role, 
        isVerified, 
        isAdmin,
        createdAt,
        lastLogin
      FROM users 
    `;
    
    const params = [];
    
    if (search) {
      query += ' WHERE name LIKE ? OR email LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const users = await db.all(query, params);
    
    // Total des utilisateurs
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    if (search) {
      countQuery += ' WHERE name LIKE ? OR email LIKE ?';
    }
    const total = await db.get(countQuery, search ? [`%${search}%`, `%${search}%`] : []);
    
    res.json({
      success: true,
      users,
      pagination: {
        total: total.total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// @desc    Détails d'un utilisateur
// @route   GET /api/admin/users/:id
// @access  Private/Admin
router.get('/users/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    const user = await db.get(`
      SELECT 
        id, 
        name, 
        email, 
        role, 
        isVerified, 
        isAdmin,
        phone,
        bio,
        address,
        city,
        country,
        postalCode,
        avatar,
        preferences,
        createdAt,
        lastLogin
      FROM users 
      WHERE id = ?
    `, [id]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Récupérer les statistiques de l'utilisateur
    const stats = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM purchases WHERE userId = ?) as totalPurchases,
        (SELECT COALESCE(SUM(amount), 0) FROM purchases WHERE userId = ? AND status = 'completed') as totalSpent,
        (SELECT COUNT(*) FROM user_favorites WHERE userId = ?) as totalFavorites,
        (SELECT COUNT(*) FROM product_reviews WHERE userId = ?) as totalReviews
    `, [id, id, id, id]);

    // Récupérer les achats récents
    const purchases = await db.all(`
      SELECT 
        p.*,
        pr.title as productTitle,
        pr.image as productImage
      FROM purchases p
      JOIN products pr ON pr.id = p.productId
      WHERE p.userId = ?
      ORDER BY p.purchaseDate DESC
      LIMIT 10
    `, [id]);

    res.json({
      success: true,
      user: {
        ...user,
        stats,
        purchases
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// @desc    Modifier un utilisateur
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isVerified, isAdmin, phone, bio, address, city, country, postalCode } = req.body;
    
    const db = getDB();
    
    // Vérifier si l'utilisateur existe
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Ne pas modifier l'admin principal
    if (user.isInternal && user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Impossible de modifier l\'administrateur principal'
      });
    }

    await db.run(`
      UPDATE users SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        role = COALESCE(?, role),
        isVerified = COALESCE(?, isVerified),
        isAdmin = COALESCE(?, isAdmin),
        phone = COALESCE(?, phone),
        bio = COALESCE(?, bio),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        country = COALESCE(?, country),
        postalCode = COALESCE(?, postalCode),
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, email, role, isVerified, isAdmin, phone, bio, address, city, country, postalCode, id]);

    // Log l'activité
    await db.run(`
      INSERT INTO admin_activity_logs (userId, action, details, createdAt)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, 'update_user', JSON.stringify({ userId: id, changes: req.body }), new Date().toISOString()]);

    const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// @desc    Supprimer un utilisateur
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
router.delete('/users/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    // Vérifier si l'utilisateur existe
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Ne pas supprimer l'admin principal
    if (user.isInternal && user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Impossible de supprimer l\'administrateur principal'
      });
    }

    // Ne pas supprimer les admins
    if (user.role === 'admin' || user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Impossible de supprimer un administrateur'
      });
    }

    await db.run('DELETE FROM users WHERE id = ?', [id]);

    // Log l'activité
    await db.run(`
      INSERT INTO admin_activity_logs (userId, action, details, createdAt)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, 'delete_user', JSON.stringify({ userId: id, email: user.email }), new Date().toISOString()]);

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ GESTION DES PRODUITS ============

// @desc    Liste des produits (admin)
// @route   GET /api/admin/products
// @access  Private/Admin
router.get('/products', async (req, res) => {
  try {
    const db = getDB();
    const { search, category, limit = 20, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const products = await db.all(query, params);
    
    const total = await db.get(
      'SELECT COUNT(*) as total FROM products WHERE 1=1' + (search ? ' AND (title LIKE ? OR description LIKE ?)' : '') + (category && category !== 'all' ? ' AND category = ?' : ''),
      search ? [`%${search}%`, `%${search}%`, category && category !== 'all' ? category : null].filter(Boolean) : []
    );

    res.json({
      success: true,
      products,
      pagination: {
        total: total?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// @desc    Créer un produit (admin)
// @route   POST /api/admin/products
// @access  Private/Admin
router.post('/products', async (req, res) => {
  try {
    const db = getDB();
    const productData = {
      ...req.body,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.run(`
      INSERT INTO products (
        title, description, category, price, oldPrice,
        rating, sales, badge, image, downloadUrl,
        fileSize, format, tags, views, isActive,
        featured, createdBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      productData.title,
      productData.description,
      productData.category,
      productData.price,
      productData.oldPrice || null,
      productData.rating || 0,
      productData.sales || 0,
      productData.badge || null,
      productData.image || '/api/placeholder/300/200',
      productData.downloadUrl || null,
      productData.fileSize || null,
      productData.format || null,
      productData.tags ? JSON.stringify(productData.tags) : null,
      productData.views || 0,
      productData.isActive !== undefined ? productData.isActive : 1,
      productData.featured || 0,
      productData.createdBy,
      productData.createdAt,
      productData.updatedAt
    ]);

    // Log l'activité
    await db.run(`
      INSERT INTO admin_activity_logs (userId, action, details, createdAt)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, 'create_product', JSON.stringify({ productId: result.lastID, title: productData.title }), new Date().toISOString()]);

    const product = await db.get('SELECT * FROM products WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      product
    });
  } catch (error) {
    console.error('Erreur création produit:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// @desc    Modifier un produit (admin)
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
router.put('/products/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    // Vérifier si le produit existe
    const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    const updates = [];
    const values = [];
    const fields = ['title', 'description', 'category', 'price', 'oldPrice', 'rating', 'sales', 'badge', 'image', 'downloadUrl', 'fileSize', 'format', 'tags', 'isActive', 'featured'];
    
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'tags' && typeof req.body[field] === 'object') {
          values.push(JSON.stringify(req.body[field]));
        } else {
          values.push(req.body[field]);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune donnée à mettre à jour'
      });
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    await db.run(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Log l'activité
    await db.run(`
      INSERT INTO admin_activity_logs (userId, action, details, createdAt)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, 'update_product', JSON.stringify({ productId: id, changes: req.body }), new Date().toISOString()]);

    const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Produit mis à jour avec succès',
      product: updatedProduct
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// @desc    Supprimer un produit (admin)
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
router.delete('/products/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    // Vérifier si le produit existe
    const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Soft delete
    await db.run('UPDATE products SET isActive = 0 WHERE id = ?', [id]);

    // Log l'activité
    await db.run(`
      INSERT INTO admin_activity_logs (userId, action, details, createdAt)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, 'delete_product', JSON.stringify({ productId: id, title: product.title }), new Date().toISOString()]);

    res.json({
      success: true,
      message: 'Produit supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ STATISTIQUES PRODUITS ============

// @desc    Statistiques des produits
// @route   GET /api/admin/products/stats
// @access  Private/Admin
router.get('/products/stats', async (req, res) => {
  try {
    const db = getDB();
    
    const stats = await db.get(`
      SELECT 
        COUNT(*) as totalProducts,
        SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as activeProducts,
        SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featuredProducts,
        SUM(sales) as totalSales,
        AVG(rating) as avgRating,
        COUNT(DISTINCT category) as totalCategories
      FROM products
    `);

    const categories = await db.all(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(sales) as totalSales,
        AVG(rating) as avgRating
      FROM products
      WHERE isActive = 1
      GROUP BY category
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      stats,
      categories
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ STATISTIQUES COMMANDES ============

// @desc    Statistiques des commandes
// @route   GET /api/admin/orders/stats
// @access  Private/Admin
router.get('/orders/stats', async (req, res) => {
  try {
    const db = getDB();
    
    const stats = await db.get(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedOrders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingOrders,
        SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refundedOrders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as totalRevenue
      FROM orders
    `);

    const recentOrders = await db.all(`
      SELECT 
        o.*,
        u.name as userName,
        u.email as userEmail
      FROM orders o
      JOIN users u ON u.id = o.userId
      ORDER BY o.createdAt DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      stats,
      recentOrders
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ PARAMÈTRES ADMIN ============

// @desc    Obtenir les paramètres admin
// @route   GET /api/admin/settings
// @access  Private/Admin
router.get('/settings', async (req, res) => {
  try {
    const db = getDB();
    
    const settings = await db.get(`
      SELECT * FROM admin_settings WHERE id = 1
    `);

    res.json({
      success: true,
      settings: settings || {
        siteName: 'TorrentTwist',
        siteLogo: '/torrent.png',
        currency: 'FCFA',
        taxRate: 0,
        maintenance: false,
        aiEnabled: true,
        aiProviders: []
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// @desc    Mettre à jour les paramètres admin
// @route   PUT /api/admin/settings
// @access  Private/Admin
router.put('/settings', async (req, res) => {
  try {
    const db = getDB();
    const settings = req.body;
    
    // Vérifier si les paramètres existent
    const existing = await db.get('SELECT * FROM admin_settings WHERE id = 1');
    
    if (existing) {
      await db.run(`
        UPDATE admin_settings SET
          siteName = ?,
          siteLogo = ?,
          currency = ?,
          taxRate = ?,
          maintenance = ?,
          aiEnabled = ?,
          aiProviders = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [
        settings.siteName,
        settings.siteLogo,
        settings.currency,
        settings.taxRate || 0,
        settings.maintenance ? 1 : 0,
        settings.aiEnabled ? 1 : 0,
        JSON.stringify(settings.aiProviders || [])
      ]);
    } else {
      await db.run(`
        INSERT INTO admin_settings (
          id, siteName, siteLogo, currency, taxRate,
          maintenance, aiEnabled, aiProviders, createdAt, updatedAt
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        settings.siteName,
        settings.siteLogo,
        settings.currency,
        settings.taxRate || 0,
        settings.maintenance ? 1 : 0,
        settings.aiEnabled ? 1 : 0,
        JSON.stringify(settings.aiProviders || [])
      ]);
    }

    // Log l'activité
    await db.run(`
      INSERT INTO admin_activity_logs (userId, action, details, createdAt)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, 'update_settings', JSON.stringify({ changes: settings }), new Date().toISOString()]);

    res.json({
      success: true,
      message: 'Paramètres mis à jour avec succès'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ ADMIN LOGS ============

// @desc    Obtenir les logs admin
// @route   GET /api/admin/logs
// @access  Private/Admin
router.get('/logs', async (req, res) => {
  try {
    const db = getDB();
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await db.all(`
      SELECT 
        l.*,
        u.name as userName,
        u.email as userEmail
      FROM admin_activity_logs l
      LEFT JOIN users u ON u.id = l.userId
      ORDER BY l.createdAt DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    const total = await db.get('SELECT COUNT(*) as total FROM admin_activity_logs');

    res.json({
      success: true,
      logs,
      pagination: {
        total: total.total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;