// app/api/webhooks/fedapay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import crypto from 'crypto';

const FEDAPAY_WEBHOOK_SECRET = process.env.FEDAPAY_WEBHOOK_SECRET || '';
const isDevelopment = process.env.NODE_ENV === 'development';

async function verifySignature(payload: any, signature: string | null): Promise<boolean> {
  if (isDevelopment && !FEDAPAY_WEBHOOK_SECRET) {
    console.log('⚠️ Mode développement - Vérification signature désactivée');
    return true;
  }
  if (!signature || !FEDAPAY_WEBHOOK_SECRET) return false;
  try {
    const expectedSignature = crypto
      .createHmac('sha256', FEDAPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    return expectedSignature === signature;
  } catch {
    return false;
  }
}

async function handleTransactionPaid(transaction: any) {
  const db = await getDB();
  const order = await db.get(
    `SELECT o.*, u.email as user_email, u.name as user_name
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     WHERE o.transaction_id = ?`,
    [transaction.id]
  );

  if (!order) {
    console.log(`⚠️ Commande non trouvée pour la transaction ${transaction.id}`);
    return { success: false, message: 'Commande non trouvée' };
  }

  if (order.status === 'completed') {
    console.log(`ℹ️ Commande ${order.order_number} déjà traitée`);
    return { success: true, alreadyProcessed: true };
  }

  // Mettre à jour la commande
  await db.run(
    `UPDATE orders 
     SET status = 'completed', 
         payment_status = 'paid',
         paid_at = ?,
         updated_at = ?
     WHERE id = ?`,
    [new Date().toISOString(), new Date().toISOString(), order.id]
  );

  // Réduire le stock
  const products = JSON.parse(order.products || '[]');
  for (const item of products) {
    await db.run(
      'UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ?',
      [item.quantity, item.quantity, item.product_id]
    );
  }

  // Ajouter à la bibliothèque
  if (order.user_id) {
    for (const item of products) {
      await db.run(
        `INSERT OR IGNORE INTO library (user_id, product_id, order_id, access_status, created_at)
         VALUES (?, ?, ?, 'active', ?)`,
        [order.user_id, item.product_id, order.id, new Date().toISOString()]
      );
    }
  }

  // Générer token de téléchargement
  const downloadToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await db.run(
    `UPDATE orders 
     SET download_token = ?, download_expires_at = ?
     WHERE id = ?`,
    [downloadToken, expiresAt.toISOString(), order.id]
  );

  // Logs de paiement
  await db.run(
    `INSERT INTO payment_logs (user_id, order_id, amount, method, status, reference, metadata, created_at)
     VALUES (?, ?, ?, ?, 'success', ?, ?, ?)`,
    [
      order.user_id,
      order.id,
      order.total_amount,
      'fedapay',
      transaction.reference || transaction.id,
      JSON.stringify({ transaction_id: transaction.id, order_number: order.order_number }),
      new Date().toISOString()
    ]
  );

  // 🔥 NOTIFICATION
  await db.run(
    `INSERT INTO notifications (user_id, type, title, message, link, icon, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      order.user_id,
      'payment',
      '💳 Paiement réussi',
      `Votre commande ${order.order_number} a été payée avec succès. Vous pouvez maintenant télécharger votre produit.`,
      `/dashboard/library`,
      '🎉',
      new Date().toISOString()
    ]
  );

  console.log(`✅ Commande ${order.order_number} payée et notification créée`);
  return { success: true, order: order.order_number, downloadToken };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const signature = req.headers.get('x-fedapay-signature');

    console.log('📨 Webhook FedaPay reçu:', body.event);

    if (!(await verifySignature(body, signature))) {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
    }

    const { event, data } = body;
    switch (event) {
      case 'transaction.paid':
      case 'transaction.approved':
        const result = await handleTransactionPaid(data);
        return NextResponse.json({ received: true, processed: true, ...result });
      default:
        console.log(`⚠️ Événement non géré: ${event}`);
        return NextResponse.json({ received: true, message: 'Événement ignoré' });
    }
  } catch (error: any) {
    console.error('❌ Erreur webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Webhook FedaPay actif' });
}