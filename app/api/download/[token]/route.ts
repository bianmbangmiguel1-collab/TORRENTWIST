// app/api/download/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    const db = await getDB();

    // 🔥 Vérifier le token dans la commande
    const order = await db.get(
      `SELECT o.*, p.file_path, p.file_name, p.file_size 
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.download_token = ? AND o.payment_status = 'paid'`,
      [token]
    );

    if (!order) {
      return NextResponse.json({ error: 'Lien de téléchargement invalide ou expiré' }, { status: 404 });
    }

    // 🔥 Vérifier que la commande est bien payée
    if (order.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Commande non payée' }, { status: 403 });
    }

    // 🔥 Vérifier les limites de téléchargement
    if (order.download_count >= order.download_limit) {
      return NextResponse.json({ error: 'Limite de téléchargement atteinte' }, { status: 403 });
    }

    // 🔥 Vérifier l'expiration
    if (order.download_expires_at && new Date(order.download_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Lien de téléchargement expiré' }, { status: 403 });
    }

    // 🔥 Incrémenter le compteur de téléchargements
    await db.run(
      `UPDATE orders SET download_count = download_count + 1 WHERE id = ?`,
      [order.id]
    );

    // 🔥 Vérifier si le fichier existe
    const filePath = path.join(process.cwd(), 'public', 'uploads', order.file_path || '');
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Fichier non trouvé: ${filePath}`);
      return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 });
    }

    // 🔥 Servir le fichier
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = order.file_name || 'download';
    const fileSize = order.file_size || fileBuffer.length;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(fileSize),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
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