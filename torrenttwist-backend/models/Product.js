const { getDB } = require('../config/database');

class Product {
  // ============ RECHERCHE ET LISTE ============

  static async findAll(filters = {}) {
    const db = getDB();
    let query = 'SELECT * FROM products WHERE isActive = 1';
    const values = [];

    if (filters.category && filters.category !== 'all') {
      query += ' AND category = ?';
      values.push(filters.category);
    }

    if (filters.search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)';
      values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.featured === 'true') {
      query += ' AND featured = 1';
    }

    if (filters.minPrice) {
      query += ' AND price >= ?';
      values.push(parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      query += ' AND price <= ?';
      values.push(parseFloat(filters.maxPrice));
    }

    // Tri
    if (filters.sort) {
      switch (filters.sort) {
        case 'price-asc':
          query += ' ORDER BY price ASC';
          break;
        case 'price-desc':
          query += ' ORDER BY price DESC';
          break;
        case 'rating':
          query += ' ORDER BY rating DESC, sales DESC';
          break;
        case 'sales':
          query += ' ORDER BY sales DESC, rating DESC';
          break;
        case 'newest':
          query += ' ORDER BY createdAt DESC';
          break;
        default:
          query += ' ORDER BY createdAt DESC';
      }
    } else {
      query += ' ORDER BY createdAt DESC';
    }

    if (filters.limit) {
      query += ' LIMIT ?';
      values.push(parseInt(filters.limit));
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      values.push(parseInt(filters.offset));
    }

    const products = await db.all(query, values);
    return products;
  }

  static async findById(id) {
    const db = getDB();
    const product = await db.get(
      'SELECT * FROM products WHERE id = ? AND isActive = 1',
      [id]
    );
    return product || null;
  }

  // ============ CRÉATION, MISE À JOUR, SUPPRESSION ============

  static async create(productData) {
    const db = getDB();
    const {
      title, description, category, price, oldPrice,
      rating, sales, badge, image, downloadUrl,
      fileSize, format, featured, createdBy, tags
    } = productData;

    const result = await db.run(
      `INSERT INTO products 
       (title, description, category, price, oldPrice, rating, sales, badge, image, downloadUrl, fileSize, format, featured, createdBy, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, category, price, oldPrice || null, rating || 0, sales || 0, badge || null, 
       image || '/api/placeholder/300/200', downloadUrl || null, fileSize || null, format || null, 
       featured || 0, createdBy || null, tags ? JSON.stringify(tags) : null]
    );

    return this.findById(result.lastID);
  }

  static async update(id, data) {
    const db = getDB();
    const updates = [];
    const values = [];

    const fields = ['title', 'description', 'category', 'price', 'oldPrice', 'rating', 'sales', 'badge', 
                    'image', 'downloadUrl', 'fileSize', 'format', 'isActive', 'featured', 'tags'];
    
    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'tags' && typeof data[field] === 'object') {
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
      `UPDATE products SET ${updates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  static async delete(id) {
    const db = getDB();
    await db.run(
      'UPDATE products SET isActive = 0 WHERE id = ?',
      [id]
    );
    return true;
  }

  // ============ STATISTIQUES ============

  static async getTotalCount(filters = {}) {
    const db = getDB();
    let query = 'SELECT COUNT(*) as total FROM products WHERE isActive = 1';
    const values = [];

    if (filters.category && filters.category !== 'all') {
      query += ' AND category = ?';
      values.push(filters.category);
    }

    if (filters.search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      values.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const result = await db.get(query, values);
    return result ? result.total : 0;
  }

  // ============ CATÉGORIES ============

  static async getCategories() {
    const db = getDB();
    try {
      const categories = await db.all(`
        SELECT 
          category,
          COUNT(*) as count,
          MIN(price) as minPrice,
          MAX(price) as maxPrice,
          AVG(rating) as avgRating,
          SUM(sales) as totalSales
        FROM products
        WHERE isActive = 1 AND category IS NOT NULL AND category != ''
        GROUP BY category
        ORDER BY count DESC
      `);
      return categories || [];
    } catch (error) {
      console.warn('⚠️ Erreur récupération catégories:', error.message);
      return [];
    }
  }

  // ============ CATÉGORIES POPULAIRES (POUR ONBOARDING) ============

  static async getPopularCategories(limit = 6) {
    const db = getDB();
    try {
      const categories = await db.all(`
        SELECT 
          category,
          COUNT(*) as count,
          AVG(rating) as avgRating,
          SUM(sales) as totalSales,
          MIN(price) as minPrice,
          MAX(price) as maxPrice
        FROM products
        WHERE isActive = 1 
          AND category IS NOT NULL 
          AND category != ''
        GROUP BY category
        ORDER BY count DESC, totalSales DESC
        LIMIT ?
      `, [limit]);
      return categories || [];
    } catch (error) {
      console.warn('⚠️ Erreur récupération catégories populaires:', error.message);
      return [];
    }
  }

  // ============ PLAGE DE PRIX ============

  static async getPriceRange() {
    const db = getDB();
    try {
      const range = await db.get(`
        SELECT 
          MIN(price) as min,
          MAX(price) as max,
          AVG(price) as avg,
          COUNT(*) as count
        FROM products
        WHERE isActive = 1
      `);
      return range || { min: 0, max: 0, avg: 0, count: 0 };
    } catch (error) {
      console.warn('⚠️ Erreur récupération plage prix:', error.message);
      return { min: 0, max: 0, avg: 0, count: 0 };
    }
  }

  // ============ PRODUITS TENDANCES ============

  static async getTrending(limit = 10) {
    const db = getDB();
    try {
      const products = await db.all(`
        SELECT * FROM products
        WHERE isActive = 1
        ORDER BY sales DESC, rating DESC, views DESC
        LIMIT ?
      `, [limit]);
      return products || [];
    } catch (error) {
      console.warn('⚠️ Erreur récupération tendances:', error.message);
      return [];
    }
  }

  // ============ PRODUITS POPULAIRES ============

  static async getPopularProducts(limit = 4) {
    const db = getDB();
    try {
      const products = await db.all(`
        SELECT * FROM products
        WHERE isActive = 1
        ORDER BY sales DESC, rating DESC
        LIMIT ?
      `, [limit]);
      return products || [];
    } catch (error) {
      console.warn('⚠️ Erreur récupération produits populaires:', error.message);
      return [];
    }
  }

  // ============ NOUVEAUTÉS ============

  static async getNewProducts(limit = 4) {
    const db = getDB();
    try {
      const products = await db.all(`
        SELECT * FROM products
        WHERE isActive = 1
        ORDER BY createdAt DESC
        LIMIT ?
      `, [limit]);
      return products || [];
    } catch (error) {
      console.warn('⚠️ Erreur récupération nouveautés:', error.message);
      return [];
    }
  }

  // ============ PRODUITS SIMILAIRES ============

  static async findSimilar(id, category, limit = 4) {
    const db = getDB();
    try {
      const products = await db.all(`
        SELECT * FROM products
        WHERE isActive = 1 
        AND category = ? 
        AND id != ?
        ORDER BY rating DESC, sales DESC
        LIMIT ?
      `, [category, id, limit]);
      return products || [];
    } catch (error) {
      console.warn('⚠️ Erreur recherche produits similaires:', error.message);
      return [];
    }
  }

  // ============ INCRÉMENTER LES VUES ============

  static async incrementViews(id) {
    const db = getDB();
    try {
      await db.run(
        'UPDATE products SET views = COALESCE(views, 0) + 1 WHERE id = ?',
        [id]
      );
    } catch (error) {
      console.warn('⚠️ Erreur incrémentation vues:', error.message);
    }
  }

  // ============ RECHERCHE AVANCÉE ============

  static async searchAdvanced({ query, category, minPrice, maxPrice, sort, limit = 20, offset = 0 }) {
    const db = getDB();
    let sql = 'SELECT * FROM products WHERE isActive = 1';
    const values = [];

    if (query) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)';
      values.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      values.push(category);
    }

    if (minPrice) {
      sql += ' AND price >= ?';
      values.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      sql += ' AND price <= ?';
      values.push(parseFloat(maxPrice));
    }

    switch (sort) {
      case 'price-asc':
        sql += ' ORDER BY price ASC';
        break;
      case 'price-desc':
        sql += ' ORDER BY price DESC';
        break;
      case 'rating':
        sql += ' ORDER BY rating DESC, sales DESC';
        break;
      case 'sales':
        sql += ' ORDER BY sales DESC, rating DESC';
        break;
      case 'newest':
        sql += ' ORDER BY createdAt DESC';
        break;
      default:
        sql += ' ORDER BY createdAt DESC';
    }

    sql += ' LIMIT ? OFFSET ?';
    values.push(parseInt(limit), parseInt(offset));

    const products = await db.all(sql, values);
    return products;
  }

  // ============ STATISTIQUES PRODUITS ============

  static async getProductStats() {
    const db = getDB();
    try {
      const stats = await db.get(`
        SELECT 
          COUNT(*) as totalProducts,
          SUM(sales) as totalSales,
          AVG(rating) as avgRating,
          COUNT(DISTINCT category) as totalCategories,
          SUM(views) as totalViews
        FROM products
        WHERE isActive = 1
      `);
      return stats || { totalProducts: 0, totalSales: 0, avgRating: 0, totalCategories: 0, totalViews: 0 };
    } catch (error) {
      console.warn('⚠️ Erreur récupération statistiques produits:', error.message);
      return { totalProducts: 0, totalSales: 0, avgRating: 0, totalCategories: 0, totalViews: 0 };
    }
  }

  // ============ PRODUITS EN PROMOTION ============

  static async getPromoProducts(limit = 10) {
    const db = getDB();
    try {
      const products = await db.all(`
        SELECT * FROM products
        WHERE isActive = 1 AND oldPrice IS NOT NULL AND oldPrice > price
        ORDER BY ((oldPrice - price) / oldPrice * 100) DESC
        LIMIT ?
      `, [limit]);
      return products || [];
    } catch (error) {
      console.warn('⚠️ Erreur récupération promotions:', error.message);
      return [];
    }
  }
}

module.exports = Product;