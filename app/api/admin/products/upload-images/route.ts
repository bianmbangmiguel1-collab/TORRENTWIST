// app/api/admin/products/upload-images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================
// POST : UPLOAD D'IMAGES POUR UN PRODUIT
// ============================================================

export async function POST(request: NextRequest) {
  console.log('📸 [upload-images] Début de la requête')

  try {
    // ✅ Récupérer l'admin ID depuis les headers injectés par le middleware
    const adminId = request.headers.get('x-admin-id')
    if (!adminId) {
      console.warn('❌ [upload-images] Header x-admin-id manquant - accès refusé')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    console.log(`✅ [upload-images] Admin ID: ${adminId}`)

    // Récupérer le formulaire
    const formData = await request.formData()
    const productId = formData.get('productId') as string
    const files = formData.getAll('images') as File[]

    if (!productId) {
      return NextResponse.json(
        { error: 'productId est requis' },
        { status: 400 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Aucune image fournie' },
        { status: 400 }
      )
    }

    console.log(`📸 [upload-images] ${files.length} images pour le produit ${productId}`)

    const db = await getDB()

    // Vérifier que le produit existe (et appartient bien à l'admin si nécessaire)
    const product = await db.get(
      'SELECT id FROM products WHERE id = ?',
      [productId]
    )
    if (!product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      )
    }

    // Dossier de destination
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products', productId)
    await mkdir(uploadDir, { recursive: true })

    const uploadedImages = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = path.extname(file.name) || '.jpg'
      const filename = `${randomUUID()}${ext}`
      const filepath = path.join(uploadDir, filename)
      const url = `/uploads/products/${productId}/${filename}`

      // Lire le contenu du fichier
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Écrire le fichier
      await writeFile(filepath, buffer)

      // Déterminer si c'est l'image principale (première image)
      const isMain = i === 0 ? 1 : 0

      // Insérer en base de données
      const result = await db.run(
        `INSERT INTO product_images (product_id, url, alt, position, is_main, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [productId, url, file.name, i, isMain]
      )

      uploadedImages.push({
        id: result.lastID,
        url,
        alt: file.name,
        position: i,
        is_main: isMain,
      })
    }

    console.log(`✅ [upload-images] ${uploadedImages.length} images uploadées avec succès`)

    return NextResponse.json({
      success: true,
      images: uploadedImages,
      message: `${uploadedImages.length} image(s) uploadée(s) avec succès`
    })
  } catch (error: any) {
    console.error('❌ [upload-images] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload des images: ' + error.message },
      { status: 500 }
    )
  }
}