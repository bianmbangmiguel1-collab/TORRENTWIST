const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// ============ CONFIGURATION MULTER POUR AVATAR ============
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// ✅ FILTRE MIS À JOUR (accepte SVG, BMP, ICO, TIFF, etc.)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',   // ✅ SVG
    'image/bmp',       // ✅ BMP
    'image/x-icon',    // ✅ ICO
    'image/tiff',      // ✅ TIFF
    'image/vnd.microsoft.icon' // ✅ ICO (autre MIME)
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Format d'image non supporté. Utilisez : JPEG, PNG, GIF, WEBP, SVG, BMP, ICO ou TIFF.`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

// ============ VALIDATIONS ============

const signupValidation = [
  body('name')
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caractères')
    .isLength({ max: 50 }).withMessage('Le nom ne peut pas dépasser 50 caractères'),
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Le mot de passe doit contenir au moins une lettre et un chiffre')
];

const loginValidation = [
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Le mot de passe est requis')
];

const profileUpdateValidation = [
  body('name')
    .optional()
    .isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caractères')
    .isLength({ max: 50 }).withMessage('Le nom ne peut pas dépasser 50 caractères'),
  body('phone')
    .optional()
    .matches(/^\+?[0-9\s\-()]{8,20}$/).withMessage('Numéro de téléphone invalide'),
  body('bio')
    .optional()
    .isLength({ max: 500 }).withMessage('La bio ne peut pas dépasser 500 caractères'),
  body('address')
    .optional()
    .isLength({ max: 200 }).withMessage('L\'adresse ne peut pas dépasser 200 caractères'),
  body('city')
    .optional()
    .isLength({ max: 100 }).withMessage('La ville ne peut pas dépasser 100 caractères'),
  body('country')
    .optional()
    .isLength({ max: 100 }).withMessage('Le pays ne peut pas dépasser 100 caractères'),
  body('postalCode')
    .optional()
    .isLength({ max: 20 }).withMessage('Le code postal ne peut pas dépasser 20 caractères')
];

const passwordChangeValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Le mot de passe actuel est requis'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Le mot de passe doit contenir au moins une lettre et un chiffre')
];

// ============ ROUTES PUBLIQUES ============

// @route   POST /api/auth/signup
// @desc    Inscription
// @access  Public
router.post('/signup', signupValidation, authController.signup);

// @route   POST /api/auth/login
// @desc    Connexion
// @access  Public
router.post('/login', loginValidation, authController.login);

// @route   POST /api/auth/refresh-token
// @desc    Rafraîchir le token JWT
// @access  Public
router.post('/refresh-token', authController.refreshToken);

// ============ ROUTES PROTÉGÉES ============

// Toutes les routes ci-dessous nécessitent une authentification
router.use(protect);

// @route   GET /api/auth/me
// @desc    Obtenir le profil utilisateur
// @access  Private
router.get('/me', authController.getMe);

// @route   PUT /api/auth/profile
// @desc    Mettre à jour le profil
// @access  Private
router.put('/profile', profileUpdateValidation, authController.updateProfile);

// @route   POST /api/auth/avatar
// @desc    Upload de l'avatar
// @access  Private
router.post('/avatar', upload.single('avatar'), authController.uploadAvatar);

// @route   DELETE /api/auth/avatar
// @desc    Supprimer l'avatar
// @access  Private
router.delete('/avatar', authController.deleteAvatar);

// @route   POST /api/auth/change-password
// @desc    Changer le mot de passe
// @access  Private
router.post('/change-password', passwordChangeValidation, authController.changePassword);

// @route   POST /api/auth/toggle-2fa
// @desc    Activer/Désactiver l'authentification à deux facteurs
// @access  Private
router.post('/toggle-2fa', authController.toggleTwoFactor);

// @route   POST /api/auth/verify-2fa
// @desc    Vérifier le code 2FA
// @access  Private
router.post('/verify-2fa', authController.verifyTwoFactor);

// @route   POST /api/auth/logout
// @desc    Déconnexion
// @access  Private
router.post('/logout', authController.logout);

// @route   DELETE /api/auth/delete
// @desc    Supprimer le compte
// @access  Private
router.delete('/delete', authController.deleteAccount);

// @route   POST /api/auth/resend-verification
// @desc    Renvoyer l'email de vérification
// @access  Private
router.post('/resend-verification', authController.resendVerification);

// @route   GET /api/auth/verify-email/:token
// @desc    Vérifier l'email
// @access  Public
router.get('/verify-email/:token', authController.verifyEmail);

module.exports = router;