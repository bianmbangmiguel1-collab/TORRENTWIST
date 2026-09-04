// app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

// ============================================================
// GET : Récupérer les notifications de l'utilisateur
// ============================================================
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/notifications - Début')

    // 🔥 Récupérer le token depuis les cookies
    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value

    console.log('🔑 Token présent:', !!token)

    if (!token) {
      console.log('❌ Token non trouvé')
      return NextResponse.json({ 
        success: false, 
        error: 'Non authentifié',
        notifications: [] 
      }, { status: 401 })
    }

    // 🔥 Décoder le token JWT
    let userId = null
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join('')
      )
      const decoded = JSON.parse(jsonPayload)
      userId = decoded?.id || decoded?.userId || null
      console.log('👤 User ID décodé:', userId)
    } catch (e) {
      console.error('❌ Erreur décodage token:', e)
      return NextResponse.json({ 
        success: false, 
        error: 'Token invalide',
        notifications: [] 
      }, { status: 401 })
    }

    if (!userId) {
      console.log('❌ User ID non trouvé')
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non identifié',
        notifications: [] 
      }, { status: 401 })
    }

    const db = await getDB()
    console.log('✅ Base de données connectée')

    // Vérifier si la table notifications existe
    try {
      const tableCheck = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'"
      )
      if (!tableCheck) {
        console.log('⚠️ Table notifications non trouvée, création...')
        await db.exec(`
          CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT DEFAULT 'info',
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            link TEXT,
            icon TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `)
        console.log('✅ Table notifications créée')
      }
    } catch (error) {
      console.error('❌ Erreur vérification table:', error)
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unread') === 'true'

    let whereClause = 'WHERE user_id = ?'
    const params: any[] = [userId]

    if (unreadOnly) {
      whereClause += ' AND is_read = 0'
    }

    console.log('📊 Requête avec params:', { userId, limit, offset, unreadOnly })

    // 🔥 Récupérer les notifications
    const notifications = await db.all(`
      SELECT 
        id,
        user_id,
        type,
        title,
        message,
        is_read as read,
        link,
        icon,
        created_at,
        updated_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset])

    console.log(`✅ ${notifications.length} notifications récupérées`)

    // 🔥 Compter les non lues
    const unreadResult = await db.get(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `, [userId])

    const unreadCount = unreadResult?.count || 0
    console.log(`📬 ${unreadCount} notifications non lues`)

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      unread_count: unreadCount,
      total: notifications.length
    })
    
  } catch (error) {
    console.error('❌ Erreur GET /api/notifications:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Erreur serveur: ' + (error instanceof Error ? error.message : 'Unknown error'),
      notifications: [] 
    }, { status: 500 })
  }
}

// ============================================================
// PATCH : Marquer une notification comme lue
// ============================================================
export async function PATCH(request: NextRequest) {
  try {
    console.log('🔍 PATCH /api/notifications - Début')

    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value

    console.log('🔑 Token présent:', !!token)

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    let userId = null
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join('')
      )
      const decoded = JSON.parse(jsonPayload)
      userId = decoded?.id || decoded?.userId || null
      console.log('👤 User ID décodé:', userId)
    } catch (e) {
      console.error('❌ Erreur décodage token:', e)
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 })
    }

    const body = await request.json()
    const { notification_id, mark_all } = body
    console.log('📝 Body reçu:', { notification_id, mark_all })

    const db = await getDB()

    if (mark_all) {
      console.log('📬 Marquage de toutes les notifications comme lues')
      await db.run(
        'UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [userId]
      )
      return NextResponse.json({
        success: true,
        message: 'Toutes les notifications ont été marquées comme lues'
      })
    }

    if (!notification_id) {
      return NextResponse.json({ error: 'ID notification requis' }, { status: 400 })
    }

    const result = await db.run(
      'UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [notification_id, userId]
    )

    if (result.changes === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Notification non trouvée' 
      }, { status: 404 })
    }

    console.log(`✅ Notification ${notification_id} marquée comme lue`)

    return NextResponse.json({
      success: true,
      message: 'Notification marquée comme lue'
    })
    
  } catch (error) {
    console.error('❌ Erreur PATCH /api/notifications:', error)
    return NextResponse.json(
      { error: 'Erreur serveur: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE : Supprimer une notification
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    console.log('🔍 DELETE /api/notifications - Début')

    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    let userId = null
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join('')
      )
      const decoded = JSON.parse(jsonPayload)
      userId = decoded?.id || decoded?.userId || null
    } catch (e) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json({ error: 'ID notification requis' }, { status: 400 })
    }

    const db = await getDB()
    const result = await db.run(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    )

    if (result.changes === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Notification non trouvée' 
      }, { status: 404 })
    }

    console.log(`✅ Notification ${notificationId} supprimée`)

    return NextResponse.json({
      success: true,
      message: 'Notification supprimée'
    })
    
  } catch (error) {
    console.error('❌ Erreur DELETE /api/notifications:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// OPTIONS : CORS
// ============================================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}