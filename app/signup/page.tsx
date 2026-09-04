// app/signup/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link' // ✅ import Link pour éviter le rechargement
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  Sparkles,
  Rocket,
  Shield,
  Zap,
  X,
  ShieldCheck,
  FileText,
  Database,
  UserCheck,
  LockKeyhole,
  Server,
  Phone,
  CreditCard,
  AlertCircle,
  Gift,
  Check,
} from 'lucide-react'

// ============================================================
// PARTICULES DÉTERMINISTES (hors du composant)
// ============================================================
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${(i * 37.17 + 8) % 100}%`,
  top: `${(i * 61.73 + 5) % 100}%`,
  animationDelay: `${(i * 1.37) % 10}s`,
  width: `${2 + ((i * 17) % 4)}px`,
  height: `${2 + ((i * 23) % 4)}px`,
}))

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState(0)

  // Vérifier la force du mot de passe
  useEffect(() => {
    const checkStrength = (pwd: string) => {
      let strength = 0
      if (pwd.length >= 8) strength++
      if (pwd.match(/[a-z]/) && pwd.match(/[A-Z]/)) strength++
      if (pwd.match(/\d/)) strength++
      if (pwd.match(/[^a-zA-Z\d]/)) strength++
      return strength
    }
    setPasswordStrength(checkStrength(formData.password))
  }, [formData.password])

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return 'Très faible'
    if (passwordStrength === 1) return 'Faible'
    if (passwordStrength === 2) return 'Moyen'
    if (passwordStrength === 3) return 'Fort'
    return 'Très fort'
  }

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return '#ef4444'
    if (passwordStrength === 2) return '#f59e0b'
    if (passwordStrength === 3) return '#3b82f6'
    return '#22c55e'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (!acceptedPrivacy || !acceptedTerms) {
      setError(
        "Veuillez accepter les conditions d'utilisation et la politique de confidentialité"
      )
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || "Erreur lors de l'inscription")
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: data.user.id,
          user_id: data.user.user_id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          is_admin: data.user.is_admin,
          is_verified: data.user.is_verified,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at,
        })
      )

      setIsSuccess(true)

      setTimeout(() => {
        router.push('/onboarding')
      }, 2500)
    } catch (error: any) {
      setError(error.message || "Erreur lors de l'inscription")
      setIsSubmitting(false)
    }
  }

  const benefits = [
    { icon: Rocket, text: 'Accès instantané aux produits', color: '#6366f1' },
    { icon: Shield, text: 'Sécurité et confidentialité', color: '#3b82f6' },
    { icon: Zap, text: 'Livraison digitale immédiate', color: '#f59e0b' },
    { icon: Gift, text: 'Offres exclusives membres', color: '#ec4899' },
  ]

  // ---- Modales ----
  const PrivacyPolicy = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && setShowPrivacy(false)}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <button className="modal-close" onClick={() => setShowPrivacy(false)}>
          <X size={24} />
        </button>
        <div className="modal-body">
          <div className="modal-header">
            <ShieldCheck size={40} />
            <h2>Politique de confidentialité</h2>
            <p>Dernière mise à jour : 22 août 2026</p>
          </div>

          <div className="privacy-section">
            <h3>
              <Database size={20} /> 1. Collecte des données
            </h3>
            <p>
              TorrentTwist collecte les informations suivantes pour vous offrir
              la meilleure expérience :
            </p>
            <ul>
              <li>
                <strong>Informations d'identification :</strong> Nom, prénom,
                adresse email, numéro de téléphone
              </li>
              <li>
                <strong>Données de connexion :</strong> Adresse IP, navigateur,
                système d'exploitation
              </li>
              <li>
                <strong>Données d'utilisation :</strong> Pages visitées, temps
                passé, interactions
              </li>
              <li>
                <strong>Données de transaction :</strong> Historique d'achats,
                moyens de paiement
              </li>
              <li>
                <strong>Cookies :</strong> Pour améliorer votre expérience
                utilisateur
              </li>
            </ul>
          </div>

          <div className="privacy-section">
            <h3>
              <LockKeyhole size={20} /> 2. Utilisation des données
            </h3>
            <p>Vos données sont utilisées pour :</p>
            <ul>
              <li>Créer et gérer votre compte utilisateur</li>
              <li>Traiter vos commandes et paiements</li>
              <li>Personnaliser votre expérience sur la plateforme</li>
              <li>
                Vous envoyer des communications marketing (avec votre
                consentement)
              </li>
              <li>Améliorer nos services et produits</li>
            </ul>
          </div>

          <div className="privacy-section">
            <h3>
              <Server size={20} /> 3. Stockage et sécurité
            </h3>
            <p>Vos données sont protégées par :</p>
            <ul>
              <li>Chiffrement SSL/TLS pour toutes les transmissions</li>
              <li>Chiffrement des données sensibles en base de données</li>
              <li>Authentification à deux facteurs pour les administrateurs</li>
              <li>Sauvegardes quotidiennes avec chiffrement</li>
            </ul>
          </div>

          <div className="privacy-footer">
            <button
              className="accept-btn"
              onClick={() => {
                setAcceptedPrivacy(true)
                setShowPrivacy(false)
              }}
            >
              <Check size={18} /> J'accepte la politique de confidentialité
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )

  const TermsModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && setShowTerms(false)}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <button className="modal-close" onClick={() => setShowTerms(false)}>
          <X size={24} />
        </button>
        <div className="modal-body">
          <div className="modal-header">
            <FileText size={40} />
            <h2>Conditions d'utilisation</h2>
            <p>Dernière mise à jour : 22 août 2026</p>
          </div>

          <div className="privacy-section">
            <h3>
              <UserCheck size={20} /> 1. Acceptation des conditions
            </h3>
            <p>
              En créant un compte sur TorrentTwist, vous acceptez pleinement et
              sans réserve les présentes conditions d'utilisation.
            </p>
          </div>

          <div className="privacy-section">
            <h3>
              <User size={20} /> 2. Compte utilisateur
            </h3>
            <ul>
              <li>
                Vous êtes responsable de la confidentialité de vos identifiants
              </li>
              <li>Vous devez fournir des informations exactes et à jour</li>
              <li>
                Vous êtes responsable de toutes les activités effectuées sous
                votre compte
              </li>
            </ul>
          </div>

          <div className="privacy-section">
            <h3>
              <CreditCard size={20} /> 3. Produits et services
            </h3>
            <ul>
              <li>Les produits sont livrés sous forme numérique (téléchargement)</li>
              <li>Les prix sont indiqués en FCFA et peuvent être modifiés</li>
              <li>La livraison est instantanée après paiement validé</li>
            </ul>
          </div>

          <div className="privacy-footer">
            <button
              className="accept-btn"
              onClick={() => {
                setAcceptedTerms(true)
                setShowTerms(false)
              }}
            >
              <Check size={18} /> J'accepte les conditions d'utilisation
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="signup-page">
      {/* Arrière-plan avec particules déterministes */}
      <div className="bg">
        <div className="gradient-overlay" />
        <div className="glow glow-1" />
        <div className="glow glow-2" />
        <div className="glow glow-3" />
        <div className="particles">
          {PARTICLES.map((particle) => (
            <div
              key={particle.id}
              className="particle"
              style={{
                left: particle.left,
                top: particle.top,
                animationDelay: particle.animationDelay,
                width: particle.width,
                height: particle.height,
              }}
            />
          ))}
        </div>
      </div>

      <div className="signup-container">
        <motion.button
          className="back-button"
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.12)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/')}
        >
          <ArrowLeft size={20} />
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="signup-header"
        >
          <div className="logo-container">
            <img src="/torrent.png" alt="TorrentTwist" className="logo-image" />
          </div>
          <div className="header-badge">
            <Sparkles size={14} />
            <span>Rejoignez l'aventure</span>
          </div>
          <h1>Créer un compte</h1>
          <p>Accédez à un univers digital sans limites</p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="error-message"
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </motion.div>
        )}

        <motion.div
          className="benefits"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {benefits.map((benefit, i) => (
            <motion.div
              key={i}
              className="benefit-item"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
            >
              <benefit.icon size={16} color={benefit.color} />
              <span>{benefit.text}</span>
            </motion.div>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="success-message"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 360],
                }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <CheckCircle size={64} className="success-icon" />
              </motion.div>
              <h2>Compte créé avec succès !</h2>
              <p>Préparation de votre espace personnel...</p>
              <div className="success-loader">
                <div className="loader-bar" />
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              onSubmit={handleSubmit}
              className="signup-form"
            >
              <div className="form-group">
                <label htmlFor="name">
                  <User size={16} /> Nom complet
                </label>
                <div
                  className={`input-wrapper ${
                    focusedField === 'name' ? 'focused' : ''
                  }`}
                >
                  <User size={20} className="input-icon" />
                  <input
                    id="name"
                    type="text"
                    placeholder="Jean Dupont"
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  <Mail size={16} /> Adresse email
                </label>
                <div
                  className={`input-wrapper ${
                    focusedField === 'email' ? 'focused' : ''
                  }`}
                >
                  <Mail size={20} className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone">
                  <Phone size={16} /> Numéro de téléphone (optionnel)
                </label>
                <div
                  className={`input-wrapper ${
                    focusedField === 'phone' ? 'focused' : ''
                  }`}
                >
                  <Phone size={20} className="input-icon" />
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+237 6XX XXX XXX"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <Lock size={16} /> Mot de passe
                </label>
                <div
                  className={`input-wrapper ${
                    focusedField === 'password' ? 'focused' : ''
                  }`}
                >
                  <Lock size={20} className="input-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                    minLength={8}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formData.password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div
                        className="strength-fill"
                        style={{
                          width: `${(passwordStrength / 4) * 100}%`,
                          backgroundColor: getStrengthColor(),
                        }}
                      />
                    </div>
                    <span style={{ color: getStrengthColor() }}>
                      {getStrengthLabel()}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  <Lock size={16} /> Confirmer le mot de passe
                </label>
                <div
                  className={`input-wrapper ${
                    focusedField === 'confirm' ? 'focused' : ''
                  }`}
                >
                  <Lock size={20} className="input-icon" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password && (
                  <div
                    className={`password-match ${
                      formData.password === formData.confirmPassword
                        ? 'match'
                        : 'mismatch'
                    }`}
                  >
                    {formData.password === formData.confirmPassword ? (
                      <>
                        <Check size={14} /> Les mots de passe correspondent
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} /> Les mots de passe ne
                        correspondent pas
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="terms">
                <label className="term-label">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    required
                    disabled={isSubmitting}
                  />
                  <span>
                    J'accepte la{' '}
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setShowPrivacy(true)}
                    >
                      politique de confidentialité
                    </button>
                  </span>
                </label>
                <label className="term-label">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    required
                    disabled={isSubmitting}
                  />
                  <span>
                    J'accepte les{' '}
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setShowTerms(true)}
                    >
                      conditions d'utilisation
                    </button>
                  </span>
                </label>
              </div>

              <motion.button
                type="submit"
                className="signup-button"
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="loading">
                    <span className="loader" />
                    Inscription en cours...
                  </span>
                ) : (
                  <>
                    Créer mon compte <Rocket size={18} />
                  </>
                )}
              </motion.button>

              <div className="form-footer">
                <p className="login-link">
                  Déjà un compte ? <Link href="/login">Connectez-vous</Link>
                </p>
                <div className="divider">
                  <span>ou</span>
                </div>
                <div className="social-login">
                  <button type="button" className="social-btn google">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path
                        fill="#EA4335"
                        d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.645 1.237 6.442l4.029 3.323z"
                      />
                      <path
                        fill="#34A853"
                        d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.03 3.32A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-2.85l-3.793-3.137z"
                      />
                      <path
                        fill="#4A90E2"
                        d="M19.834 21.15A11.93 11.93 0 0 0 24 12c0-1.1-.157-2.16-.44-3.17H12v6.34h4.99c-.214 1.16-.833 2.14-1.72 2.814l3.564 3.166z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.266 9.765A7.077 7.077 0 0 0 4.909 12c0 .782.126 1.535.357 2.24l-4.03-3.322a11.93 11.93 0 0 1 0-1.835l4.03 3.682z"
                      />
                    </svg>
                    Google
                  </button>
                  <button type="button" className="social-btn github">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    GitHub
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPrivacy && <PrivacyPolicy />}
        {showTerms && <TermsModal />}
      </AnimatePresence>

      {/* ============================================================
        STYLES (inchangés)
      ============================================================ */}
      <style jsx>{`
        .signup-page {
          min-height: 100vh;
          background: linear-gradient(
            135deg,
            #0f1724 0%,
            #1a2a4a 30%,
            #1e3a5f 60%,
            #2a4a7a 100%
          );
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .gradient-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 70%, rgba(59, 130, 246, 0.1) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(79, 70, 229, 0.08) 0%, transparent 50%);
        }

        .glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.08;
          animation: glowFloat 20s ease-in-out infinite;
        }

        .glow-1 {
          width: 600px;
          height: 600px;
          top: -200px;
          left: -200px;
          background: radial-gradient(circle, #6366f1, transparent);
        }

        .glow-2 {
          width: 500px;
          height: 500px;
          bottom: -150px;
          right: -150px;
          background: radial-gradient(circle, #3b82f6, transparent);
          animation-delay: -7s;
        }

        .glow-3 {
          width: 400px;
          height: 400px;
          top: 40%;
          left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(99, 102, 241, 0.06), transparent);
          animation-delay: -12s;
        }

        @keyframes glowFloat {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(80px, -40px) scale(1.1);
          }
          66% {
            transform: translate(-40px, 50px) scale(0.9);
          }
        }

        .particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
          animation: float 15s ease-in-out infinite;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-100px) rotate(180deg);
          }
        }

        .signup-container {
          position: relative;
          z-index: 1;
          max-width: 480px;
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 32px;
          padding: 48px 40px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        @media (max-width: 480px) {
          .signup-container {
            padding: 32px 20px;
            border-radius: 24px;
          }
        }

        .back-button {
          position: absolute;
          top: 16px;
          left: 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.8);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .signup-header {
          text-align: center;
          margin-bottom: 28px;
          margin-top: 4px;
        }

        .logo-container {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 50%;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .logo-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 30px;
          font-size: 12px;
          color: #93b4f8;
          margin-bottom: 16px;
          font-weight: 500;
        }

        .header-badge svg {
          color: #7a9cf5;
        }

        .signup-header h1 {
          font-size: 30px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }

        .signup-header p {
          color: rgba(255, 255, 255, 0.35);
          font-size: 15px;
          margin: 0;
        }

        @media (max-width: 480px) {
          .signup-header h1 {
            font-size: 24px;
          }
          .signup-header p {
            font-size: 14px;
          }
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.12);
          color: #fca5a5;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .error-message svg {
          flex-shrink: 0;
          color: #ef4444;
        }

        .benefits {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 28px;
        }

        @media (max-width: 480px) {
          .benefits {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 380px) {
          .benefits {
            grid-template-columns: 1fr;
          }
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
          transition: all 0.3s ease;
          cursor: default;
        }

        .benefit-item svg {
          flex-shrink: 0;
        }

        .benefit-item span {
          font-weight: 500;
        }

        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-group label svg {
          color: rgba(255, 255, 255, 0.2);
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 14px;
          transition: all 0.3s ease;
        }

        .input-wrapper.focused {
          border-color: rgba(122, 156, 245, 0.4);
          box-shadow: 0 0 40px rgba(37, 99, 235, 0.04);
          background: rgba(255, 255, 255, 0.04);
        }

        .input-wrapper .input-icon {
          position: absolute;
          left: 16px;
          color: rgba(255, 255, 255, 0.1);
        }

        .input-wrapper input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          background: transparent;
          border: none;
          border-radius: 14px;
          color: #ffffff;
          font-size: 14px;
          outline: none;
          font-family: inherit;
        }

        .input-wrapper input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .input-wrapper input::placeholder {
          color: rgba(255, 255, 255, 0.1);
        }

        .toggle-password {
          position: absolute;
          right: 16px;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.1);
          cursor: pointer;
          padding: 0;
          transition: color 0.3s ease;
        }

        .toggle-password:hover {
          color: rgba(255, 255, 255, 0.3);
        }

        .toggle-password:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .password-strength {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 4px;
        }

        .strength-bar {
          flex: 1;
          height: 3px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 10px;
          overflow: hidden;
        }

        .strength-fill {
          height: 100%;
          border-radius: 10px;
          transition: all 0.3s ease;
        }

        .password-strength span {
          font-size: 11px;
          font-weight: 500;
          min-width: 60px;
          text-align: right;
        }

        .password-match {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          margin-top: 2px;
          padding: 4px 0;
        }

        .password-match.match {
          color: #4ade80;
        }
        .password-match.mismatch {
          color: #fca5a5;
        }

        .terms {
          margin: 4px 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .term-label {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: rgba(255, 255, 255, 0.3);
          font-size: 13px;
          cursor: pointer;
          line-height: 1.4;
        }

        .term-label input[type='checkbox'] {
          accent-color: #7a9cf5;
          width: 16px;
          height: 16px;
          margin-top: 2px;
          flex-shrink: 0;
          cursor: pointer;
        }

        .term-label input[type='checkbox']:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .link-btn {
          background: none;
          border: none;
          color: #7a9cf5;
          text-decoration: none;
          font-weight: 500;
          cursor: pointer;
          font-size: 13px;
          padding: 0;
          transition: color 0.3s;
        }

        .link-btn:hover {
          color: #93b4f8;
        }

        .signup-button {
          padding: 16px 24px;
          background: linear-gradient(135deg, #4f7ef7, #7a9cf5);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 4px;
          font-family: inherit;
        }

        .signup-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(37, 99, 235, 0.25);
        }

        .signup-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .loading {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .loader {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .form-footer {
          margin-top: 8px;
        }

        .login-link {
          text-align: center;
          color: rgba(255, 255, 255, 0.25);
          font-size: 14px;
          margin: 0;
        }

        .login-link a {
          color: #7a9cf5;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s;
        }

        .login-link a:hover {
          color: #93b4f8;
          text-decoration: underline;
        }

        .divider {
          display: flex;
          align-items: center;
          margin: 16px 0;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.04);
        }

        .divider span {
          color: rgba(255, 255, 255, 0.15);
          font-size: 12px;
          padding: 0 16px;
          font-weight: 500;
        }

        .social-login {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        @media (max-width: 380px) {
          .social-login {
            grid-template-columns: 1fr;
          }
        }

        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .social-btn:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.8);
        }

        .social-btn.google:hover {
          border-color: rgba(234, 67, 53, 0.3);
        }

        .social-btn.github:hover {
          border-color: rgba(255, 255, 255, 0.15);
        }

        .success-message {
          text-align: center;
          padding: 32px 0;
          animation: successPulse 2s ease-in-out infinite;
        }

        @keyframes successPulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .success-icon {
          color: #4ade80;
          margin-bottom: 16px;
        }

        .success-message h2 {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
        }

        .success-message p {
          color: rgba(255, 255, 255, 0.4);
          margin: 0 0 20px 0;
        }

        .success-loader {
          max-width: 200px;
          margin: 0 auto;
          height: 3px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 10px;
          overflow: hidden;
        }

        .loader-bar {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #4ade80, #22c55e);
          border-radius: 10px;
          animation: loading 2s ease-in-out forwards;
        }

        @keyframes loading {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(12px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content {
          background: rgba(26, 42, 74, 0.95);
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          max-width: 680px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: relative;
          backdrop-filter: blur(20px);
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 10;
        }

        .modal-close:hover {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.8);
        }

        .modal-body {
          padding: 40px 44px;
          overflow-y: auto;
          max-height: calc(90vh - 80px);
        }

        @media (max-width: 480px) {
          .modal-body {
            padding: 28px 20px;
          }
        }

        .modal-body::-webkit-scrollbar {
          width: 4px;
        }
        .modal-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .modal-body::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 10px;
        }

        .modal-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .modal-header svg {
          color: #7a9cf5;
          margin-bottom: 12px;
        }

        .modal-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 4px 0;
        }

        .modal-header p {
          color: rgba(255, 255, 255, 0.25);
          font-size: 13px;
          margin: 0;
        }

        .privacy-section {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
        }

        .privacy-section:last-of-type {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .privacy-section h3 {
          font-size: 15px;
          font-weight: 600;
          color: #93b4f8;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .privacy-section h3 svg {
          color: #7a9cf5;
        }

        .privacy-section p {
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 8px 0;
        }

        .privacy-section ul {
          margin: 8px 0 0 0;
          padding: 0 0 0 20px;
        }

        .privacy-section ul li {
          color: rgba(255, 255, 255, 0.4);
          font-size: 13px;
          line-height: 1.6;
          margin-bottom: 4px;
        }

        .privacy-section ul li strong {
          color: rgba(255, 255, 255, 0.6);
        }

        .privacy-footer {
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.02);
          text-align: center;
        }

        .accept-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 32px;
          background: linear-gradient(135deg, #4f7ef7, #7a9cf5);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .accept-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(37, 99, 235, 0.2);
        }
      `}</style>
    </div>
  )
}