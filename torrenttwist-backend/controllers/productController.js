const Product = require('../models/Product');
const User = require('../models/User');

// ============ LISTE DES PRODUITS ============

// @desc    Obtenir tous les produits avec filtres
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { 
      category, 
      search, 
      featured, 
      minPrice, 
      maxPrice, 
      sort,
      limit = 20, 
      page = 1 
    } = req.query;
    
    const filters = { 
      category, 
      search, 
      featured,
      minPrice,
      maxPrice,
      sort,
      limit, 
      page,
      offset: (page - 1) * limit
    };
    
    const products = await Product.findAll(filters);
    const total = await Product.getTotalCount(filters);

    // Récupérer les catégories et la plage de prix
    let categories = [];
    let priceRange = { min: 0, max: 0, avg: 0, count: 0 };
    
    try {
      categories = await Product.getCategories() || [];
    } catch (error) {
      console.warn('⚠️ Erreur récupération catégories:', error.message);
    }
    
    try {
      priceRange = await Product.getPriceRange() || { min: 0, max: 0, avg: 0, count: 0 };
    } catch (error) {
      console.warn('⚠️ Erreur récupération plage prix:', error.message);
    }

    res.status(200).json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        categories,
        priceRange
      }
    });
  } catch (error) {
    console.error('Erreur récupération produits:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des produits',
      code: 'PRODUCTS_ERROR'
    });
  }
};

// ============ PRODUIT PAR ID ============

// @desc    Obtenir un produit par ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(parseInt(req.params.id));
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Incrémenter les vues
    await Product.incrementViews(parseInt(req.params.id));

    // Récupérer les avis
    let reviews = [];
    try {
      reviews = await User.getReviews(parseInt(req.params.id), 5) || [];
    } catch (error) {
      console.warn('⚠️ Erreur récupération avis:', error.message);
    }
    
    // Récupérer les produits similaires
    let similar = [];
    try {
      similar = await Product.findSimilar(parseInt(req.params.id), product.category, 4) || [];
    } catch (error) {
      console.warn('⚠️ Erreur récupération produits similaires:', error.message);
    }

    res.status(200).json({
      success: true,
      product,
      reviews,
      similar
    });
  } catch (error) {
    console.error('Erreur récupération produit:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du produit',
      code: 'PRODUCT_ERROR'
    });
  }
};

// ============ CRÉATION PRODUIT ============

// @desc    Créer un produit (admin)
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      createdBy: req.user.id,
      tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : []
    };

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      product,
      message: 'Produit créé avec succès'
    });
  } catch (error) {
    console.error('Erreur création produit:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création du produit',
      code: 'CREATE_PRODUCT_ERROR'
    });
  }
};

// ============ MISE À JOUR PRODUIT ============

// @desc    Mettre à jour un produit
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Traiter les tags si présents
    if (req.body.tags && typeof req.body.tags === 'string') {
      req.body.tags = req.body.tags.split(',').map(t => t.trim());
    }

    const updatedProduct = await Product.update(productId, req.body);

    res.status(200).json({
      success: true,
      product: updatedProduct,
      message: 'Produit mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur mise à jour produit:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour du produit',
      code: 'UPDATE_PRODUCT_ERROR'
    });
  }
};

// ============ SUPPRESSION PRODUIT ============

// @desc    Supprimer un produit (soft delete)
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    await Product.delete(productId);

    res.status(200).json({
      success: true,
      message: 'Produit supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression produit:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression du produit',
      code: 'DELETE_PRODUCT_ERROR'
    });
  }
};

// ============ CATÉGORIES ============

// @desc    Obtenir toutes les catégories
// @route   GET /api/products/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Product.getCategories();
    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Erreur récupération catégories:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des catégories',
      code: 'CATEGORIES_ERROR'
    });
  }
};

// ============ PRODUITS TENDANCES ============

// @desc    Obtenir les produits tendances
// @route   GET /api/products/trending
// @access  Public
const getTrending = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await Product.getTrending(limit);
    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Erreur récupération tendances:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des tendances',
      code: 'TRENDING_ERROR'
    });
  }
};

// ============ PRODUITS POPULAIRES ============

// @desc    Obtenir les produits populaires
// @route   GET /api/products/popular
// @access  Public
const getPopular = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const products = await Product.getPopularProducts(limit);
    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Erreur récupération produits populaires:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des produits populaires',
      code: 'POPULAR_ERROR'
    });
  }
};

// ============ NOUVEAUTÉS ============

// @desc    Obtenir les nouveautés
// @route   GET /api/products/new
// @access  Public
const getNewProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const products = await Product.getNewProducts(limit);
    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Erreur récupération nouveautés:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des nouveautés',
      code: 'NEW_ERROR'
    });
  }
};

// ============ PRODUITS EN PROMOTION ============

// @desc    Obtenir les produits en promotion
// @route   GET /api/products/promo
// @access  Public
const getPromoProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await Product.getPromoProducts(limit);
    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Erreur récupération promotions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des promotions',
      code: 'PROMO_ERROR'
    });
  }
};

// ============ RECHERCHE AVANCÉE ============

// @desc    Recherche avancée de produits
// @route   POST /api/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { 
      query, 
      category, 
      minPrice, 
      maxPrice, 
      sort,
      limit = 20, 
      page = 1 
    } = req.body;

    const offset = (page - 1) * limit;
    
    const products = await Product.searchAdvanced({
      query,
      category,
      minPrice,
      maxPrice,
      sort,
      limit,
      offset
    });

    const total = await Product.getTotalCount({ category, search: query });

    res.status(200).json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur recherche avancée:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la recherche',
      code: 'SEARCH_ERROR'
    });
  }
};

// ============ STATISTIQUES PRODUITS ============

// @desc    Obtenir les statistiques des produits
// @route   GET /api/products/stats
// @access  Private/Admin
const getProductStats = async (req, res) => {
  try {
    const stats = await Product.getProductStats();
    const categories = await Product.getCategories();
    const priceRange = await Product.getPriceRange();

    res.status(200).json({
      success: true,
      stats,
      categories,
      priceRange
    });
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des statistiques',
      code: 'STATS_ERROR'
    });
  }
};

// ============ EXPORTATION ============

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getTrending,
  getPopular,
  getNewProducts,
  getPromoProducts,
  searchProducts,
  getProductStats
};