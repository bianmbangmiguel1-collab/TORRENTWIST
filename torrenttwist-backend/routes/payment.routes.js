// routes/payment.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate, rateLimiter } = require('../middleware');

// Routes publiques
router.post('/api/v1/payments/create', 
  authenticate,
  rateLimiter({ windowMs: 60 * 1000, max: 5 }), // 5 requêtes/minute
  paymentController.createPayment
);

router.get('/api/v1/payments/status/:orderNumber',
  authenticate,
  paymentController.checkOrderStatus
);

router.delete('/api/v1/payments/cancel/:orderId',
  authenticate,
  paymentController.cancelOrder
);

// Route webhook (publique)
router.get('/api/webhooks/fidepay/ipn',
  rateLimiter({ windowMs: 60 * 1000, max: 100 }),
  paymentController.handleIPN
);

module.exports = router;