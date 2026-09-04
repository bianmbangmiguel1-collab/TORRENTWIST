// app/api/orders/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // 🔥 Authentification centralisée
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    const { productId, quantity = 1, userEmail } = await req.json();

    if (!productId) {
      return NextResponse.json(
        { error: 'ID produit requis' },
        { status: 400 }
      );
    }

    const db = await getDB();

    const product = await db.get(
      'SELECT * FROM products WHERE id = ? AND status = "published"',
      [productId]
    );

    if (!product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        { error: 'Stock insuffisant' },
        { status: 400 }
      );
    }

    const totalAmount = product.price * quantity;
    const orderNumber = `TT-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const now = new Date().toISOString();

    // 🔥 TOUTES les colonnes, avec total_amount (NOT NULL)
    const orderData = {
      order_number: orderNumber,
      user_id: user.id,
      user_email: userEmail || user.email,
      user_name: user.name || user.email,
      product_id: product.id,
      product_title: product.title,
      subtotal: totalAmount,
      total: totalAmount,
      amount: totalAmount,
      total_amount: totalAmount,   // ✅ AJOUT indispensable
      currency: 'XOF',
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'fedapay',
      products: JSON.stringify([{
        product_id: product.id,
        title: product.title,
        quantity: quantity,
        price: product.price,
        total: totalAmount
      }]),
      created_at: now,
      updated_at: now,
    };

    const columns = Object.keys(orderData).join(', ');
    const placeholders = Object.keys(orderData).map(() => '?').join(', ');
    const values = Object.values(orderData);

    const orderResult = await db.run(
      `INSERT INTO orders (${columns}) VALUES (${placeholders})`,
      values
    );

    const orderId = orderResult.lastID || orderResult.insertId;

    // Ajout dans order_items
    await db.run(
      `INSERT INTO order_items (
        order_id, product_id, quantity, price, total, product_title, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        product.id,
        quantity,
        product.price,
        totalAmount,
        product.title,
        now,
      ]
    );

    return NextResponse.json({
      success: true,
      orderId: orderId,
      orderNumber: orderNumber,
      totalAmount: totalAmount,
    });

  } catch (error: any) {
    console.error('❌ Erreur création commande:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}