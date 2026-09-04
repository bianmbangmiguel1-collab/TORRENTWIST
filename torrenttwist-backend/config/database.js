// torrenttwist-backend/config/database.js
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

let db = null;

const connectDB = async () => {
  try {
    db = await open({
      filename: process.env.DB_FILE || './database.sqlite',
      driver: sqlite3.Database
    });
    
    console.log('✅ SQLite connecté avec succès');
    await createTables();
    await migrateExistingDatabase();
    return db;
  } catch (error) {
    console.error('❌ Erreur SQLite:', error.message);
    process.exit(1);
  }
};

// Fonction pour migrer une base existante
const migrateExistingDatabase = async () => {
  try {
    // Vérifier si la table users existe
    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    );
    
    if (!tableExists) {
      console.log('ℹ️ Table users non trouvée, création automatique...');
      return;
    }

    // Récupérer les colonnes existantes
    const columns = await db.all('PRAGMA table_info(users)');
    const existingColumns = columns.map(c => c.name);

    console.log('🔍 Vérification des colonnes manquantes...');

    // Liste des colonnes à vérifier (TOUTES en snake_case)
    const columnsToAdd = [
      // Onboarding
      { name: 'main_goal', type: 'TEXT' },
      { name: 'interests', type: 'TEXT' },
      { name: 'experience_level', type: 'TEXT' },
      { name: 'profile_completeness', type: 'INTEGER DEFAULT 0' },
      { name: 'onboarding_completed', type: 'INTEGER DEFAULT 0' },
      { name: 'onboarding_step', type: 'INTEGER DEFAULT 0' },
      { name: 'engagement_score', type: 'INTEGER DEFAULT 0' },
      { name: 'total_time_spent', type: 'INTEGER DEFAULT 0' },
      { name: 'last_activity', type: 'DATETIME' },
      // Profil
      { name: 'phone', type: 'TEXT' },
      { name: 'bio', type: 'TEXT' },
      { name: 'address', type: 'TEXT' },
      { name: 'city', type: 'TEXT' },
      { name: 'country', type: 'TEXT' },
      { name: 'postal_code', type: 'TEXT' },
      { name: 'avatar', type: 'TEXT' },
      { name: 'preferences', type: 'TEXT' },
      // Admin
      { name: 'is_admin', type: 'INTEGER DEFAULT 0' },
      { name: 'is_internal', type: 'INTEGER DEFAULT 0' },
      { name: 'temp_password', type: 'TEXT' },
      { name: 'permissions', type: 'TEXT' }
    ];

    let addedCount = 0;
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        try {
          await db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
          console.log(`   ✅ Colonne ${col.name} ajoutée`);
          addedCount++;
        } catch (error) {
          console.log(`   ⚠️ Erreur ajout ${col.name}: ${error.message}`);
        }
      } else {
        console.log(`   ℹ️ Colonne ${col.name} existe déjà`);
      }
    }

    if (addedCount > 0) {
      console.log(`   ✅ ${addedCount} nouvelles colonnes ajoutées`);
    } else {
      console.log('   ℹ️ Toutes les colonnes sont déjà présentes');
    }

    // Vérifier les tables admin
    const adminTables = ['admin_activity_logs', 'admin_settings'];
    for (const table of adminTables) {
      const exists = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [table]
      );
      if (!exists) {
        console.log(`📝 Création de la table ${table}...`);
        if (table === 'admin_activity_logs') {
          await db.exec(`
            CREATE TABLE IF NOT EXISTS admin_activity_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER,
              email TEXT,
              action TEXT NOT NULL,
              details TEXT,
              ip TEXT,
              userAgent TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
          `);
        } else if (table === 'admin_settings') {
          await db.exec(`
            CREATE TABLE IF NOT EXISTS admin_settings (
              id INTEGER PRIMARY KEY DEFAULT 1,
              siteName TEXT DEFAULT 'TorrentTwist',
              siteLogo TEXT DEFAULT '/torrent.png',
              currency TEXT DEFAULT 'FCFA',
              taxRate REAL DEFAULT 0,
              maintenance INTEGER DEFAULT 0,
              aiEnabled INTEGER DEFAULT 1,
              aiProviders TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
        }
        console.log(`   ✅ Table ${table} créée`);
      }
    }

  } catch (error) {
    console.warn('⚠️ Erreur lors de la migration:', error.message);
  }
};

const createTables = async () => {
  try {
    // ============ TABLE USERS (100% snake_case) ============
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_verified INTEGER DEFAULT 0,
        last_login DATETIME,
        login_attempts INTEGER DEFAULT 0,
        lock_until DATETIME,
        main_goal TEXT,
        interests TEXT,
        experience_level TEXT,
        profile_completeness INTEGER DEFAULT 0,
        onboarding_completed INTEGER DEFAULT 0,
        onboarding_step INTEGER DEFAULT 0,
        engagement_score INTEGER DEFAULT 0,
        total_time_spent INTEGER DEFAULT 0,
        last_activity DATETIME,
        phone TEXT,
        bio TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        postal_code TEXT,
        avatar TEXT,
        preferences TEXT,
        is_admin INTEGER DEFAULT 0,
        is_internal INTEGER DEFAULT 0,
        temp_password TEXT,
        permissions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table users créée/vérifiée');

    // ============ TABLE PRODUCTS ============
    await db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        category TEXT,
        slug TEXT UNIQUE,
        price REAL NOT NULL,
        old_price REAL,
        rating REAL DEFAULT 0,
        sales INTEGER DEFAULT 0,
        badge TEXT,
        image TEXT DEFAULT '/api/placeholder/300/200',
        download_url TEXT,
        file_size TEXT,
        format TEXT,
        tags TEXT,
        views INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        featured INTEGER DEFAULT 0,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Table products créée/vérifiée');

    // ============ TABLE PURCHASES (100% snake_case) ============
    await db.exec(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table purchases créée/vérifiée');

    // ============ TABLE USER_ACTIVITIES (100% snake_case) ============
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        product_id INTEGER,
        category TEXT,
        search_query TEXT,
        time_spent INTEGER DEFAULT 0,
        referrer TEXT,
        session_id TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table user_activities créée/vérifiée');

    // ============ TABLE USER_FAVORITES (100% snake_case) ============
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

    // ============ TABLE USER_CART (100% snake_case) ============
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
      )
    `);
    console.log('✅ Table user_cart créée/vérifiée');

    // ============ TABLE USER_RECOMMENDATIONS (100% snake_case) ============
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        score REAL DEFAULT 0,
        reason TEXT,
        viewed INTEGER DEFAULT 0,
        clicked INTEGER DEFAULT 0,
        converted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
      )
    `);
    console.log('✅ Table user_recommendations créée/vérifiée');

    // ============ TABLE ORDERS (100% snake_case) ============
    await db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_number TEXT UNIQUE NOT NULL,
        products TEXT NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        customer_info TEXT,
        payment_method TEXT,
        payment_reference TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table orders créée/vérifiée');

    // ============ TABLE REVIEWS (100% snake_case) ============
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

    // ============ TABLE PAYMENT_LOGS (100% snake_case) ============
    await db.exec(`
      CREATE TABLE IF NOT EXISTS payment_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_number TEXT,
        amount REAL NOT NULL,
        method TEXT,
        status TEXT DEFAULT 'pending',
        reference TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table payment_logs créée/vérifiée');

    // ============ TABLE ADMIN_ACTIVITY_LOGS (100% snake_case) ============
    await db.exec(`
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        email TEXT,
        action TEXT NOT NULL,
        details TEXT,
        ip TEXT,
        userAgent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Table admin_activity_logs créée/vérifiée');

    // ============ TABLE ADMIN_SETTINGS ============
    await db.exec(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        siteName TEXT DEFAULT 'TorrentTwist',
        siteLogo TEXT DEFAULT '/torrent.png',
        currency TEXT DEFAULT 'FCFA',
        taxRate REAL DEFAULT 0,
        maintenance INTEGER DEFAULT 0,
        aiEnabled INTEGER DEFAULT 1,
        aiProviders TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table admin_settings créée/vérifiée');

    // ============ INDEX (100% snake_case) ============
    await db.exec(`
      -- Users
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      
      -- Products
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
      CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
      CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
      CREATE INDEX IF NOT EXISTS idx_products_sales ON products(sales);
      CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
      CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
      
      -- Purchases
      CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
      CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);
      CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
      CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);
      
      -- User activities
      CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activities_action_type ON user_activities(action_type);
      CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
      
      -- Favorites
      CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON user_favorites(product_id);
      
      -- Cart
      CREATE INDEX IF NOT EXISTS idx_user_cart_user_id ON user_cart(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_cart_product_id ON user_cart(product_id);
      
      -- Recommendations
      CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_id ON user_recommendations(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_recommendations_product_id ON user_recommendations(product_id);
      
      -- Orders
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      
      -- Reviews
      CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
      CREATE INDEX IF NOT EXISTS idx_reviews_is_verified ON reviews(is_verified_purchase);
      CREATE INDEX IF NOT EXISTS idx_reviews_is_visible ON reviews(is_visible);
      CREATE INDEX IF NOT EXISTS idx_reviews_display_priority ON reviews(display_priority);
      
      -- Payment logs
      CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_payment_logs_order_number ON payment_logs(order_number);
      CREATE INDEX IF NOT EXISTS idx_payment_logs_status ON payment_logs(status);
      
      -- Admin logs
      CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_user_id ON admin_activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at);
    `);
    console.log('✅ Index créés avec succès');

  } catch (error) {
    console.error('❌ Erreur création tables:', error.message);
    throw error;
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

// ============ EXPORTATION ============
module.exports = { 
  connectDB, 
  getDB 
};