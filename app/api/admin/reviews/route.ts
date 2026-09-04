// app/api/admin/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { getAdminReviews, updateReview, deleteReview } from '@/lib/services/reviews';
import { revalidatePath } from 'next/cache';

// ============================================================
// GET – Liste des avis (admin)
// ============================================================
export async function GET(request: NextRequest) {
  try {
    // Vérification admin avec token extrait manuellement
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';
    const ratingParam = searchParams.get('rating');
    const productIdParam = searchParams.get('productId');
    const search = searchParams.get('search') || undefined;
    const pageParam = Number(searchParams.get('page')) || 1;
    const limitParam = Number(searchParams.get('limit')) || 20;

    const rating = ratingParam && !Number.isNaN(Number(ratingParam))
      ? Number(ratingParam)
      : undefined;

    const productId = productIdParam && !Number.isNaN(Number(productIdParam))
      ? Number(productIdParam)
      : undefined;

    const page = Math.max(1, Number.isFinite(pageParam) ? pageParam : 1);
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitParam) ? limitParam : 20));

    const data = await getAdminReviews({
      status,
      rating,
      productId,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('❌ Erreur GET /api/admin/reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH – Mettre à jour un avis (approbation, rejet, etc.)
// ============================================================
export async function PATCH(request: NextRequest) {
  try {
    // Vérification admin avec token extrait manuellement
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Récupérer l'ID depuis la query string
    const idParam = request.nextUrl.searchParams.get('id');
    if (!idParam) {
      return NextResponse.json(
        { success: false, error: 'ID manquant (paramètre ?id=...)' },
        { status: 400 }
      );
    }
    const reviewId = Number(idParam);
    if (isNaN(reviewId) || reviewId <= 0) {
      return NextResponse.json(
        { success: false, error: 'ID invalide' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      status,
      admin_reply,
      is_featured,
      is_visible,
      display_priority,
      scheduled_start,
      scheduled_end,
    } = body;

    const updateData: any = {};

    if (status !== undefined) {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Statut invalide' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (admin_reply !== undefined) {
      updateData.admin_reply = admin_reply?.trim() || null;
    }

    if (is_featured !== undefined) {
      updateData.is_featured = Boolean(is_featured);
    }

    if (is_visible !== undefined) {
      updateData.is_visible = Boolean(is_visible);
    }

    if (display_priority !== undefined) {
      const priority = Number(display_priority);
      if (!Number.isFinite(priority)) {
        return NextResponse.json(
          { success: false, error: 'Priorité invalide' },
          { status: 400 }
        );
      }
      updateData.display_priority = priority;
    }

    if (scheduled_start !== undefined) {
      updateData.scheduled_start = scheduled_start || null;
    }

    if (scheduled_end !== undefined) {
      updateData.scheduled_end = scheduled_end || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      );
    }

    const updated = await updateReview(reviewId, updateData);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Avis non trouvé' },
        { status: 404 }
      );
    }

    revalidatePath('/admin/reviews');
    return NextResponse.json({
      success: true,
      message: 'Avis mis à jour avec succès',
      review: updated,
    });
  } catch (error) {
    console.error('❌ Erreur PATCH /api/admin/reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE – Supprimer un avis
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    // Vérification admin avec token extrait manuellement
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const idParam = request.nextUrl.searchParams.get('id');
    if (!idParam) {
      return NextResponse.json(
        { success: false, error: 'ID manquant (paramètre ?id=...)' },
        { status: 400 }
      );
    }
    const reviewId = Number(idParam);
    if (isNaN(reviewId) || reviewId <= 0) {
      return NextResponse.json(
        { success: false, error: 'ID invalide' },
        { status: 400 }
      );
    }

    const success = await deleteReview(reviewId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Avis non trouvé' },
        { status: 404 }
      );
    }

    revalidatePath('/admin/reviews');
    return NextResponse.json({
      success: true,
      message: 'Avis supprimé avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur DELETE /api/admin/reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}