const { connectDB, getDB } = require('../config/database');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const products = [
  {
    title: "Pack Créateur Digital Pro",
    category: "packs",
    price: 49.99,
    oldPrice: 79.99,
    rating: 4.8,
    sales: 1247,
    badge: "Populaire",
    description: "L'essentiel pour lancer votre activité en ligne avec des templates professionnels et des outils de création.",
    image: "/images/products/pack-createur.jpg",
    downloadUrl: "/downloads/pack-createur-pro.zip",
    fileSize: "2.5 GB",
    format: "ZIP",
    featured: true,
    tags: ['pack', 'créateur', 'digital', 'pro']
  },
  {
    title: "Formation Marketing Digital 2026",
    category: "formations",
    price: 89.99,
    rating: 4.9,
    sales: 856,
    badge: "Meilleure vente",
    description: "Maîtrisez les stratégies digitales qui fonctionnent vraiment avec des études de cas réelles et des exercices pratiques.",
    image: "/images/products/formation-marketing.jpg",
    downloadUrl: "/downloads/formation-marketing-2026.zip",
    fileSize: "4.2 GB",
    format: "VIDEO + PDF",
    featured: true,
    tags: ['formation', 'marketing', 'digital', '2026']
  },
  {
    title: "Ebook - Stratégie Web 2026",
    category: "ebooks",
    price: 19.99,
    rating: 4.7,
    sales: 2341,
    badge: "Nouveau",
    description: "Les tendances qui vont façonner le web cette année : IA, SEO, expérience utilisateur et conversion.",
    image: "/images/products/ebook-strategie-web.jpg",
    downloadUrl: "/downloads/ebook-strategie-web-2026.pdf",
    fileSize: "15 MB",
    format: "PDF",
    featured: false,
    tags: ['ebook', 'stratégie', 'web', '2026']
  },
  {
    title: "Logiciel Pro Design Suite",
    category: "logiciels",
    price: 129.99,
    oldPrice: 199.99,
    rating: 4.6,
    sales: 523,
    badge: "Promo",
    description: "Créez des designs professionnels en un clic avec notre suite d'outils de création et d'édition.",
    image: "/images/products/logiciel-design.jpg",
    downloadUrl: "/downloads/design-suite-pro.exe",
    fileSize: "1.8 GB",
    format: "EXE",
    featured: false,
    tags: ['logiciel', 'design', 'pro', 'suite']
  },
  {
    title: "Template UX/UI Premium Pack",
    category: "design",
    price: 34.99,
    rating: 4.9,
    sales: 3128,
    badge: "Tendance",
    description: "50+ templates prêts à l'emploi pour vos projets web et mobiles, avec des composants React et Figma.",
    image: "/images/products/template-ux-ui.jpg",
    downloadUrl: "/downloads/ux-ui-templates.zip",
    fileSize: "850 MB",
    format: "ZIP",
    featured: true,
    tags: ['template', 'ux', 'ui', 'design']
  },
  {
    title: "Masterclass Vidéo - Filmmaking",
    category: "videos",
    price: 59.99,
    rating: 4.8,
    sales: 967,
    badge: "Top qualité",
    description: "Apprenez les techniques des pros du cinéma avec des tutoriels vidéo exclusifs et des exercices pratiques.",
    image: "/images/products/masterclass-video.jpg",
    downloadUrl: "/downloads/masterclass-filmmaking.zip",
    fileSize: "8.5 GB",
    format: "MP4",
    featured: false,
    tags: ['masterclass', 'vidéo', 'filmmaking', 'cinéma']
  },
  {
    title: "Bundle Créateur de Contenu",
    category: "packs",
    price: 79.99,
    oldPrice: 119.99,
    rating: 4.7,
    sales: 432,
    badge: "Promo",
    description: "Tout ce dont vous avez besoin pour créer du contenu de qualité : templates, formations, logiciels et plus.",
    image: "/images/products/bundle-contenu.jpg",
    downloadUrl: "/downloads/bundle-createur-contenu.zip",
    fileSize: "6.8 GB",
    format: "ZIP",
    featured: false,
    tags: ['bundle', 'contenu', 'créateur', 'pack']
  },
  {
    title: "Formation SEO Avancé",
    category: "formations",
    price: 69.99,
    rating: 4.9,
    sales: 678,
    badge: "Populaire",
    description: "Maîtrisez les techniques SEO avancées pour dominer les résultats de recherche et attirer du trafic qualifié.",
    image: "/images/products/formation-seo.jpg",
    downloadUrl: "/downloads/formation-seo-avance.zip",
    fileSize: "3.2 GB",
    format: "VIDEO + PDF",
    featured: true,
    tags: ['formation', 'seo', 'avancé', 'marketing']
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();
    const db = getDB();
    
    console.log('🗑️ Nettoyage des tables...');
    await db.run('DELETE FROM products');
    await db.run('DELETE FROM users');
    await db.run('DELETE FROM purchases');
    
    console.log('👤 Création de l\'admin...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const result = await db.run(
      'INSERT INTO users (name, email, password, role, isVerified) VALUES (?, ?, ?, ?, ?)',
      ['Admin TorrentTwist', 'admin@torrenttwist.com', hashedPassword, 'admin', 1]
    );
    const adminId = result.lastID;
    
    console.log('📦 Ajout des produits...');
    for (const product of products) {
      await db.run(
        `INSERT INTO products 
         (title, description, category, price, oldPrice, rating, sales, badge, image, downloadUrl, fileSize, format, featured, tags, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [product.title, product.description, product.category, product.price, product.oldPrice || null, 
         product.rating, product.sales, product.badge || null, product.image || '/api/placeholder/300/200',
         product.downloadUrl || null, product.fileSize || null, product.format || null, 
         product.featured ? 1 : 0, JSON.stringify(product.tags || []), adminId]
      );
    }
    
    console.log(`✅ ${products.length} produits ajoutés`);
    console.log('✅ Seed terminé avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  }
};

seedDatabase();