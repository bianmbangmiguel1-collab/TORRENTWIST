// app/api/orders/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('user_session')?.value;
    
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

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID de commande requis' },
        { status: 400 }
      );
    }

    const db = await getDB();

    const order = await db.get(
      'SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = "pending"',
      [orderId, user.id]
    );

    if (!order) {
      return NextResponse.json(
        { error: 'Commande non trouvée ou déjà traitée' },
        { status: 404 }
      );
    }

    await db.run(
      `UPDATE orders 
       SET status = 'cancelled', 
           payment_status = 'cancelled',
           updated_at = ?
       WHERE id = ?`,
      [new Date().toISOString(), orderId]
    );

    return NextResponse.json({
      success: true,
      message: 'Commande annulée'
    });

  } catch (error: any) {
    console.error('❌ Erreur annulation:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}