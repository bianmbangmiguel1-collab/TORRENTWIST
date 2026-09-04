// config/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { runMigrations } = require('../migrations');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
let dbInstance = null;

function getDB() {
  return dbInstance;
}

async function connectDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    // Créer le dossier
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new sqlite3.Database(DB_PATH, async (err) => {
      if (err) {
        console.error('❌ Erreur SQLite:', err.message);
        reject(err);
        return;
      }

      console.log('✅ SQLite connecté');
      
      // Activer les PRAGMA
      db.exec('PRAGMA foreign_keys = ON');
      db.exec('PRAGMA journal_mode = WAL');
      db.exec('PRAGMA synchronous = NORMAL');
      db.exec('PRAGMA cache_size = 10000');

      dbInstance = db;
      
      // Exécuter les migrations
      await runMigrations(db);
      
      resolve(db);
    });
  });
}

module.exports = { connectDB, getDB };