// controllers/payment.controller.js
const paymentService = require('../services/payment.service');
const logger = require('../utils/logger');
const { validatePaymentRequest } = require('../utils/validators');

class PaymentController {
  /**
   * Créer un paiement
   */
  async createPayment(req, res) {
    try {
      const { userId, productId, quantity = 1 } = req.body;
      
      // Validation
      const validation = validatePaymentRequest(req.body);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Données invalides',
          details: validation.errors
        });
      }
      
      // Traiter le paiement
      const result = await paymentService.createOrderAndPayment(
        userId,
        productId,
        quantity,
        req.user || {}
      );
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('❌ Erreur création paiement:', error);
      
      res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Erreur interne du serveur',
        code: error.code || 'INTERNAL_ERROR'
      });
    }
  }
  
  /**
   * Webhook IPN
   */
  async handleIPN(req, res) {
    try {
      const { status, signature, data } = req.query;
      
      // Log IPN
      logger.info('📨 IPN FidePay reçu', {
        status,
        signature: signature?.substring(0, 10) + '...',
        data: JSON.stringify(data)
      });
      
      // Vérifier le statut
      if (!status || status !== 'success') {
        logger.warn(`⚠️ IPN avec statut non-success: ${status}`);
        return res.status(200).json({ received: true });
      }
      
      // Traiter le webhook
      const result = await paymentService.processIPN(data, signature);
      
      res.status(200).json({
        received: true,
        processed: true,
        result
      });
      
    } catch (error) {
      logger.error('❌ Erreur IPN:', error);
      
      // Toujours répondre 200 pour éviter que FidePay renvoie l'IPN
      res.status(200).json({
        received: true,
        processed: false,
        error: error.message
      });
    }
  }
  
  /**
   * Vérifier le statut d'une commande
   */
  async checkOrderStatus(req, res) {
    try {
      const { orderNumber } = req.params;
      
      const order = await paymentService.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Commande non trouvée'
        });
      }
      
      res.json({
        success: true,
        data: {
          orderNumber: order.order_number,
          status: order.status,
          paymentStatus: order.payment_status,
          totalAmount: order.total_amount,
          createdAt: order.created_at
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Annuler une commande en attente
   */
  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { userId } = req.user || {};
      
      const order = await paymentService.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Commande non trouvée'
        });
      }
      
      if (order.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé'
        });
      }
      
      if (order.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Seules les commandes en attente peuvent être annulées'
        });
      }
      
      await paymentService.cancelOrder(orderId);
      
      res.json({
        success: true,
        message: 'Commande annulée avec succès'
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new PaymentController();