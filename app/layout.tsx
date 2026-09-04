// app/layout.tsx
import type { Metadata } from 'next'
import { UserProvider } from '@/context/UserContext'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'TorrentTwist – Plateforme de produits numériques',
  description: 'Découvrez les meilleurs produits numériques, formations, templates et ressources pour booster votre activité.',
  keywords: 'produits numériques, formation, templates, logiciels, TorrentTwist',
  authors: [{ name: 'TorrentTwist' }],
  creator: 'TorrentTwist',
  publisher: 'TorrentTwist',
  openGraph: {
    title: 'TorrentTwist – Plateforme de produits numériques',
    description: 'Découvrez les meilleurs produits numériques pour votre activité.',
    url: 'https://torrenttwist.com',
    siteName: 'TorrentTwist',
    images: [
      {
        url: 'https://torrenttwist.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TorrentTwist',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TorrentTwist – Plateforme de produits numériques',
    description: 'Découvrez les meilleurs produits numériques pour votre activité.',
    images: ['https://torrenttwist.com/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/torrent.png',
    apple: '/torrent.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        {/* 🔥🔥🔥 SCRIPT FEDAPAY - OBLIGATOIRE POUR LE PAIEMENT 🔥🔥🔥 */}
        <Script
          src="https://js.fedapay.com/v3/checkout.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        {/* ============================================================
          UserProvider : fournit l'utilisateur et la déconnexion à toute l'application
          ============================================================ */}
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}