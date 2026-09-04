// services/payment.service.js
const db = require('../config/database');
const fidePay = require('../config/fidepay');
const logger = require('../utils/logger');
const notificationService = require('./notification.service');

class PaymentService {
  /**
   * Créer une commande et initier le paiement
   */
  async createOrderAndPayment(userId, productId, quantity = 1, userData = {}) {
    const startTime = Date.now();
    
    try {
      // 1. Récupérer les informations
      const product = await this.getProduct(productId);
      if (!product) {
        throw new Error('Produit non trouvé');
      }
      
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      
      // 2. Vérifier le stock
      if (product.stock < quantity) {
        throw new Error('Stock insuffisant');
      }
      
      // 3. Calculer le total
      const totalAmount = product.price * quantity;
      
      // 4. Créer la commande
      const order = await this.createOrder({
        userId,
        productId,
        quantity,
        totalAmount,
        product,
        user
      });
      
      // 5. Initier le paiement FidePay
      const paymentData = {
        orderNumber: order.order_number,
        totalAmount: totalAmount,
        currency: 'XOF',
        customerName: user.name || user.email,
        customerEmail: user.email,
        description: `${product.title} x${quantity}`
      };
      
      const paymentResult = await fidePay.createPayment(paymentData);
      
      // 6. Mettre à jour la commande
      await this.updateOrderPayment(order.id, {
        transactionId: paymentResult.transactionId,
        paymentUrl: paymentResult.paymentUrl
      });
      
      // 7. Log
      const duration = Date.now() - startTime;
      logger.info(`✅ Commande ${order.order_number} créée en ${duration}ms`);
      
      // 8. Notification
      await notificationService.sendPaymentInitiated(user.email, {
        orderNumber: order.order_number,
        amount: totalAmount,
        paymentUrl: paymentResult.paymentUrl
      });
      
      return {
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        paymentUrl: paymentResult.paymentUrl,
        transactionId: paymentResult.transactionId,
        totalAmount
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Échec création commande après ${duration}ms:`, error);
      throw error;
    }
  }
  
  /**
   * Traiter le webhook IPN
   */
  async processIPN(data, signature) {
    try {
      // 1. Vérifier la signature
      if (!fidePay.verifyIPN(data, signature)) {
        throw new Error('Signature IPN invalide');
      }
      
      const dataObj = typeof data === 'string' ? JSON.parse(data) : data;
      const transactionId = dataObj.transaction_id;
      
      // 2. Trouver la commande
      const order = await this.getOrderByTransactionId(transactionId);
      if (!order) {
        throw new Error(`Commande non trouvée pour la transaction ${transactionId}`);
      }
      
      // 3. Vérifier si déjà traitée
      if (order.status === 'completed') {
        logger.info(`ℹ️ Commande ${order.order_number} déjà traitée`);
        return { alreadyProcessed: true };
      }
      
      // 4. Traiter selon le statut
      if (dataObj.status === 'success') {
        await this.completeOrder(order);
        return { success: true, order: order.order_number };
      } else {
        await this.failOrder(order);
        return { success: false, order: order.order_number };
      }
      
    } catch (error) {
      logger.error('❌ Erreur traitement IPN:', error);
      throw error;
    }
  }
  
  /**
   * Compléter une commande
   */
  async completeOrder(order) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 1. Mettre à jour la commande
      await connection.query(
        `UPDATE orders 
         SET status = 'completed', 
             payment_status = 'paid',
             paid_at = ?,
             updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), new Date().toISOString(), order.id]
      );
      
      // 2. Réduire le stock
      const products = JSON.parse(order.products);
      for (const item of products) {
        await connection.query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
      
      // 3. Ajouter à l'historique d'achat
      await connection.query(
        `INSERT INTO purchases (user_id, product_id, order_id, quantity, price, purchased_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [order.user_id, products[0].product_id, order.id, products[0].quantity, products[0].price, new Date().toISOString()]
      );
      
      await connection.commit();
      
      // 4. Notification
      await notificationService.sendPaymentConfirmation(order.user_email, {
        orderNumber: order.order_number,
        totalAmount: order.total_amount
      });
      
      logger.info(`✅ Commande ${order.order_number} complétée`);
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Échouer une commande
   */
  async failOrder(order) {
    await db.query(
      `UPDATE orders 
       SET status = 'failed', 
           payment_status = 'failed',
           updated_at = ?
       WHERE id = ?`,
      [new Date().toISOString(), order.id]
    );
    
    logger.info(`❌ Commande ${order.order_number} échouée`);
  }
  
  /**
   * Créer une commande dans la base
   */
  async createOrder({ userId, productId, quantity, totalAmount, product, user }) {
    const orderNumber = `TT-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    
    const result = await db.query(
      `INSERT INTO orders (
        order_number, user_id, subtotal, total, amount, currency,
        status, payment_status, payment_method, products, total_amount,
        user_email, user_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        userId,
        totalAmount,
        totalAmount,
        totalAmount,
        'XOF',
        'pending',
        'pending',
        'fidepay',
        JSON.stringify([{
          product_id: product.id,
          title: product.title,
          quantity: quantity,
          price: product.price,
          total: totalAmount
        }]),
        totalAmount,
        user.email,
        user.name || user.email,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );
    
    return {
      id: result.insertId || result.lastID,
      order_number: orderNumber,
      total_amount: totalAmount
    };
  }
  
  /**
   * Mettre à jour la commande avec les infos de paiement
   */
  async updateOrderPayment(orderId, { transactionId, paymentUrl }) {
    await db.query(
      'UPDATE orders SET transaction_id = ?, payment_url = ?, updated_at = ? WHERE id = ?',
      [transactionId, paymentUrl, new Date().toISOString(), orderId]
    );
  }
  
  /**
   * Récupérer une commande par transaction ID
   */
  async getOrderByTransactionId(transactionId) {
    const [order] = await db.query(
      `SELECT o.*, u.email as user_email, u.name as user_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.transaction_id = ?`,
      [transactionId]
    );
    return order;
  }
  
  /**
   * Récupérer un produit
   */
  async getProduct(productId) {
    const [product] = await db.query(
      'SELECT * FROM products WHERE id = ? AND status = "active"',
      [productId]
    );
    return product;
  }
  
  /**
   * Récupérer un utilisateur
   */
  async getUser(userId) {
    const [user] = await db.query(
      'SELECT id, email, name FROM users WHERE id = ?',
      [userId]
    );
    return user;
  }
}

module.exports = new PaymentService();