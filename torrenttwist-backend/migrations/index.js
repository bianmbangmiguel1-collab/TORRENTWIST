// migrations/index.js
const { ensureColumns } = require('./helpers');

async function runMigrations(db) {
  console.log('🔄 Exécution des migrations...');
  
  try {
    // ============================================================
    // 1. TABLE USERS
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        isAdmin INTEGER DEFAULT 0,
        isVerified INTEGER DEFAULT 1,
        isInternal INTEGER DEFAULT 0,
        phone TEXT,
        bio TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        postalCode TEXT,
        avatar TEXT,
        preferences TEXT,
        loginAttempts INTEGER DEFAULT 0,
        lockUntil DATETIME,
        lastLogin DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table users créée/vérifiée');

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
    // 14. TABLE ADMIN_SETTINGS
    // ============================================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        siteName TEXT DEFAULT 'TorrentTwist',
        siteLogo TEXT DEFAULT '/torrent.png',
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
        emailUpdates INTEGER DEFAULT 1,
        twoFactor INTEGER DEFAULT 0,
        pushNotifications INTEGER DEFAULT 0,
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
      'CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)',
      'CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)',
      'CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)',
      'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_download_token ON orders(download_token)',
      'CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON user_favorites(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_cart_user_id ON user_cart(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_cart_product_id ON user_cart(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_user_id ON admin_activity_logs(user_id)',
    ];

    for (const query of indexQueries) {
      try {
        await db.exec(query);
      } catch (err) {
        console.warn(`   ⚠️ Index non créé:`, err.message);
      }
    }

    console.log('✅ Index créés avec succès');
    console.log('✅ Toutes les migrations terminées');

  } catch (error) {
    console.error('❌ Erreur lors des migrations:', error);
    throw error;
  }
}

module.exports = { runMigrations };