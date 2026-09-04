// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getDB } from '@/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature') || ''
    
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Erreur webhook:', err)
      return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
    }
    
    const db = await getDB()
    
    // Enregistrer l'événement
    await db.run(`
      INSERT INTO webhooks (event_type, payload, processed, created_at)
      VALUES (?, ?, 0, datetime('now'))
    `, [event.type, JSON.stringify(event.data)])
    
    // Traiter selon le type d'événement
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentSuccess(db, paymentIntent)
        break
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailed(db, paymentIntent)
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleSubscriptionPayment(db, invoice)
        break
      }
    }
    
    // Marquer comme traité
    await db.run(
      'UPDATE webhooks SET processed = 1 WHERE event_type = ?',
      [event.type]
    )
    
    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('Erreur webhook:', error)
    return NextResponse.json(
      { error: 'Erreur lors du traitement du webhook' },
      { status: 500 }
    )
  }
}

async function handlePaymentSuccess(db: any, paymentIntent: Stripe.PaymentIntent) {
  const { productId, userId } = paymentIntent.metadata
  
  // Mettre à jour le paiement
  await db.run(`
    UPDATE payments SET status = 'completed', updated_at = datetime('now')
    WHERE payment_intent_id = ?
  `, [paymentIntent.id])
  
  // Mettre à jour la commande
  await db.run(`
    UPDATE orders SET status = 'completed', payment_status = 'paid', updated_at = datetime('now')
    WHERE id = (SELECT order_id FROM payments WHERE payment_intent_id = ?)
  `, [paymentIntent.id])
  
  // Délivrer le produit selon son type
  const product = await db.get('SELECT * FROM products WHERE id = ?', [productId])
  if (!product) return
  
  switch (product.type) {
    case 'file':
      await deliverFile(db, productId, userId)
      break
    case 'license':
      await generateLicenses(db, productId, userId)
      break
    case 'group_access':
      await deliverGroupAccess(db, productId, userId)
      break
    case 'course':
      await enrollCourse(db, productId, userId)
      break
    case 'credits':
      await addCredits(db, productId, userId)
      break
    // Ajouter les autres cas...
  }
}

async function handlePaymentFailed(db: any, paymentIntent: Stripe.PaymentIntent) {
  await db.run(`
    UPDATE payments SET status = 'failed', updated_at = datetime('now')
    WHERE payment_intent_id = ?
  `, [paymentIntent.id])
  
  await db.run(`
    UPDATE orders SET status = 'cancelled', updated_at = datetime('now')
    WHERE id = (SELECT order_id FROM payments WHERE payment_intent_id = ?)
  `, [paymentIntent.id])
}

// Fonctions de délivrance
async function deliverFile(db: any, productId: number, userId: number) {
  const product = await db.get('SELECT * FROM products WHERE id = ?', [productId])
  const token = generateDownloadToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (product.download_expires_days || 30))
  
  await db.run(`
    INSERT INTO download_tokens (
      token, order_id, product_id, user_id, expires_at,
      max_downloads, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `, [
    token,
    (await db.get('SELECT id FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId])).id,
    productId,
    userId,
    expiresAt.toISOString(),
    product.download_limit || 1
  ])
  
  // Envoyer l'email avec le lien de téléchargement
  await sendDownloadEmail(userId, product, token)
}

async function generateLicenses(db: any, productId: number, userId: number) {
  const product = await db.get('SELECT * FROM products WHERE id = ?', [productId])
  const quantity = product.license_quantity || 1
  const validityDays = product.license_validity_days || 365
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + validityDays)
  
  const licenses = []
  for (let i = 0; i < quantity; i++) {
    const code = generateLicenseCode()
    await db.run(`
      INSERT INTO licenses (product_id, user_id, code, expires_at, status)
      VALUES (?, ?, ?, ?, 'active')
    `, [productId, userId, code, expiresAt.toISOString()])
    licenses.push(code)
  }
  
  // Envoyer l'email avec les licences
  await sendLicenseEmail(userId, product, licenses, expiresAt)
}

async function deliverGroupAccess(db: any, productId: number, userId: number) {
  const product = await db.get('SELECT * FROM products WHERE id = ?', [productId])
  
  await db.run(`
    INSERT INTO group_access (user_id, product_id, status, created_at)
    VALUES (?, ?, 'pending', datetime('now'))
  `, [userId, productId])
  
  // Si le produit a un lien de groupe, l'envoyer par email
  if (product.group_link) {
    await sendGroupEmail(userId, product)
  }
}

async function enrollCourse(db: any, productId: number, userId: number) {
  const product = await db.get('SELECT * FROM products WHERE id = ?', [productId])
  const courseId = product.course_id
  
  if (courseId) {
    await db.run(`
      INSERT INTO user_courses (user_id, course_id, status, enrolled_at)
      VALUES (?, ?, 'active', datetime('now'))
    `, [userId, courseId])
  }
}

async function addCredits(db: any, productId: number, userId: number) {
  const product = await db.get('SELECT * FROM products WHERE id = ?', [productId])
  const credits = product.credits_amount || 0
  
  // Ajouter les crédits à l'utilisateur
  await db.run(`
    INSERT INTO credit_transactions (user_id, amount, type, reference, description, created_at)
    VALUES (?, ?, 'purchase', ?, ?, datetime('now'))
  `, [userId, credits, productId, `Achat de ${product.title}`])
  
  // Mettre à jour le solde
  await db.run(`
    UPDATE user_credits SET balance = balance + ? WHERE user_id = ?
  `, [credits, userId])
}

// Utilitaires
function generateDownloadToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function generateLicenseCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segments = []
  for (let i = 0; i < 4; i++) {
    let segment = ''
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    segments.push(segment)
  }
  return segments.join('-')
}

// Fonctions d'envoi d'email (à implémenter avec nodemailer ou autre)
async function sendDownloadEmail(userId: number, product: any, token: string) {
  // Implémentation avec votre service d'email
}

async function sendLicenseEmail(userId: number, product: any, licenses: string[], expiresAt: Date) {
  // Implémentation avec votre service d'email
}

async function sendGroupEmail(userId: number, product: any) {
  // Implémentation avec votre service d'email
}