// app/api/payments/fedapay/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { extractToken, verifyToken, getUserId } from '@/lib/auth';

// ============================================================
// CONFIGURATION FEDAPAY
// ============================================================

const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY;
const FEDAPAY_ENVIRONMENT = process.env.FEDAPAY_ENVIRONMENT || 'sandbox';
const FEDAPAY_API_URL = FEDAPAY_ENVIRONMENT === 'live'
  ? 'https://api.fedapay.com/v1'
  : 'https://sandbox-api.fedapay.com/v1';

const FEDAPAY_CALLBACK_URL =
  process.env.FEDAPAY_CALLBACK_URL ||
  `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success`;

// ============================================================
// POST /api/payments/fedapay/create
// ============================================================

export async function POST(req: NextRequest) {
  try {
    console.log('========================================');
    console.log('💳 FEDAPAY - INITIALISATION PAIEMENT');
    console.log('========================================');

    // ============================================================
    // 0. 🔥 DEBUG : AFFICHER LES COOKIES REÇUS
    // ============================================================
    const allCookies = req.cookies.getAll();
    console.log('🍪 Cookies reçus:', allCookies.map(c => c.name));
    
    const userSession = req.cookies.get('user_session')?.value;
    const adminSession = req.cookies.get('admin_session')?.value;
    const tokenCookie = req.cookies.get('token')?.value;
    
    console.log('🔑 user_session:', userSession ? '✅ Présent' : '❌ Absent');
    console.log('🔑 admin_session:', adminSession ? '✅ Présent' : '❌ Absent');
    console.log('🔑 token (cookie):', tokenCookie ? '✅ Présent' : '❌ Absent');

    // ============================================================
    // 1. AUTHENTIFICATION CENTRALISÉE (avec fallback manuel)
    // ============================================================

    let token = extractToken(req);
    
    if (!token && userSession) {
      token = userSession;
      console.log('🔑 Token récupéré manuellement depuis user_session');
    }

    if (!token && adminSession) {
      token = adminSession;
      console.log('🔑 Token récupéré manuellement depuis admin_session');
    }

    if (!token) {
      console.log('❌ Aucun token trouvé');
      return NextResponse.json(
        { error: 'Non authentifié', code: 'AUTH_TOKEN_MISSING' },
        { status: 401 }
      );
    }

    console.log('🔐 Token extrait:', token.substring(0, 20) + '...');

    const decoded = await verifyToken(token);
    if (!decoded) {
      console.log('❌ JWT invalide ou expiré');
      return NextResponse.json(
        { error: 'Session invalide ou expirée', code: 'AUTH_TOKEN_INVALID' },
        { status: 401 }
      );
    }

    const userId = getUserId(decoded);
    console.log('👤 User ID:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'Utilisateur non identifié', code: 'AUTH_USER_ID_MISSING' },
        { status: 401 }
      );
    }

    // ============================================================
    // 2. VALIDATION DU BODY
    // ============================================================

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    const orderId = Number(body?.orderId);
    console.log('📦 Order ID reçu:', orderId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { error: 'orderId invalide', code: 'INVALID_ORDER_ID' },
        { status: 400 }
      );
    }

    // ============================================================
    // 3. CONNEXION BDD
    // ============================================================

    const db = await getDB();

    // ============================================================
    // 4. RÉCUPÉRER LA COMMANDE (et NON PAS LA CRÉER)
    // ============================================================

    const order = await db.get(
      `
      SELECT
        o.*,
        u.id AS customer_id,
        u.email AS customer_email,
        u.name AS customer_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
      LIMIT 1
      `,
      [orderId]
    );

    if (!order) {
      console.log('❌ Commande introuvable:', orderId);
      return NextResponse.json(
        { error: 'Commande non trouvée', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    console.log('✅ Commande trouvée:', {
      id: order.id,
      user_id: order.user_id,
      product_id: order.product_id,
      product_title: order.product_title,
      payment_status: order.payment_status,
      transaction_id: order.transaction_id,
    });

    // ============================================================
    // 5. VÉRIFICATION PROPRIÉTAIRE
    // ============================================================

    if (Number(order.user_id) !== Number(userId)) {
      console.log('❌ Commande appartenant à un autre utilisateur');
      return NextResponse.json(
        { error: 'Accès non autorisé', code: 'ORDER_FORBIDDEN' },
        { status: 403 }
      );
    }

    // ============================================================
    // 6. COMMANDE DÉJÀ PAYÉE ?
    // ============================================================

    if (String(order.payment_status || '').toLowerCase() === 'paid') {
      console.log('⚠️ Commande déjà payée:', order.id);
      return NextResponse.json(
        { error: 'Cette commande est déjà payée', code: 'ORDER_ALREADY_PAID' },
        { status: 409 }
      );
    }

    // ============================================================
    // 7. RÉCUPÉRER LE PRODUIT (via la commande)
    // ============================================================

    let product = null;
    let productId = Number(order.product_id);

    if (Number.isInteger(productId) && productId > 0) {
      product = await db.get(
        `SELECT id, title, price FROM products WHERE id = ? LIMIT 1`,
        [productId]
      );
      console.log('🔍 Produit via order.product_id:', product ? '✅' : '❌');
    }

    if (!product) {
      const orderItem = await db.get(
        `SELECT product_id FROM order_items WHERE order_id = ? LIMIT 1`,
        [orderId]
      );
      if (orderItem?.product_id) {
        product = await db.get(
          `SELECT id, title, price FROM products WHERE id = ?`,
          [orderItem.product_id]
        );
        console.log('🔍 Produit via order_items:', product ? '✅' : '❌');
      }
    }

    if (!product && order.product_title) {
      product = await db.get(
        `SELECT id, title, price FROM products WHERE title = ? LIMIT 1`,
        [order.product_title]
      );
      console.log('🔍 Produit via product_title:', product ? '✅' : '❌');
    }

    if (!product && order.product_title) {
      product = await db.get(
        `SELECT id, title, price FROM products WHERE title LIKE ? LIMIT 1`,
        [`%${order.product_title}%`]
      );
      console.log('🔍 Produit via LIKE title:', product ? '✅' : '❌');
    }

    if (!product) {
      console.error('❌ Produit non trouvé pour la commande', orderId);
      return NextResponse.json(
        { error: 'Produit non trouvé', code: 'PRODUCT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const realAmount = Math.round(product.price);
    const productTitle = product.title;

    console.log('🔐 Prix réel en base:', realAmount);
    console.log('📦 Produit:', productTitle);

    // ============================================================
    // 8. VÉRIFICATION CLÉ FEDAPAY
    // ============================================================

    if (!FEDAPAY_SECRET_KEY) {
      console.error('❌ FEDAPAY_SECRET_KEY non définie');
      return NextResponse.json(
        { error: 'Configuration du paiement indisponible', code: 'PAYMENT_CONFIGURATION_ERROR' },
        { status: 500 }
      );
    }

    console.log('🔐 Clé FedaPay serveur: ✅ Présente');

    // ============================================================
    // 9. PRÉPARATION TRANSACTION
    // ============================================================

    const transactionData = {
      description: `Paiement ${productTitle}`,
      amount: realAmount,
      currency: { iso: 'XOF' },
      callback_url: FEDAPAY_CALLBACK_URL,
      customer: {
        email: order.customer_email || decoded.email,
        firstname: order.customer_name || decoded.name || 'Client',
      },
      custom_metadata: {
        orderId: Number(order.id),
        orderNumber: order.order_number || `ORD-${order.id}`,
        productId: Number(product.id),
        productTitle: productTitle,
        environment: FEDAPAY_ENVIRONMENT,
        timestamp: new Date().toISOString(),
      },
    };

    console.log('📦 Transaction:', {
      description: transactionData.description,
      amount: transactionData.amount,
      currency: transactionData.currency.iso,
      orderId: transactionData.custom_metadata.orderId,
      productId: transactionData.custom_metadata.productId,
      environment: FEDAPAY_ENVIRONMENT,
    });

    // ============================================================
    // 10. CRÉER TRANSACTION FEDAPAY
    // ============================================================

    console.log('📡 Envoi de la requête à FedaPay...');
    const fedapayResponse = await fetch(`${FEDAPAY_API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
      },
      body: JSON.stringify(transactionData),
    });

    const rawBody = await fedapayResponse.text();
    console.log('📡 Status FedaPay:', fedapayResponse.status);
    console.log('📡 Réponse brute FedaPay:', rawBody.substring(0, 200) + '...'); // Ne log pas tout pour éviter de polluer

    if (!fedapayResponse.ok) {
      let errorData = null;
      try {
        errorData = JSON.parse(rawBody);
      } catch {
        errorData = null;
      }

      console.error('❌ FedaPay HTTP:', fedapayResponse.status);
      console.error('❌ FedaPay réponse:', errorData);

      const errorMessage = typeof errorData?.message === 'string'
        ? errorData.message
        : 'Erreur lors de la création du paiement';

      return NextResponse.json(
        { error: errorMessage, code: 'FEDAPAY_TRANSACTION_ERROR' },
        { status: fedapayResponse.status >= 400 ? fedapayResponse.status : 502 }
      );
    }

    // 🔥 Parser la réponse JSON
    let transaction;
    try {
      transaction = JSON.parse(rawBody);
    } catch {
      console.error('❌ Impossible de parser la réponse JSON');
      return NextResponse.json(
        { error: 'Réponse FedaPay invalide', code: 'FEDAPAY_INVALID_RESPONSE' },
        { status: 502 }
      );
    }

    // 🔥🔥🔥 CORRECTION CRITIQUE : extraire la transaction encapsulée
    // La réponse est sous la forme { "v1/transaction": { ... } }
    const transactionDataRaw = transaction['v1/transaction'] || transaction.data || transaction;

    const transactionId = transactionDataRaw?.id || null;
    const transactionStatus = transactionDataRaw?.status || null;
    const paymentUrl = transactionDataRaw?.payment_url || null;

    console.log('✅ Transaction FedaPay créée:', transactionId);
    console.log('📊 Statut FedaPay:', transactionStatus);
    console.log('🔗 URL de paiement:', paymentUrl);

    if (!transactionId) {
      console.error('❌ FedaPay n\'a pas retourné d\'ID transaction');
      return NextResponse.json(
        { error: 'Transaction FedaPay invalide', code: 'FEDAPAY_TRANSACTION_INVALID' },
        { status: 502 }
      );
    }

    if (!paymentUrl) {
      console.error('❌ FedaPay n\'a pas retourné d\'URL de paiement');
      return NextResponse.json(
        { error: 'URL de paiement non reçue', code: 'FEDAPAY_PAYMENT_URL_MISSING' },
        { status: 502 }
      );
    }

    // ============================================================
    // 11. METTRE À JOUR LA COMMANDE (transaction_id)
    // ============================================================

    await db.run(
      `
      UPDATE orders
      SET
        transaction_id = ?,
        payment_status = 'pending',
        updated_at = datetime('now')
      WHERE id = ?
      `,
      [String(transactionId), Number(order.id)]
    );

    console.log('✅ Commande mise à jour:', order.id);

    // ============================================================
    // 12. RÉPONSE
    // ============================================================

    return NextResponse.json({
      success: true,
      orderId: Number(order.id),
      orderNumber: order.order_number,
      transactionId: transactionId,
      paymentUrl: paymentUrl,
    });

  } catch (error: any) {
    console.error('❌ ERREUR CRITIQUE FEDAPAY:', error);
    return NextResponse.json(
      { error: 'Erreur interne lors de l\'initialisation du paiement', code: 'PAYMENT_INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';