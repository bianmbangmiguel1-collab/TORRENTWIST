'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  BookOpen,
  GraduationCap,
  Palette,
  Code2,
  Package,
  Video,
  ShoppingBag,
  Sparkles,
  Download,
  Rocket,
  Shield,
  Zap,
  Heart,
  ArrowRight,
  Feather,
  Award,
  Briefcase,
  Target,
  Globe,
  TrendingUp,
  Users,
  ChevronRight,
  Play,
  Star,
  Clock,
  CheckCircle,
  Gift,
  Headphones,
  Mail,
  Phone,
  MapPin,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Menu,
  X,
  Search,
  Lock,
  CreditCard,
  Library,
  BadgeCheck,
  MousePointer2,
  Layers3,
  MessageCircle,
  ChevronDown,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function WelcomeScreen() {
  const router = useRouter()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [showTopButton, setShowTopButton] = useState(false)

  const { scrollYProgress } = useScroll()

  const heroY = useTransform(scrollYProgress, [0, 0.25], [0, -100])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0.45])

  useEffect(() => {
    const onScroll = () => {
      setShowTopButton(window.scrollY > 600)
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const categories = [
    {
      icon: BookOpen,
      title: 'Ebooks',
      description: 'Guides, livres pratiques et ressources digitales.',
    },
    {
      icon: GraduationCap,
      title: 'Formations',
      description: 'Apprenez de nouvelles compétences à votre rythme.',
    },
    {
      icon: Palette,
      title: 'Templates',
      description: 'Designs, modèles Canva et ressources créatives.',
    },
    {
      icon: Code2,
      title: 'Outils digitaux',
      description: 'Ressources, logiciels et solutions numériques.',
    },
    {
      icon: Video,
      title: 'Vidéos',
      description: 'Contenus pédagogiques et ressources vidéo.',
    },
    {
      icon: Package,
      title: 'Packs',
      description: 'Des collections complètes pour aller plus vite.',
    },
  ]

  const benefits = [
    {
      icon: Zap,
      title: 'Accès immédiat',
      description:
        'Après validation de votre achat, vos produits numériques sont immédiatement accessibles.',
    },
    {
      icon: Shield,
      title: 'Paiement sécurisé',
      description:
        'Vos paiements sont traités via une infrastructure de paiement sécurisée.',
    },
    {
      icon: Library,
      title: 'Bibliothèque personnelle',
      description:
        'Retrouvez vos achats dans un espace personnel organisé et accessible.',
    },
    {
      icon: Download,
      title: 'Téléchargement simple',
      description:
        'Retrouvez vos ressources sans devoir rechercher vos anciennes commandes.',
    },
  ]

  const steps = [
    {
      number: '01',
      icon: Search,
      title: 'Explorez',
      description:
        'Parcourez les produits et trouvez les ressources qui correspondent à vos besoins.',
    },
    {
      number: '02',
      icon: ShoppingBag,
      title: 'Choisissez',
      description:
        'Ajoutez vos produits au panier ou utilisez Acheter maintenant pour aller plus vite.',
    },
    {
      number: '03',
      icon: CreditCard,
      title: 'Payez',
      description:
        'Finalisez votre commande avec la méthode de paiement disponible.',
    },
    {
      number: '04',
      icon: Download,
      title: 'Profitez',
      description:
        'Retrouvez votre achat, votre facture et votre téléchargement dans votre espace.',
    },
  ]

  const values = [
    {
      icon: Rocket,
      title: 'Innovation',
      description: 'Une expérience pensée pour les usages numériques modernes.',
    },
    {
      icon: Shield,
      title: 'Sécurité',
      description: 'La protection des comptes et des transactions reste prioritaire.',
    },
    {
      icon: Heart,
      title: 'Expérience',
      description: 'Une interface simple, rapide et agréable à utiliser.',
    },
    {
      icon: Target,
      title: 'Utilité',
      description: 'Des ressources pensées pour répondre à de vrais besoins.',
    },
  ]

  const faqs = [
    {
      question: 'Qu\'est-ce que TorrentTwist ?',
      answer:
        'TorrentTwist est une plateforme dédiée aux produits numériques : ebooks, formations, templates, outils, vidéos et différents packs de ressources.',
    },
    {
      question: 'Comment acheter un produit ?',
      answer:
        'Vous pouvez ajouter un produit au panier ou utiliser Acheter maintenant. Vous êtes ensuite dirigé vers le parcours de paiement pour finaliser votre commande.',
    },
    {
      question: 'Quand vais-je recevoir mon produit ?',
      answer:
        'Pour un produit numérique, l\'accès est prévu après confirmation du paiement. Le produit peut ensuite être retrouvé dans votre espace personnel.',
    },
    {
      question: 'Où retrouver mes factures ?',
      answer:
        'Vos factures peuvent être regroupées dans votre espace personnel afin que vous puissiez les consulter et les télécharger facilement.',
    },
    {
      question: 'Puis-je retrouver mes anciens achats ?',
      answer:
        'Oui. Votre espace personnel est conçu pour centraliser vos commandes, vos produits acquis, vos favoris et vos documents.',
    },
  ]

  const floatingCards = [
    {
      icon: BookOpen,
      title: 'Ebooks',
      position: 'top-[16%] left-[4%]',
    },
    {
      icon: Palette,
      title: 'Templates',
      position: 'top-[30%] right-[3%]',
    },
    {
      icon: Video,
      title: 'Formations',
      position: 'bottom-[18%] left-[8%]',
    },
    {
      icon: Code2,
      title: 'Outils',
      position: 'bottom-[12%] right-[8%]',
    },
  ]

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false)

    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      {/* =========================================================
          PROGRESS BAR
      ========================================================== */}
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed left-0 top-0 z-[200] h-1 w-full origin-left bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"
      />

      {/* =========================================================
          BACKGROUND
      ========================================================== */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-12%] top-[-10%] h-[500px] w-[500px] rounded-full bg-blue-200/30 blur-[120px]" />
        <div className="absolute right-[-12%] top-[15%] h-[450px] w-[450px] rounded-full bg-indigo-200/25 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[25%] h-[500px] w-[500px] rounded-full bg-violet-200/20 blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #2563eb 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* =========================================================
          HEADER
      ========================================================== */}
      <header className="sticky top-0 z-[100] border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <button
            onClick={() => router.push('/')}
            className="group flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition duration-300 group-hover:scale-105">
              <img
                src="/torrent.png"
                alt="TorrentTwist"
                className="h-9 w-9 object-contain"
              />
            </div>

            <div className="hidden sm:block">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-xl font-black text-transparent">
                TorrentTwist
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Digital Universe
              </div>
            </div>
          </button>

          <nav
            className={`${
              mobileMenuOpen ? 'flex' : 'hidden'
            } absolute left-0 right-0 top-full flex-col gap-2 border-b border-slate-200 bg-white/95 p-5 backdrop-blur-xl md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`}
          >
            {[
              ['Univers', 'universe'],
              ['Fonctionnement', 'how-it-works'],
              ['Valeurs', 'values'],
              ['FAQ', 'faq'],
            ].map(([label, target]) => (
              <button
                key={target}
                onClick={() => scrollTo(target)}
                className="rounded-xl px-4 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 md:text-center"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/login')}
              className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:block"
            >
              Connexion
            </button>

            <button
              onClick={() => router.push('/signup')}
              className="hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25 sm:flex"
            >
              Créer un compte
            </button>

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 md:hidden"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================
          HERO
      ========================================================== */}
      <section className="relative isolate overflow-hidden">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="mx-auto max-w-7xl px-5 pb-20 pt-16 lg:px-8 lg:pb-28 lg:pt-24"
        >
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            {/* LEFT */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
                <Sparkles size={14} />
                Votre univers de produits digitaux
              </div>

              <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
                Découvrez.
                <br />
                Apprenez.
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Créez.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                TorrentTwist réunit dans un même univers des ressources
                numériques pensées pour apprendre, créer, développer vos
                projets et aller plus loin.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => router.push('/signup')}
                  className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-4 font-bold text-white shadow-xl shadow-blue-500/20 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/25"
                >
                  Explorer TorrentTwist
                  <ArrowRight
                    size={19}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </button>

                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-7 py-4 font-bold text-slate-800 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                >
                  <Play size={17} />
                  Comment ça marche
                </button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <BadgeCheck size={17} className="text-emerald-500" />
                  Produits numériques
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={17} className="text-blue-500" />
                  Paiement sécurisé
                </div>
                <div className="flex items-center gap-2">
                  <Download size={17} className="text-violet-500" />
                  Accès digital
                </div>
              </div>
            </motion.div>

            {/* RIGHT VISUAL */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.15 }}
              className="relative mx-auto h-[520px] w-full max-w-[560px]"
            >
              <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-100 via-indigo-100 to-violet-100 blur-2xl" />

              <motion.div
                animate={{
                  y: [0, -12, 0],
                  rotate: [0, 1.5, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute left-1/2 top-1/2 z-20 flex h-[290px] w-[290px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[42px] border border-white/80 bg-white/80 shadow-[0_35px_100px_rgba(37,99,235,0.18)] backdrop-blur-xl"
              >
                <div className="text-center">
                  <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[32px] bg-white shadow-lg ring-1 ring-slate-100">
                    <img
                      src="/torrent.png"
                      alt="TorrentTwist"
                      className="h-24 w-24 object-contain"
                    />
                  </div>

                  <div className="mt-6 text-3xl font-black text-slate-950">
                    TorrentTwist
                  </div>

                  <div className="mt-2 text-sm font-medium text-slate-500">
                    Votre univers digital
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-600">
                      Plateforme en ligne
                    </span>
                  </div>
                </div>
              </motion.div>

              {floatingCards.map((card, index) => {
                const Icon = card.icon

                return (
                  <motion.div
                    key={card.title}
                    animate={{
                      y: [0, index % 2 === 0 ? -10 : 10, 0],
                    }}
                    transition={{
                      duration: 4 + index,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className={`absolute ${card.position} z-30 hidden rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-xl backdrop-blur-md sm:flex`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Icon size={19} />
                      </div>

                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {card.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Ressource digitale
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              <div className="absolute inset-x-8 bottom-3 z-10 grid grid-cols-3 gap-3">
                {[
                  [Lock, 'Sécurisé'],
                  [Download, 'Instantané'],
                  [Library, 'Centralisé'],
                ].map(([Icon, label]) => (
                  <div
                    key={label as string}
                    className="rounded-2xl border border-white/80 bg-white/75 p-4 text-center shadow-lg backdrop-blur-md"
                  >
                    {/*
                      @ts-expect-error lucide component typing
                    */}
                    <Icon className="mx-auto mb-2 h-5 w-5 text-blue-600" />
                    <div className="text-xs font-bold text-slate-700">
                      {label as string}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* =========================================================
          UNIVERSE
      ========================================================== */}
      <section id="universe" className="scroll-mt-24 bg-slate-50/70 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-700">
              Explorez l'univers
            </div>

            <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Tout un monde de ressources
              <span className="text-blue-600"> digitales.</span>
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Un espace pensé pour vous permettre de découvrir rapidement des
              produits numériques adaptés à vos projets.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => {
              const Icon = category.icon

              return (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.6, delay: index * 0.06 }}
                  whileHover={{ y: -7 }}
                  className="group rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 transition duration-300 group-hover:scale-110">
                      <Icon size={28} />
                    </div>

                    <ArrowRight
                      size={19}
                      className="text-slate-300 transition duration-300 group-hover:translate-x-1 group-hover:text-blue-600"
                    />
                  </div>

                  <h3 className="mt-6 text-xl font-black text-slate-950">
                    {category.title}
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    {category.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          BENEFITS
      ========================================================== */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid items-start gap-14 lg:grid-cols-[0.85fr_1.15fr]">
            <motion.div
              initial={{ opacity: 0, x: -25 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="mb-4 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                Une expérience pensée pour vous
              </div>

              <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Simple à utiliser.
                <br />
                <span className="text-blue-600">Puissante au quotidien.</span>
              </h2>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                TorrentTwist ne doit pas simplement être une boutique.
                L'objectif est de créer un espace dans lequel vos produits
                numériques vous suivent après votre achat.
              </p>

              <button
                onClick={() => router.push('/signup')}
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Commencer maintenant
                <ArrowRight size={18} />
              </button>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon

                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55, delay: index * 0.08 }}
                    className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Icon size={22} />
                    </div>

                    <h3 className="mt-5 text-lg font-black text-slate-950">
                      {benefit.title}
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-slate-500">
                      {benefit.description}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
      ========================================================== */}
      <section
        id="how-it-works"
        className="scroll-mt-24 overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 py-24 text-white"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-300">
              Parcours simplifié
            </div>

            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
              Quatre étapes.
              <br />
              <span className="text-blue-400">Une expérience fluide.</span>
            </h2>
          </motion.div>

          <div className="relative mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-[12.5%] right-[12.5%] top-14 hidden h-px bg-gradient-to-r from-blue-500/0 via-blue-400/50 to-blue-500/0 lg:block" />

            {steps.map((step, index) => {
              const Icon = step.icon

              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                  className="relative z-10 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                      <Icon size={21} />
                    </div>

                    <span className="text-sm font-black text-white/25">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="mt-7 text-xl font-black">{step.title}</h3>

                  <p className="mt-3 text-sm leading-7 text-white/60">
                    {step.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          VALUES
      ========================================================== */}
      <section id="values" className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex rounded-full bg-violet-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-violet-700">
              Notre philosophie
            </div>

            <h2 className="text-4xl font-black text-slate-950 sm:text-5xl">
              Les principes derrière
              <span className="text-blue-600"> l'expérience.</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => {
              const Icon = value.icon

              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: index * 0.07 }}
                  whileHover={{ y: -6 }}
                  className="rounded-[28px] border border-slate-200 bg-white p-7 text-center shadow-sm transition-shadow hover:shadow-xl hover:shadow-blue-500/10"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Icon size={30} />
                  </div>

                  <h3 className="mt-5 text-lg font-black text-slate-950">
                    {value.title}
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    {value.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          EXPERIENCE PANEL
      ========================================================== */}
      <section className="px-5 pb-24 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 text-white shadow-2xl shadow-blue-500/20 sm:p-12 lg:p-16"
        >
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur">
                ✨ Votre espace personnel
              </div>

              <h2 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
                Achetez une fois.
                <br />
                Retrouvez votre univers ensuite.
              </h2>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
                Commandes, favoris, factures, produits acquis et notifications
                peuvent être réunis dans un seul espace personnel.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {[
                [ShoppingBag, 'Commandes'],
                [Library, 'Bibliothèque'],
                [Heart, 'Favoris'],
                [Award, 'Récompenses'],
              ].map(([Icon, label]) => (
                <div
                  key={label as string}
                  className="rounded-2xl border border-white/10 bg-white/10 p-5 text-center backdrop-blur"
                >
                  {/*
                    @ts-expect-error lucide component typing
                  */}
                  <Icon className="mx-auto mb-2 h-6 w-6" />
                  <div className="text-xs font-bold text-white/90">
                    {label as string}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* =========================================================
          FAQ
      ========================================================== */}
      <section id="faq" className="scroll-mt-24 bg-slate-50/70 py-24">
        <div className="mx-auto max-w-4xl px-5 lg:px-8">
          <div className="text-center">
            <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-700">
              FAQ
            </div>

            <h2 className="text-4xl font-black text-slate-950 sm:text-5xl">
              Les questions essentielles.
            </h2>
          </div>

          <div className="mt-12 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index

              return (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <button
                    onClick={() =>
                      setOpenFaq((current) =>
                        current === index ? null : index
                      )
                    }
                    className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left"
                  >
                    <span className="font-bold text-slate-900">
                      {faq.question}
                    </span>

                    <ChevronDown
                      size={19}
                      className={`shrink-0 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="border-t border-slate-100 px-6 pb-6 pt-4 text-sm leading-7 text-slate-500">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          FINAL CTA
      ========================================================== */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-5 text-center lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.08)] sm:p-12"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Rocket size={30} />
            </div>

            <h2 className="mt-6 text-4xl font-black text-slate-950 sm:text-5xl">
              Prêt à entrer dans l'univers TorrentTwist ?
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Créez votre espace, explorez les ressources disponibles et
              construisez votre bibliothèque numérique.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => router.push('/signup')}
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-4 font-bold text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-1"
              >
                Créer mon compte
                <ArrowRight size={18} />
              </button>

              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 font-bold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/50"
              >
                J'ai déjà un compte
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================== */}
      <footer className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
                  <img
                    src="/torrent.png"
                    alt="TorrentTwist"
                    className="h-9 w-9 object-contain"
                  />
                </div>

                <div>
                  <div className="text-xl font-black">TorrentTwist</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                    Digital Universe
                  </div>
                </div>
              </div>

              <p className="mt-5 max-w-md text-sm leading-7 text-white/55">
                Une plateforme pensée pour découvrir, acheter et retrouver
                facilement des produits numériques.
              </p>

              <div className="mt-6 flex gap-2">
                {[Twitter, Facebook, Instagram, Youtube, Linkedin].map(
                  (Icon, index) => (
                    <a
                      key={index}
                      href="#"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                      <Icon size={17} />
                    </a>
                  )
                )}
              </div>
            </div>

            <div>
              <h3 className="font-bold">Découvrir</h3>

              <div className="mt-4 space-y-3 text-sm text-white/50">
                <button
                  onClick={() => scrollTo('universe')}
                  className="block transition hover:text-white"
                >
                  Univers
                </button>

                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="block transition hover:text-white"
                >
                  Fonctionnement
                </button>

                <button
                  onClick={() => scrollTo('values')}
                  className="block transition hover:text-white"
                >
                  Valeurs
                </button>

                <button
                  onClick={() => scrollTo('faq')}
                  className="block transition hover:text-white"
                >
                  FAQ
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold">Compte</h3>

              <div className="mt-4 space-y-3 text-sm">
                <button
                  onClick={() => router.push('/login')}
                  className="block text-white/50 transition hover:text-white"
                >
                  Connexion
                </button>

                <button
                  onClick={() => router.push('/signup')}
                  className="block text-white/50 transition hover:text-white"
                >
                  Inscription
                </button>

                <button
                  onClick={() => router.push('/products')}
                  className="block text-white/50 transition hover:text-white"
                >
                  Produits
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold">Contact</h3>

              <div className="mt-4 space-y-4 text-sm text-white/50">
                <div className="flex items-center gap-3">
                  <Mail size={16} />
                  <span>support@torrenttwist.com</span>
                </div>

                <div className="flex items-center gap-3">
                  <Phone size={16} />
                  <span>Support client</span>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin size={16} />
                  <span>Cameroun</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 TorrentTwist. Tous droits réservés.</span>

            <div className="flex items-center gap-2">
              <Heart size={13} className="text-rose-400" />
              <span>Made with care in Cameroon</span>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================
          BACK TO TOP
      ========================================================== */}
      <AnimatePresence>
        {showTopButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: 'smooth',
              })
            }
            className="fixed bottom-6 right-6 z-[120] flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-2xl"
            aria-label="Retour en haut"
          >
            <ChevronRight size={18} className="-rotate-90" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}