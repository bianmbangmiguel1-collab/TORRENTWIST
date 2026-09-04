const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let db = null;

const connectDB = async () => {
  try {
    db = await open({
      filename: process.env.DB_FILE || './database.sqlite',
      driver: sqlite3.Database
    });
    
    console.log('✅ SQLite connecté avec succès');

    // Créer les tables
    await createTables();
    
    return db;
  } catch (error) {
    console.error('❌ Erreur SQLite:', error.message);
    process.exit(1);
  }
};

const createTables = async () => {
  // Table Users
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      isVerified INTEGER DEFAULT 0,
      lastLogin DATETIME,
      loginAttempts INTEGER DEFAULT 0,
      lockUntil DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Table users créée/vérifiée');

  // Table Products
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      price REAL NOT NULL,
      oldPrice REAL,
      rating REAL DEFAULT 0,
      sales INTEGER DEFAULT 0,
      badge TEXT,
      image TEXT,
      downloadUrl TEXT,
      fileSize TEXT,
      format TEXT,
      isActive INTEGER DEFAULT 1,
      featured INTEGER DEFAULT 0,
      createdBy INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  console.log('✅ Table products créée/vérifiée');

  // Table Purchases
  await db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      purchaseDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ Table purchases créée/vérifiée');
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

module.exports = { connectDB, getDB };