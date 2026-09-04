// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

// ============================================
// CONFIGURATION
// ============================================

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

// ============================================
// ROUTE GET /api/auth/me
// ============================================

export async function GET(request: NextRequest) {
  try {
    // 1. Récupérer le token : admin_session d'abord, puis user_session, puis Authorization
    let token = request.cookies.get('admin_session')?.value

    if (!token) {
      token = request.cookies.get('user_session')?.value
    }

    if (!token) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      console.warn('⚠️ /api/auth/me: Aucun token fourni')
      return NextResponse.json(
        { error: 'Non authentifié – Token manquant' },
        { status: 401 }
      )
    }

    // 2. Vérifier la validité du JWT
    let payload: any
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const { payload: decoded } = await jose.jwtVerify(token, secret, {
        algorithms: ['HS256'],
      })
      payload = decoded
      console.log('✅ Token décodé avec succès:', payload.email || payload.userId)
    } catch (error) {
      console.error('❌ Erreur de vérification JWT:', error)
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      )
    }

    // 3. Extraire l'userId (support multiple)
    const userId = payload.id || payload.userId || payload.sub
    if (!userId) {
      console.error('❌ userId manquant dans le payload:', payload)
      return NextResponse.json(
        { error: 'Token invalide – identifiant utilisateur manquant' },
        { status: 401 }
      )
    }

    const db = await getDB()
    let user = null
    let isAdmin = false

    // 4. Déterminer si c'est un admin ou un client
    // Si le payload contient role === 'admin' ou isAdmin === true, chercher dans admin_accounts
    if (payload.role === 'admin' || payload.isAdmin === true || payload.is_admin === true) {
      isAdmin = true
      user = await db.get(
        `SELECT 
          id,
          email,
          name,
          role,
          isActive as is_admin,
          isFirstLogin as is_first_login,
          lastLogin as last_login,
          created_at,
          updated_at
        FROM admin_accounts 
        WHERE id = ?`,
        [userId]
      )
    } else {
      // Sinon chercher dans users
      user = await db.get(
        `SELECT 
          id,
          name,
          email,
          phone,
          bio,
          address,
          city,
          country,
          postal_code,
          avatar,
          role,
          is_admin,
          is_verified,
          main_goal,
          interests,
          experience_level,
          profile_completeness,
          onboarding_completed,
          onboarding_step,
          engagement_score,
          total_time_spent,
          last_activity,
          preferences,
          created_at,
          updated_at
        FROM users 
        WHERE id = ?`,
        [parseInt(userId)]
      )
    }

    if (!user) {
      console.warn(`⚠️ Utilisateur ${userId} non trouvé dans la base`)
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // 5. Traiter les champs JSON pour user (uniquement pour le client)
    if (!isAdmin) {
      if (user.interests && typeof user.interests === 'string') {
        try {
          user.interests = JSON.parse(user.interests)
        } catch {
          user.interests = []
        }
      }
      if (user.preferences && typeof user.preferences === 'string') {
        try {
          user.preferences = JSON.parse(user.preferences)
        } catch {
          user.preferences = {}
        }
      }
    }

    // 6. Construire la réponse en snake_case
    if (isAdmin) {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'admin',
          is_admin: user.is_admin === 1,
          is_first_login: user.is_first_login === 1,
          last_login: user.last_login,
          created_at: user.created_at,
          updated_at: user.updated_at,
        }
      })
    } else {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          bio: user.bio || null,
          address: user.address || null,
          city: user.city || null,
          country: user.country || null,
          postal_code: user.postal_code || null,
          avatar: user.avatar || null,
          role: user.role || 'user',
          is_admin: user.is_admin === 1,
          is_verified: user.is_verified === 1,
          main_goal: user.main_goal || null,
          interests: user.interests || [],
          experience_level: user.experience_level || null,
          profile_completeness: user.profile_completeness || 0,
          onboarding_completed: user.onboarding_completed === 1,
          onboarding_step: user.onboarding_step || 0,
          engagement_score: user.engagement_score || 0,
          total_time_spent: user.total_time_spent || 0,
          last_activity: user.last_activity || null,
          preferences: user.preferences || {},
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      })
    }

  } catch (error: any) {
    console.error('❌ Erreur inattendue dans /api/auth/me:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// ============================================
// OPTIONS CORS
// ============================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'