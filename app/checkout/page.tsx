// app/checkout/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { Loader2, ArrowLeft, Package, CreditCard, ShieldCheck, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// 🔥 FedaPayCheckout chargé dynamiquement
const FedaPayCheckout = dynamic(
  () => import('@/components/payment/FedaPayCheckout'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Chargement du paiement...</span>
      </div>
    )
  }
);

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading: userLoading } = useUser();
  
  // 🔥 Récupérer le product_id depuis l'URL
  const productId = searchParams?.get('product_id');
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [redirectDone, setRedirectDone] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // 🔥 MOUNT
  useEffect(() => {
    setIsMounted(true);
    console.log('✅ Checkout page mounted');
    console.log('📦 Product ID from URL:', productId);
    console.log('📦 Search Params:', searchParams?.toString());
    console.log('👤 User:', user?.email);
    console.log('🔐 Authenticated:', isAuthenticated);
    console.log('⏳ User Loading:', userLoading);
  }, []);

  // 🔥 REDIRECTION VERS LOGIN (une seule fois)
  useEffect(() => {
    if (!userLoading && !isAuthenticated && isMounted && !redirectDone) {
      setRedirectDone(true);
      console.log('🔑 Redirection vers login');
      router.replace(`/login?redirect=/checkout?product_id=${productId || ''}`);
    }
  }, [userLoading, isAuthenticated, isMounted, redirectDone, productId, router]);

  // 🔥 CHARGEMENT DU PRODUIT
  useEffect(() => {
    if (!userLoading && isAuthenticated && productId && isMounted && !redirectDone) {
      console.log('📡 Fetching product:', productId);
      fetchProduct();
    } else if (!userLoading && isAuthenticated && !productId && isMounted) {
      console.log('⚠️ Pas de product_id dans l\'URL');
      setError('Aucun produit sélectionné. Veuillez retourner à la page produit.');
      setLoading(false);
    }
  }, [userLoading, isAuthenticated, productId, isMounted, redirectDone]);

  const fetchProduct = async () => {
    try {
      console.log('📡 Fetching product:', productId);
      const response = await fetch(`/api/products/${productId}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Product loaded:', data.title);
        setProduct(data);
        setError(null);
      } else {
        setError('Produit non trouvé');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      setError('Erreur lors du chargement du produit');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 CRÉER LA COMMANDE
  const createOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('📦 Creating order for product:', productId);
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId: parseInt(productId!),
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la commande');
      }

      console.log('✅ Order created:', data);
      setOrderData(data);
      setShowPayment(true);
      return data;

    } catch (error: any) {
      console.error('❌ Erreur création commande:', error);
      setError(error.message || 'Erreur lors de la création de la commande');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 SUCCÈS DU PAIEMENT
  const handlePaymentSuccess = async (transaction: any) => {
    console.log('✅ Paiement réussi:', transaction);
    setPaymentSuccess(true);
    setShowPayment(false);

    try {
      if (orderData) {
        await fetch('/api/orders/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            orderId: orderData.orderId,
            transactionId: transaction.id,
            status: 'completed'
          })
        });
      }
    } catch (err) {
      console.error('❌ Erreur confirmation:', err);
    }

    setTimeout(() => {
      router.push(`/payment/success?transaction=${transaction.id}&order=${orderData?.orderNumber || ''}`);
    }, 1000);
  };

  // ============================================================
  // RENDU
  // ============================================================
  
  // 🔥 CHARGEMENT INITIAL
  if (!isMounted || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // 🔥 SUCCÈS DU PAIEMENT
  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">✅ Paiement réussi !</h2>
          <p className="text-gray-500 mt-2">Votre commande a été confirmée.</p>
          <p className="text-sm text-gray-400 mt-1">Vous allez être redirigé...</p>
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  // 🔥 PAS DE PRODUCT_ID
  if (!productId && !loading && !userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Aucun produit sélectionné</h2>
          <p className="text-gray-500 mt-2">Veuillez sélectionner un produit avant de continuer.</p>
          <Link
            href="/products"
            className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            Voir les produits
          </Link>
        </div>
      </div>
    );
  }

  // 🔥 NON AUTHENTIFIÉ
  if (!isAuthenticated && !userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  // 🔥 ERREUR
  if (error && !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Erreur</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <Link
            href="/products"
            className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            Retour aux produits
          </Link>
        </div>
      </div>
    );
  }

  // 🔥 PRODUIT NON TROUVÉ
  if (!product && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Produit non trouvé</h2>
          <p className="text-gray-500 mt-2">Le produit que vous recherchez n'existe pas.</p>
          <Link
            href="/products"
            className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            Voir les produits
          </Link>
        </div>
      </div>
    );
  }

  // 🔥 CHARGEMENT DU PRODUIT
  if (loading && !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Chargement du produit...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/product/${product?.slug || '#'}`}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-xl hover:bg-white transition shadow-sm text-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-blue-600" />
              Paiement sécurisé
            </h1>
            {orderData && (
              <span className="text-xs text-gray-400 ml-auto">
                #{orderData.orderNumber}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Résumé */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Résumé de la commande</h2>
            
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <Package className="w-12 h-12 text-blue-500" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{product?.title}</p>
                <p className="text-sm text-gray-500">{product?.description?.slice(0, 100)}...</p>
              </div>
              <p className="font-bold text-blue-600 text-lg">
                {product?.price?.toLocaleString()} FCFA
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-blue-600">{product?.price?.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>

          {/* Informations utilisateur */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-blue-500">👤</span>
              Informations
            </h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Nom:</span> {user?.name}</p>
              <p><span className="text-gray-500">Email:</span> {user?.email}</p>
              {orderData && (
                <p className="text-xs text-gray-400 mt-2">
                  Commande #{orderData.orderNumber}
                </p>
              )}
            </div>
          </div>

          {/* BOUTON PAYER */}
          {!showPayment ? (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-2xl shadow-blue-500/30">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-8 h-8" />
                <span className="text-xl font-bold">Paiement sécurisé</span>
              </div>
              
              <p className="text-white/80 mb-6">
                Vous allez être redirigé vers FedaPay pour finaliser votre paiement.
              </p>

              <button
                onClick={createOrder}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-blue-600 rounded-2xl hover:shadow-xl transition font-bold text-lg disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Préparation...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Payer {product?.price?.toLocaleString()} FCFA
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-4 text-sm text-white/60">
                <span className="flex items-center gap-1">🔒 Sécurisé</span>
                <span className="w-px h-4 bg-white/20" />
                <span>💳 FedaPay</span>
                <span className="w-px h-4 bg-white/20" />
                <span>📱 Mobile Money</span>
              </div>
            </div>
          ) : (
            // FEDAPAY CHECKOUT
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                  Paiement sécurisé
                </h2>
                {orderData && (
                  <span className="text-xs text-gray-400">
                    Commande #{orderData.orderNumber}
                  </span>
                )}
              </div>

              <FedaPayCheckout
                amount={product?.price || 0}
                description={`Achat: ${product?.title || 'Produit'}`}
                customerEmail={user?.email || ''}
                customerName={user?.name || ''}
                currency="XOF"
                productId={parseInt(productId!)}
                productTitle={product?.title}
                buttonText={`Payer ${product?.price?.toLocaleString()} FCFA`}
                buttonClassName="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 transition hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg"
                onSuccess={handlePaymentSuccess}
                onError={(err) => {
                  console.error('❌ Erreur paiement:', err);
                  setError('Erreur lors du paiement. Veuillez réessayer.');
                  setShowPayment(false);
                }}
                onClose={() => {
                  console.log('👋 Paiement annulé');
                  setShowPayment(false);
                }}
              />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-500 hover:text-red-700 mt-1"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// EXPORT AVEC SUSPENSE
// ============================================================

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Chargement du checkout...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}