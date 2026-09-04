// torrenttwist-backend/routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// POST /api/v1/orders - Créer une commande
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { productIds, quantities = [] } = req.body;

    if (!productIds || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun produit sélectionné'
      });
    }

    let total = 0;
    const items = [];

    for (let i = 0; i < productIds.length; i++) {
      const product = await db.get(`
        SELECT id, title, price, file_path FROM products 
        WHERE id = ? AND status = 'published'
      `, [productIds[i]]);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: `Produit ${productIds[i]} non trouvé`
        });
      }

      const quantity = quantities[i] || 1;
      items.push({ product, quantity });
      total += product.price * quantity;
    }

    const orderNumber = `TT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const result = await db.run(`
      INSERT INTO orders (
        order_number,
        user_id,
        subtotal,
        total,
        currency,
        status,
        payment_status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'XAF', 'pending', 'pending', datetime('now'), datetime('now'))
    `, [orderNumber, userId, total, total]);

    const orderId = result.lastID;

    for (const item of items) {
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
        item.product.id,
        item.quantity,
        item.product.price,
        item.product.price * item.quantity,
        item.product.title,
        item.product.file_path,
      ]);
    }

    const order = await db.get(`SELECT * FROM orders WHERE id = ?`, [orderId]);

    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total: order.total,
        status: order.status,
      }
    });

  } catch (error) {
    console.error('❌ Erreur création commande:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la commande'
    });
  }
});

module.exports = router;