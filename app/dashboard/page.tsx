// app/dashboard/page.tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ShoppingBag,
  Heart,
  Star,
  Clock,
  AlertCircle,
  Sparkles,
  Wallet,
  Award,
  Eye,
  ChevronRight,
  Plus,
  TrendingUp,
  Zap,
  User,
  LogOut,
  Settings,
  Package,
  RefreshCw,
  Search,
  Grid3x3,
  List,
  ArrowUpRight,
  Activity,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Loader2,
  Bell,
  Mail,
  CreditCard,
  Download,
  FileText,
  Home,
  BarChart,
  Layers,
  Trash2,
  Minus,
  Plus as PlusIcon,
  Truck,
  FileCheck,
  ShieldCheck,
  Crown,
  Gift,
  Flame,
  Tag,
  Menu,
  X,
  ChevronDown,
  Filter,
  Calendar,
  DollarSign,
  BellRing,
  BellOff,
  EyeOff,
  MessageCircle,
  ThumbsUp,
  Share2,
  Bookmark,
  Clock as ClockIcon,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Copy,
  Check,
  AlertTriangle,
  Info,
  HelpCircle,
  LifeBuoy,
  StarHalf,
  Star as StarIcon
} from 'lucide-react'

import { useUser } from '@/context/UserContext'
import AppHeader from '@/components/AppHeader'

// ============================================================
// TYPES
// ============================================================

interface Product {
  id: number
  title: string
  slug: string
  description: string
  price: number
  compare_price?: number
  avg_rating?: number
  sales: number
  badge?: string
  image: string
  category: string
  is_new?: boolean
  is_featured?: boolean
}

interface CartItem {
  id: number
  product_id: number
  title: string
  price: number
  quantity: number
  image?: string
  total: number
}

interface UserStats {
  total_purchases: number
  total_spent: number
  total_favorites: number
  total_reviews: number
  total_views: number
  total_clicks: number
  engagement_score: number
  cart_items: number
  pending_orders: number
  completed_orders: number
  level: number
  next_level_progress: number
}

interface OrderItem {
  product_id: number
  title: string
  quantity: number
  price: number
  total: number
}

interface Order {
  id: number
  order_number: string
  total: number
  subtotal: number
  status: string
  payment_status: string
  payment_method: string
  created_at: string
  updated_at: string
  products: OrderItem[]
  product_title: string
  download_url?: string
  invoice_url?: string
}

interface Activity {
  id: number
  action_type: string
  product_id?: number
  product_title?: string
  created_at: string
  metadata?: any
}

interface Notification {
  id: number
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  link?: string
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: userLoading, isAuthenticated, logout } = useUser()
  
  // 🔥 Refs pour éviter les appels multiples
  const hasLoaded = useRef(false)
  const isFetching = useRef(false)
  const mounted = useRef(true)
  
  // États principaux
  const [stats, setStats] = useState<UserStats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [favorites, setFavorites] = useState<Product[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [greeting, setGreeting] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  
  // États de chargement
  const [dataLoading, setDataLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [cartLoading, setCartLoading] = useState(false)
  
  // États UI
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'cart' | 'favorites'>('overview')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)

  // ============================================================
  // SALUTATION, HEURE ET DATE
  // ============================================================
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Bonjour')
    else if (hour < 18) setGreeting('Bon après-midi')
    else setGreeting('Bonsoir')

    const updateDateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      }))
      setCurrentDate(now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }))
    }
    updateDateTime()
    const interval = setInterval(updateDateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // ============================================================
  // REDIRECTION SI NON AUTHENTIFIÉ
  // ============================================================
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [userLoading, isAuthenticated, router])

  // ============================================================
  // TÉLÉCHARGEMENT DU PRODUIT
  // ============================================================
  const handleDownload = async (orderId: number, downloadUrl: string, productTitle: string) => {
    if (!downloadUrl) {
      addNotification('error', '❌ Fichier non disponible', 'Aucun fichier disponible pour ce produit')
      return
    }

    setDownloading(orderId)

    try {
      const response = await fetch(`/api/orders/download/${orderId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors du téléchargement')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `${productTitle || 'produit'}.zip`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) filename = match[1]
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      addNotification('success', '✅ Téléchargement réussi', `Le fichier ${filename} a été téléchargé avec succès.`)

    } catch (err: any) {
      console.error('❌ Erreur téléchargement:', err)
      addNotification('error', '❌ Échec du téléchargement', err.message || 'Erreur lors du téléchargement du fichier')
    } finally {
      setDownloading(null)
    }
  }

  // ============================================================
  // GESTION DES NOTIFICATIONS
  // ============================================================
  const addNotification = useCallback((type: string, title: string, message: string) => {
    setNotifications(prev => [{
      id: Date.now(),
      type,
      title,
      message,
      read: false,
      created_at: new Date().toISOString()
    }, ...prev])
  }, [])

  // ============================================================
  // GESTION DU PANIER
  // ============================================================
  const loadCart = useCallback(async () => {
    try {
      const response = await fetch('/api/cart', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setCartItems(data.items || [])
      }
    } catch (err) {
      console.error('❌ Erreur chargement panier:', err)
    }
  }, [])

  const updateCartQuantity = async (productId: number, quantity: number) => {
    setCartLoading(true)
    try {
      const response = await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId, quantity })
      })
      if (response.ok) {
        await loadCart()
      }
    } catch (err) {
      console.error('❌ Erreur mise à jour panier:', err)
    } finally {
      setCartLoading(false)
    }
  }

  const removeFromCart = async (productId: number) => {
    setCartLoading(true)
    try {
      const response = await fetch('/api/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId })
      })
      if (response.ok) {
        await loadCart()
        addNotification('info', '🗑️ Produit retiré', 'Le produit a été retiré de votre panier')
      }
    } catch (err) {
      console.error('❌ Erreur suppression panier:', err)
    } finally {
      setCartLoading(false)
    }
  }

  const clearCart = async () => {
    setCartLoading(true)
    try {
      const response = await fetch('/api/cart/clear', {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        setCartItems([])
        addNotification('info', '🧹 Panier vidé', 'Votre panier a été vidé avec succès')
      }
    } catch (err) {
      console.error('❌ Erreur vidage panier:', err)
    } finally {
      setCartLoading(false)
    }
  }

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [cartItems])

  const getCartItemCount = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0)
  }, [cartItems])

  // ============================================================
  // 🔥 CHARGEMENT DES DONNÉES - AVEC PROTECTION COMPLÈTE
  // ============================================================
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    // 🔥 Éviter les appels multiples simultanés
    if (isFetching.current && !isRefresh) {
      console.log('⏳ Chargement déjà en cours, ignoré')
      return
    }

    // 🔥 Éviter les rechargements inutiles
    if (!isRefresh && hasLoaded.current) {
      console.log('📦 Données déjà chargées')
      return
    }

    isFetching.current = true

    if (isRefresh) {
      setRefreshing(true)
    }

    console.log('📡 Chargement des données...')

    try {
      // 1. Statistiques
      const statsRes = await fetch('/api/users/stats', { 
        credentials: 'include',
      })
      
      if (statsRes.status === 401) {
        router.push('/login')
        return
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        if (statsData.stats) {
          setStats({
            ...statsData.stats,
            pending_orders: orders.filter(o => o.status === 'pending').length || 0,
            completed_orders: orders.filter(o => o.status === 'completed').length || 0,
            level: Math.floor((statsData.stats.total_spent || 0) / 50000) + 1,
            next_level_progress: ((statsData.stats.total_spent || 0) % 50000) / 50000 * 100
          })
          localStorage.setItem('dashboardStats', JSON.stringify(statsData.stats))
        }
      }

      // 2. Commandes
      const ordersRes = await fetch('/api/orders', { 
        credentials: 'include',
      })
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json()
        if (ordersData.orders) {
          setOrders(ordersData.orders)
        }
      }

      // 3. Panier
      await loadCart()

      // 4. Favoris
      const favRes = await fetch('/api/users/favorites', { 
        credentials: 'include',
      })
      if (favRes.status === 401) {
        setFavorites([])
      } else if (favRes.ok) {
        const favData = await favRes.json()
        if (favData.favorites) {
          setFavorites(favData.favorites)
        }
      }

      // 5. Activités
      const actRes = await fetch('/api/users/activities?limit=5', { 
        credentials: 'include',
      })
      if (actRes.status === 401) {
        setActivities([])
      } else if (actRes.ok) {
        const actData = await actRes.json()
        if (actData.activities) {
          setActivities(actData.activities)
        }
      }

      // 6. Notifications
      try {
        const notifRes = await fetch('/api/notifications?limit=3', { 
          credentials: 'include',
        })
        if (notifRes.ok) {
          const notifData = await notifRes.json()
          if (notifData.notifications) {
            setNotifications(notifData.notifications)
          }
        }
      } catch (e) {
        setNotifications([])
      }

      hasLoaded.current = true
      setError(null)
      setRetryCount(0)
      
    } catch (err: any) {
      console.error('❌ Erreur chargement données dashboard:', err)
      
      if (retryCount < 3 && err.message?.includes('fetch')) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => loadDashboardData(isRefresh), 1000 * (retryCount + 1))
        return
      }
      
      const cachedStats = localStorage.getItem('dashboardStats')
      if (cachedStats) {
        try {
          const parsed = JSON.parse(cachedStats)
          setStats({
            ...parsed,
            pending_orders: orders.filter(o => o.status === 'pending').length || 0,
            completed_orders: orders.filter(o => o.status === 'completed').length || 0,
            level: Math.floor((parsed.total_spent || 0) / 50000) + 1,
            next_level_progress: ((parsed.total_spent || 0) % 50000) / 50000 * 100
          })
          setError('Données en cache - Connexion au serveur instable')
        } catch (e) {
          setError(err.message || 'Impossible de charger les données')
        }
      } else {
        setStats({
          total_purchases: 0,
          total_spent: 0,
          total_favorites: 0,
          total_reviews: 0,
          total_views: 0,
          total_clicks: 0,
          engagement_score: 0,
          cart_items: 0,
          pending_orders: 0,
          completed_orders: 0,
          level: 1,
          next_level_progress: 0
        })
        setError('Mode démo - Connectez-vous pour voir vos données réelles')
      }
    } finally {
      setDataLoading(false)
      isFetching.current = false
      if (isRefresh) {
        setRefreshing(false)
      }
    }
  }, [router, retryCount, orders, loadCart])

  // 🔥 Un seul effet pour charger les données
  useEffect(() => {
    // Attendre que l'utilisateur soit chargé
    if (userLoading) return

    // Vérifier l'authentification
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    // Charger les données une seule fois
    if (!hasLoaded.current && !isFetching.current && mounted.current) {
      loadDashboardData()
    }

    // Cleanup
    return () => {
      mounted.current = false
    }
  }, [userLoading, isAuthenticated, router, loadDashboardData])

  // ============================================================
  // FONCTION POUR NETTOYER LA DESCRIPTION
  // ============================================================
  const stripHtml = (html: string): string => {
    if (!html) return ''
    const stripped = html.replace(/<[^>]*>/g, '')
    const decoded = stripped.replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, '')
    return decoded.length > 100 ? decoded.substring(0, 100) + '...' : decoded
  }

  // ============================================================
  // STATUT DES COMMANDES
  // ============================================================
  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: any }> = {
      'pending': { 
        label: 'En attente', 
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: Clock
      },
      'confirmed': { 
        label: 'Confirmée', 
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: CheckCircle
      },
      'processing': { 
        label: 'En traitement', 
        color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        icon: Truck
      },
      'completed': { 
        label: 'Terminée', 
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: FileCheck
      },
      'cancelled': { 
        label: 'Annulée', 
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: XCircle
      },
      'refunded': { 
        label: 'Remboursée', 
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: XCircle
      }
    }
    const s = map[status] || map['pending']
    const Icon = s.icon
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>
        <Icon className="w-3 h-3" />
        {s.label}
      </span>
    )
  }

  // ============================================================
  // CARTES STATISTIQUES
  // ============================================================
  const statsCards = [
    { 
      icon: ShoppingBag, 
      value: stats?.total_purchases || 0, 
      label: 'Achats',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    { 
      icon: Heart, 
      value: stats?.total_favorites || 0, 
      label: 'Favoris',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600'
    },
    { 
      icon: Star, 
      value: stats?.total_reviews || 0, 
      label: 'Avis',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600'
    },
    { 
      icon: Wallet, 
      value: `${(stats?.total_spent || 0).toLocaleString()} FCFA`, 
      label: 'Dépensé',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    { 
      icon: Award, 
      value: stats?.level || 1, 
      label: 'Niveau',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    { 
      icon: ShoppingCart, 
      value: getCartItemCount() || 0, 
      label: 'Panier',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600'
    },
  ]

  // ============================================================
  // ICÔNE POUR ACTIVITÉS
  // ============================================================
  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'view':
        return <Eye size={16} className="text-blue-500" />
      case 'purchase':
        return <ShoppingBag size={16} className="text-green-500" />
      case 'favorite_add':
        return <Heart size={16} className="text-red-500" />
      case 'cart_add':
        return <Plus size={16} className="text-purple-500" />
      default:
        return <Zap size={16} className="text-yellow-500" />
    }
  }

  // ============================================================
  // FORMATEUR DE DATE
  // ============================================================
  const formatDate = (date: string) => {
    if (!date) return 'Date inconnue'
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return 'Date invalide'
      const now = new Date()
      const diff = now.getTime() - d.getTime()
      
      if (diff < 60000) return 'À l\'instant'
      if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
      if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Date invalide'
    }
  }

  // ============================================================
  // FILTRAGE DES RECOMMANDATIONS
  // ============================================================
  const filteredRecommendations = Array.isArray(recommendations) 
    ? recommendations.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      )
    : []

  // ============================================================
  // AFFICHAGE DES DÉTAILS D'UNE COMMANDE
  // ============================================================
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
  }

  // ============================================================
  // ÉTATS DE CHARGEMENT
  // ============================================================
  if (userLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-500 font-medium">Chargement de votre espace...</p>
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Erreur de chargement</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <div className="mt-6 space-y-3">
            <button 
              onClick={() => {
                setRetryCount(0)
                setDataLoading(true)
                hasLoaded.current = false
                loadDashboardData()
              }}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Réessayer
            </button>
            <button 
              onClick={() => {
                localStorage.clear()
                router.push('/login')
              }}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              Se reconnecter
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // RENDU PRINCIPAL - VERSION COMPLÈTE
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ============================================================
            EN-TÊTE AVEC SALUTATION
        ============================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span>{greeting}</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                {user?.name || 'Utilisateur'}
              </span>
              <span className="text-sm font-normal text-gray-400">👋</span>
            </h1>
            <p className="text-gray-500 flex items-center gap-2 mt-1">
              <ClockIcon className="w-4 h-4" />
              {currentTime} • {currentDate}
            </p>
            {error && (
              <p className="text-sm text-amber-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Niveau */}
            {stats?.level && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-amber-700">Niveau {stats.level}</span>
                <div className="w-20 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                    style={{ width: `${Math.min(stats.next_level_progress || 0, 100)}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => {
                hasLoaded.current = false
                loadDashboardData(true)
              }}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50 text-sm font-medium text-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Chargement...' : 'Rafraîchir'}
            </button>

            {/* Bouton Panier */}
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {getCartItemCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {getCartItemCount()}
                </span>
              )}
            </button>

            {/* Bouton Notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-700"
            >
              <Settings className="w-4 h-4" />
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>

        {/* ============================================================
            NOTIFICATIONS POPUP
        ============================================================ */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 mb-6"
            >
              {/* Contenu des notifications - inchangé */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  Notifications
                </h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              {notifications.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Aucune notification</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div key={notif.id} className={`p-3 rounded-lg ${notif.read ? 'bg-gray-50' : 'bg-blue-50'}`}>
                      <p className="font-medium text-gray-900 text-sm">{notif.title}</p>
                      <p className="text-gray-600 text-sm">{notif.message}</p>
                      <span className="text-xs text-gray-400">{formatDate(notif.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================
            PANIER POPUP
        ============================================================ */}
        <AnimatePresence>
          {showCart && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 mb-6"
            >
              {/* Contenu du panier - inchangé */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  Mon panier ({getCartItemCount()} articles)
                </h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Votre panier est vide</p>
                  <Link href="/products" className="text-sm text-blue-600 hover:underline">
                    Découvrir les produits
                  </Link>
                </div>
              ) : (
                <>
                  {/* Contenu du panier - inchangé */}
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <img
                          src={item.image || '/images/placeholder.png'}
                          alt={item.title}
                          className="w-12 h-12 object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.src = '/images/placeholder.png'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{item.title}</p>
                          <p className="text-sm text-blue-600 font-bold">{item.price.toLocaleString()} FCFA</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateCartQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                            disabled={cartLoading}
                            className="p-1 hover:bg-gray-200 rounded transition disabled:opacity-50"
                          >
                            <Minus className="w-4 h-4 text-gray-500" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                            disabled={cartLoading}
                            className="p-1 hover:bg-gray-200 rounded transition disabled:opacity-50"
                          >
                            <PlusIcon className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product_id)}
                            disabled={cartLoading}
                            className="p-1 hover:bg-red-100 rounded transition ml-1 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-blue-600">{getCartTotal().toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={clearCart}
                        disabled={cartLoading}
                        className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition font-medium disabled:opacity-50"
                      >
                        Vider
                      </button>
                      <Link
                        href="/checkout"
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-medium text-center"
                      >
                        Commander
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================
            STATISTIQUES
        ============================================================ */}
        <section className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {statsCards.map((stat, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <div className={`p-2 rounded-lg ${stat.bgColor} w-fit`}>
                  <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                </div>
                <p className="text-xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ============================================================
            ONGLETS
        ============================================================ */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium text-sm transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Aperçu
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 font-medium text-sm transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="w-4 h-4" />
            Mes commandes
            {orders.filter(o => o.status === 'pending').length > 0 && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                {orders.filter(o => o.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('cart')}
            className={`px-4 py-2 font-medium text-sm transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'cart'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Panier
            {getCartItemCount() > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                {getCartItemCount()}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 font-medium text-sm transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'favorites'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Heart className="w-4 h-4" />
            Favoris
            {favorites.length > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                {favorites.length}
              </span>
            )}
          </button>
        </div>

        {/* ============================================================
            CONTENU - ONGLET APERÇU
        ============================================================ */}
        {activeTab === 'overview' && (
          <>
            {/* Recommandations */}
            <section className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Recommandé pour vous</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Rechercher..."
                      className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-40 sm:w-56 text-gray-900"
                    />
                  </div>
                  <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-400'}`}
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-400'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  <Link href="/products" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    Voir tout
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {filteredRecommendations.length > 0 ? (
                <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
                  {filteredRecommendations.slice(0, 4).map((product, index) => {
                    const cleanDescription = stripHtml(product.description || '')

                    return (
                      <motion.div
                        key={product.id}
                        className={`bg-white rounded-xl border border-gray-200 hover:shadow-lg transition group cursor-pointer ${
                          viewMode === 'list' ? 'flex items-center gap-4 p-4' : 'overflow-hidden'
                        }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ y: -4 }}
                        onClick={() => router.push(`/product/${product.slug}`)}
                      >
                        {/* Contenu des recommandations - inchangé */}
                        {viewMode === 'grid' ? (
                          <>
                            <div className="relative h-48 bg-gray-100 overflow-hidden">
                              <img
                                src={product.image || '/images/placeholder.png'}
                                alt={product.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                onError={(e) => {
                                  e.currentTarget.src = '/images/placeholder.png'
                                }}
                              />
                              {product.is_new && (
                                <span className="absolute top-3 left-3 px-2 py-1 text-xs font-bold bg-blue-500 text-white rounded-lg">
                                  Nouveau
                                </span>
                              )}
                              {product.compare_price && (
                                <span className="absolute top-3 right-3 px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-lg">
                                  -{Math.round((1 - product.price / product.compare_price) * 100)}%
                                </span>
                              )}
                              {product.badge && (
                                <span className={`absolute bottom-3 left-3 px-2 py-1 text-xs font-bold rounded-lg ${
                                  product.badge === 'Promo' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                                }`}>
                                  {product.badge}
                                </span>
                              )}
                            </div>
                            <div className="p-4">
                              <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
                              <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                                {cleanDescription}
                              </p>
                              <div className="flex items-center justify-between mt-3">
                                <div>
                                  {product.compare_price && (
                                    <span className="text-sm text-gray-400 line-through mr-2">
                                      {product.compare_price.toLocaleString()} FCFA
                                    </span>
                                  )}
                                  <span className="font-bold text-blue-600">
                                    {product.price.toLocaleString()} FCFA
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  {product.avg_rating || 0}
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <img
                              src={product.image || '/images/placeholder.png'}
                              alt={product.title}
                              className="w-20 h-20 object-cover rounded-lg"
                              onError={(e) => {
                                e.currentTarget.src = '/images/placeholder.png'
                              }}
                            />
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{product.title}</h3>
                              <p className="text-sm text-gray-500 line-clamp-1">{cleanDescription}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-bold text-blue-600">
                                  {product.price.toLocaleString()} FCFA
                                </span>
                                {product.compare_price && (
                                  <span className="text-sm text-gray-400 line-through">
                                    {product.compare_price.toLocaleString()} FCFA
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
                          </>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600">Aucune recommandation</h3>
                  <p className="text-gray-400 mt-1">Découvrez notre catalogue pour trouver des produits</p>
                  <Link
                    href="/products"
                    className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-medium"
                  >
                    Explorer le catalogue
                  </Link>
                </div>
              )}
            </section>

            {/* Grille Favoris + Activités */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Favoris */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    <h2 className="text-lg font-bold text-gray-900">Favoris</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('favorites')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    Voir tout
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {favorites.length > 0 ? (
                  <div className="space-y-2">
                    {favorites.slice(0, 3).map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-200 hover:shadow-md transition cursor-pointer"
                        onClick={() => router.push(`/product/${product.slug}`)}
                      >
                        <img
                          src={product.image || '/images/placeholder.png'}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.src = '/images/placeholder.png'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{product.title}</p>
                          <p className="text-sm text-blue-600 font-bold">{product.price.toLocaleString()} FCFA</p>
                        </div>
                        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <Heart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Aucun favori</p>
                    <Link href="/products" className="text-sm text-blue-600 hover:underline">
                      Découvrir des produits
                    </Link>
                  </div>
                )}
              </section>

              {/* Activités */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-bold text-gray-900">Activités récentes</h2>
                </div>
                {activities.length > 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          {getActivityIcon(activity.action_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700">
                            {activity.action_type === 'view' && `Vous avez consulté "${activity.product_title || 'un produit'}"`}
                            {activity.action_type === 'purchase' && `Vous avez acheté "${activity.product_title || 'un produit'}"`}
                            {activity.action_type === 'favorite_add' && `Vous avez ajouté "${activity.product_title || 'un produit'}" aux favoris`}
                            {activity.action_type === 'cart_add' && `Vous avez ajouté "${activity.product_title || 'un produit'}" au panier`}
                          </p>
                          <span className="text-xs text-gray-400">{formatDate(activity.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Aucune activité récente</p>
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {/* ============================================================
            CONTENU - ONGLET COMMANDES
        ============================================================ */}
        {activeTab === 'orders' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                Mes commandes
              </h2>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                  {orders.filter(o => o.status === 'pending').length} en attente
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  {orders.filter(o => o.status === 'completed').length} terminées
                </span>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">Aucune commande</h3>
                <p className="text-gray-400 mt-1">Vous n'avez pas encore passé de commande.</p>
                <Link
                  href="/products"
                  className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-medium"
                >
                  Découvrir les produits
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const products = order.products || []
                  const firstProduct = products[0] || { title: order.product_title || 'Produit' }
                  
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-50 rounded-xl">
                            <Package className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {firstProduct.title || 'Produit'}
                            </p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-xs text-gray-500">
                                #{order.order_number}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {formatDate(order.created_at)}
                              </span>
                              {getStatusBadge(order.status)}
                              <span className="text-xs text-gray-400">
                                {order.payment_status === 'paid' ? '✅ Payée' : '⏳ En attente'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-blue-600">
                            {order.total.toLocaleString()} FCFA
                          </span>

                          {order.status === 'completed' && order.download_url ? (
                            <button
                              onClick={() => handleDownload(order.id, order.download_url!, firstProduct.title)}
                              disabled={downloading === order.id}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl transition text-sm font-medium disabled:opacity-50"
                            >
                              {downloading === order.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Téléchargement...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4" />
                                  Télécharger
                                </>
                              )}
                            </button>
                          ) : order.status === 'pending' ? (
                            <span className="text-xs text-yellow-600 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              En attente
                            </span>
                          ) : order.status === 'cancelled' ? (
                            <span className="text-xs text-red-600 flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              Annulée
                            </span>
                          ) : null}

                          <button
                            onClick={() => handleViewOrder(order)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition rounded-lg hover:bg-blue-50"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {products.length > 1 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex flex-wrap gap-2">
                            {products.slice(1, 4).map((item, idx) => (
                              <span key={idx} className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                                {item.title} × {item.quantity}
                              </span>
                            ))}
                            {products.length > 4 && (
                              <span className="text-xs text-gray-400">
                                +{products.length - 4} autres
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ============================================================
            CONTENU - ONGLET PANIER
        ============================================================ */}
        {activeTab === 'cart' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
                Mon panier
              </h2>
              <span className="text-sm text-gray-500">
                {getCartItemCount()} article{getCartItemCount() > 1 ? 's' : ''}
              </span>
            </div>

            {cartItems.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">Votre panier est vide</h3>
                <p className="text-gray-400 mt-1">Découvrez nos produits et ajoutez-les à votre panier.</p>
                <Link
                  href="/products"
                  className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-medium"
                >
                  Découvrir les produits
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <img
                        src={item.image || '/images/placeholder.png'}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = '/images/placeholder.png'
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-sm text-blue-600 font-bold">{item.price.toLocaleString()} FCFA</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCartQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                          disabled={cartLoading}
                          className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                        >
                          <Minus className="w-4 h-4 text-gray-500" />
                        </button>
                        <span className="w-10 text-center font-medium text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                          disabled={cartLoading}
                          className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                        >
                          <PlusIcon className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          disabled={cartLoading}
                          className="p-1.5 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-50 ml-1"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total articles</p>
                      <p className="text-lg font-bold text-gray-900">{getCartItemCount()} articles</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="text-2xl font-bold text-blue-600">{getCartTotal().toLocaleString()} FCFA</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <button
                      onClick={clearCart}
                      disabled={cartLoading}
                      className="px-6 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition font-medium disabled:opacity-50"
                    >
                      Vider le panier
                    </button>
                    <Link
                      href="/checkout"
                      className="flex-1 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-medium text-center"
                    >
                      Procéder au paiement
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ============================================================
            CONTENU - ONGLET FAVORIS
        ============================================================ */}
        {activeTab === 'favorites' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-500" />
                Mes favoris
              </h2>
              <span className="text-sm text-gray-500">
                {favorites.length} produit{favorites.length > 1 ? 's' : ''}
              </span>
            </div>

            {favorites.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">Aucun favori</h3>
                <p className="text-gray-400 mt-1">Ajoutez des produits à vos favoris pour les retrouver facilement.</p>
                <Link
                  href="/products"
                  className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-medium"
                >
                  Découvrir les produits
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition cursor-pointer"
                    onClick={() => router.push(`/product/${product.slug}`)}
                  >
                    <div className="relative h-48 bg-gray-100">
                      <img
                        src={product.image || '/images/placeholder.png'}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/images/placeholder.png'
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Retirer des favoris
                        }}
                        className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-red-50 transition"
                      >
                        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                        {stripHtml(product.description || '')}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-bold text-blue-600">
                          {product.price.toLocaleString()} FCFA
                        </span>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {product.avg_rating || 0}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============================================================
            FOOTER
        ============================================================ */}
        <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">
                Connecté en tant que <span className="font-medium text-gray-900">{user?.email}</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                {stats?.total_purchases || 0} commandes
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-red-400" />
                {stats?.total_favorites || 0} favoris
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400" />
                {stats?.total_reviews || 0} avis
              </span>
              <span className="flex items-center gap-1">
                <ShoppingCart className="w-4 h-4 text-blue-400" />
                {getCartItemCount()} panier
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/settings"
                className="text-sm text-gray-500 hover:text-blue-600 transition font-medium flex items-center gap-1"
              >
                <Settings className="w-4 h-4" />
                Paramètres
              </Link>
              <button
                onClick={logout}
                className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================
          MODAL DÉTAILS COMMANDE
      ============================================================ */}
      <AnimatePresence>
        {showOrderModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowOrderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Commande #{selectedOrder.order_number}
                  </h2>
                  <p className="text-sm text-gray-500">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-wrap gap-3 mb-6">
                {getStatusBadge(selectedOrder.status)}
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {selectedOrder.payment_status === 'paid' ? '✅ Payée' : '⏳ En attente'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {selectedOrder.payment_method === 'fedapay' ? '💳 FedaPay' : '💳 Autre'}
                </span>
              </div>

              {selectedOrder.products && selectedOrder.products.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Articles</h3>
                  <div className="space-y-2">
                    {selectedOrder.products.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{item.title}</p>
                          <p className="text-sm text-gray-500">× {item.quantity}</p>
                        </div>
                        <p className="font-bold text-gray-900">{item.total.toLocaleString()} FCFA</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sous-total</span>
                  <span>{selectedOrder.subtotal.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-blue-600">{selectedOrder.total.toLocaleString()} FCFA</span>
                </div>
              </div>

              {selectedOrder.status === 'completed' && selectedOrder.download_url && (
                <div className="mt-6">
                  <button
                    onClick={() => {
                      handleDownload(selectedOrder.id, selectedOrder.download_url!, selectedOrder.products?.[0]?.title || 'Produit')
                    }}
                    disabled={downloading === selectedOrder.id}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-medium transition disabled:opacity-50"
                  >
                    {downloading === selectedOrder.id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Téléchargement...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Télécharger le produit
                      </>
                    )}
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowOrderModal(false)}
                className="w-full mt-4 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}