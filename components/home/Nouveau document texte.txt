// components/home/ProductSection.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Tag,
  Clock,
  Zap,
  Flame,
  Eye,
} from 'lucide-react';
import ProductCard from './ProductCard';

type SortOption = 'newest' | 'popular' | 'trending' | 'price-asc' | 'price-desc' | 'rating';

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  products: any[];
  viewAllLink?: string;
  seeMore?: boolean;
  showSort?: boolean;
  itemsPerRow?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    large?: number;
  };
  carousel?: boolean;
  showBadge?: 'new' | 'trending' | 'promotion' | 'popular' | 'none';
  className?: string;
  onAddToCart?: (productId: number) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Nouveautés' },
  { value: 'popular', label: 'Populaires' },
  { value: 'trending', label: 'Tendance' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'rating', label: 'Mieux notés' },
];

export default function ProductSection({
  title,
  subtitle,
  icon,
  products,
  viewAllLink = '/products',
  seeMore = true,
  showSort = true,
  itemsPerRow = { mobile: 2, tablet: 3, desktop: 4, large: 5 },
  carousel = false,
  showBadge = 'none',
  className = '',
  onAddToCart,
}: ProductSectionProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleItems, setVisibleItems] = useState(products.length);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Determine items per page based on screen size
  useEffect(() => {
    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      if (width >= 1280) setItemsPerPage(itemsPerRow.large || 5);
      else if (width >= 1024) setItemsPerPage(itemsPerRow.desktop || 4);
      else if (width >= 768) setItemsPerPage(itemsPerRow.tablet || 3);
      else setItemsPerPage(itemsPerRow.mobile || 2);
    };
    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, [itemsPerRow]);

  // Sort products
  const getSortedProducts = () => {
    const sorted = [...products];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      case 'popular':
        return sorted.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
      case 'trending':
        return sorted.sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0));
      case 'price-asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'rating':
        return sorted.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
      default:
        return sorted;
    }
  };

  const sortedProducts = getSortedProducts();
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const displayedProducts = carousel
    ? sortedProducts.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
    : sortedProducts;

  const goToPrev = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const goToNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  if (products.length === 0) {
    return (
      <div className="relative py-16 text-center border-2 border-dashed border-gray-200 rounded-3xl">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <span className="text-5xl">📦</span>
          <h3 className="text-lg font-medium text-gray-600">Aucun produit</h3>
          <p className="text-sm">Revenez plus tard, de nouveaux produits arrivent bientôt.</p>
        </div>
      </div>
    );
  }

  // Grid classes based on items per row
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  };

  const getGridCols = () => {
    const cols = itemsPerRow.large || 5;
    if (cols >= 5) return gridCols[5];
    if (cols === 4) return gridCols[4];
    if (cols === 3) return gridCols[3];
    return gridCols[2];
  };

  return (
    <section className={`mb-16 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex-shrink-0 p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-blue-600">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              {title}
              {showBadge === 'new' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">Nouveau</span>
              )}
              {showBadge === 'trending' && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Tendance
                </span>
              )}
              {showBadge === 'popular' && (
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Populaire
                </span>
              )}
              {showBadge === 'promotion' && (
                <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Promotion
                </span>
              )}
            </h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort dropdown */}
          {showSort && products.length > 1 && (
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▾</span>
            </div>
          )}

          {/* View all */}
          {seeMore && (
            <Link
              href={viewAllLink}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition whitespace-nowrap"
            >
              Voir tout <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Products grid */}
      <div
        ref={containerRef}
        className={`relative ${carousel ? 'overflow-hidden' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          key={sortBy}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`grid ${getGridCols()} gap-4 md:gap-6`}
        >
          {displayedProducts.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              index={idx}
              onAddToCart={onAddToCart}
            />
          ))}
        </motion.div>

        {/* Carousel navigation */}
        {carousel && totalPages > 1 && (
          <>
            <button
              onClick={goToPrev}
              disabled={currentPage === 0}
              className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-2.5 shadow-lg transition-all ${
                currentPage === 0 ? 'opacity-0 pointer-events-none' : 'hover:bg-blue-50 hover:border-blue-200'
              }`}
              aria-label="Précédent"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={goToNext}
              disabled={currentPage === totalPages - 1}
              className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-2.5 shadow-lg transition-all ${
                currentPage === totalPages - 1 ? 'opacity-0 pointer-events-none' : 'hover:bg-blue-50 hover:border-blue-200'
              }`}
              aria-label="Suivant"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentPage ? 'w-8 bg-blue-600' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Page ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer with total count */}
      {products.length > 0 && !carousel && (
        <div className="flex justify-between items-center mt-6 text-sm text-gray-400 border-t pt-4">
          <span>{products.length} produits</span>
          <span>
            {sortedProducts.length} {sortBy !== 'newest' && `triés par ${sortOptions.find(s => s.value === sortBy)?.label.toLowerCase()}`}
          </span>
        </div>
      )}
    </section>
  );
}