// app/cart/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag,
  ArrowRight,
  MessageCircle,
  CreditCard,
  Truck,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Download,
  FileText,
  Zap,
  Wallet,
  Smartphone,
  Package,
  ShieldCheck,
  Heart,
  Clock,
  Sparkles,
  Loader2
} from 'lucide-react'

interface CartItem {
  id: number
  title: string
  price: number
  quantity: number
  image: string
  subtotal: number
  file_path?: string
}

interface CartTotal {
  items: number
  total: number
  totalQuantity: number
}

export default function CartPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState<CartTotal>({ items: 0, total: 0, totalQuantity: 0 })
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    fetchCart()
  }, [])

  const fetchCart = async () => {
    try {
      setError(null)
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('http://localhost:5000/api/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error('Erreur lors du chargement du panier')
      }

      const data = await response.json()
      setCart(data.cart || [])
      setTotal(data.total || { items: 0, total: 0, totalQuantity: 0 })
    } catch (error: any) {
      console.error('Erreur chargement panier:', error)
      setError(error.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (productId: number, quantity: number) => {
    if (quantity < 0) return
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/cart/update/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      })

      if (response.ok) {
        await fetchCart()
      }
    } catch (error) {
      console.error('Erreur mise à jour:', error)
    }
  }

  const removeItem = async (productId: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/cart/remove/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await fetchCart()
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }

  const clearCart = async () => {
    if (!confirm('Vider votre panier ?')) return
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/cart/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await fetchCart()
      }
    } catch (error) {
      console.error('Erreur vidage panier:', error)
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setShowPaymentModal(true)
  }

  // 🔥 FONCTION HANDLEPAYMENT MODIFIÉE
  const handlePayment = async (method: string) => {
    setIsProcessing(true)
    setPaymentMethod(method)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const userData = localStorage.getItem('user')
      const user = userData ? JSON.parse(userData) : {}

      // 🔥 ÉTAPE 1 : Créer la commande avec /api/v1/orders
      const orderResponse = await fetch('http://localhost:5000/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productIds: cart.map(item => item.id),
          quantities: cart.map(item => item.quantity)
        })
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        throw new Error(errorData.error || 'Erreur lors de la création de la commande')
      }

      const orderData = await orderResponse.json()
      const orderId = orderData.order.id

      // 🔥 ÉTAPE 2 : Créer le paiement avec /api/v1/payments
      const paymentResponse = await fetch('http://localhost:5000/api/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: orderId,
          returnUrl: `${window.location.origin}/payment/success`
        })
      })

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json()
        throw new Error(errorData.error || 'Erreur lors de la création du paiement')
      }

      const paymentData = await paymentResponse.json()

      // 🔥 ÉTAPE 3 : Rediriger vers FedaPay ou page de succès
      if (paymentData.payment?.paymentUrl) {
        window.location.href = paymentData.payment.paymentUrl
      } else {
        router.push(`/payment/success?order=${orderId}`)
      }

    } catch (error: any) {
      console.error('Erreur paiement:', error)
      setError(error.message || 'Erreur lors du paiement')
      alert(error.message || 'Erreur lors du paiement')
    } finally {
      setIsProcessing(false)
      setShowPaymentModal(false)
      setPaymentMethod(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-500">Chargement de votre panier...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-gray-800 mt-4">Une erreur est survenue</h2>
          <p className="text-gray-500">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Votre panier est vide</h2>
          <p className="text-gray-500 mt-2">Découvrez nos produits et commencez vos achats</p>
          <div className="mt-6 space-y-3">
            <Link
              href="/avant"
              className="block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition"
            >
              Découvrir les produits
            </Link>
            <Link
              href="/orders"
              className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
            >
              Voir mes commandes
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/avant"
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl hover:bg-white transition shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              Continuer les achats
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mon panier</h1>
              <p className="text-gray-500">{total.items} produit(s) dans votre panier</p>
            </div>
          </div>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl hover:bg-white transition shadow-sm text-red-600 hover:text-red-700"
            onClick={clearCart}
          >
            <Trash2 className="w-4 h-4" />
            Vider le panier
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des produits */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item, index) => (
              <motion.div
                key={item.id}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50 hover:shadow-md transition"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start gap-4">
                  <img 
                    src={item.image || '/images/placeholder.png'} 
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-lg bg-gray-100"
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder.png'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.price.toLocaleString()} FCFA</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-gray-200 rounded-lg">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 hover:bg-gray-100 rounded-l-lg disabled:opacity-50"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 hover:bg-gray-100 rounded-r-lg"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {(item.price * item.quantity).toLocaleString()} FCFA
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Résumé */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/50 h-fit lg:sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Résumé</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Sous-total ({total.items} articles)</span>
                <span>{total.total.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Livraison</span>
                <span className="text-green-600">Gratuite</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>{total.total.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleCheckout}
                disabled={isProcessing || cart.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Procéder au paiement
                  </>
                )}
              </button>

              <Link
                href="/avant"
                className="block text-center text-sm text-blue-600 hover:text-blue-700"
              >
                Continuer les achats
              </Link>
            </div>

            {/* Sécurité */}
            <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-2 text-sm text-green-700">
              <ShieldCheck className="w-4 h-4" />
              Paiement sécurisé
            </div>
          </div>
        </div>
      </div>

      {/* Modal de paiement */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Choisissez votre méthode de paiement</h3>
            <p className="text-gray-500 mb-6">Montant total: <span className="font-bold text-gray-900">{total.total.toLocaleString()} FCFA</span></p>
            
            <div className="space-y-3">
              <button
                onClick={() => handlePayment('fedapay')}
                disabled={isProcessing}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">FedaPay</p>
                  <p className="text-sm text-gray-500">Mobile Money, Carte bancaire</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handlePayment('whatsapp')}
                disabled={isProcessing}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition"
              >
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">WhatsApp</p>
                  <p className="text-sm text-gray-500">Paiement par message</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <button
              onClick={() => setShowPaymentModal(false)}
              className="mt-4 w-full px-4 py-2 text-gray-500 hover:text-gray-700 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}