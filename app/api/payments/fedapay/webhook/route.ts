=// app/api/payments/fedapay/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📨 Webhook FedaPay reçu:', JSON.stringify(body, null, 2));

    // 🔥 Vérifier le type d'événement
    const eventType = body.type || body.event;
    const data = body.data || body;

    if (eventType === 'transaction.approved' || eventType === 'transaction.paid') {
      const transaction = data.transaction || data;
      const transactionId = transaction.id;
      const amount = transaction.amount;
      const status = transaction.status;

      console.log(`💰 Transaction ${transactionId}: ${status} - ${amount} FCFA`);

      const db = await getDB();

      // 🔥 Vérifier que la transaction existe
      const order = await db.get(
        `SELECT * FROM orders WHERE transaction_id = ?`,
        [transactionId]
      );

      if (!order) {
        console.warn(`⚠️ Commande non trouvée pour transaction ${transactionId}`);
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // 🔥 Vérifier le montant
      const product = await db.get(
        `SELECT price FROM products WHERE id = ?`,
        [order.product_id]
      );

      if (!product) {
        console.warn(`⚠️ Produit non trouvé pour commande ${order.id}`);
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // 🔥 Vérifier que le montant correspond
      if (Math.abs(amount - product.price) > 1) {
        console.error(`❌ Montant invalide: ${amount} vs ${product.price}`);
        return NextResponse.json(
          { error: 'Invalid amount' },
          { status: 400 }
        );
      }

      // 🔥 Marquer la commande comme payée
      await db.run(
        `UPDATE orders 
         SET payment_status = 'paid', 
             status = 'completed',
             updated_at = datetime('now') 
         WHERE id = ?`,
        [order.id]
      );

      // 🔥 Ajouter le produit à la bibliothèque
      if (order.user_id) {
        await db.run(
          `INSERT OR IGNORE INTO library (user_id, product_id, order_id, access_status, created_at)
           VALUES (?, ?, ?, 'active', datetime('now'))`,
          [order.user_id, order.product_id, order.id]
        );
      }

      console.log(`✅ Commande ${order.id} marquée comme payée`);
      return NextResponse.json({ success: true });

    } else {
      console.log(`ℹ️ Événement ignoré: ${eventType}`);
      return NextResponse.json({ success: true });
    }

  } catch (error: any) {
    console.error('❌ Erreur webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'FedaPay webhook endpoint is active'
  });
}