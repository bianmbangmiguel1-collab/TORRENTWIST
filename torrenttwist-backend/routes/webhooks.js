// torrenttwist-backend/routes/webhooks.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const crypto = require('crypto');

// ============================================================
// WEBHOOK FEDAPAY
// POST /api/webhooks/fedapay
// ============================================================
router.post('/fedapay', async (req, res) => {
  try {
    const payload = req.body;
    const signature = req.headers['x-fedapay-signature'];

    console.log('📨 Webhook FedaPay reçu:', {
      event: payload.event_type,
      transaction: payload.transaction?.id
    });

    // ============================================================
    // 1. VÉRIFIER LA SIGNATURE
    // ============================================================
    const webhookSecret = process.env.FEDAPAY_WEBHOOK_SECRET || '';
    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature || ''),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.error('❌ Signature webhook invalide');
        return res.status(401).json({ error: 'Signature invalide' });
      }
      console.log('✅ Signature webhook vérifiée');
    }

    // ============================================================
    // 2. RÉCUPÉRER LES DONNÉES
    // ============================================================
    const { transaction, event_type } = payload;

    if (!transaction || !transaction.id) {
      console.error('❌ Transaction invalide');
      return res.status(400).json({ error: 'Transaction invalide' });
    }

    const providerPaymentId = transaction.id;

    // ============================================================
    // 3. VÉRIFIER SI DÉJÀ TRAITÉ
    // ============================================================
    const existing = await db.get(`
      SELECT id FROM payment_events 
      WHERE event_id = ? AND provider = 'fedapay'
    `, [providerPaymentId]);

    if (existing) {
      console.log(`⚠️ Événement déjà traité: ${providerPaymentId}`);
      return res.status(200).json({ success: true, alreadyProcessed: true });
    }

    // ============================================================
    // 4. ENREGISTRER L'ÉVÉNEMENT
    // ============================================================
    await db.run(`
      INSERT INTO payment_events (
        event_id,
        provider,
        event_type,
        payment_id,
        payload,
        processed,
        created_at
      ) VALUES (?, 'fedapay', ?, ?, ?, 0, datetime('now'))
    `, [
      providerPaymentId,
      event_type || 'payment.updated',
      providerPaymentId,
      JSON.stringify(payload)
    ]);

    // ============================================================
    // 5. TRAITER LE PAIEMENT SELON LE STATUT
    // ============================================================
    if (event_type === 'transaction.successful') {
      await handleSuccessfulPayment(transaction);
    } else if (event_type === 'transaction.failed') {
      await handleFailedPayment(transaction);
    } else if (event_type === 'transaction.cancelled') {
      await handleCancelledPayment(transaction);
    } else {
      console.log(`⚠️ Événement non traité: ${event_type}`);
    }

    // ============================================================
    // 6. MARQUER L'ÉVÉNEMENT COMME TRAITÉ
    // ============================================================
    await db.run(`
      UPDATE payment_events 
      SET processed = 1,
          processed_at = datetime('now')
      WHERE event_id = ?
    `, [providerPaymentId]);

    console.log(`✅ Webhook traité: ${providerPaymentId}`);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// 7. GESTIONNAIRE DE PAIEMENT RÉUSSI
// ============================================================
async function handleSuccessfulPayment(transaction) {
  const db = require('../config/database');
  const providerPaymentId = transaction.id;
  const amount = transaction.amount;
  const currency = transaction.currency || 'XAF';

  console.log(`✅ Paiement réussi: ${providerPaymentId}`);

  // ============================================================
  // 7a. RÉCUPÉRER LE PAIEMENT EN BASE
  // ============================================================
  const payment = await db.get(`
    SELECT 
      p.*,
      o.user_id,
      o.order_number,
      o.id as order_id
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE p.transaction_id = ?
  `, [providerPaymentId]);

  if (!payment) {
    console.error(`❌ Paiement non trouvé: ${providerPaymentId}`);
    return;
  }

  // ============================================================
  // 7b. VÉRIFIER LE MONTANT
  // ============================================================
  if (payment.amount !== amount) {
    console.error(`⚠️ Montant incohérent: ${payment.amount} vs ${amount}`);
    // Continuer quand même, mais logger l'erreur
  }

  // ============================================================
  // 7c. METTRE À JOUR LE STATUT DU PAIEMENT
  // ============================================================
  await db.run(`
    UPDATE payments 
    SET status = 'successful',
        updated_at = datetime('now'),
        provider_data = ?
    WHERE id = ?
  `, [JSON.stringify(transaction), payment.id]);

  // ============================================================
  // 7d. METTRE À JOUR LA COMMANDE
  // ============================================================
  await db.run(`
    UPDATE orders 
    SET status = 'confirmed',
        payment_status = 'successful',
        updated_at = datetime('now')
    WHERE id = ?
  `, [payment.order_id]);

  console.log(`✅ Commande #${payment.order_number} confirmée`);

  // ============================================================
  // 7e. CRÉER LES PURCHASES (ACCÈS AUX PRODUITS)
  // ============================================================
  const items = await db.all(`
    SELECT * FROM order_items WHERE order_id = ?
  `, [payment.order_id]);

  for (const item of items) {
    // Vérifier si déjà dans la bibliothèque
    const existing = await db.get(`
      SELECT * FROM library WHERE user_id = ? AND product_id = ?
    `, [payment.user_id, item.product_id]);

    if (!existing) {
      await db.run(`
        INSERT INTO library (
          user_id,
          product_id,
          order_id,
          access_status,
          created_at
        ) VALUES (?, ?, ?, 'active', datetime('now'))
      `, [payment.user_id, item.product_id, payment.order_id]);
      
      console.log(`✅ Produit #${item.product_id} ajouté à la bibliothèque`);
    }
  }

  // ============================================================
  // 7f. GÉNÉRER LE TOKEN DE TÉLÉCHARGEMENT
  // ============================================================
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

  console.log(`✅ Token de téléchargement généré: ${downloadToken}`);

  // ============================================================
  // 7g. CRÉER LA NOTIFICATION
  // ============================================================
  await db.run(`
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      read,
      created_at
    ) VALUES (?, 'payment_success', '✅ Paiement réussi', ?, 0, datetime('now'))
  `, [
    payment.user_id,
    `Votre commande #${payment.order_number} a été payée avec succès. Téléchargez votre produit maintenant !`
  ]);

  console.log(`✅ Notification créée pour l'utilisateur #${payment.user_id}`);

  // ============================================================
  // 7h. CRÉER LA FACTURE
  // ============================================================
  const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  await db.run(`
    INSERT INTO invoices (
      invoice_number,
      order_id,
      user_id,
      subtotal,
      total,
      currency,
      status,
      issued_at,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'paid', datetime('now'), datetime('now'))
  `, [
    invoiceNumber,
    payment.order_id,
    payment.user_id,
    payment.amount,
    payment.amount,
    currency
  ]);

  console.log(`✅ Facture #${invoiceNumber} créée`);

  // ============================================================
  // 7i. METTRE À JOUR LES STATISTIQUES UTILISATEUR
  // ============================================================
  try {
    await db.run(`
      UPDATE users 
      SET total_spent = total_spent + ?,
          orders_count = orders_count + 1,
          last_order_date = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `, [payment.amount, payment.user_id]);
    
    console.log(`✅ Statistiques utilisateur #${payment.user_id} mises à jour`);
  } catch (statsError) {
    console.warn('⚠️ Erreur mise à jour stats:', statsError);
  }
}

// ============================================================
// 8. GESTIONNAIRE DE PAIEMENT ÉCHOUÉ
// ============================================================
async function handleFailedPayment(transaction) {
  const db = require('../config/database');
  const providerPaymentId = transaction.id;

  console.log(`❌ Paiement échoué: ${providerPaymentId}`);

  const payment = await db.get(`
    SELECT p.*, o.order_number
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE p.transaction_id = ?
  `, [providerPaymentId]);

  if (!payment) {
    console.error(`❌ Paiement non trouvé: ${providerPaymentId}`);
    return;
  }

  await db.run(`
    UPDATE payments 
    SET status = 'failed',
        updated_at = datetime('now')
    WHERE id = ?
  `, [payment.id]);

  await db.run(`
    UPDATE orders 
    SET status = 'cancelled',
        payment_status = 'failed',
        updated_at = datetime('now')
    WHERE id = ?
  `, [payment.order_id]);

  console.log(`❌ Commande #${payment.order_number} annulée`);

  // Créer une notification d'échec
  await db.run(`
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      read,
      created_at
    ) VALUES (?, 'payment_failed', '❌ Paiement échoué', ?, 0, datetime('now'))
  `, [
    payment.user_id,
    `Le paiement de votre commande #${payment.order_number} a échoué. Veuillez réessayer.`
  ]);
}

// ============================================================
// 9. GESTIONNAIRE DE PAIEMENT ANNULÉ
// ============================================================
async function handleCancelledPayment(transaction) {
  const db = require('../config/database');
  const providerPaymentId = transaction.id;

  console.log(`⏸️ Paiement annulé: ${providerPaymentId}`);

  const payment = await db.get(`
    SELECT p.*, o.order_number
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE p.transaction_id = ?
  `, [providerPaymentId]);

  if (!payment) return;

  await db.run(`
    UPDATE payments 
    SET status = 'cancelled',
        updated_at = datetime('now')
    WHERE id = ?
  `, [payment.id]);

  await db.run(`
    UPDATE orders 
    SET status = 'cancelled',
        payment_status = 'cancelled',
        updated_at = datetime('now')
    WHERE id = ?
  `, [payment.order_id]);

  console.log(`⏸️ Commande #${payment.order_number} annulée par l'utilisateur`);
}

module.exports = router;