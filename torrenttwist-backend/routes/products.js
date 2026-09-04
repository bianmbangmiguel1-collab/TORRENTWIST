const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, admin } = require('../middleware/auth');

// Routes publiques
router.get('/', productController.getProducts);
router.get('/categories', productController.getCategories);
router.get('/trending', productController.getTrending);
router.get('/popular', productController.getPopular);
router.get('/new', productController.getNewProducts);
router.get('/promo', productController.getPromoProducts);
router.get('/stats', protect, admin, productController.getProductStats);
router.post('/search', productController.searchProducts);
router.get('/:id', productController.getProductById);

// Routes protégées (admin seulement)
router.post('/', protect, admin, productController.createProduct);
router.put('/:id', protect, admin, productController.updateProduct);
router.delete('/:id', protect, admin, productController.deleteProduct);

module.exports = router;