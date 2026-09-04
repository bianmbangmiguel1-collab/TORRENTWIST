// context/UserContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface User {
  // Identité
  id: number
  name: string
  email: string
  phone?: string | null
  avatar?: string | null
  bio?: string | null

  // Adresse
  address?: string | null
  city?: string | null
  country?: string | null
  postal_code?: string | null

  // Authentification / rôle
  role: string
  is_admin: boolean
  is_verified: boolean

  // Connexion / sécurité
  last_login?: string | null
  login_attempts?: number
  lock_until?: string | null

  // Profil / personnalisation
  main_goal?: string | null
  interests?: string | null
  experience_level?: string | null
  profile_completeness?: number

  // État du compte
  is_active?: boolean
  is_banned?: boolean
  status?: string | null

  // Dates
  created_at?: string | null
  updated_at?: string | null

  // Statistiques utilisateur
  total_orders?: number
  total_purchases?: number
  total_spent?: number
  total_reviews?: number

  // Informations commerciales
  customer_code?: string | null
  referral_code?: string | null
  referred_by?: number | null

  // Préférences
  language?: string | null
  currency?: string | null
  timezone?: string | null

  // Notifications
  email_notifications?: boolean
  push_notifications?: boolean
  whatsapp_notifications?: boolean

  // Réseaux sociaux
  facebook_id?: string | null
  google_id?: string | null

  // Boutique / vendeur
  shop_name?: string | null
  shop_slug?: string | null
  shop_description?: string | null
  shop_logo?: string | null

  // Métadonnées
  metadata?: Record<string, unknown> | null
}

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  loading: boolean
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const fetchRef = useRef(false)

  // 1. Marquer le composant comme monté
  useEffect(() => {
    setMounted(true)
  }, [])

  // 2. 🔥 Fonction de récupération de l'utilisateur (CORRIGÉE)
  const fetchUser = useCallback(async (): Promise<void> => {
    // Éviter les appels multiples simultanés
    if (fetchRef.current) return
    fetchRef.current = true

    try {
      console.log('🔍 Vérification de l\'authentification...')
      
      // 🔥 Utiliser l'URL complète avec credentials: 'include'
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      console.log('📊 Status /api/auth/me:', res.status)

      // 🔥 Gestion des différents statuts
      if (res.status === 401) {
        console.log('❌ Non authentifié')
        setUser(null)
        localStorage.removeItem('user')
        return
      }

      if (!res.ok) {
        throw new Error(`Erreur HTTP ${res.status}`)
      }

      const data = await res.json()
      console.log('✅ Réponse /api/auth/me:', data)

      if (data.success && data.user) {
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
        console.log('✅ Utilisateur authentifié:', data.user.email)
      } else {
        console.log('❌ Données utilisateur manquantes')
        setUser(null)
        localStorage.removeItem('user')
      }
    } catch (error) {
      console.error('❌ Erreur fetchUser:', error)
      setUser(null)
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
      fetchRef.current = false
    }
  }, [])

  // 3. Rafraîchir l'utilisateur
  const refreshUser = useCallback(async (): Promise<void> => {
    setLoading(true)
    await fetchUser()
  }, [fetchUser])

  // 4. 🔥 Connexion
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    console.log('🔑 Tentative de connexion...')
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // 🔥 Important
      body: JSON.stringify({ email, password }),
    })

    console.log('📊 Status /api/auth/login:', response.status)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || error.message || 'Erreur de connexion')
    }

    const data = await response.json()
    console.log('✅ Connexion réussie:', data.user?.email)

    if (data.user) {
      setUser(data.user)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard')
    } else {
      throw new Error('Données utilisateur manquantes')
    }
  }, [router])

  // 5. 🔥 Déconnexion
  const logout = useCallback(async (): Promise<void> => {
    console.log('🚪 Déconnexion...')
    
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      })
      console.log('✅ Déconnexion réussie')
    } catch (e) {
      console.warn('⚠️ Erreur logout:', e)
    } finally {
      localStorage.removeItem('user')
      localStorage.removeItem('dashboardStats')
      localStorage.removeItem('token')
      setUser(null)
      router.push('/login')
    }
  }, [router])

  // 6. Chargement initial – seulement après montage
  useEffect(() => {
    if (!mounted) return

    // Charger depuis le cache pour un affichage instantané
    const cachedUser = localStorage.getItem('user')
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser)
        setUser(parsed)
        console.log('📦 Utilisateur chargé depuis le cache')
      } catch {
        localStorage.removeItem('user')
      }
    }

    // Vérifier l'authentification auprès du serveur
    fetchUser()
  }, [mounted, fetchUser])

  // 7. Valeur du contexte
  const value: UserContextType = {
    user,
    setUser,
    loading,
    refreshUser,
    logout,
    isAuthenticated: !!user,
    login,
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextType {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}