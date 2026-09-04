// app/avant/page.tsx
import { getDB } from '@/lib/db';
import { getActiveCampaigns } from '@/lib/campaign-service';
import { getAIRecommendations, getTrendingProducts } from '@/lib/ai-recommendations';
import Link from 'next/link';
import { headers } from 'next/headers';
import dynamic from 'next/dynamic';
import AppHeaderWrapper from '@/components/AppHeaderWrapper';
import {
  Star,
  ChevronRight,
  Sparkles,
  Tag,
  TrendingUp,
  Shield,
  Truck,
  Headphones,
  CreditCard,
  Award,
  Gift,
  FolderOpen,
  Send,
  ShoppingBag,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Search,
  Zap,
  User,
  Clock,
  Flame,
  BarChart,
  Code,
  Music,
  Video,
  BookOpen,
  Camera,
  PenTool,
  Heart,
  Coffee,
  Briefcase,
  Smartphone,
  Gamepad2,
} from 'lucide-react';

// ============================================================
// TYPES – 100% SNAKE_CASE
// ============================================================

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  description: string | null;
  image: string | null;
  position: number;
  is_active: number;
  created_at: string;
  product_count: number;
  icon?: string;
}

interface Product {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  type: string;
  price: number;
  compare_price: number | null;
  cost_price: number | null;
  sku: string | null;
  barcode: string | null;
  stock: number;
  stock_alert: number;
  category_id: number | null;
  brand: string | null;
  status: string;
  visibility: string;
  password: string | null;
  published_at: string | null;
  scheduled_at: string | null;
  featured: number;
  weight: number | null;
  dimensions: string | null;
  file_path: string | null;
  file_size: string | null;
  file_format: string | null;
  download_limit: number;
  download_expires_days: number;
  validity_start_date: string | null;
  validity_end_date: string | null;
  validity_duration_days: number;
  validity_duration_unit: string;
  has_auto_renewal: number;
  renewal_price: number | null;
  base_currency: string;
  price_usd: number | null;
  price_eur: number | null;
  price_gbp: number | null;
  license_validity_days: number;
  license_quantity: number;
  group_id: string | null;
  group_link: string | null;
  require_phone: number;
  course_id: number | null;
  event_id: number | null;
  event_date: string | null;
  event_link: string | null;
  credits_amount: number;
  subscription_interval: string | null;
  subscription_trial_days: number;
  consultation_duration: number;
  affiliate_commission: number;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  avg_rating: number;
  total_reviews: number;
  sales_count: number;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
  main_image: string | null;
  review_count: number;
  is_new?: number;
}

interface Banner {
  id: number;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string;
  video_url: string | null;
  link_url: string | null;
  position: number;
  is_active: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SeasonalMessage {
  id: number;
  title: string;
  content: string;
  icon: string | null;
  theme: string | null;
  is_active: number;
  starts_at: string | null;
  ends_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

interface Slide {
  id: number;
  type: 'campaign' | 'image' | 'video';
  title: string | null;
  description: string | null;
  link_url: string | null;
  media_url: string;
  video_url?: string | null;
  campaign_slides?: any[];
}

// ============================================================
// IMPORTS DYNAMIQUES
// ============================================================

const SearchBar = dynamic(() => import('@/components/home/SearchBar'), { ssr: false });
const CarouselHero = dynamic(() => import('@/components/home/CarouselHero'), { ssr: false });
const ProductSection = dynamic(() => import('@/components/home/ProductSection'), { ssr: false });
const CategoryShowcase = dynamic(() => import('@/components/home/CategoryShowcase'), { ssr: false });
const Features = dynamic(() => import('@/components/home/Features'), { ssr: false });
const Testimonials = dynamic(() => import('@/components/home/Testimonials'), { ssr: false });
const Newsletter = dynamic(() => import('@/components/home/Newsletter'), { ssr: false });
const ReviewsShowcase = dynamic(() => import('@/components/home/ReviewsShowcase'), { ssr: false });

// ============================================================
// 🟣 IMPORT DYNAMIQUE DE L'AGENT NEWSLETTER
// ============================================================

const NewsletterAgent = dynamic(
  () => import('@/components/NewsletterAgent'),
  { ssr: false }
);

// ============================================================
// MÉTADONNÉES
// ============================================================

export const metadata = {
  title: 'TorrentTwist – Plateforme de produits numériques',
  description: 'Découvrez les meilleurs produits numériques, formations, templates et ressources pour booster votre activité.',
  keywords: 'produits numériques, formation, templates, logiciels, TorrentTwist',
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
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
};

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default async function HomePage() {
  const db = await getDB();

  // Détection de l'appareil pour le ciblage des campagnes
  const headersList = headers();
  const userAgent = headersList.get('user-agent') || '';
  let device: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  if (/mobile/i.test(userAgent)) device = 'mobile';
  else if (/tablet/i.test(userAgent)) device = 'tablet';

  // ============================================================
  // 1. CAMPAGNES ACTIVES (carousel principal)
  // ============================================================
  const campaigns = await getActiveCampaigns(device);
  const carouselSlides: Slide[] = campaigns.flatMap(campaign =>
    campaign.slides.map((slide: any) => ({
      id: slide.id,
      type: 'campaign' as const,
      title: slide.title || campaign.name,
      description: slide.subtitle || '',
      link_url: slide.cta_value || '',
      campaign_slides: campaign.slides,
      media_url: slide.media_url || '',
    }))
  );

  // Fallback : bannières traditionnelles
  let fallbackSlides: Slide[] = [];
  if (carouselSlides.length === 0) {
    const banners = await db.all<Banner[]>(`
      SELECT * FROM banners 
      WHERE is_active = 1 
      AND (starts_at <= datetime('now') OR starts_at IS NULL)
      AND (ends_at >= datetime('now') OR ends_at IS NULL)
      ORDER BY position ASC
    `);
    fallbackSlides = banners.map(b => ({
      id: b.id,
      type: b.media_type === 'video' ? 'video' : 'image',
      media_url: b.media_url,
      video_url: b.video_url,
      title: b.title,
      description: b.description,
      link_url: b.link_url,
    }));
  }
  const slides = carouselSlides.length > 0 ? carouselSlides : fallbackSlides;

  // ============================================================
  // 2. MESSAGES SAISONNIERS
  // ============================================================
  const seasonalMessages = await db.all<SeasonalMessage[]>(`
    SELECT * FROM seasonal_messages 
    WHERE is_active = 1 
    AND (starts_at <= datetime('now') OR starts_at IS NULL)
    AND (ends_at >= datetime('now') OR ends_at IS NULL)
    ORDER BY position ASC
  `);

  // ============================================================
  // 3. CATÉGORIES PARENTES (showcase)
  // ============================================================
  const categories = await db.all<Category[]>(`
    SELECT 
      c.*,
      (SELECT COUNT(*) FROM products WHERE category_id = c.id AND status = 'published') as product_count
    FROM categories c
    WHERE c.is_active = 1 AND c.parent_id IS NULL
    ORDER BY c.position ASC, c.name ASC
    LIMIT 6
  `);

  // ============================================================
  // 4. NOUVEAUTÉS
  // ============================================================
  const newProducts = await db.all<Product[]>(`
    SELECT 
      p.*,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
      (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count,
      1 as is_new
    FROM products p
    WHERE p.status = 'published'
    ORDER BY p.created_at DESC
    LIMIT 10
  `);

  // ============================================================
  // 5. PROMOTIONS (produits en réduction)
  // ============================================================
  const promoProducts = await db.all<Product[]>(`
    SELECT 
      p.*,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
      (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count
    FROM products p
    WHERE p.status = 'published' AND p.compare_price IS NOT NULL
    ORDER BY (p.compare_price - p.price) DESC
    LIMIT 10
  `);

  // ============================================================
  // 6. PRODUITS POPULAIRES
  // ============================================================
  const popularProducts = await db.all<Product[]>(`
    SELECT 
      p.*,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
      (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count
    FROM products p
    WHERE p.status = 'published'
    ORDER BY sales_count DESC
    LIMIT 10
  `);

  // ============================================================
  // 7. RECOMMANDATIONS IA
  // ============================================================
  const aiProducts = await getAIRecommendations(undefined, 10);

  // ============================================================
  // 8. PRODUITS TENDANCE
  // ============================================================
  const trendingProducts = await getTrendingProducts(10);

  // ============================================================
  // 9. MEILLEURES VENTES
  // ============================================================
  const bestSellers = await db.all<Product[]>(`
    SELECT 
      p.*,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
      (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count
    FROM products p
    WHERE p.status = 'published'
    ORDER BY sales_count DESC
    LIMIT 10
  `);

  // ============================================================
  // 10. VÉRIFICATION DE LA PRÉSENCE D'AVIS RÉELS
  // ============================================================
  const reviewCountResult = await db.get<{ count: number }>(`
    SELECT COUNT(*) as count 
    FROM reviews 
    WHERE status = 'approved' AND is_visible = 1
  `);
  const hasRealReviews = (reviewCountResult?.count || 0) > 0;

  // ============================================================
  // 11. MAPPING DES CATÉGORIES VERS DES ICÔNES
  // ============================================================
  const categoryIconMap: Record<string, string> = {
    'Informatique': 'code',
    'Musique': 'music',
    'Vidéo': 'video',
    'E-books': 'book',
    'Shopping': 'shopping',
    'Photographie': 'camera',
    'Design': 'pen',
    'Santé': 'heart',
    'Café': 'coffee',
    'Business': 'briefcase',
    'Téléphonie': 'smartphone',
    'Jeux': 'gamepad',
  };

  const categoriesWithIcons = categories.map((cat) => {
    const iconName = categoryIconMap[cat.name] || 'sparkles';
    return { ...cat, icon: iconName };
  });

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white overflow-x-hidden">
      <AppHeaderWrapper />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Barre de recherche */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <SearchBar />
        </div>

        {/* Messages saisonniers */}
        {seasonalMessages.length > 0 && (
          <div className="mb-4 sm:mb-6 md:mb-8">
            <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
              {seasonalMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl sm:rounded-2xl shadow-sm w-full sm:w-auto max-w-full"
                >
                  <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate">{msg.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Carousel principal */}
        <section className="mb-6 sm:mb-8 md:mb-12">
          <CarouselHero slides={slides} autoplayInterval={5} />
        </section>

        {/* Catégories en vedette */}
        <div className="mb-6 sm:mb-8 md:mb-12">
          <CategoryShowcase
            categories={categoriesWithIcons}
            title="Catégories"
            subtitle="Parcourez nos catégories de produits"
            variant="default"
            itemsPerRow={{ mobile: 2, tablet: 3, desktop: 6 }}
          />
        </div>

        {/* Nouveautés */}
        <ProductSection
          title="Nouveautés"
          subtitle="Découvrez les derniers produits ajoutés"
          icon={<Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />}
          products={newProducts}
          viewAllLink="/products?sort=newest"
          showBadge="new"
          itemsPerRow={{ mobile: 2, tablet: 3, desktop: 4, large: 5 }}
        />

        {/* Promotions */}
        {promoProducts.length > 0 && (
          <ProductSection
            title="Promotions"
            subtitle="Profitez des meilleures offres"
            icon={<Tag className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />}
            products={promoProducts}
            viewAllLink="/products?promo=true"
            showBadge="promotion"
            carousel={true}
            itemsPerRow={{ mobile: 2, tablet: 3, desktop: 4, large: 4 }}
          />
        )}

        {/* Populaires */}
        <ProductSection
          title="Populaires"
          subtitle="Les produits les plus vendus"
          icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />}
          products={popularProducts}
          viewAllLink="/products?sort=popular"
          showBadge="popular"
          itemsPerRow={{ mobile: 2, tablet: 3, desktop: 4, large: 5 }}
        />

        {/* Recommandations IA */}
        {aiProducts.length > 0 && (
          <ProductSection
            title="Recommandés pour vous"
            subtitle="Basé sur vos préférences et votre historique"
            icon={<User className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />}
            products={aiProducts}
            viewAllLink="/recommendations"
            showSort={false}
            itemsPerRow={{ mobile: 2, tablet: 3, desktop: 4, large: 5 }}
          />
        )}

        {/* Tendances */}
        {trendingProducts.length > 0 && (
          <ProductSection
            title="Tendances du moment"
            subtitle="Ce qui fait le buzz actuellement"
            icon={<Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />}
            products={trendingProducts}
            viewAllLink="/products?sort=trending"
            showBadge="trending"
            itemsPerRow={{ mobile: 2, tablet: 3, desktop: 4, large: 5 }}
          />
        )}

        {/* Meilleures ventes */}
        {bestSellers.length > 0 && (
          <ProductSection
            title="Meilleures ventes"
            subtitle="Les produits les plus plébiscités"
            icon={<BarChart className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />}
            products={bestSellers}
            viewAllLink="/products?sort=best-sellers"
            showBadge="popular"
            itemsPerRow={{ mobile: 2, tablet: 3, desktop: 4, large: 5 }}
          />
        )}

        {/* ═══ SECTION AVIS CLIENTS (bascule intelligente) ═══ */}
        {hasRealReviews ? (
          <div className="mb-6 sm:mb-8 md:mb-12">
            <ReviewsShowcase
              limit={6}
              title="💬 Ce que nos clients disent"
              subtitle="Des témoignages authentiques de nos acheteurs"
              variant="featured"
              autoPlay={true}
              interval={7000}
            />
          </div>
        ) : (
          <div className="mb-6 sm:mb-8 md:mb-12">
            <Testimonials />
          </div>
        )}

        {/* Fonctionnalités */}
        <div className="mb-6 sm:mb-8 md:mb-12">
          <Features />
        </div>

        {/* Newsletter - Formulaire d'inscription */}
        <div className="mb-6 sm:mb-8 md:mb-12">
          <Newsletter />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-8 md:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="col-span-2 md:col-span-1">
              <h3 className="font-bold text-base sm:text-lg mb-2 md:mb-4">TorrentTwist</h3>
              <p className="text-gray-400 text-sm">Plateforme de vente de produits numériques.</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm md:text-base mb-3">Liens rapides</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/products" className="hover:text-white transition">Catalogue</Link></li>
                <li><Link href="/categories" className="hover:text-white transition">Catégories</Link></li>
                <li><Link href="/about" className="hover:text-white transition">À propos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm md:text-base mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/faq" className="hover:text-white transition">FAQ</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm md:text-base mb-3">Suivez-nous</h4>
              <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                <a href="#" className="hover:text-white transition">Facebook</a>
                <a href="#" className="hover:text-white transition">Twitter</a>
                <a href="#" className="hover:text-white transition">Instagram</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 md:mt-8 pt-6 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} TorrentTwist. Tous droits réservés.
          </div>
        </div>
      </footer>

      {/* ============================================================
          🟣 AGENT NEWSLETTER - Orbe lumineux IA
          Apparaît uniquement pour les utilisateurs connectés et abonnés
          ============================================================ */}
      <NewsletterAgent />
    </div>
  );
}