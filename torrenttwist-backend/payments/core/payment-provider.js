// payments/core/payment-provider.js

/**
 * Interface que tous les providers de paiement doivent implémenter
 */
class PaymentProvider {
  /**
   * Créer un paiement
   * @param {Object} input
   * @param {number} input.orderId - ID de la commande
   * @param {number} input.amount - Montant en FCFA
   * @param {string} input.currency - Devise (XOF, XAF, etc.)
   * @param {string} input.description - Description du paiement
   * @param {Object} input.customer - Informations du client
   * @param {string} input.customer.name - Nom du client
   * @param {string} input.customer.email - Email du client
   * @param {string} input.customer.phone - Téléphone du client (optionnel)
   * @param {string} input.returnUrl - URL de retour après paiement
   * @param {string} input.webhookUrl - URL du webhook
   * @returns {Promise<{providerPaymentId: string, paymentUrl: string, status: string}>}
   */
  async createPayment(input) {
    throw new Error('Méthode createPayment doit être implémentée');
  }

  /**
   * Récupérer le statut d'un paiement
   * @param {string} providerPaymentId - ID du paiement chez le provider
   * @returns {Promise<{providerPaymentId: string, status: string}>}
   */
  async getPayment(providerPaymentId) {
    throw new Error('Méthode getPayment doit être implémentée');
  }

  /**
   * Vérifier un webhook
   * @param {Object} payload - Payload du webhook
   * @param {string} signature - Signature du webhook
   * @returns {Promise<{valid: boolean, data: any}>}
   */
  async verifyWebhook(payload, signature) {
    throw new Error('Méthode verifyWebhook doit être implémentée');
  }

  /**
   * Rembourser un paiement
   * @param {string} providerPaymentId - ID du paiement chez le provider
   * @param {number} amount - Montant à rembourser (optionnel)
   * @returns {Promise<{status: string}>}
   */
  async refundPayment(providerPaymentId, amount) {
    throw new Error('Méthode refundPayment doit être implémentée');
  }
}

module.exports = { PaymentProvider };