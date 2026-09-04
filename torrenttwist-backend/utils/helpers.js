// utils/helpers.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { UPLOAD_DIRS } = require('../config/constants');

function createUploadDirectories() {
  for (const dir of UPLOAD_DIRS) {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      try {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Dossier créé: ${dir}`);
      } catch (error) {
        console.warn(`⚠️ Impossible de créer ${dir}:`, error.message);
      }
    }
  }
}

async function ensureAdminExists(db) {
  try {
    const admin = await db.get(
      'SELECT * FROM users WHERE role = "admin" OR isAdmin = 1 LIMIT 1'
    );
    
    if (!admin) {
      console.log('\n🔐 Création automatique de l\'administrateur...\n');
      
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@torrenttwist.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
      const adminName = process.env.ADMIN_NAME || 'Administrateur TorrentTwist';
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      await db.run(
        `INSERT INTO users 
         (name, email, password, role, isVerified, isAdmin, isInternal, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [adminName, adminEmail, hashedPassword, 'admin', 1, 1, 1, new Date().toISOString()]
      );
      
      console.log('='.repeat(60));
      console.log('🔐 ADMINISTRATEUR CRÉÉ AVEC SUCCÈS');
      console.log('='.repeat(60));
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Mot de passe: ${adminPassword}`);
      console.log('='.repeat(60) + '\n');
    }
  } catch (error) {
    console.warn('⚠️ Erreur création admin:', error.message);
  }
}

function generateToken(user) {
  return Buffer.from(JSON.stringify({
    userId: user.id,
    email: user.email,
    role: user.role || 'user',
    isAdmin: user.isAdmin === 1
  })).toString('base64');
}

module.exports = {
  createUploadDirectories,
  ensureAdminExists,
  generateToken
};