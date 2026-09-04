const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// ============ INSCRIPTION ============

// @desc    Inscription
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, email, password } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cet email est déjà utilisé' 
      });
    }

    // ✅ Création de l'utilisateur avec rôle par défaut 'user' et isAdmin = 0
    const user = await User.create({ 
      name, 
      email, 
      password,
      role: 'user',
      isAdmin: 0
    });
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        isAdmin: user.isAdmin || 0,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: error.message
    });
  }
};

// ============ CONNEXION ============

// @desc    Connexion
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier si le compte est verrouillé
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.lockUntil) - new Date()) / (60 * 1000));
      return res.status(403).json({
        success: false,
        message: `Compte verrouillé. Réessayez dans ${remainingTime} minutes`
      });
    }

    // Vérifier le mot de passe
    const userWithPassword = await User.findByEmail(email);
    const isPasswordMatch = await User.comparePassword(password, userWithPassword.password);
    
    if (!isPasswordMatch) {
      const attempts = (user.loginAttempts || 0) + 1;
      let lockUntil = null;
      if (attempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await User.updateLoginAttempts(user.id, attempts, lockUntil);
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Réinitialiser les tentatives
    await User.updateLoginAttempts(user.id, 0, null);
    await User.updateLastLogin(user.id);

    const token = generateToken(user.id);

    // ✅ Ajouter isAdmin et role dans la réponse
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        isAdmin: user.isAdmin || 0,
        lastLogin: new Date()
      }
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
};

// ============ PROFIL UTILISATEUR ============

// @desc    Profil utilisateur
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Récupérer les statistiques
    const stats = await User.getStats(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin || 0,
        phone: user.phone || '',
        bio: user.bio || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
        postalCode: user.postalCode || '',
        avatar: user.avatar || null,
        preferences: user.preferences || {},
        isVerified: user.isVerified || false,
        createdAt: user.createdAt,
        purchases: stats?.totalPurchases || 0,
        favorites: stats?.totalFavorites || 0,
        reviews: stats?.totalReviews || 0,
        score: stats?.engagementScore || 0
      }
    });
  } catch (error) {
    console.error('Erreur profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: error.message
    });
  }
};

// ============ MISE À JOUR DU PROFIL ============

// @desc    Mettre à jour le profil
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { 
      name, 
      phone, 
      bio, 
      address, 
      city, 
      country, 
      postalCode,
      preferences 
    } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Construire l'objet de mise à jour
    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (country !== undefined) updateData.country = country;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (preferences) updateData.preferences = preferences;

    await User.update(req.user.id, updateData);

    const updatedUser = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil',
      error: error.message
    });
  }
};

// ============ GESTION DE L'AVATAR ============

// @desc    Upload de l'avatar
// @route   POST /api/auth/avatar
// @access  Private
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier uploadé'
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Supprimer l'ancien avatar si existant
    if (user.avatar) {
      const oldPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (err) {
          console.warn('Impossible de supprimer l\'ancien avatar:', err);
        }
      }
    }

    await User.update(req.user.id, { avatar: avatarUrl });

    res.status(200).json({
      success: true,
      avatarUrl,
      message: 'Avatar mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur upload avatar:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'upload de l\'avatar'
    });
  }
};

// @desc    Supprimer l'avatar
// @route   DELETE /api/auth/avatar
// @access  Private
exports.deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.avatar) {
      const oldPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (err) {
          console.warn('Impossible de supprimer l\'avatar:', err);
        }
      }
      await User.update(req.user.id, { avatar: null });
    }

    res.status(200).json({
      success: true,
      message: 'Avatar supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression avatar:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression de l\'avatar'
    });
  }
};

// ============ CHANGEMENT DE MOT DE PASSE ============

// @desc    Changer le mot de passe
// @route   POST /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findByIdWithPassword(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le mot de passe actuel
    const isMatch = await User.comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT) || 10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Mettre à jour le mot de passe
    const db = require('../config/database').getDB();
    await db.run(
      'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors du changement de mot de passe'
    });
  }
};

// ============ AUTHENTIFICATION À DEUX FACTEURS ============

// @desc    Activer/Désactiver la 2FA
// @route   POST /api/auth/toggle-2fa
// @access  Private
exports.toggleTwoFactor = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const preferences = user.preferences || {};
    preferences.twoFactor = enabled;
    
    await User.update(req.user.id, { preferences });

    res.status(200).json({
      success: true,
      enabled,
      message: enabled ? '2FA activée avec succès' : '2FA désactivée avec succès'
    });
  } catch (error) {
    console.error('Erreur toggle 2FA:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour de la 2FA'
    });
  }
};

// @desc    Vérifier le code 2FA
// @route   POST /api/auth/verify-2fa
// @access  Private
exports.verifyTwoFactor = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code 2FA requis'
      });
    }

    // Logique de vérification 2FA
    // À intégrer avec une bibliothèque comme speakeasy ou otplib
    // Pour l'instant, simulation avec un code simple
    if (code === '123456') {
      return res.status(200).json({
        success: true,
        message: 'Code 2FA vérifié avec succès'
      });
    }

    res.status(400).json({
      success: false,
      message: 'Code 2FA invalide'
    });
  } catch (error) {
    console.error('Erreur vérification 2FA:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la vérification'
    });
  }
};

// ============ SUPPRESSION DE COMPTE ============

// @desc    Supprimer le compte
// @route   DELETE /api/auth/delete
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Supprimer l'avatar si existant
    if (user.avatar) {
      const oldPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (err) {
          console.warn('Impossible de supprimer l\'avatar:', err);
        }
      }
    }

    // Supprimer l'utilisateur de la base de données
    const db = require('../config/database').getDB();
    await db.run('DELETE FROM users WHERE id = ?', [req.user.id]);

    res.status(200).json({
      success: true,
      message: 'Compte supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression compte:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression du compte'
    });
  }
};

// ============ DÉCONNEXION ============

// @desc    Déconnexion
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
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

// ============ VÉRIFICATION EMAIL ============

// @desc    Renvoyer l'email de vérification
// @route   POST /api/auth/resend-verification
// @access  Private
exports.resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email déjà vérifié'
      });
    }

    // Générer un token de vérification
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Ici, envoyer l'email de vérification
    // À intégrer avec Nodemailer ou un service d'email

    res.status(200).json({
      success: true,
      message: 'Email de vérification envoyé'
    });
  } catch (error) {
    console.error('Erreur renvoi vérification:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'envoi'
    });
  }
};

// @desc    Vérifier l'email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email déjà vérifié'
      });
    }

    await User.update(user.id, { isVerified: true });

    res.status(200).json({
      success: true,
      message: 'Email vérifié avec succès'
    });
  } catch (error) {
    console.error('Erreur vérification email:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la vérification'
    });
  }
};

// ============ REFRESH TOKEN ============

// @desc    Rafraîchir le token JWT
// @route   POST /api/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token requis'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

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
      message: 'Refresh token invalide'
    });
  }
};