const { getDB } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // ============ CRÉATION ET RECHERCHE ============

  static async create(userData) {
    const db = getDB();
    const { name, email, password, role = 'user' } = userData;
    
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT) || 10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const result = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );
    
    return this.findById(result.lastID);
  }

  static async findByEmail(email) {
    const db = getDB();
    const user = await db.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return user || null;
  }

  static async findById(id) {
    const db = getDB();
    try {
      const user = await db.get(
        `SELECT id, name, email, role, isVerified, lastLogin, createdAt,
                phone, bio, address, city, country, postalCode, avatar, preferences,
                mainGoal, interests, experienceLevel, profileCompleteness, 
                onboardingCompleted, onboardingStep, engagementScore, totalTimeSpent,
                isAdmin, isInternal, tempPassword, permissions
         FROM users WHERE id = ?`,
        [id]
      );
      
      if (user && user.interests) {
        try {
          user.interests = JSON.parse(user.interests);
        } catch (e) {
          user.interests = [];
        }
      }
      
      if (user && user.preferences) {
        try {
          user.preferences = JSON.parse(user.preferences);
        } catch (e) {
          user.preferences = {};
        }
      }

      if (user && user.permissions) {
        try {
          user.permissions = JSON.parse(user.permissions);
        } catch (e) {
          user.permissions = [];
        }
      }
      
      return user || null;
    } catch (error) {
      console.warn('⚠️ Colonnes manquantes, utilisation du fallback');
      const user = await db.get(
        'SELECT id, name, email, role, isVerified, lastLogin, createdAt FROM users WHERE id = ?',
        [id]
      );
      return user || null;
    }
  }

  static async findByIdWithPassword(id) {
    const db = getDB();
    const user = await db.get(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return user || null;
  }

  // ============ ADMIN INTERNE ============

  // @desc    Vérifier si un admin existe
  // @access  Interne
  static async adminExists() {
    const db = getDB();
    const admin = await db.get(
      'SELECT * FROM users WHERE role = "admin" OR isAdmin = 1 LIMIT 1'
    );
    return !!admin;
  }

  // @desc    Créer l'admin interne
  // @access  Interne
  static async createInternalAdmin() {
    const db = getDB();
    
    const exists = await this.adminExists();
    if (exists) {
      console.log('ℹ️ Un administrateur existe déjà');
      return null;
    }

    const password = this.generateSecurePassword();
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT) || 10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.run(
      `INSERT INTO users 
       (name, email, password, role, isVerified, isAdmin, isInternal, tempPassword, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Administrateur TorrentTwist',
        'admin@torrenttwist.com',
        hashedPassword,
        'admin',
        1,
        1,
        1,
        password,
        new Date().toISOString()
      ]
    );

    console.log('✅ Administrateur interne créé avec succès !');
    console.log('📧 Email: admin@torrenttwist.com');
    console.log('🔑 Mot de passe:', password);
    console.log('⚠️ Changez ce mot de passe après la première connexion.');
    
    return {
      id: result.lastID,
      email: 'admin@torrenttwist.com',
      password: password,
      temp: true
    };
  }

  // @desc    Générer un mot de passe sécurisé
  // @access  Interne
  static generateSecurePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // @desc    Vérifier si c'est la première connexion admin
  // @access  Interne
  static async isFirstAdminLogin(userId) {
    const db = getDB();
    const user = await db.get(
      'SELECT tempPassword FROM users WHERE id = ?',
      [userId]
    );
    return user && user.tempPassword !== null;
  }

  // @desc    Effacer le mot de passe temporaire après connexion
  // @access  Interne
  static async clearTempPassword(userId) {
    const db = getDB();
    await db.run(
      'UPDATE users SET tempPassword = NULL WHERE id = ?',
      [userId]
    );
  }

  // @desc    Vérifier si l'utilisateur est admin
  // @access  Interne
  static async isAdmin(userId) {
    const db = getDB();
    const user = await db.get(
      'SELECT role, isAdmin FROM users WHERE id = ?',
      [userId]
    );
    return user && (user.role === 'admin' || user.isAdmin === 1);
  }

  // @desc    Vérifier les permissions admin
  // @access  Interne
  static async hasPermission(userId, permission) {
    const db = getDB();
    const user = await db.get(
      'SELECT role, isAdmin, permissions FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) return false;
    if (user.role === 'admin' || user.isAdmin === 1) return true;
    
    const permissions = user.permissions ? JSON.parse(user.permissions) : [];
    return permissions.includes(permission);
  }

  // ============ GESTION DU PROFIL ============

  static async update(id, data) {
    const db = getDB();
    const updates = [];
    const values = [];

    const fields = [
      'name', 'email', 'phone', 'bio', 'address', 
      'city', 'country', 'postalCode', 'avatar', 
      'preferences', 'mainGoal', 'experienceLevel',
      'profile', 'profileCompleteness', 'permissions'
    ];
    
    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (typeof data[field] === 'object') {
          values.push(JSON.stringify(data[field]));
        } else {
          values.push(data[field]);
        }
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await db.run(
      `UPDATE users SET ${updates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  static async updateLoginAttempts(id, attempts, lockUntil) {
    const db = getDB();
    await db.run(
      'UPDATE users SET loginAttempts = ?, lockUntil = ? WHERE id = ?',
      [attempts, lockUntil, id]
    );
  }

  static async updateLastLogin(id) {
    const db = getDB();
    await db.run(
      'UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  static async updatePassword(id, hashedPassword) {
    const db = getDB();
    await db.run(
      'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id]
    );
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async delete(id) {
    const db = getDB();
    await db.run(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
  }

  // ============ ONBOARDING ============

  static async updateOnboarding(userId, data) {
    const db = getDB();
    const { mainGoal, interests, experienceLevel, step } = data;
    
    const updates = [];
    const values = [];

    if (mainGoal) {
      updates.push('mainGoal = ?');
      values.push(mainGoal);
    }
    if (interests) {
      updates.push('interests = ?');
      values.push(JSON.stringify(interests));
    }
    if (experienceLevel) {
      updates.push('experienceLevel = ?');
      values.push(experienceLevel);
    }
    if (step !== undefined) {
      updates.push('onboardingStep = ?');
      values.push(step);
    }
    
    const user = await this.findById(userId);
    let completeness = 0;
    if (user) {
      if (user.mainGoal) completeness += 33;
      if (user.interests) completeness += 33;
      if (user.experienceLevel) completeness += 34;
    }
    updates.push('profileCompleteness = ?');
    values.push(completeness);
    
    if (step >= 3) {
      updates.push('onboardingCompleted = 1');
    }
    
    values.push(userId);
    await db.run(
      `UPDATE users SET ${updates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    return this.findById(userId);
  }

  static async getOnboardingStatus(userId) {
    const db = getDB();
    try {
      const user = await db.get(
        `SELECT onboardingCompleted, onboardingStep, profileCompleteness,
                mainGoal, interests, experienceLevel
         FROM users WHERE id = ?`,
        [userId]
      );
      
      if (user && user.interests) {
        try {
          user.interests = JSON.parse(user.interests);
        } catch (e) {
          user.interests = [];
        }
      }
      
      return user || null;
    } catch (error) {
      console.warn('⚠️ Erreur récupération statut onboarding:', error.message);
      return null;
    }
  }

  // ============ ACTIVITÉS UTILISATEUR ============

  static async recordActivity(userId, activity) {
    const db = getDB();
    const { 
      actionType, 
      productId, 
      category, 
      searchQuery, 
      timeSpent, 
      metadata, 
      sessionId,
      referrer 
    } = activity;
    
    try {
      await db.run(
        `INSERT INTO user_activities 
         (userId, actionType, productId, category, searchQuery, timeSpent, metadata, sessionId, referrer)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, actionType, productId || null, category || null, 
         searchQuery || null, timeSpent || 0, metadata ? JSON.stringify(metadata) : null, 
         sessionId || null, referrer || null]
      );
      
      await db.run(
        `UPDATE users SET 
          lastActivity = CURRENT_TIMESTAMP,
          totalTimeSpent = COALESCE(totalTimeSpent, 0) + ?
         WHERE id = ?`,
        [timeSpent || 0, userId]
      );
    } catch (error) {
      console.warn('⚠️ Erreur enregistrement activité:', error.message);
    }
  }

  static async getActivities(userId, limit = 20, offset = 0) {
    const db = getDB();
    try {
      return await db.all(
        `SELECT a.*, p.title as productTitle, p.image as productImage
         FROM user_activities a
         LEFT JOIN products p ON p.id = a.productId
         WHERE a.userId = ?
         ORDER BY a.createdAt DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );
    } catch (error) {
      console.warn('⚠️ Erreur récupération activités:', error.message);
      return [];
    }
  }

  static async getActivityStats(userId) {
    const db = getDB();
    try {
      return await db.get(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN actionType = 'view' THEN 1 ELSE 0 END) as views,
           SUM(CASE WHEN actionType = 'click' THEN 1 ELSE 0 END) as clicks,
           SUM(CASE WHEN actionType = 'search' THEN 1 ELSE 0 END) as searches,
           SUM(CASE WHEN actionType = 'favorite' THEN 1 ELSE 0 END) as favorites,
           SUM(CASE WHEN actionType = 'cart_add' THEN 1 ELSE 0 END) as cartAdds,
           SUM(CASE WHEN actionType = 'purchase' THEN 1 ELSE 0 END) as purchases,
           SUM(CASE WHEN actionType = 'download' THEN 1 ELSE 0 END) as downloads,
           SUM(timeSpent) as totalTimeSpent
         FROM user_activities
         WHERE userId = ?`,
        [userId]
      );
    } catch (error) {
      console.warn('⚠️ Erreur récupération statistiques activités:', error.message);
      return null;
    }
  }

  // ============ STATISTIQUES ============

  static async getStats(userId) {
    const db = getDB();
    
    try {
      const stats = await db.get(`
        SELECT 
          (SELECT COUNT(*) FROM purchases WHERE userId = ?) as totalPurchases,
          (SELECT COALESCE(SUM(amount), 0) FROM purchases WHERE userId = ? AND status = 'completed') as totalSpent,
          (SELECT COUNT(*) FROM user_favorites WHERE userId = ?) as totalFavorites,
          (SELECT COUNT(*) FROM product_reviews WHERE userId = ?) as totalReviews,
          (SELECT COUNT(*) FROM user_activities WHERE userId = ? AND actionType = 'view') as totalViews,
          (SELECT COUNT(*) FROM user_activities WHERE userId = ? AND actionType = 'click') as totalClicks,
          (SELECT COUNT(*) FROM user_activities WHERE userId = ? AND actionType = 'search') as totalSearches,
          (SELECT COALESCE(SUM(timeSpent), 0) FROM user_activities WHERE userId = ?) as totalTimeSpent,
          (SELECT engagementScore FROM users WHERE id = ?) as engagementScore,
          (SELECT datetime(lastActivity) FROM users WHERE id = ?) as lastActivity,
          (SELECT COUNT(*) FROM user_cart WHERE userId = ?) as cartItems
      `, [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]);
      
      return stats || { 
        totalPurchases: 0, 
        totalSpent: 0, 
        totalFavorites: 0, 
        totalReviews: 0, 
        totalViews: 0, 
        totalClicks: 0, 
        totalSearches: 0, 
        totalTimeSpent: 0, 
        engagementScore: 0, 
        lastActivity: null, 
        cartItems: 0 
      };
    } catch (error) {
      console.warn('⚠️ Erreur récupération statistiques:', error.message);
      return { 
        totalPurchases: 0, 
        totalSpent: 0, 
        totalFavorites: 0, 
        totalReviews: 0, 
        totalViews: 0, 
        totalClicks: 0, 
        totalSearches: 0, 
        totalTimeSpent: 0, 
        engagementScore: 0, 
        lastActivity: null, 
        cartItems: 0 
      };
    }
  }

  // ============ RECOMMANDATIONS ============

  static async getRecommendations(userId, limit = 10) {
    const db = getDB();
    
    try {
      const user = await this.findById(userId);
      const interests = user && user.interests ? (Array.isArray(user.interests) ? user.interests : []) : [];
      
      const purchasedProducts = await db.all(
        'SELECT DISTINCT productId FROM purchases WHERE userId = ?',
        [userId]
      );
      const purchasedIds = purchasedProducts.map(p => p.productId);
      
      const favorites = await db.all(
        'SELECT DISTINCT productId FROM user_favorites WHERE userId = ?',
        [userId]
      );
      const favoriteIds = favorites.map(f => f.productId);
      
      const cartProducts = await db.all(
        'SELECT DISTINCT productId FROM user_cart WHERE userId = ?',
        [userId]
      );
      const cartIds = cartProducts.map(c => c.productId);
      
      let query = `
        SELECT p.*,
               CASE 
                 WHEN ? AND instr(?, p.category) > 0 THEN 0.95
                 WHEN p.featured = 1 THEN 0.75
                 WHEN p.sales > 1000 THEN 0.65
                 WHEN p.rating >= 4.5 THEN 0.55
                 WHEN p.sales > 500 THEN 0.45
                 ELSE 0.3
               END as recommendation_score,
               CASE 
                 WHEN ? AND instr(?, p.category) > 0 THEN 'Basé sur vos intérêts'
                 WHEN p.featured = 1 THEN 'Produit tendance'
                 WHEN p.sales > 1000 THEN 'Très populaire'
                 WHEN p.rating >= 4.5 THEN 'Très bien noté'
                 WHEN p.sales > 500 THEN 'Populaire'
                 ELSE 'Recommandé pour vous'
               END as reason
        FROM products p
        WHERE p.isActive = 1
      `;
      
      const values = [];
      values.push(interests.length > 0 ? 1 : 0);
      values.push(interests.join(','));
      values.push(interests.length > 0 ? 1 : 0);
      values.push(interests.join(','));
      
      if (purchasedIds.length > 0) {
        query += ` AND p.id NOT IN (${purchasedIds.map(() => '?').join(',')})`;
        values.push(...purchasedIds);
      }
      
      if (cartIds.length > 0) {
        query += ` AND p.id NOT IN (${cartIds.map(() => '?').join(',')})`;
        values.push(...cartIds);
      }
      
      if (interests.length > 0) {
        query += ` AND (${interests.map(() => 'p.category = ?').join(' OR ')})`;
        values.push(...interests);
      }
      
      query += `
        ORDER BY 
          CASE WHEN p.id IN (${favoriteIds.map(() => '?').join(',')}) THEN 1 ELSE 0 END DESC,
          recommendation_score DESC, 
          p.sales DESC, 
          p.rating DESC
        LIMIT ?
      `;
      
      if (favoriteIds.length > 0) {
        values.push(...favoriteIds);
      }
      values.push(limit);
      
      const recommendations = await db.all(query, values);
      
      for (const rec of recommendations) {
        try {
          await db.run(
            `INSERT OR IGNORE INTO user_recommendations 
             (userId, productId, score, reason)
             VALUES (?, ?, ?, ?)`,
            [userId, rec.id, rec.recommendation_score, rec.reason]
          );
        } catch (e) {
          // Ignorer les erreurs d'insertion
        }
      }
      
      return recommendations;
    } catch (error) {
      console.warn('⚠️ Erreur récupération recommandations:', error.message);
      return [];
    }
  }

  static async trackRecommendationClick(userId, productId) {
    const db = getDB();
    try {
      await db.run(
        `UPDATE user_recommendations 
         SET clicked = COALESCE(clicked, 0) + 1, updatedAt = CURRENT_TIMESTAMP
         WHERE userId = ? AND productId = ?`,
        [userId, productId]
      );
    } catch (error) {
      console.warn('⚠️ Erreur suivi recommandation:', error.message);
    }
  }

  static async trackRecommendationView(userId, productId) {
    const db = getDB();
    try {
      await db.run(
        `UPDATE user_recommendations 
         SET viewed = COALESCE(viewed, 0) + 1, updatedAt = CURRENT_TIMESTAMP
         WHERE userId = ? AND productId = ?`,
        [userId, productId]
      );
    } catch (error) {
      console.warn('⚠️ Erreur suivi recommandation:', error.message);
    }
  }

  // ============ FAVORIS ============

  static async toggleFavorite(userId, productId) {
    const db = getDB();
    
    try {
      const existing = await db.get(
        'SELECT id FROM user_favorites WHERE userId = ? AND productId = ?',
        [userId, productId]
      );
      
      if (existing) {
        await db.run(
          'DELETE FROM user_favorites WHERE userId = ? AND productId = ?',
          [userId, productId]
        );
        await this.recordActivity(userId, {
          actionType: 'favorite_remove',
          productId: productId
        });
        return { favorited: false, message: 'Retiré des favoris' };
      } else {
        await db.run(
          'INSERT INTO user_favorites (userId, productId) VALUES (?, ?)',
          [userId, productId]
        );
        await this.recordActivity(userId, {
          actionType: 'favorite_add',
          productId: productId
        });
        return { favorited: true, message: 'Ajouté aux favoris' };
      }
    } catch (error) {
      console.warn('⚠️ Erreur favoris:', error.message);
      throw error;
    }
  }

  static async getFavorites(userId) {
    const db = getDB();
    try {
      return await db.all(
        `SELECT p.*, f.createdAt as favoritedAt
         FROM products p
         INNER JOIN user_favorites f ON f.productId = p.id
         WHERE f.userId = ? AND p.isActive = 1
         ORDER BY f.createdAt DESC`,
        [userId]
      );
    } catch (error) {
      console.warn('⚠️ Erreur récupération favoris:', error.message);
      return [];
    }
  }

  static async isFavorite(userId, productId) {
    const db = getDB();
    try {
      const result = await db.get(
        'SELECT id FROM user_favorites WHERE userId = ? AND productId = ?',
        [userId, productId]
      );
      return !!result;
    } catch (error) {
      return false;
    }
  }

  // ============ PANIER ============

  static async addToCart(userId, productId, quantity = 1) {
    const db = getDB();
    
    try {
      const existing = await db.get(
        'SELECT id, quantity FROM user_cart WHERE userId = ? AND productId = ?',
        [userId, productId]
      );
      
      if (existing) {
        await db.run(
          'UPDATE user_cart SET quantity = quantity + ? WHERE id = ?',
          [quantity, existing.id]
        );
      } else {
        await db.run(
          'INSERT INTO user_cart (userId, productId, quantity) VALUES (?, ?, ?)',
          [userId, productId, quantity]
        );
      }
      
      await this.recordActivity(userId, {
        actionType: 'cart_add',
        productId: productId,
        metadata: { quantity }
      });
      
      return await this.getCart(userId);
    } catch (error) {
      console.warn('⚠️ Erreur ajout panier:', error.message);
      throw error;
    }
  }

  static async removeFromCart(userId, productId) {
    const db = getDB();
    try {
      await db.run(
        'DELETE FROM user_cart WHERE userId = ? AND productId = ?',
        [userId, productId]
      );
      await this.recordActivity(userId, {
        actionType: 'cart_remove',
        productId: productId
      });
      return await this.getCart(userId);
    } catch (error) {
      console.warn('⚠️ Erreur suppression panier:', error.message);
      throw error;
    }
  }

  static async updateCartQuantity(userId, productId, quantity) {
    if (quantity <= 0) {
      return await this.removeFromCart(userId, productId);
    }
    
    const db = getDB();
    try {
      await db.run(
        'UPDATE user_cart SET quantity = ? WHERE userId = ? AND productId = ?',
        [quantity, userId, productId]
      );
      return await this.getCart(userId);
    } catch (error) {
      console.warn('⚠️ Erreur mise à jour panier:', error.message);
      throw error;
    }
  }

  static async getCart(userId) {
    const db = getDB();
    try {
      return await db.all(
        `SELECT p.*, c.quantity, c.addedAt
         FROM user_cart c
         INNER JOIN products p ON p.id = c.productId
         WHERE c.userId = ? AND p.isActive = 1
         ORDER BY c.addedAt DESC`,
        [userId]
      );
    } catch (error) {
      console.warn('⚠️ Erreur récupération panier:', error.message);
      return [];
    }
  }

  static async clearCart(userId) {
    const db = getDB();
    try {
      await db.run(
        'DELETE FROM user_cart WHERE userId = ?',
        [userId]
      );
    } catch (error) {
      console.warn('⚠️ Erreur vidage panier:', error.message);
    }
  }

  static async getCartTotal(userId) {
    const db = getDB();
    try {
      const result = await db.get(
        `SELECT 
           COUNT(*) as items,
           COALESCE(SUM(p.price * c.quantity), 0) as total,
           COALESCE(SUM(c.quantity), 0) as totalQuantity
         FROM user_cart c
         INNER JOIN products p ON p.id = c.productId
         WHERE c.userId = ? AND p.isActive = 1`,
        [userId]
      );
      return result || { items: 0, total: 0, totalQuantity: 0 };
    } catch (error) {
      console.warn('⚠️ Erreur calcul total panier:', error.message);
      return { items: 0, total: 0, totalQuantity: 0 };
    }
  }

  // ============ ACHATS ============

  static async purchaseCart(userId) {
    const db = getDB();
    const cart = await this.getCart(userId);
    
    if (cart.length === 0) {
      throw new Error('Le panier est vide');
    }
    
    let totalAmount = 0;
    const purchases = [];
    
    for (const item of cart) {
      const amount = item.price * item.quantity;
      totalAmount += amount;
      
      const result = await db.run(
        `INSERT INTO purchases (userId, productId, amount, status)
         VALUES (?, ?, ?, ?)`,
        [userId, item.id, amount, 'completed']
      );
      
      purchases.push({
        id: result.lastID,
        productId: item.id,
        title: item.title,
        quantity: item.quantity,
        amount: amount
      });
      
      await db.run(
        'UPDATE products SET sales = COALESCE(sales, 0) + ? WHERE id = ?',
        [item.quantity, item.id]
      );
      
      await this.recordActivity(userId, {
        actionType: 'purchase',
        productId: item.id,
        metadata: { quantity: item.quantity, amount: amount }
      });
    }
    
    await this.clearCart(userId);
    
    return {
      success: true,
      purchases,
      total: totalAmount,
      items: cart.length
    };
  }

  static async getPurchaseHistory(userId, limit = 20, offset = 0) {
    const db = getDB();
    try {
      return await db.all(
        `SELECT p.*, pr.title as productTitle, pr.image as productImage
         FROM purchases p
         INNER JOIN products pr ON pr.id = p.productId
         WHERE p.userId = ?
         ORDER BY p.purchaseDate DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );
    } catch (error) {
      console.warn('⚠️ Erreur récupération historique achats:', error.message);
      return [];
    }
  }

  // ============ AVIS ============

  static async addReview(userId, productId, rating, comment) {
    const db = getDB();
    
    try {
      const hasPurchased = await db.get(
        'SELECT id FROM purchases WHERE userId = ? AND productId = ? AND status = "completed"',
        [userId, productId]
      );
      
      if (!hasPurchased) {
        throw new Error('Vous devez acheter le produit pour laisser un avis');
      }
      
      const existing = await db.get(
        'SELECT id FROM product_reviews WHERE userId = ? AND productId = ?',
        [userId, productId]
      );
      
      if (existing) {
        await db.run(
          'UPDATE product_reviews SET rating = ?, comment = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
          [rating, comment, existing.id]
        );
      } else {
        await db.run(
          'INSERT INTO product_reviews (userId, productId, rating, comment) VALUES (?, ?, ?, ?)',
          [userId, productId, rating, comment]
        );
      }
      
      const avgRating = await db.get(
        'SELECT AVG(rating) as avg FROM product_reviews WHERE productId = ?',
        [productId]
      );
      
      await db.run(
        'UPDATE products SET rating = ? WHERE id = ?',
        [avgRating.avg || 0, productId]
      );
      
      await this.recordActivity(userId, {
        actionType: 'review',
        productId: productId,
        metadata: { rating }
      });
      
      return { success: true, rating: avgRating.avg };
    } catch (error) {
      console.warn('⚠️ Erreur ajout avis:', error.message);
      throw error;
    }
  }

  static async getReviews(productId, limit = 10, offset = 0) {
    const db = getDB();
    try {
      return await db.all(
        `SELECT r.*, u.name as userName
         FROM product_reviews r
         INNER JOIN users u ON u.id = r.userId
         WHERE r.productId = ?
         ORDER BY r.createdAt DESC
         LIMIT ? OFFSET ?`,
        [productId, limit, offset]
      );
    } catch (error) {
      console.warn('⚠️ Erreur récupération avis:', error.message);
      return [];
    }
  }
}

module.exports = User;