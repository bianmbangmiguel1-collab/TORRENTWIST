const User = require('../models/User');
const Product = require('../models/Product');

// @desc    Obtenir le panier
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
  try {
    const cart = await User.getCart(req.user.id);
    const total = await User.getCartTotal(req.user.id);
    
    res.status(200).json({
      success: true,
      cart,
      total
    });
  } catch (error) {
    console.error('Erreur récupération panier:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      code: 'CART_ERROR'
    });
  }
};

// @desc    Ajouter au panier
// @route   POST /api/cart/add
// @access  Private
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    // Vérifier si le produit existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé',
        code: 'PRODUCT_NOT_FOUND'
      });
    }
    
    const cart = await User.addToCart(req.user.id, productId, quantity);
    const total = await User.getCartTotal(req.user.id);
    
    res.status(200).json({
      success: true,
      cart,
      total,
      message: 'Produit ajouté au panier'
    });
  } catch (error) {
    console.error('Erreur ajout panier:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      code: 'CART_ADD_ERROR'
    });
  }
};

// @desc    Retirer du panier
// @route   DELETE /api/cart/remove/:productId
// @access  Private
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const cart = await User.removeFromCart(req.user.id, parseInt(productId));
    const total = await User.getCartTotal(req.user.id);
    
    res.status(200).json({
      success: true,
      cart,
      total,
      message: 'Produit retiré du panier'
    });
  } catch (error) {
    console.error('Erreur suppression panier:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      code: 'CART_REMOVE_ERROR'
    });
  }
};

// @desc    Mettre à jour la quantité
// @route   PUT /api/cart/update/:productId
// @access  Private
exports.updateQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'La quantité doit être positive',
        code: 'INVALID_QUANTITY'
      });
    }
    
    const cart = await User.updateCartQuantity(req.user.id, parseInt(productId), quantity);
    const total = await User.getCartTotal(req.user.id);
    
    res.status(200).json({
      success: true,
      cart,
      total,
      message: 'Panier mis à jour'
    });
  } catch (error) {
    console.error('Erreur mise à jour panier:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      code: 'CART_UPDATE_ERROR'
    });
  }
};

// @desc    Vider le panier
// @route   DELETE /api/cart/clear
// @access  Private
exports.clearCart = async (req, res) => {
  try {
    await User.clearCart(req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'Panier vidé avec succès'
    });
  } catch (error) {
    console.error('Erreur vidage panier:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      code: 'CART_CLEAR_ERROR'
    });
  }
};