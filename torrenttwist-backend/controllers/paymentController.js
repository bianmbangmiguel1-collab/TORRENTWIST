// controllers/paymentController.js
const db = require('../config/database');
const fedapayService = require('../services/fedapay.service');
const crypto = require('crypto');

/**
 * Créer un paiement
 */
exports.createPayment = async (req, res) => {
  try {
    const { 
      product_id, 
      quantity = 1, 
      payment_method = 'mobile_money',
      return_url 
    } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email || req.body.email;

    if (!product_id || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Produit et email requis'
      });
    }

    // Récupérer le produit
    const product = await db.get(`
      SELECT id, title, price, base_currency, file_path, type 
      FROM products 
      WHERE id = ? AND status = 'published'
    `, [product_id]);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produit non trouvé'
      });
    }

    // Générer le numéro de commande
    const orderNumber = `TT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Créer la commande
    const orderResult = await db.run(`
      INSERT INTO orders (
        order_number,
        user_id,
        subtotal,
        total,
        currency,
        status,
        payment_status,
        products,
        customer_info,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, datetime('now'), datetime('now'))
    `, [
      orderNumber,
      userId || null,
      product.price * quantity,
      product.price * quantity,
      product.base_currency || 'XOF',
      JSON.stringify([{ 
        product_id: product.id, 
        title: product.title, 
        price: product.price, 
        quantity 
      }]),
      JSON.stringify({ email: userEmail, name: req.user?.name || req.body.name })
    ]);

    const orderId = orderResult.lastID;

    // Ajouter l'item de commande
    await db.run(`
      INSERT INTO order_items (
        order_id,
        product_id,
        quantity,
        price,
        total,
        product_title,
        product_file_path,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      orderId,
      product.id,
      quantity,
      product.price,
      product.price * quantity,
      product.title,
      product.file_path
    ]);

    // Créer la transaction FedaPay
    const fedapayResult = await fedapayService.createTransaction({
      amount: product.price * quantity,
      currency: product.base_currency || 'XOF',
      description: `Achat: ${product.title}`,
      customer_email: userEmail,
      customer_name: req.user?.name || req.body.name || 'Client',
      payment_method: payment_method,
      return_url: return_url,
    });

    // Sauvegarder le paiement
    await db.run(`
      INSERT INTO payments (
        order_id,
        user_id,
        amount,
        currency_code,
        amount_converted,
        method,
        status,
        transaction_id,
        payment_intent_id,
        provider,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, 'fedapay', datetime('now'), datetime('now'))
    `, [
      orderId,
      userId || null,
      product.price * quantity,
      product.base_currency || 'XOF',
      product.price * quantity,
      payment_method,
      fedapayResult.transaction.id,
      fedapayResult.transaction.id,
    ]);

    return res.status(200).json({
      success: true,
      order: {
        id: orderId,
        order_number: orderNumber,
        total: product.price * quantity,
      },
      payment: {
        transaction_id: fedapayResult.transaction.id,
        payment_url: fedapayResult.payment_url,
        status: fedapayResult.transaction.status,
        token: fedapayResult.token,
      },
      product: {
        id: product.id,
        title: product.title,
      }
    });

  } catch (error) {
    console.error('❌ Erreur createPayment:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du traitement du paiement: ' + error.message
    });
  }
};

/**
 * Confirmer un paiement
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { transaction_id } = req.query;

    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        error: 'ID de transaction requis'
      });
    }

    // Récupérer le paiement
    const payment = await db.get(`
      SELECT 
        p.*,
        o.order_number,
        o.download_token,
        o.download_expires_at,
        o.status as order_status,
        o.user_id
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.transaction_id = ?
    `, [transaction_id]);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé'
      });
    }

    // Vérifier le statut en temps réel
    const transaction = await fedapayService.getTransaction(transaction_id);

    // Mettre à jour si le statut a changé
    if (transaction.status !== payment.status) {
      await updatePaymentStatus(transaction_id, transaction.status);
    }

    return res.status(200).json({
      success: true,
      payment: {
        status: transaction.status,
        order_number: payment.order_number,
        download_token: payment.status === 'successful' ? payment.download_token : null,
        download_expires_at: payment.download_expires_at,
      },
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        payment_method: transaction.payment_method,
        created_at: transaction.created_at,
      }
    });

  } catch (error) {
    console.error('❌ Erreur confirmPayment:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la confirmation: ' + error.message
    });
  }
};

/**
 * Mettre à jour le statut d'un paiement
 */
async function updatePaymentStatus(transactionId, status) {
  const db = require('../config/database');
  
  const payment = await db.get(`
    SELECT * FROM payments WHERE transaction_id = ?
  `, [transactionId]);

  if (!payment) return;

  await db.run(`
    UPDATE payments 
    SET status = ?, 
        updated_at = datetime('now')
    WHERE id = ?
  `, [status, payment.id]);

  // Si paiement réussi, mettre à jour la commande
  if (status === 'successful') {
    await db.run(`
      UPDATE orders 
      SET status = 'confirmed',
          payment_status = 'successful',
          updated_at = datetime('now')
      WHERE id = ?
    `, [payment.order_id]);

    // Créer la purchase
    await createPurchase(payment.order_id);

    // Générer le token de téléchargement
    const downloadToken = crypto.randomBytes(32).toString('hex');
    const downloadExpiresAt = new Date();
    downloadExpiresAt.setDate(downloadExpiresAt.getDate() + 30);

    await db.run(`
      UPDATE orders 
      SET download_token = ?,
          download_expires_at = ?,
          download_limit = 5
      WHERE id = ?
    `, [downloadToken, downloadExpiresAt.toISOString(), payment.order_id]);
  }
}

/**
 * Créer une purchase (bibliothèque)
 */
async function createPurchase(orderId) {
  const db = require('../config/database');
  
  const order = await db.get(`
    SELECT * FROM orders WHERE id = ?
  `, [orderId]);

  if (!order || !order.user_id) return;

  const items = await db.all(`
    SELECT * FROM order_items WHERE order_id = ?
  `, [orderId]);

  for (const item of items) {
    // Vérifier si déjà dans la bibliothèque
    const existing = await db.get(`
      SELECT * FROM library WHERE user_id = ? AND product_id = ?
    `, [order.user_id, item.product_id]);

    if (!existing) {
      await db.run(`
        INSERT INTO library (user_id, product_id, order_id, access_status, created_at)
        VALUES (?, ?, ?, 'active', datetime('now'))
      `, [order.user_id, item.product_id, orderId]);
    }
  }
}