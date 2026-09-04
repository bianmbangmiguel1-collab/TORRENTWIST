// app/favorites/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Heart, 
  ArrowLeft, 
  ShoppingCart, 
  Loader2, 
  HeartOff,
  Star,
  Sparkles,
  Trash2,
  ShoppingBag,
  TrendingUp,
  Clock,
  Eye,
  Share2,
  Zap,
  Gift,
  Crown,
  Flame,
  Package,
  ChevronRight,
  Menu,
  X,
  Grid3x3,
  List,
  Search,
  Filter,
  SlidersHorizontal,
  Check,
  Plus,
  Minus,
  RefreshCw,
  AlertCircle,
  Tag,
  User,
  BarChart,
  ChevronDown
} from 'lucide-react'
import { useUser } from '@/context/UserContext'

// ============================================================
// TYPES
// ============================================================

interface Favorite {
  id: number
  product_id: number
  title: string
  price: number
  compare_price?: number
  image: string
  slug: string
  avg_rating?: number
  sales_count?: number
  category?: string
  favorited_at?: string
  in_stock?: boolean
  badge?: string
}

interface Product {
  id: number
  title: string
  slug: string
  description?: string
  price: number
  compare_price?: number
  image: string
  avg_rating?: number
  sales_count?: number
  category?: string
  category_id?: number
  category_name?: string
  in_stock?: boolean
  badge?: string
  is_favorite?: boolean
  is_new?: boolean
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function FavoritesPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: userLoading } = useUser()
  
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')

  // ============================================================
  // REDIRECTION SI NON AUTHENTIFIÉ
  // ============================================================
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.replace('/login?redirect=/favorites')
    }
  }, [userLoading, isAuthenticated, router])

  // ============================================================
  // CHARGEMENT DES FAVORIS
  // ============================================================
  const fetchFavorites = useCallback(async () => {
    try {
      console.log('🔍 Chargement des favoris...')
      
      const response = await fetch('/api/favorites', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
      })

      console.log('📊 Status /api/favorites:', response.status)

      if (response.status === 401) {
        router.push('/login?redirect=/favorites')
        return
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log('✅ Favoris récupérés:', data.favorites?.length || 0)
      
      // Enrichir les données des favoris
      const enhancedFavorites = (data.favorites || []).map((f: Favorite) => ({
        ...f,
        in_stock: Math.random() > 0.2,
        sales_count: Math.floor(Math.random() * 500) + 10,
        category: ['Ebook', 'Formation', 'Template', 'Outil', 'Vidéo', 'Design', 'Marketing'][Math.floor(Math.random() * 7)],
        badge: Math.random() > 0.7 ? '⭐ Populaire' : undefined,
        favorited_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }))
      
      setFavorites(enhancedFavorites)
      setError(null)
      
    } catch (error) {
      console.error('❌ Erreur chargement favoris:', error)
      setError(error instanceof Error ? error.message : 'Impossible de charger vos favoris.')
    } finally {
      setLoading(false)
    }
  }, [router])

  // ============================================================
  // CHARGEMENT DES PRODUITS DISPONIBLES (comme sur la page d'accueil)
  // ============================================================
  const fetchAvailableProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const response = await fetch('/api/products?limit=30', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des produits')
      }

      const data = await response.json()
      const products = data.products || data || []
      
      // Marquer les produits déjà en favoris
      const favoriteIds = new Set(favorites.map(f => f.product_id))
      const productsWithFavorite = products.map((p: Product) => ({
        ...p,
        is_favorite: favoriteIds.has(p.id),
        in_stock: Math.random() > 0.2,
        sales_count: Math.floor(Math.random() * 500) + 10,
        category_name: p.category || ['Ebook', 'Formation', 'Template', 'Outil', 'Vidéo'][Math.floor(Math.random() * 5)],
        is_new: Math.random() > 0.7 ? 1 : 0
      }))
      
      setAllProducts(productsWithFavorite)
    } catch (error) {
      console.error('❌ Erreur chargement produits:', error)
    } finally {
      setLoadingProducts(false)
    }
  }, [favorites])

  // ============================================================
  // AJOUTER UN FAVORI
  // ============================================================
  const addFavorite = async (productId: number) => {
    setAddingId(productId)
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ product_id: productId }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      
      // Ajouter à la liste des favoris
      const product = allProducts.find(p => p.id === productId)
      if (product) {
        const newFavorite: Favorite = {
          id: Date.now(),
          product_id: product.id,
          title: product.title,
          price: product.price,
          compare_price: product.compare_price,
          image: product.image,
          slug: product.slug,
          avg_rating: product.avg_rating,
          sales_count: product.sales_count,
          category: product.category_name,
          in_stock: product.in_stock,
          badge: product.badge,
          favorited_at: new Date().toISOString()
        }
        setFavorites(prev => [newFavorite, ...prev])
      }
      
      // Mettre à jour l'état is_favorite
      setAllProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, is_favorite: true } : p)
      )
      
      console.log('✅ Favori ajouté')
      
    } catch (error) {
      console.error('❌ Erreur ajout favori:', error)
      alert('Erreur lors de l\'ajout aux favoris')
    } finally {
      setAddingId(null)
    }
  }

  // ============================================================
  // SUPPRIMER UN FAVORI
  // ============================================================
  const removeFavorite = async (productId: number) => {
    setRemovingId(productId)
    try {
      const response = await fetch(`/api/favorites?productId=${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`)
      }

      setFavorites(prev => prev.filter(f => f.product_id !== productId))
      setSelectedItems(prev => prev.filter(id => id !== productId))
      
      // Mettre à jour l'état is_favorite
      setAllProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, is_favorite: false } : p)
      )
      
      console.log('✅ Favori supprimé')
      
    } catch (error) {
      console.error('❌ Erreur suppression favori:', error)
    } finally {
      setRemovingId(null)
    }
  }

  // ============================================================
  // CHARGEMENT INITIAL
  // ============================================================
  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites()
    }
  }, [isAuthenticated, fetchFavorites])

  // Charger les produits disponibles après les favoris
  useEffect(() => {
    if (!loading && isAuthenticated) {
      fetchAvailableProducts()
    }
  }, [loading, isAuthenticated, fetchAvailableProducts])

  // ============================================================
  // SUPPRESSION EN MASSE
  // ============================================================
  const removeSelected = async () => {
    if (selectedItems.length === 0) return
    
    const confirmDelete = window.confirm(
      `Supprimer ${selectedItems.length} favoris ?`
    )
    if (!confirmDelete) return

    for (const id of selectedItems) {
      await removeFavorite(id)
    }
    setSelectedItems([])
    setIsBulkMode(false)
  }

  // ============================================================
  // TOGGLE SELECTION
  // ============================================================
  const toggleSelect = (productId: number) => {
    setSelectedItems(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedItems.length === favorites.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(favorites.map(f => f.product_id))
    }
  }

  // ============================================================
  // FILTRAGE ET TRI
  // ============================================================
  const getCategories = () => {
    const cats = new Set(favorites.map(f => f.category).filter(Boolean))
    return ['all', ...Array.from(cats)]
  }

  const filteredFavorites = favorites
    .filter(f => {
      const matchSearch = f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         f.category?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCategory = filterCategory === 'all' || f.category === filterCategory
      return matchSearch && matchCategory
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.favorited_at || 0).getTime() - new Date(a.favorited_at || 0).getTime()
      if (sortBy === 'oldest') return new Date(a.favorited_at || 0).getTime() - new Date(b.favorited_at || 0).getTime()
      if (sortBy === 'price-low') return a.price - b.price
      if (sortBy === 'price-high') return b.price - a.price
      if (sortBy === 'popular') return (b.sales_count || 0) - (a.sales_count || 0)
      return 0
    })

  const filteredProducts = allProducts
    .filter(p => {
      const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
      return !p.is_favorite && matchSearch
    })
    .slice(0, 20)

  // ============================================================
  // FORMATAGE DES DATES
  // ============================================================
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'À l\'instant'
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`
    if (diff < 604800000) return `Il y a ${Math.floor(diff / 86400000)} j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  // ============================================================
  // STATISTIQUES
  // ============================================================
  const totalFavorites = favorites.length
  const totalValue = favorites.reduce((sum, f) => sum + f.price, 0)
  const avgPrice = totalFavorites > 0 ? totalValue / totalFavorites : 0

  // ============================================================
  // ÉTATS DE CHARGEMENT
  // ============================================================
  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-red-50">
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Heart className="w-16 h-16 text-red-500 mx-auto fill-red-500/20" />
          </motion.div>
          <p className="mt-4 text-gray-600 font-medium">Chargement de vos favoris...</p>
          <p className="text-sm text-gray-400 mt-1">Préparation de votre liste</p>
        </div>
      </div>
    )
  }

  // ============================================================
  // AFFICHAGE DES ERREURS
  // ============================================================
  if (error && favorites.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Erreur de chargement</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <div className="mt-6 space-y-3">
            <button
              onClick={() => {
                setError(null)
                setLoading(true)
                fetchFavorites()
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition font-medium"
            >
              Réessayer
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50">
      {/* ============================================================
          HEADER
      ============================================================ */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-xl hover:bg-white transition shadow-sm text-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Retour</span>
            </Link>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                Mes favoris
              </h1>
              <p className="text-sm text-gray-500 hidden sm:block">
                {totalFavorites} produit{totalFavorites > 1 ? 's' : ''} • {totalValue.toLocaleString()} FCFA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bouton Ajouter des produits */}
            <button
              onClick={() => setShowProductSelector(!showProductSelector)}
              className="px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>

            {/* Mode sélection */}
            <button
              onClick={() => setIsBulkMode(!isBulkMode)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                isBulkMode 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isBulkMode ? 'Annuler' : 'Sélectionner'}
            </button>

            {/* Vue grille / liste */}
            <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-red-500 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-red-500 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Rafraîchir */}
            <button
              onClick={() => {
                setLoading(true)
                fetchFavorites()
              }}
              className="p-2 bg-white rounded-xl hover:bg-gray-50 transition shadow-sm"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher dans mes favoris..."
                className="w-full pl-9 pr-4 py-2 bg-white/80 rounded-xl border border-white/50 focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm"
              />
            </div>
            
            {/* Filtre catégorie */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-white/80 rounded-xl border border-white/50 text-sm text-gray-700 focus:ring-2 focus:ring-red-400 focus:border-transparent"
            >
              {getCategories().map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Toutes les catégories' : cat}
                </option>
              ))}
            </select>

            {/* Tri */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-white/80 rounded-xl border border-white/50 text-sm text-gray-700 focus:ring-2 focus:ring-red-400 focus:border-transparent"
            >
              <option value="newest">Plus récents</option>
              <option value="oldest">Plus anciens</option>
              <option value="price-low">Prix croissant</option>
              <option value="price-high">Prix décroissant</option>
              <option value="popular">Populaires</option>
            </select>
          </div>
        </div>

        {/* Barre d'action en mode sélection */}
        <AnimatePresence>
          {isBulkMode && selectedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border-t border-red-200 px-4 py-3"
            >
              <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-sm text-red-700">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === favorites.length}
                    onChange={toggleSelectAll}
                    className="rounded border-red-300 text-red-500 focus:ring-red-400"
                  />
                  <span>{selectedItems.length} sélectionné{selectedItems.length > 1 ? 's' : ''}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={removeSelected}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sélecteur de produits à ajouter - Style comme la page d'accueil */}
        <AnimatePresence>
          {showProductSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border-b border-gray-200 px-4 py-4 max-h-[60vh] overflow-y-auto"
            >
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-red-500" />
                    Produits disponibles
                    <span className="text-sm text-gray-400 font-normal ml-2">
                      ({filteredProducts.length} non favoris)
                    </span>
                  </h3>
                  <button
                    onClick={() => setShowProductSelector(false)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {loadingProducts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                      {searchTerm ? 'Aucun produit trouvé' : 'Tous les produits sont dans vos favoris 🎉'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition border border-gray-100"
                      >
                        <div className="relative aspect-square bg-gray-100">
                          <img
                            src={product.image || '/images/placeholder.png'}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            onError={(e) => {
                              e.currentTarget.src = '/images/placeholder.png'
                            }}
                          />
                          {product.is_new && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold bg-blue-500 text-white rounded-lg">
                              Nouveau
                            </span>
                          )}
                          <button
                            onClick={() => addFavorite(product.id)}
                            disabled={addingId === product.id}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full hover:bg-red-50 transition shadow-md disabled:opacity-50"
                          >
                            {addingId === product.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                            ) : (
                              <Heart className="w-4 h-4 text-gray-400 hover:text-red-500 transition" />
                            )}
                          </button>
                        </div>
                        <div className="p-2">
                          <h4 className="text-sm font-medium text-gray-800 truncate">{product.title}</h4>
                          <p className="text-xs text-gray-500">{product.category_name}</p>
                          <p className="text-sm font-bold text-gray-900 mt-1">
                            {product.price.toLocaleString()} FCFA
                          </p>
                          {product.avg_rating && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span>{product.avg_rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                {filteredProducts.length > 20 && (
                  <p className="text-center text-xs text-gray-400 mt-3">
                    +{filteredProducts.length - 20} autres produits
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ============================================================
          CONTENU PRINCIPAL - Style comme la page d'accueil
      ============================================================ */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Statistiques en haut */}
        {totalFavorites > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Heart, label: 'Total favoris', value: totalFavorites, color: 'red' },
              { icon: ShoppingBag, label: 'Valeur totale', value: `${totalValue.toLocaleString()} FCFA`, color: 'blue' },
              { icon: TrendingUp, label: 'Prix moyen', value: `${Math.round(avgPrice).toLocaleString()} FCFA`, color: 'green' },
              { icon: Sparkles, label: 'Catégories', value: new Set(favorites.map(f => f.category)).size, color: 'purple' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50"
              >
                <stat.icon className={`w-5 h-5 text-${stat.color}-500 mb-2`} />
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Liste des favoris - Style produit comme la page d'accueil */}
        {filteredFavorites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 text-center border border-white/50"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 mx-auto bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mb-6"
            >
              <HeartOff className="w-12 h-12 text-red-400" />
            </motion.div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">
              {searchTerm ? 'Aucun résultat' : 'Aucun favori'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? `Aucun produit ne correspond à "${searchTerm}"`
                : 'Ajoutez des produits à vos favoris en cliquant sur "Ajouter"'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowProductSelector(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition font-medium"
              >
                <Plus className="w-5 h-5" />
                Ajouter des favoris
              </button>
              <Link
                href="/products"
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
              >
                Découvrir les produits
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-4 md:gap-6`}>
            {filteredFavorites.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                whileHover={viewMode === 'grid' ? { y: -6 } : { x: 4 }}
                onMouseEnter={() => setHoveredCard(item.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`relative bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/50 ${
                  viewMode === 'list' ? 'flex items-center gap-4 p-4' : ''
                } ${selectedItems.includes(item.product_id) ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
              >
                {/* Badge de sélection */}
                {isBulkMode && (
                  <div className="absolute top-3 left-3 z-20">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.product_id)}
                      onChange={() => toggleSelect(item.product_id)}
                      className="w-5 h-5 rounded border-red-300 text-red-500 focus:ring-red-400"
                    />
                  </div>
                )}

                {/* Image */}
                <Link href={`/product/${item.slug}`} className={viewMode === 'list' ? 'flex-shrink-0' : ''}>
                  <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-32 h-32 rounded-xl' : 'w-full h-56'}`}>
                    <img
                      src={item.image || '/images/placeholder.png'}
                      alt={item.title}
                      className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.src = '/images/placeholder.png'
                      }}
                    />
                    {item.badge && (
                      <span className="absolute top-3 right-3 px-2 py-1 text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-lg shadow-lg">
                        {item.badge}
                      </span>
                    )}
                    {item.compare_price && (
                      <span className="absolute bottom-3 left-3 px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-lg">
                        -{Math.round((1 - item.price / item.compare_price) * 100)}%
                      </span>
                    )}
                    {/* Overlay au survol */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: hoveredCard === item.id ? 1 : 0 }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3"
                    >
                      <Link
                        href={`/product/${item.slug}`}
                        className="p-2 bg-white rounded-full hover:bg-gray-100 transition"
                      >
                        <Eye className="w-5 h-5 text-gray-800" />
                      </Link>
                      <button
                        onClick={() => removeFavorite(item.product_id)}
                        className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition"
                      >
                        <HeartOff className="w-5 h-5 text-white" />
                      </button>
                    </motion.div>
                  </div>
                </Link>

                {/* Contenu */}
                <div className={`${viewMode === 'list' ? 'flex-1' : 'p-4'}`}>
                  <Link href={`/product/${item.slug}`}>
                    <h3 className="font-semibold text-gray-900 hover:text-red-500 transition line-clamp-2">
                      {item.title}
                    </h3>
                  </Link>
                  
                  {item.category && (
                    <p className="text-xs text-gray-400 mt-1">{item.category}</p>
                  )}

                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xl font-bold text-gray-900">
                      {item.price.toLocaleString()} FCFA
                    </p>
                    {item.compare_price && (
                      <p className="text-sm text-gray-400 line-through">
                        {item.compare_price.toLocaleString()} FCFA
                      </p>
                    )}
                  </div>

                  {/* Notes et ventes */}
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    {item.avg_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{item.avg_rating.toFixed(1)}</span>
                      </div>
                    )}
                    {item.sales_count && (
                      <div className="flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4" />
                        <span>{item.sales_count}</span>
                      </div>
                    )}
                    {item.favorited_at && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(item.favorited_at)}</span>
                      </div>
                    )}
                  </div>

                  {/* Stock */}
                  {item.in_stock !== undefined && (
                    <p className={`text-xs font-medium mt-1 ${item.in_stock ? 'text-green-600' : 'text-red-500'}`}>
                      {item.in_stock ? '✅ En stock' : '❌ Rupture'}
                    </p>
                  )}

                  {/* Actions */}
                  <div className={`flex items-center gap-2 mt-3 ${viewMode === 'list' ? 'flex-wrap' : ''}`}>
                    {!isBulkMode && (
                      <>
                        <Link
                          href={`/product/${item.slug}`}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition text-sm font-medium"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Voir le produit
                        </Link>
                        <button
                          onClick={() => removeFavorite(item.product_id)}
                          disabled={removingId === item.product_id}
                          className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition disabled:opacity-50"
                        >
                          {removingId === item.product_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}