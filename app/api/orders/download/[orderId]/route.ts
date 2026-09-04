// app/api/orders/download/[orderId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    
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

    const orderId = parseInt(params.orderId);
    const db = await getDB();

    // Récupérer la commande
    const order = await db.get(
      `SELECT o.*, p.download_url, p.title as product_title
       FROM orders o
       JOIN products p ON JSON_EXTRACT(o.products, '$[0].product_id') = p.id
       WHERE o.id = ? AND o.user_id = ? AND o.status = 'completed'`,
      [orderId, user.id]
    );

    if (!order) {
      return NextResponse.json(
        { error: 'Commande non trouvée ou non disponible' },
        { status: 404 }
      );
    }

    if (!order.download_url) {
      return NextResponse.json(
        { error: 'Aucun fichier disponible pour ce produit' },
        { status: 404 }
      );
    }

    // 🔥 Servir le fichier
    const filePath = path.join(process.cwd(), 'public', order.download_url);
    const file = await readFile(filePath);
    
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${order.product_title || 'produit'}.zip"`,
      },
    });

  } catch (error: any) {
    console.error('❌ Erreur téléchargement:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}