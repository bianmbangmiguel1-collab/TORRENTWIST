// components/AppHeader.tsx
'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useUser } from '@/context/UserContext'
import {
  Menu,
  X,
  Search,
  ChevronDown,
  LogOut,
  Home,
  BarChart,
  ShoppingBag,
  Heart,
  Bell,
  Settings,
  Shield,
  FileText,
  Users,
  MessageCircle,
} from 'lucide-react'

// ============================================================
// LIENS DE NAVIGATION (définis en dehors du composant)
// ============================================================
const NAV_LINKS = [
  { icon: Home, label: 'Accueil', href: '/avant' },
  { icon: BarChart, label: 'Dashboard', href: '/dashboard' },
  { icon: ShoppingBag, label: 'Commandes', href: '/orders' },
  { icon: Heart, label: 'Favoris', href: '/favorites' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
  { icon: Settings, label: 'Paramètres', href: '/settings' },
  { icon: Shield, label: 'Sécurité', href: '/security' },
  { icon: FileText, label: 'Factures', href: '/invoices' },
  { icon: Users, label: 'Parrainage', href: '/referral' },
  { icon: MessageCircle, label: 'Support', href: '/support' },
]

export default function AppHeader() {
  const router = useRouter()
  const { user, logout } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // ============================================================
  // GESTION DE LA RECHERCHE
  // ============================================================
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (searchQuery.trim()) {
        router.push(`/products?search=${encodeURIComponent(searchQuery)}`)
      }
    },
    [searchQuery, router]
  )

  // ============================================================
  // SALUTATION (mémorisée)
  // ============================================================
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bonjour'
    if (hour < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }, [])

  // ============================================================
  // AVATAR – CORRECTION : utilisation directe du chemin stocké
  // ============================================================
  // AVANT (avec localhost:5000) :
  // const displayAvatar = user?.avatar
  //   ? user.avatar.startsWith('http')
  //     ? user.avatar
  //     : `http://localhost:5000${user.avatar}`
  //   : null
  //
  // APRÈS : l'avatar est servi par Next.js via public/uploads/avatars/
  const displayAvatar = user?.avatar || null

  // ============================================================
  // NOM D'UTILISATEUR (prénom ou fallback)
  // ============================================================
  const userName = useMemo(() => {
    if (!user?.name) return 'Utilisateur'
    return user.name.split(' ')[0]
  }, [user?.name])

  // ============================================================
  // PREMIÈRE LETTRE POUR L'AVATAR PAR DÉFAUT
  // ============================================================
  const avatarLetter = useMemo(() => {
    return user?.name?.charAt(0) || 'U'
  }, [user?.name])

  // ============================================================
  // NAVIGATION
  // ============================================================
  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href)
      setMobileMenuOpen(false)
    },
    [router]
  )

  // ============================================================
  // DÉCONNEXION
  // ============================================================
  const handleLogout = useCallback(async () => {
    await logout()
  }, [logout])

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <>
      <nav className="main-nav">
        <div className="nav-container">
          {/* -------- GAUCHE : Logo + menu mobile -------- */}
          <div className="nav-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={24} />
            </button>
            <a href="/" className="nav-logo">
              <div className="logo-container">
                <Image
                  src="/torrent.png"
                  alt="TorrentTwist"
                  width={36}
                  height={36}
                  className="logo-image"
                  priority
                />
              </div>
              <span className="logo-text">TorrentTwist</span>
            </a>
          </div>

          {/* -------- CENTRE : Barre de recherche -------- */}
          <div className="nav-center">
            <form className="search-form" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                aria-label="Rechercher"
              />
              <button type="submit" className="search-btn" aria-label="Lancer la recherche">
                <Search size={20} />
              </button>
            </form>
          </div>

          {/* -------- DROITE : Utilisateur + Déconnexion -------- */}
          <div className="nav-right">
            <div className="nav-user" onClick={() => router.push('/profile')}>
              <div className="nav-avatar">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={user?.name || 'Avatar'}
                    className="nav-avatar-img"
                    loading="lazy"
                  />
                ) : (
                  avatarLetter
                )}
              </div>
              <div className="nav-user-info">
                <span className="nav-greeting">{greeting},</span>
                <span className="nav-username">{userName}</span>
              </div>
              <ChevronDown size={16} className="nav-chevron" />
            </div>
            <button
              className="nav-logout"
              onClick={handleLogout}
              aria-label="Déconnexion"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* -------- SOUS-NAVIGATION (liens rapides) -------- */}
        <div className="nav-sub">
          <div className="nav-sub-container">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="nav-sub-link"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavigation(link.href)
                }}
              >
                <link.icon size={16} />
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* -------- MENU MOBILE -------- */}
      <div className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-header">
          <div className="mobile-nav-user">
            <div className="mobile-nav-avatar">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={user?.name || 'Avatar'}
                  className="mobile-nav-avatar-img"
                  loading="lazy"
                />
              ) : (
                avatarLetter
              )}
            </div>
            <div>
              <span className="mobile-nav-name">{user?.name || 'Utilisateur'}</span>
              <span className="mobile-nav-email">{user?.email}</span>
            </div>
          </div>
          <button
            className="mobile-nav-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fermer le menu"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mobile-nav-links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="mobile-nav-link"
              onClick={(e) => {
                e.preventDefault()
                handleNavigation(link.href)
              }}
            >
              <link.icon size={20} />
              <span>{link.label}</span>
            </a>
          ))}
          <button className="mobile-nav-logout" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* ============================================================
        STYLES
      ============================================================ */}
      <style jsx>{`
        .main-nav {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .nav-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: #1a1a2e;
          cursor: pointer;
          padding: 4px;
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .logo-container {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .logo-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a2e;
          letter-spacing: -0.5px;
        }

        .nav-center {
          flex: 1;
          max-width: 600px;
        }

        .search-form {
          display: flex;
          align-items: center;
          background: #f1f5f9;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .search-form:focus-within {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.04);
        }

        .search-input {
          flex: 1;
          padding: 10px 16px;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          color: #1a1a2e;
        }

        .search-input::placeholder {
          color: #94a3b8;
        }

        .search-btn {
          padding: 10px 16px;
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          transition: color 0.3s ease;
        }

        .search-btn:hover {
          color: #2563eb;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .nav-user {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          padding: 6px 12px 6px 6px;
          border-radius: 12px;
          transition: background 0.3s ease;
        }

        .nav-user:hover {
          background: #f1f5f9;
        }

        .nav-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          font-weight: 600;
          overflow: hidden;
          flex-shrink: 0;
        }

        .nav-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .nav-user-info {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .nav-greeting {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 400;
        }

        .nav-username {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a2e;
        }

        .nav-chevron {
          color: #94a3b8;
        }

        .nav-logout {
          padding: 8px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .nav-logout:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        .nav-sub {
          border-top: 1px solid #f1f5f9;
          padding: 0 24px;
        }

        .nav-sub-container {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          gap: 4px;
          overflow-x: auto;
          padding: 6px 0;
        }

        .nav-sub-container::-webkit-scrollbar {
          height: 0;
        }

        .nav-sub-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          color: #64748b;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.3s ease;
          white-space: nowrap;
          cursor: pointer;
        }

        .nav-sub-link:hover {
          background: #f1f5f9;
          color: #2563eb;
        }

        .mobile-nav {
          position: fixed;
          top: 0;
          left: 0;
          width: 300px;
          height: 100vh;
          background: #ffffff;
          z-index: 101;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          padding: 24px;
          overflow-y: auto;
        }

        .mobile-nav.open {
          transform: translateX(0);
        }

        .mobile-nav-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 20px;
          border-bottom: 1px solid #f1f5f9;
        }

        .mobile-nav-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mobile-nav-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          font-weight: 600;
          overflow: hidden;
          flex-shrink: 0;
        }

        .mobile-nav-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .mobile-nav-name {
          display: block;
          font-weight: 600;
          color: #1a1a2e;
        }

        .mobile-nav-email {
          display: block;
          font-size: 13px;
          color: #94a3b8;
        }

        .mobile-nav-close {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
        }

        .mobile-nav-links {
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          color: #1a1a2e;
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          transition: background 0.3s ease;
          cursor: pointer;
        }

        .mobile-nav-link:hover {
          background: #f1f5f9;
        }

        .mobile-nav-logout {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          margin-top: 8px;
          border: none;
          background: none;
          color: #ef4444;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 10px;
          transition: background 0.3s ease;
          width: 100%;
        }

        .mobile-nav-logout:hover {
          background: #fee2e2;
        }

        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block;
          }

          .nav-center {
            display: none;
          }

          .nav-user-info {
            display: none;
          }

          .nav-chevron {
            display: none;
          }

          .nav-sub {
            display: none;
          }

          .nav-right .nav-logout {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .logo-text {
            font-size: 16px;
          }

          .nav-container {
            padding: 10px 16px;
          }
        }
      `}</style>
    </>
  )
}