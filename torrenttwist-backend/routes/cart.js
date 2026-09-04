const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

// Toutes les routes protégées
router.use(protect);

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.delete('/remove/:productId', cartController.removeFromCart);
router.put('/update/:productId', cartController.updateQuantity);
router.delete('/clear', cartController.clearCart);

module.exports = router;