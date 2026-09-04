// app/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  Zap,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated } = useUser()
  const redirectParam = searchParams.get('redirect') || null

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 🔥 Si déjà connecté, rediriger
  useEffect(() => {
    if (isAuthenticated) {
      const safeRedirect = getSafeRedirect(redirectParam)
      if (safeRedirect) {
        router.replace(safeRedirect)
      } else {
        router.replace('/dashboard')
      }
    }
  }, [isAuthenticated, router, redirectParam])

  // Valider que l'URL de redirection est interne (sécurité)
  const getSafeRedirect = (url: string | null): string | null => {
    if (!url) return null
    if (url.startsWith('/')) {
      if (url.startsWith('//') || url.startsWith('http://') || url.startsWith('https://')) {
        return null
      }
      return url
    }
    return null
  }

  const safeRedirect = getSafeRedirect(redirectParam)

  // 🔥 handleSubmit avec useUser().login()
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Utiliser la fonction login du contexte
      await login(email, password)
      
      setIsSuccess(true)

      // Redirection après un court délai
      setTimeout(() => {
        if (safeRedirect) {
          router.replace(safeRedirect)
          return
        }
        router.replace('/dashboard')
      }, 1500)

    } catch (error: any) {
      setError(error.message || 'Email ou mot de passe incorrect')
      setIsSubmitting(false)
    }
  }

  const features = [
    { icon: Shield, text: 'Connexion sécurisée' },
    { icon: Zap, text: 'Accès instantané' },
  ]

  return (
    <div className="login-page">
      <div className="bg">
        <div className="gradient-overlay" />
        <div className="glow glow-1" />
        <div className="glow glow-2" />
        <div className="glow glow-3" />
      </div>

      <div className="login-container">
        <motion.button
          className="back-button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/')}
        >
          <ArrowLeft size={20} />
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="login-header"
        >
          <div className="logo-container">
            <img src="/torrent.png" alt="TorrentTwist" className="logo-image" />
          </div>
          <div className="header-badge">
            <Sparkles size={14} />
            <span>Bienvenue</span>
          </div>
          <h1>Connectez-vous</h1>
          <p>Retrouvez votre espace TorrentTwist</p>
        </motion.div>

        <motion.div
          className="features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {features.map((feature, i) => (
            <div key={i} className="feature-item">
              <feature.icon size={16} />
              <span>{feature.text}</span>
            </div>
          ))}
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

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="success-message"
          >
            <CheckCircle size={48} className="success-icon" />
            <h2>Connexion réussie !</h2>
            <p>Redirection en cours...</p>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handleSubmit}
            className="login-form"
          >
            <div className="form-group">
              <label htmlFor="email">Adresse email</label>
              <div className={`input-wrapper ${focusedField === 'email' ? 'focused' : ''}`}>
                <Mail size={20} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="Entrez votre adresse email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <div className={`input-wrapper ${focusedField === 'password' ? 'focused' : ''}`}>
                <Lock size={20} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Entrez votre mot de passe"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span>Se souvenir de moi</span>
              </label>
              <a href="/forgot-password" className="forgot-password">
                Mot de passe oublié ?
              </a>
            </div>

            <motion.button
              type="submit"
              className="login-button"
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading">
                  <span className="loader" />
                  Connexion en cours...
                </span>
              ) : (
                'Se connecter'
              )}
            </motion.button>
          </motion.form>
        )}

        {!isSuccess && (
          <div className="links">
            <p className="signup-link">
              Pas encore de compte ? <a href="/signup">Inscrivez-vous</a>
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a365d 0%, #2d4a7a 30%, #3b5c9e 60%, #4a6fb5 100%);
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

        .login-container {
          position: relative;
          z-index: 1;
          max-width: 440px;
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 40px 36px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }

        .back-button {
          position: absolute;
          top: 16px;
          left: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.9);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .login-header {
          text-align: center;
          margin-bottom: 24px;
          margin-top: 4px;
        }

        .logo-container {
          width: 56px;
          height: 56px;
          margin: 0 auto 12px;
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
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 30px;
          font-size: 12px;
          color: #93b4f8;
          margin-bottom: 16px;
        }

        .header-badge svg {
          color: #7a9cf5;
        }

        .login-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 6px 0;
        }

        .login-header p {
          color: rgba(255, 255, 255, 0.4);
          font-size: 14px;
          margin: 0;
        }

        .features {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 20px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
        }

        .feature-item svg {
          color: #7a9cf5;
          flex-shrink: 0;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .error-message svg {
          flex-shrink: 0;
          color: #ef4444;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group label {
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
          font-weight: 500;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .input-wrapper.focused {
          border-color: #7a9cf5;
          box-shadow: 0 0 30px rgba(37, 99, 235, 0.06);
          background: rgba(255, 255, 255, 0.08);
        }

        .input-wrapper .input-icon {
          position: absolute;
          left: 14px;
          color: rgba(255, 255, 255, 0.15);
        }

        .input-wrapper input {
          width: 100%;
          padding: 12px 14px 12px 46px;
          background: transparent;
          border: none;
          border-radius: 12px;
          color: #ffffff;
          font-size: 14px;
          outline: none;
        }

        .input-wrapper input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .input-wrapper input::placeholder {
          color: rgba(255, 255, 255, 0.15);
        }

        .toggle-password {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.15);
          cursor: pointer;
          padding: 0;
          transition: color 0.3s ease;
        }

        .toggle-password:hover {
          color: rgba(255, 255, 255, 0.4);
        }

        .toggle-password:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          margin: 4px 0;
        }

        .remember-me {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.35);
          cursor: pointer;
          transition: color 0.3s ease;
        }

        .remember-me:hover {
          color: rgba(255, 255, 255, 0.6);
        }

        .remember-me input[type='checkbox'] {
          accent-color: #7a9cf5;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .remember-me input[type='checkbox']:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .forgot-password {
          color: #93b4f8;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s;
          font-size: 13px;
        }

        .forgot-password:hover {
          color: #b8cffc;
          text-decoration: underline;
        }

        .login-button {
          padding: 14px 24px;
          background: linear-gradient(135deg, #4f7ef7, #7a9cf5);
          border: none;
          border-radius: 12px;
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
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(37, 99, 235, 0.25);
        }

        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .loader {
          width: 18px;
          height: 18px;
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

        .signup-link {
          text-align: center;
          color: rgba(255, 255, 255, 0.25);
          font-size: 14px;
          margin: 0;
        }

        .signup-link a {
          color: #93b4f8;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s;
        }

        .signup-link a:hover {
          color: #b8cffc;
          text-decoration: underline;
        }

        .links {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-top: 20px;
        }

        .success-message {
          text-align: center;
          padding: 32px 0;
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
          margin: 0;
        }

        @media (max-width: 480px) {
          .login-container {
            padding: 32px 20px;
          }

          .login-header h1 {
            font-size: 24px;
          }

          .form-options {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .features {
            flex-direction: column;
            align-items: center;
          }

          .feature-item {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}