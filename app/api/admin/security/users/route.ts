// app/api/admin/security/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, verifyToken } from '@/lib/auth';
import { banUser, unbanUser, suspendUser, unsuspendUser } from '@/lib/services/security';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    const adminId = payload?.userId || payload?.sub;

    if (!adminId) {
      return NextResponse.json({ error: 'Admin non identifié' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action, reason, duration } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    switch (action) {
      case 'ban':
        if (!reason) return NextResponse.json({ error: 'Motif requis' }, { status: 400 });
        await banUser(userId, reason, adminId);
        break;
      case 'unban':
        await unbanUser(userId, adminId);
        break;
      case 'suspend':
        if (!reason || !duration) {
          return NextResponse.json({ error: 'Motif et durée requis' }, { status: 400 });
        }
        await suspendUser(userId, reason, duration, adminId);
        break;
      case 'unsuspend':
        await unsuspendUser(userId, adminId);
        break;
      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Action effectuée avec succès' });
  } catch (error) {
    console.error('❌ Erreur security users:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}