// torrenttwist-backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { connectDB, getDB } = require('./config/database');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const paymentRoutes = require('./routes/payment');
const orderRoutes = require('./routes/orders');
const webhookRoutes = require('./routes/webhooks');
const usersRoutes = require('./routes/users');

// Charger .env.local ou .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============ CRÉATION DES DOSSIERS ============
const createUploadDirectories = () => {
  const dirs = [
    'uploads',
    'uploads/avatars',
    'uploads/products',
    'uploads/temp'
  ];
  
  for (const dir of dirs) {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      try {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Dossier créé: ${dir}`);
      } catch (error) {
        console.warn(`⚠️ Impossible de créer le dossier ${dir}:`, error.message);
      }
    }
  }
};

createUploadDirectories();

// ============ RATE LIMITING ============
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Trop de tentatives de connexion, veuillez réessayer plus tard',
    code: 'AUTH_RATE_LIMIT'
  }
});

// ============ MIDDLEWARE ============
// ✅ CORS - CORRIGÉ
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging des requêtes
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.url}`);
    next();
  });
}

// ============ ROUTES PUBLIQUES ============
app.get('/', (req, res) => {
  res.json({
    name: 'TorrentTwist API',
    version: '3.0.0',
    status: 'Online',
    database: process.env.DB_TYPE || 'SQLite'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================================
// FONCTIONS DE MIGRATION (100% SNAKE_CASE)
// ============================================================

async function columnExists(db, tableName, columnName) {
  try {
    const result = await db.get(
      `SELECT name FROM pragma_table_info(?) WHERE name = ?`,
      [tableName, columnName]
    );
    return !!result;
  } catch (error) {
    return false;
  }
}

async function addColumnIfNotExists(db, tableName, columnName, columnType) {
  try {
    const exists = await columnExists(db, tableName, columnName);
    if (!exists) {
      let cleanType = columnType
        .replace(/\bUNIQUE\b/gi, '')
        .replace(/\bNOT NULL\b/gi, '')
        .replace(/\bPRIMARY KEY\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (!cleanType || cleanType === '') {
        cleanType = 'TEXT';
      }
      
      await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${cleanType}`);
      console.log(`   ✅ Colonne ${columnName} ajoutée à ${tableName}`);
      return true;
    }
    return false;
  } catch (error) {
    if (error.message && error.message.includes('duplicate column name')) {
      return true;
    }
    console.warn(`   ⚠️ Impossible d'ajouter ${columnName} à ${tableName}:`, error.message);
    return false;
  }
}

async function migrateTables(db) {
  try {
    console.log('🔄 Vérification des tables...');

    // ============================================================
    // 1. TABLE USERS (100% snake_case)
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_admin INTEGER DEFAULT 0,
        is_verified INTEGER DEFAULT 1,
        is_internal INTEGER DEFAULT 0,
        phone TEXT,
        bio TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        postal_code TEXT,
        avatar TEXT,
        preferences TEXT,
        login_attempts INTEGER DEFAULT 0,
        lock_until DATETIME,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table users créée/vérifiée');

    const userColumns = [
      { name: 'phone', type: 'TEXT' },
      { name: 'bio', type: 'TEXT' },
      { name: 'address', type: 'TEXT' },
      { name: 'city', type: 'TEXT' },
      { name: 'country', type: 'TEXT' },
      { name: 'postal_code', type: 'TEXT' },
      { name: 'avatar', type: 'TEXT' },
      { name: 'preferences', type: 'TEXT' },
      { name: 'login_attempts', type: 'INTEGER DEFAULT 0' },
      { name: 'lock_until', type: 'DATETIME' },
      { name: 'last_login', type: 'DATETIME' },
      { name: 'is_internal', type: 'INTEGER DEFAULT 0' }
    ];

    for (const col of userColumns) {
      await addColumnIfNotExists(db, 'users', col.name, col.type);
    }

    // ============================================================
    // 2. TABLE CATEGORIES
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        parent_id INTEGER,
        description TEXT,
        image TEXT,
        position INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table categories créée/vérifiée');

    // ============================================================
    // 3. TABLE PRODUCTS
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        content TEXT,
        type TEXT DEFAULT 'file',
        price INTEGER NOT NULL,
        compare_price INTEGER,
        cost_price INTEGER,
        sku TEXT UNIQUE,
        barcode TEXT,
        stock INTEGER DEFAULT 0,
        stock_alert INTEGER DEFAULT 5,
        category_id INTEGER,
        brand TEXT,
        status TEXT DEFAULT 'draft',
        visibility TEXT DEFAULT 'public',
        password TEXT,
        published_at DATETIME,
        scheduled_at DATETIME,
        featured INTEGER DEFAULT 0,
        weight REAL,
        dimensions TEXT,
        file_path TEXT,
        file_size TEXT,
        file_format TEXT,
        download_limit INTEGER DEFAULT 0,
        download_expires_days INTEGER DEFAULT 30,
        validity_start_date DATETIME,
        validity_end_date DATETIME,
        validity_duration_days INTEGER DEFAULT 0,
        validity_duration_unit TEXT DEFAULT 'days',
        has_auto_renewal INTEGER DEFAULT 0,
        renewal_price INTEGER,
        base_currency TEXT DEFAULT 'FCFA',
        price_usd REAL,
        price_eur REAL,
        price_gbp REAL,
        license_validity_days INTEGER DEFAULT 365,
        license_quantity INTEGER DEFAULT 1,
        group_id TEXT,
        group_link TEXT,
        require_phone INTEGER DEFAULT 0,
        course_id INTEGER,
        event_id INTEGER,
        event_date DATETIME,
        event_link TEXT,
        credits_amount INTEGER DEFAULT 0,
        subscription_interval TEXT,
        subscription_trial_days INTEGER DEFAULT 0,
        consultation_duration INTEGER DEFAULT 30,
        affiliate_commission REAL DEFAULT 10,
        meta_title TEXT,
        meta_description TEXT,
        meta_keywords TEXT,
        avg_rating REAL DEFAULT 0,
        total_reviews INTEGER DEFAULT 0,
        sales INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        updated_by INTEGER,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Table products créée/vérifiée');

    // ============================================================
    // 4. TABLE ORDERS
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        user_id INTEGER,
        subtotal REAL DEFAULT 0,
        total REAL NOT NULL,
        amount REAL DEFAULT 0,
        currency TEXT DEFAULT 'XOF',
        status TEXT DEFAULT 'pending',
        payment_status TEXT DEFAULT 'pending',
        payment_method TEXT,
        payment_id TEXT,
        transaction_id TEXT,
        shipping_address TEXT,
        shipping_city TEXT,
        shipping_country TEXT,
        shipping_postal TEXT,
        tracking_number TEXT,
        download_token TEXT UNIQUE,
        download_expires_at DATETIME,
        download_count INTEGER DEFAULT 0,
        download_limit INTEGER DEFAULT 1,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Table orders créée/vérifiée');

    // ============================================================
    // 5. TABLE ORDER_ITEMS
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        variant_id INTEGER,
        quantity INTEGER DEFAULT 1,
        price INTEGER NOT NULL,
        total INTEGER NOT NULL,
        product_title TEXT NOT NULL,
        product_file_path TEXT,
        product_file_size TEXT,
        product_format TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Table order_items créée/vérifiée');

    // ============================================================
    // 6. TABLE PURCHASES
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        order_id INTEGER,
        amount INTEGER NOT NULL,
        currency TEXT DEFAULT 'XOF',
        payment_method TEXT,
        payment_status TEXT DEFAULT 'pending',
        transaction_id TEXT,
        download_token TEXT UNIQUE,
        download_expires_at DATETIME,
        download_count INTEGER DEFAULT 0,
        download_limit INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Table purchases créée/vérifiée');

    // ============================================================
    // 7. TABLE REVIEWS
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        order_id INTEGER,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        status TEXT DEFAULT 'pending',
        is_verified_purchase INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        helpful_count INTEGER DEFAULT 0,
        not_helpful_count INTEGER DEFAULT 0,
        admin_reply TEXT,
        sentiment TEXT,
        spam_score REAL,
        is_visible INTEGER DEFAULT 1,
        display_priority INTEGER DEFAULT 0,
        scheduled_start DATETIME,
        scheduled_end DATETIME,
        display_count INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        conversion_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
        UNIQUE(user_id, product_id)
      )
    `);
    console.log('✅ Table reviews créée/vérifiée');

    // ============================================================
    // 8. TABLE USER_FAVORITES
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
      )
    `);
    console.log('✅ Table user_favorites créée/vérifiée');

    // ============================================================
    // 9. TABLE USER_CART
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
      )
    `);
    console.log('✅ Table user_cart créée/vérifiée');

    // ============================================================
    // 10. TABLE USER_ACTIVITIES
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table user_activities créée/vérifiée');

    // ============================================================
    // 11. TABLE USER_RECOMMENDATIONS
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_ids TEXT NOT NULL,
        type TEXT DEFAULT 'personalized',
        score REAL,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table user_recommendations créée/vérifiée');

    // ============================================================
    // 12. TABLE PAYMENT_LOGS
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS payment_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_id INTEGER,
        amount INTEGER NOT NULL,
        method TEXT,
        status TEXT DEFAULT 'pending',
        reference TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Table payment_logs créée/vérifiée');

    // ============================================================
    // 13. TABLE ADMIN_ACTIVITY_LOGS
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table admin_activity_logs créée/vérifiée');

    // ============================================================
    // 14. TABLE ADMIN_SETTINGS (snake_case)
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        site_name TEXT DEFAULT 'TorrentTwist',
        site_logo TEXT DEFAULT '/torrent.png',
        currency TEXT DEFAULT 'FCFA',
        currency_symbol TEXT DEFAULT 'CFA',
        tax_rate REAL DEFAULT 0,
        maintenance_mode INTEGER DEFAULT 0,
        ai_enabled INTEGER DEFAULT 1,
        ai_providers TEXT,
        download_expiry_days INTEGER DEFAULT 30,
        download_limit INTEGER DEFAULT 5,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table admin_settings créée/vérifiée');

    // ============================================================
    // 15. TABLE PRODUCT_IMAGES
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        alt TEXT,
        position INTEGER DEFAULT 0,
        is_main INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table product_images créée/vérifiée');

    // ============================================================
    // 16. TABLE PRODUCT_VARIANTS
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        attributes TEXT,
        price INTEGER,
        stock INTEGER DEFAULT 0,
        sku TEXT UNIQUE,
        image TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table product_variants créée/vérifiée');

    // ============================================================
    // 17. TABLE USER_PREFERENCES
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        notifications INTEGER DEFAULT 1,
        newsletter INTEGER DEFAULT 0,
        email_updates INTEGER DEFAULT 1,
        two_factor INTEGER DEFAULT 0,
        push_notifications INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table user_preferences créée/vérifiée');

    // ============================================================
    // CRÉATION DES INDEX
    // ============================================================
    console.log('📌 Création des index...');

    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin)',
      'CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)',
      'CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)',
      'CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)',
      'CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)',
      'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_download_token ON orders(download_token)',
      'CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status)',
      'CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON user_favorites(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_cart_user_id ON user_cart(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_cart_product_id ON user_cart(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_id ON user_recommendations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_user_id ON admin_activity_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku)',
      'CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)',
    ];

    for (const query of indexQueries) {
      try {
        await db.exec(query);
      } catch (err) {
        console.warn(`   ⚠️ Index non créé: ${err.message}`);
      }
    }

    console.log('✅ Index créés avec succès');
    console.log('✅ Toutes les tables créées avec succès');

  } catch (error) {
    console.error('❌ Erreur création tables:', error);
    throw error;
  }
}

// ============================================================
// FONCTION CRÉATION ADMIN INTERNE
// ============================================================

async function ensureAdminExists() {
  try {
    const db = getDB();
    
    const tableExists = await db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='users'`
    );
    
    if (!tableExists) {
      console.log('⚠️ Table users inexistante, création...');
      await migrateTables(db);
    }
    
    const admin = await db.get(
      'SELECT * FROM users WHERE role = "admin" OR is_admin = 1 LIMIT 1'
    );
    
    if (!admin) {
      console.log('\n🔐 Aucun administrateur trouvé. Création automatique...\n');
      
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@torrenttwist.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
      const adminName = process.env.ADMIN_NAME || 'Administrateur TorrentTwist';
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      await db.run(
        `INSERT INTO users 
         (name, email, password, role, is_verified, is_admin, is_internal, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [adminName, adminEmail, hashedPassword, 'admin', 1, 1, 1, new Date().toISOString(), new Date().toISOString()]
      );
      
      console.log('='.repeat(60));
      console.log('🔐 ADMINISTRATEUR CRÉÉ AVEC SUCCÈS');
      console.log('='.repeat(60));
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Mot de passe: ${adminPassword}`);
      console.log('='.repeat(60) + '\n');
      
    } else {
      console.log('✅ Administrateur existant');
    }
  } catch (error) {
    console.warn('⚠️ Erreur création admin:', error.message);
  }
}

// ============================================================
// 🔥 ROUTES AUTH - AVEC RATE LIMITING
// ============================================================

// 🔥 AUTH LIMITER - PLACÉ ICI AVANT LES ROUTES AUTH
app.use('/api/auth', authLimiter);

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Nom, email et mot de passe sont requis'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Format d\'email invalide'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    const db = getDB();

    const existingUser = await db.get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Cet email est déjà utilisé'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.run(
      `INSERT INTO users 
       (name, email, password, role, is_verified, is_admin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        hashedPassword,
        'user',
        1,
        0,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    const newUser = await db.get(
      'SELECT id, name, email, role, is_admin FROM users WHERE id = ?',
      [result.lastID]
    );

    const token = jwt.sign(
      {
        id: newUser.id,
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role || 'user',
        isAdmin: newUser.is_admin === 1
      },
      process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026',
      { expiresIn: '7d' }
    );

    res.cookie('user_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role || 'user',
        isAdmin: newUser.is_admin === 1
      }
    });

    console.log(`✅ Nouvel utilisateur inscrit: ${email}`);

  } catch (error) {
    console.error('❌ Erreur inscription:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'inscription'
    });
  }
});

// 🔥 LOGIN AVEC COOKIE
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }
    
    const db = getDB();
    const user = await db.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }
    
    if (user.is_verified === 0) {
      return res.status(403).json({
        success: false,
        error: 'Compte non vérifié. Vérifiez votre email.'
      });
    }
    
    const token = jwt.sign(
      {
        id: user.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
        isAdmin: user.is_admin === 1
      },
      process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026',
      { expiresIn: '7d' }
    );

    res.cookie('user_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        isAdmin: user.is_admin === 1,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la connexion'
    });
  }
});

// 🔥 /ME AVEC COOKIE
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.cookies.user_session;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026');
    } catch (e) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }

    const db = getDB();
    const user = await db.get(
      `SELECT id, name, email, phone, bio, address, city, country, postal_code, 
              avatar, role, is_admin, is_verified, created_at, updated_at
       FROM users WHERE id = ?`,
      [decoded.id || decoded.userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      user: {
        ...user,
        isAdmin: user.is_admin === 1,
        isVerified: user.is_verified === 1
      }
    });

  } catch (error) {
    console.error('❌ Erreur /me:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
});

// 🔥 LOGOUT - SUPPRIMER LE COOKIE
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('user_session', {
    path: '/',
  });
  res.json({ 
    success: true, 
    message: 'Déconnexion réussie' 
  });
});

// ============================================================
// 🔥 ROUTES UTILISATEURS - UNIQUEMENT VIA usersRoutes
// ============================================================

app.use('/api/users', usersRoutes);

// ============================================================
// 🔥 ROUTES DE PAIEMENT, COMMANDES ET WEBHOOKS
// ============================================================

app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/webhooks', webhookRoutes);

// ============================================================
// ROUTES PRODUITS PUBLIQUES
// ============================================================

app.get('/api/products', async (req, res) => {
  try {
    const db = getDB();
    const products = await db.all(
      `SELECT * FROM products WHERE status = 'published' ORDER BY created_at DESC`
    );
    res.json(products);
  } catch (error) {
    console.error('Erreur produits:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const db = getDB();
    const product = await db.get(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    res.json(product);
  } catch (error) {
    console.error('Erreur produit:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du produit' });
  }
});

// ============================================================
// ROUTES PANIER
// ============================================================

app.get('/api/cart/:userId', async (req, res) => {
  try {
    const db = getDB();
    const items = await db.all(
      `SELECT c.*, p.title, p.price, p.file_path, p.avg_rating 
       FROM user_cart c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ?`,
      [req.params.userId]
    );
    res.json(items);
  } catch (error) {
    console.error('Erreur panier:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du panier' });
  }
});

app.post('/api/cart', async (req, res) => {
  try {
    const { user_id, product_id, quantity = 1 } = req.body;
    
    if (!user_id || !product_id) {
      return res.status(400).json({ error: 'user_id et product_id sont requis' });
    }
    
    const db = getDB();
    await db.run(
      `INSERT INTO user_cart (user_id, product_id, quantity) 
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, product_id) DO UPDATE SET 
         quantity = quantity + excluded.quantity,
         updated_at = CURRENT_TIMESTAMP`,
      [user_id, product_id, quantity]
    );
    
    res.json({ success: true, message: 'Produit ajouté au panier' });
  } catch (error) {
    console.error('Erreur ajout panier:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout au panier' });
  }
});

app.delete('/api/cart/:user_id/:product_id', async (req, res) => {
  try {
    const { user_id, product_id } = req.params;
    const db = getDB();
    await db.run(
      'DELETE FROM user_cart WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );
    res.json({ success: true, message: 'Produit retiré du panier' });
  } catch (error) {
    console.error('Erreur suppression panier:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du panier' });
  }
});

// ============================================================
// ROUTES FAVORIS
// ============================================================

app.post('/api/favorites', async (req, res) => {
  try {
    const { user_id, product_id } = req.body;
    
    if (!user_id || !product_id) {
      return res.status(400).json({ error: 'user_id et product_id sont requis' });
    }
    
    const db = getDB();
    await db.run(
      'INSERT OR IGNORE INTO user_favorites (user_id, product_id) VALUES (?, ?)',
      [user_id, product_id]
    );
    res.json({ success: true, message: 'Ajouté aux favoris' });
  } catch (error) {
    console.error('Erreur ajout favoris:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout aux favoris' });
  }
});

app.delete('/api/favorites/:user_id/:product_id', async (req, res) => {
  try {
    const { user_id, product_id } = req.params;
    const db = getDB();
    await db.run(
      'DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );
    res.json({ success: true, message: 'Retiré des favoris' });
  } catch (error) {
    console.error('Erreur suppression favoris:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression des favoris' });
  }
});

app.get('/api/favorites/:userId', async (req, res) => {
  try {
    const db = getDB();
    const favorites = await db.all(
      `SELECT p.* 
       FROM user_favorites f 
       JOIN products p ON f.product_id = p.id 
       WHERE f.user_id = ?`,
      [req.params.userId]
    );
    res.json(favorites);
  } catch (error) {
    console.error('Erreur récupération favoris:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des favoris' });
  }
});

// ============================================================
// ROUTES ADMIN PRODUITS
// ============================================================

const requireAdmin = async (req, res, next) => {
  next();
};

app.get('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const { page = 1, limit = 10, search = '', status = '', type = '', sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }
    if (type) {
      whereClauses.push('type = ?');
      params.push(type);
    }
    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM products ${where}`;
    const countResult = await db.get(countQuery, params);
    const total = countResult ? countResult.total : 0;

    const query = `
      SELECT
        p.id,
        p.title,
        p.slug,
        p.description,
        p.price,
        p.compare_price,
        p.stock,
        p.category_id,
        c.name as category_name,
        p.status,
        p.type,
        p.featured,
        p.file_path,
        p.sales as sales_count,
        p.sku,
        p.created_at,
        u.name as creator_name,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      ${where}
      ORDER BY p.${sort} ${order}
      LIMIT ? OFFSET ?
    `;
    const products = await db.all(query, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Erreur /api/admin/products:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des produits' });
  }
});

// ============================================================
// GESTION DES ERREURS (404 - TOUJOURS À LA FIN)
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    code: 'NOT_FOUND'
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors: err.errors || err.message,
      code: 'VALIDATION_ERROR'
    });
  }
  
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({
      success: false,
      message: 'Conflit de données',
      code: 'CONFLICT'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    code: 'INTERNAL_SERVER_ERROR',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================

const startServer = async () => {
  try {
    await connectDB();
    
    const db = getDB();
    await migrateTables(db);
    await ensureAdminExists();

    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Serveur démarré avec succès !`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🏷️  Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Base de données: ${process.env.DB_TYPE || 'SQLite'}`);
      console.log(`\n📋 Endpoints disponibles:`);
      console.log(`   - GET  /                  → Accueil API`);
      console.log(`   - GET  /health            → Health check`);
      console.log(`   - POST /api/auth/login    → Connexion (avec cookie)`);
      console.log(`   - POST /api/auth/signup   → Inscription (avec cookie)`);
      console.log(`   - GET  /api/auth/me       → Profil utilisateur (cookie)`);
      console.log(`   - POST /api/auth/logout   → Déconnexion`);
      console.log(`   - GET  /api/products      → Liste produits`);
      console.log(`   - GET  /api/cart/:userId  → Panier utilisateur`);
      console.log(`   - GET  /api/favorites/:userId → Favoris utilisateur`);
      console.log(`   - GET  /api/admin/products → Liste admin produits`);
      console.log(`   - GET  /api/admin/products/:id → Détail admin produit`);
      console.log(`   - POST /api/admin/products → Créer produit admin`);
      console.log(`   - PUT  /api/admin/products/:id → Mettre à jour produit admin`);
      console.log(`   - DELETE /api/admin/products/:id → Supprimer produit admin`);
      console.log(`   - PATCH  /api/admin/products/:id/status → Changer statut produit`);
      console.log(`   - POST /api/v1/payments  → Paiement`);
      console.log(`   - POST /api/v1/orders    → Commandes`);
      console.log(`   - POST /api/webhooks/fedapay → Webhook FedaPay\n`);
    });

    const shutdown = () => {
      console.log('\n🛑 Arrêt du serveur...');
      server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('❌ Erreur au démarrage:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

module.exports = app;

if (require.main === module) {
  startServer();
}