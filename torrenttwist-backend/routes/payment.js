// torrenttwist-backend/routes/payment.js

const express = require('express');
const router = express.Router();

const { getDB } = require('../config/database');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');

// ============================================================
// CONFIGURATION
// ============================================================

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'torrenttwist_super_secret_key_2026';

const FEDAPAY_API_URL =
  process.env.FEDAPAY_API_URL ||
  'https://api.fedapay.com/v1';

const FEDAPAY_SECRET_KEY =
  process.env.FEDAPAY_SECRET_KEY || '';

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  'http://localhost:3000';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  'http://localhost:5000';

const DOWNLOAD_EXPIRY_DAYS =
  Number(process.env.DOWNLOAD_EXPIRY_DAYS || 30);

const DOWNLOAD_LIMIT =
  Number(process.env.DOWNLOAD_LIMIT || 5);

// ============================================================
// DEBUG ENV
// ============================================================

console.log('');
console.log('============================================================');
console.log('💳 CONFIGURATION FEDAPAY');
console.log('============================================================');
console.log(
  '🔐 FEDAPAY_SECRET_KEY:',
  FEDAPAY_SECRET_KEY ? '✅ Présente' : '❌ Manquante'
);
console.log('🌐 FEDAPAY_API_URL:', FEDAPAY_API_URL);
console.log('🖥️ FRONTEND_URL:', FRONTEND_URL);
console.log('⚙️ BACKEND_URL:', BACKEND_URL);
console.log('============================================================');
console.log('');

// ============================================================
// UTILITAIRES
// ============================================================

function normalizeId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return 'TT-' + timestamp + '-' + random;
}

function generateDownloadToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getDownloadExpiryDate(days = DOWNLOAD_EXPIRY_DAYS) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function getErrorDetails(error) {
  return error?.response?.data || error?.message || 'Erreur inconnue';
}

function safeString(value) {
  return value === undefined || value === null ? null : String(value);
}

// ============================================================
// AUTHENTIFICATION
// ============================================================

const authenticate = async (req, res, next) => {
  try {
    const token =
      req.cookies?.user_session ||
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Non authentifié',
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('❌ JWT invalide:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Token invalide',
      });
    }

    const userId = normalizeId(decoded?.id || decoded?.userId || decoded?.sub);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non identifié',
      });
    }

    req.userId = userId;
    req.user = decoded;

    next();
  } catch (error) {
    console.error('❌ Erreur authenticate:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
};

// ============================================================
// UTILITAIRE : COLONNES TABLE
// ============================================================

async function getTableColumns(db, tableName) {
  try {
    const rows = await db.all(`PRAGMA table_info("${tableName}")`);
    return rows.map((row) => row.name);
  } catch (error) {
    console.warn(`⚠️ Lecture colonnes ${tableName}:`, error.message);
    return [];
  }
}

// ============================================================
// CREATION DE COMMANDE
// ============================================================

async function createOrder({
  db,
  userId,
  product,
  quantity,
  totalAmount,
}) {
  const orderNumber = generateOrderNumber();

  const columns = await getTableColumns(db, 'orders');

  if (!columns.includes('order_number')) {
    throw new Error('La table orders ne contient pas order_number');
  }

  if (!columns.includes('user_id')) {
    throw new Error('La table orders ne contient pas user_id');
  }

  if (!columns.includes('total')) {
    throw new Error('La table orders ne contient pas total');
  }

  const insertColumns = [];
  const values = [];

  // ----------------------------------------------------------
  // COLONNES DE BASE
  // ----------------------------------------------------------

  insertColumns.push('order_number');
  values.push(orderNumber);

  insertColumns.push('user_id');
  values.push(userId);

  if (columns.includes('subtotal')) {
    insertColumns.push('subtotal');
    values.push(totalAmount);
  }

  if (columns.includes('total')) {
    insertColumns.push('total');
    values.push(totalAmount);
  }

  if (columns.includes('amount')) {
    insertColumns.push('amount');
    values.push(totalAmount);
  }

  if (columns.includes('currency')) {
    insertColumns.push('currency');
    values.push('XOF');
  }

  if (columns.includes('status')) {
    insertColumns.push('status');
    values.push('pending');
  }

  if (columns.includes('payment_status')) {
    insertColumns.push('payment_status');
    values.push('pending');
  }

  if (columns.includes('payment_method')) {
    insertColumns.push('payment_method');
    values.push('fedapay');
  }

  // ----------------------------------------------------------
  // PRODUCTS - Rempli avec une valeur JSON valide
  // ----------------------------------------------------------

  if (columns.includes('products')) {
    const productsJson = JSON.stringify([
      {
        product_id: product.id,
        title: product.title,
        quantity,
        price: Number(product.price),
        total: Number(totalAmount),
      },
    ]);

    insertColumns.push('products');
    values.push(productsJson);
  }

  // ----------------------------------------------------------
  // TOTAL_AMOUNT SI PRESENT
  // ----------------------------------------------------------

  if (columns.includes('total_amount')) {
    insertColumns.push('total_amount');
    values.push(totalAmount);
  }

  // ----------------------------------------------------------
  // DATES
  // ----------------------------------------------------------

  if (columns.includes('created_at')) {
    insertColumns.push('created_at');
    values.push(new Date().toISOString());
  }

  if (columns.includes('updated_at')) {
    insertColumns.push('updated_at');
    values.push(new Date().toISOString());
  }

  const placeholders = insertColumns.map(() => '?').join(', ');

  const sql = `
    INSERT INTO orders (
      ${insertColumns.join(', ')}
    )
    VALUES (
      ${placeholders}
    )
  `;

  console.log('📝 SQL:', sql);
  console.log('📊 Values:', values);

  const result = await db.run(sql, values);

  const orderId = result.lastID;

  if (!orderId) {
    throw new Error('Impossible de récupérer l’ID de commande');
  }

  // ----------------------------------------------------------
  // ORDER ITEMS
  // ----------------------------------------------------------

  const orderItemColumns = await getTableColumns(db, 'order_items');

  const itemColumns = [];
  const itemValues = [];

  const addItem = (name, value) => {
    if (orderItemColumns.includes(name)) {
      itemColumns.push(name);
      itemValues.push(value);
    }
  };

  addItem('order_id', orderId);
  addItem('product_id', product.id);
  addItem('variant_id', null);
  addItem('quantity', quantity);
  addItem('price', Number(product.price));
  addItem('total', Number(totalAmount));
  addItem('product_title', product.title);
  addItem('product_file_path', product.file_path || null);
  addItem('product_file_size', product.file_size || null);
  addItem('product_format', product.file_format || null);

  if (orderItemColumns.includes('created_at')) {
    addItem('created_at', new Date().toISOString());
  }

  const itemPlaceholders = itemColumns.map(() => '?').join(', ');

  const itemSql = `
    INSERT INTO order_items (
      ${itemColumns.join(', ')}
    )
    VALUES (
      ${itemPlaceholders}
    )
  `;

  await db.run(itemSql, itemValues);

  return {
    orderId,
    orderNumber,
  };
}

// ============================================================
// FINALISER PAIEMENT
// ============================================================

async function finalizeSuccessfulPayment(db, payment) {
  if (!payment) {
    throw new Error('Paiement manquant');
  }

  const currentPayment = await db.get(
    `
    SELECT
      p.*,
      o.order_number,
      o.status as order_status,
      o.payment_status as order_payment_status,
      o.download_token,
      o.download_expires_at,
      o.download_count,
      o.download_limit
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE p.id = ?
    LIMIT 1
    `,
    [payment.id]
  );

  if (!currentPayment) {
    throw new Error('Paiement introuvable');
  }

  // Déjà finalisé ?
  if (currentPayment.status === 'successful') {
    return {
      orderId: currentPayment.order_id,
      orderNumber: currentPayment.order_number,
      transactionId: currentPayment.transaction_id,
      downloadToken: currentPayment.download_token,
      downloadExpiresAt: currentPayment.download_expires_at,
    };
  }

  // PAYMENT SUCCESSFUL
  await db.run(
    `
    UPDATE payments
    SET
      status = 'successful',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [currentPayment.id]
  );

  // ORDER PAID
  await db.run(
    `
    UPDATE orders
    SET
      payment_status = 'paid',
      status = 'confirmed',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [currentPayment.order_id]
  );

  // DOWNLOAD TOKEN
  let downloadToken = currentPayment.download_token;
  let downloadExpiresAt = currentPayment.download_expires_at;

  if (!downloadToken) {
    downloadToken = generateDownloadToken();
    downloadExpiresAt = getDownloadExpiryDate();

    await db.run(
      `
      UPDATE orders
      SET
        download_token = ?,
        download_expires_at = ?,
        download_limit = ?,
        download_count = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [downloadToken, downloadExpiresAt, DOWNLOAD_LIMIT, currentPayment.order_id]
    );
  }

  // ARTICLES
  const orderItems = await db.all(
    `
    SELECT
      id,
      product_id,
      quantity,
      price,
      total,
      product_title
    FROM order_items
    WHERE order_id = ?
    ORDER BY id ASC
    `,
    [currentPayment.order_id]
  );

  // LIBRARY
  for (const item of orderItems) {
    const existingLibrary = await db.get(
      `
      SELECT id
      FROM library
      WHERE user_id = ? AND product_id = ?
      LIMIT 1
      `,
      [currentPayment.user_id, item.product_id]
    );

    if (!existingLibrary) {
      await db.run(
        `
        INSERT INTO library (user_id, product_id, order_id, access_status, created_at)
        VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)
        `,
        [currentPayment.user_id, item.product_id, currentPayment.order_id]
      );
    }
  }

  // NOTIFICATION
  try {
    await db.run(
      `
      INSERT INTO notifications (user_id, type, title, message, is_read, created_at, updated_at)
      VALUES (?, 'success', '✅ Paiement confirmé', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [
        currentPayment.user_id,
        `Votre commande ${currentPayment.order_number} a été payée avec succès. Vos produits sont maintenant disponibles.`,
      ]
    );
  } catch (error) {
    console.warn('⚠️ Notification ignorée:', error.message);
  }

  return {
    orderId: currentPayment.order_id,
    orderNumber: currentPayment.order_number,
    transactionId: currentPayment.transaction_id,
    downloadToken,
    downloadExpiresAt,
  };
}

// ============================================================
// POST /api/v1/payments/create
// ============================================================

router.post('/create', authenticate, async (req, res) => {
  let orderId = null;

  try {
    console.log('');
    console.log('💳 ========= NOUVEAU PAIEMENT =========');

    const userId = req.userId;
    const productId = normalizeId(req.body?.product_id);
    const quantityRaw = Number(req.body?.quantity || 1);

    if (!Number.isFinite(quantityRaw)) {
      return res.status(400).json({
        success: false,
        error: 'Quantité invalide',
      });
    }

    const quantity = Math.floor(Math.max(1, Math.min(100, quantityRaw)));

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'ID produit requis',
      });
    }

    // --------------------------------------------------------
    // CLÉ FEDAPAY
    // --------------------------------------------------------

    if (!FEDAPAY_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: 'FEDAPAY_SECRET_KEY manquante dans .env',
      });
    }

    // --------------------------------------------------------
    // DB
    // --------------------------------------------------------

    const db = await getDB();

    // --------------------------------------------------------
    // PRODUIT
    // --------------------------------------------------------

    const product = await db.get(
      `
      SELECT id, title, price, slug, file_path, file_size, file_format, status
      FROM products
      WHERE id = ? AND status = 'published'
      LIMIT 1
      `,
      [productId]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produit non trouvé ou non publié',
      });
    }

    const unitPrice = Number(product.price);

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Le prix du produit est invalide',
      });
    }

    const totalAmount = Math.round(unitPrice * quantity);

    // --------------------------------------------------------
    // UTILISATEUR
    // --------------------------------------------------------

    const user = await db.get(
      `
      SELECT id, name, email, phone
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    // --------------------------------------------------------
    // COMMANDES
    // --------------------------------------------------------

    const createdOrder = await createOrder({
      db,
      userId,
      product,
      quantity,
      totalAmount,
    });

    orderId = createdOrder.orderId;
    const orderNumber = createdOrder.orderNumber;

    console.log('✅ Commande créée:', { orderId, orderNumber, totalAmount });

    // --------------------------------------------------------
    // CLIENT FEDAPAY
    // --------------------------------------------------------

    const customer = {
      email: user.email || 'client@torrenttwist.com',
      firstname: user.name?.trim().split(/\s+/)[0] || 'Client',
      lastname: user.name?.trim().split(/\s+/).slice(1).join(' ') || 'TorrentTwist',
    };

    // --------------------------------------------------------
    // CREATION TRANSACTION FEDAPAY
    // --------------------------------------------------------

    console.log('🌐 FedaPay:', `${FEDAPAY_API_URL}/transactions`);

    let fedapayResponse;

    try {
      fedapayResponse = await axios.post(
        `${FEDAPAY_API_URL}/transactions`,
        {
          amount: totalAmount,
          currency: 'XOF',
          description: `Achat de ${product.title} - ${orderNumber}`,
          customer: customer,
          callback_url: `${BACKEND_URL}/api/v1/payments/confirm?order_id=${orderId}`,
          cancel_url: `${FRONTEND_URL}/payment/cancel?order_id=${orderId}`,
          merchant_reference: orderNumber,
          custom_metadata: {
            order_id: String(orderId),
            order_number: String(orderNumber),
            product_id: String(product.id),
            product_title: String(product.title),
            user_id: String(userId),
            quantity: String(quantity),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${FEDAPAY_SECRET_KEY}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 30000,
        }
      );
    } catch (fedapayError) {
      console.error('❌ ERREUR FEDAPAY');
      console.error('STATUS:', fedapayError?.response?.status);
      console.error('DATA:', JSON.stringify(fedapayError?.response?.data, null, 2));
      console.error('MESSAGE:', fedapayError?.message);

      if (orderId) {
        await db.run(
          `
          UPDATE orders
          SET status = 'failed', payment_status = 'failed', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [orderId]
        );
      }

      return res.status(502).json({
        success: false,
        error: 'Impossible de créer la transaction FedaPay',
        details: process.env.NODE_ENV === 'development' ? getErrorDetails(fedapayError) : undefined,
      });
    }

    // --------------------------------------------------------
    // REPONSE FEDAPAY
    // --------------------------------------------------------

    const transaction = fedapayResponse?.data?.transaction || fedapayResponse?.data || {};

    console.log('✅ Réponse FedaPay reçue');

    const transactionId = transaction.id || transaction.transaction_id || null;

    if (!transactionId) {
      console.error('❌ Aucun ID transaction FedaPay');

      await db.run(
        `
        UPDATE orders
        SET status = 'failed', payment_status = 'failed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [orderId]
      );

      return res.status(502).json({
        success: false,
        error: 'FedaPay n\'a pas retourné d\'identifiant de transaction',
      });
    }

    // --------------------------------------------------------
    // GENERER LE LIEN DE PAIEMENT
    // --------------------------------------------------------

    let checkoutUrl = null;

    try {
      const tokenResponse = await axios.post(
        `${FEDAPAY_API_URL}/transactions/${transactionId}/token`,
        {},
        {
          headers: {
            Authorization: `Bearer ${FEDAPAY_SECRET_KEY}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 30000,
        }
      );

      checkoutUrl = tokenResponse?.data?.url || null;
      console.log('✅ Checkout URL FedaPay générée');
    } catch (tokenError) {
      console.error('❌ Erreur génération checkout URL:');
      console.error('STATUS:', tokenError?.response?.status);
      console.error('DATA:', JSON.stringify(tokenError?.response?.data, null, 2));
      console.error('MESSAGE:', tokenError?.message);

      await db.run(
        `
        UPDATE orders
        SET status = 'failed', payment_status = 'failed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [orderId]
      );

      return res.status(502).json({
        success: false,
        error: 'Impossible de générer le lien de paiement FedaPay',
        details: process.env.NODE_ENV === 'development' ? getErrorDetails(tokenError) : undefined,
      });
    }

    if (!checkoutUrl) {
      await db.run(
        `
        UPDATE orders
        SET status = 'failed', payment_status = 'failed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [orderId]
      );

      return res.status(502).json({
        success: false,
        error: 'FedaPay n\'a pas retourné de lien de paiement',
      });
    }

    // --------------------------------------------------------
    // METTRE A JOUR ORDRE
    // --------------------------------------------------------

    await db.run(
      `
      UPDATE orders
      SET transaction_id = ?, payment_id = ?, payment_method = 'fedapay', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [String(transactionId), String(transactionId), orderId]
    );

    // --------------------------------------------------------
    // PAYMENT
    // --------------------------------------------------------

    const existingPayment = await db.get(
      `
      SELECT id
      FROM payments
      WHERE order_id = ?
      LIMIT 1
      `,
      [orderId]
    );

    let paymentId = existingPayment?.id || null;

    const metadata = JSON.stringify({
      product_id: product.id,
      product_title: product.title,
      quantity,
      order_number: orderNumber,
      transaction_id: String(transactionId),
    });

    if (!paymentId) {
      const paymentResult = await db.run(
        `
        INSERT INTO payments (
          order_id, user_id, amount, currency_code, amount_converted,
          method, status, transaction_id, metadata, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'fedapay', 'pending', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [orderId, userId, totalAmount, 'XOF', totalAmount, String(transactionId), metadata]
      );

      paymentId = paymentResult.lastID;
    } else {
      await db.run(
        `
        UPDATE payments
        SET
          amount = ?, currency_code = 'XOF', amount_converted = ?,
          method = 'fedapay', status = 'pending', transaction_id = ?,
          metadata = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [totalAmount, totalAmount, String(transactionId), metadata, paymentId]
      );
    }

    // --------------------------------------------------------
    // REPONSE FRONTEND
    // --------------------------------------------------------

    console.log('✅ PAIEMENT FEDAPAY PRÊT');
    console.log('🔗 Checkout:', checkoutUrl);

    return res.status(200).json({
      success: true,
      message: 'Paiement FedaPay créé avec succès',

      transaction: {
        id: String(transactionId),
        reference: transaction.reference || null,
        status: transaction.status || 'pending',
        amount: transaction.amount || totalAmount,
        currency: 'XOF',
        checkout_url: checkoutUrl,
      },

      order: {
        id: orderId,
        order_number: orderNumber,
        total: totalAmount,
        currency: 'XOF',
        status: 'pending',
        payment_status: 'pending',
      },

      payment: {
        id: paymentId,
        status: 'pending',
        method: 'fedapay',
      },
    });
  } catch (error) {
    console.error('❌ ERREUR CRÉATION PAIEMENT:');
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la création du paiement',
    });
  }
});

// ============================================================
// GET /api/v1/payments/confirm
// ============================================================

router.get('/confirm', async (req, res) => {
  try {
    const transactionId = req.query.transaction_id || req.query.transactionId || null;
    const orderId = normalizeId(req.query.order_id) || normalizeId(req.query.orderId);

    if (!transactionId && !orderId) {
      return res.status(400).json({
        success: false,
        error: 'ID transaction ou commande requis',
      });
    }

    const db = await getDB();

    let payment = null;

    if (transactionId) {
      payment = await db.get(
        `
        SELECT *
        FROM payments
        WHERE transaction_id = ?
        LIMIT 1
        `,
        [String(transactionId)]
      );
    } else {
      payment = await db.get(
        `
        SELECT *
        FROM payments
        WHERE order_id = ?
        ORDER BY id DESC
        LIMIT 1
        `,
        [orderId]
      );
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé',
      });
    }

    if (payment.status === 'successful') {
      const order = await db.get(
        `
        SELECT order_number, download_token, download_expires_at
        FROM orders
        WHERE id = ?
        LIMIT 1
        `,
        [payment.order_id]
      );

      return res.status(200).json({
        success: true,
        payment: {
          status: 'successful',
          order_id: payment.order_id,
          order_number: order?.order_number || null,
          transaction_id: payment.transaction_id,
          download_token: order?.download_token || null,
          download_expires_at: order?.download_expires_at || null,
        },
      });
    }

    if (!FEDAPAY_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: 'FEDAPAY_SECRET_KEY manquante',
      });
    }

    let transaction;

    try {
      const response = await axios.get(
        `${FEDAPAY_API_URL}/transactions/${payment.transaction_id}`,
        {
          headers: {
            Authorization: `Bearer ${FEDAPAY_SECRET_KEY}`,
            Accept: 'application/json',
          },
          timeout: 30000,
        }
      );

      transaction = response?.data?.transaction || response?.data || {};
    } catch (fedapayError) {
      console.error(
        '❌ Erreur récupération transaction FedaPay:',
        JSON.stringify(fedapayError?.response?.data || fedapayError?.message, null, 2)
      );

      return res.status(502).json({
        success: false,
        error: 'Impossible de vérifier le paiement FedaPay',
      });
    }

    const status = String(transaction.status || '').toLowerCase();

    console.log('🔎 Statut FedaPay:', status);

    // SUCCESS
    if (status === 'approved' || status === 'successful' || status === 'success' || status === 'completed') {
      const finalized = await finalizeSuccessfulPayment(db, payment);

      return res.status(200).json({
        success: true,
        payment: {
          status: 'successful',
          order_id: finalized.orderId,
          order_number: finalized.orderNumber,
          transaction_id: finalized.transactionId,
          download_token: finalized.downloadToken,
          download_expires_at: finalized.downloadExpiresAt,
        },
      });
    }

    // FAILED / CANCELLED
    if (status === 'failed' || status === 'canceled' || status === 'cancelled' || status === 'declined') {
      await db.run(
        `
        UPDATE payments
        SET status = 'failed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [payment.id]
      );

      await db.run(
        `
        UPDATE orders
        SET status = 'failed', payment_status = 'failed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [payment.order_id]
      );

      return res.status(200).json({
        success: true,
        payment: {
          status: 'failed',
          order_id: payment.order_id,
        },
      });
    }

    // PENDING
    return res.status(200).json({
      success: true,
      payment: {
        status: payment.status || 'pending',
        order_id: payment.order_id,
        transaction_id: payment.transaction_id,
      },
    });
  } catch (error) {
    console.error('❌ Erreur confirmation paiement:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la confirmation',
    });
  }
});

// ============================================================
// POST /api/v1/payments/webhook
// ============================================================

router.post('/webhook', async (req, res) => {
  try {
    const event = req.body || {};

    console.log('');
    console.log('📡 ========= WEBHOOK FEDAPAY =========');
    console.log('TYPE:', event.type || event.event_type || event.name || 'unknown');

    const db = await getDB();

    const eventType = event.type || event.event_type || event.name || '';
    const transaction = event.data?.transaction || event.data || event.transaction || {};
    const transactionId = transaction.id || transaction.transaction_id || null;

    if (!transactionId) {
      console.warn('⚠️ Webhook sans transaction');
      return res.status(200).json({ received: true, ignored: true });
    }

    // TRANSACTION CREATED
    if (eventType === 'transaction.created') {
      console.log('✅ Transaction créée:', transactionId);
      return res.status(200).json({ received: true });
    }

    // TRANSACTION SUCCESS
    if (eventType === 'transaction.successful' || eventType === 'transaction.success' || eventType === 'transaction.approved') {
      const payment = await db.get(
        `
        SELECT *
        FROM payments
        WHERE transaction_id = ?
        LIMIT 1
        `,
        [String(transactionId)]
      );

      if (!payment) {
        console.warn('⚠️ Paiement introuvable:', transactionId);
        return res.status(200).json({ received: true, ignored: true });
      }

      const finalized = await finalizeSuccessfulPayment(db, payment);
      console.log('✅ Paiement finalisé:', finalized.orderNumber);

      return res.status(200).json({
        received: true,
        success: true,
        order_id: finalized.orderId,
      });
    }

    // TRANSACTION FAILED
    if (eventType === 'transaction.failed' || eventType === 'transaction.canceled' || 
        eventType === 'transaction.cancelled' || eventType === 'transaction.declined') {
      const payment = await db.get(
        `
        SELECT id, order_id
        FROM payments
        WHERE transaction_id = ?
        LIMIT 1
        `,
        [String(transactionId)]
      );

      if (payment) {
        await db.run(
          `
          UPDATE payments
          SET status = 'failed', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [payment.id]
        );

        await db.run(
          `
          UPDATE orders
          SET status = 'failed', payment_status = 'failed', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [payment.order_id]
        );
      }

      return res.status(200).json({ received: true });
    }

    console.log('ℹ️ Événement FedaPay ignoré:', eventType);
    return res.status(200).json({ received: true, ignored: true });
  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    return res.status(200).json({ received: true });
  }
});

// ============================================================
// POST /api/v1/payments/webhook-test
// ============================================================

router.post('/webhook-test', async (req, res) => {
  console.log('🔧 Webhook test reçu');
  console.log('📦 Body:', req.body);

  return res.status(200).json({
    success: true,
    message: 'Webhook de test reçu',
    body: req.body,
  });
});

// ============================================================
// GET /api/v1/payments/:id
// ============================================================

router.get('/:id', authenticate, async (req, res) => {
  try {
    const paymentId = normalizeId(req.params.id);

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'ID paiement invalide',
      });
    }

    const db = await getDB();

    const payment = await db.get(
      `
      SELECT p.*, o.order_number, o.status as order_status, o.payment_status as order_payment_status
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE p.id = ? AND p.user_id = ?
      LIMIT 1
      `,
      [paymentId, req.userId]
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Paiement introuvable',
      });
    }

    return res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('❌ Erreur récupération paiement:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
});

// ============================================================
// OPTIONS
// ============================================================

router.options('*', (req, res) => {
  const origin = req.headers.origin || FRONTEND_URL;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(204).end();
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;