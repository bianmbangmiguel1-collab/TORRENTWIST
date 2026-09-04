// routes/profile.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDB } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// ============================================================
// ROUTES PROFIL
// ============================================================

// GET /api/profile/me - Récupérer le profil
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const user = await db.get(
      `SELECT id, name, email, phone, bio, address, city, country, postalCode, 
              avatar, role, isAdmin, isVerified, createdAt, updatedAt
       FROM users WHERE id = ?`,
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Récupérer les préférences
    const preferences = await db.get(
      `SELECT * FROM user_preferences WHERE user_id = ?`,
      [req.user.userId]
    );

    // Compter les commandes
    const purchases = await db.get(
      `SELECT COUNT(*) as count FROM orders WHERE user_id = ?`,
      [req.user.userId]
    );

    // Compter les favoris
    const favorites = await db.get(
      `SELECT COUNT(*) as count FROM user_favorites WHERE user_id = ?`,
      [req.user.userId]
    );

    // Compter les avis
    const reviews = await db.get(
      `SELECT COUNT(*) as count FROM reviews WHERE user_id = ?`,
      [req.user.userId]
    );

    res.json({
      success: true,
      user: {
        ...user,
        preferences: preferences || {},
        purchases: purchases?.count || 0,
        favorites: favorites?.count || 0,
        reviews: reviews?.count || 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur /me:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
});

// PUT /api/profile - Mettre à jour le profil
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { name, phone, bio, address, city, country, postalCode, preferences } = req.body;
    const db = getDB();

    // Mettre à jour l'utilisateur
    await db.run(
      `UPDATE users 
       SET name = ?, phone = ?, bio = ?, address = ?, city = ?, 
           country = ?, postalCode = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, phone || null, bio || null, address || null, city || null, 
       country || null, postalCode || null, req.user.userId]
    );

    // Mettre à jour les préférences
    if (preferences) {
      await db.run(
        `INSERT OR REPLACE INTO user_preferences 
         (user_id, notifications, newsletter, emailUpdates, twoFactor, pushNotifications)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.user.userId,
          preferences.notifications ? 1 : 0,
          preferences.newsletter ? 1 : 0,
          preferences.emailUpdates ? 1 : 0,
          preferences.twoFactor ? 1 : 0,
          preferences.pushNotifications ? 1 : 0
        ]
      );
    }

    // Récupérer l'utilisateur mis à jour
    const user = await db.get(
      `SELECT id, name, email, phone, bio, address, city, country, postalCode, 
              avatar, role, isAdmin, isVerified, createdAt, updatedAt
       FROM users WHERE id = ?`,
      [req.user.userId]
    );

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
});

// POST /api/profile/change-password - Changer le mot de passe
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const db = getDB();

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
      });
    }

    const user = await db.get(
      'SELECT password FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.run(
      'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur changement mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe'
    });
  }
});

// POST /api/profile/avatar - Upload avatar
router.post('/avatar', authMiddleware, async (req, res) => {
  // ... (à implémenter avec multer)
});

module.exports = router;