// payments/providers/fedapay.provider.js
const FedaPay = require('fedapay');
const crypto = require('crypto');
const { PaymentProvider } = require('../core/payment-provider');

class FedaPayProvider extends PaymentProvider {
  constructor() {
    super();
    this.apiKey = process.env.FEDAPAY_SECRET_KEY;
    this.environment = process.env.FEDAPAY_ENVIRONMENT || 'sandbox';
    
    // Initialiser FedaPay
    FedaPay.init(this.apiKey, this.environment);
  }

  async createPayment(input) {
    try {
      // Créer un client FedaPay
      const customer = await FedaPay.Customer.create({
        email: input.customer.email,
        name: input.customer.name || 'Client',
        phone: input.customer.phone || null,
      });

      // Créer la transaction
      const transaction = await FedaPay.Transaction.create({
        amount: input.amount,
        currency: input.currency || 'XAF',
        description: input.description || `Commande #${input.orderId}`,
        customer: customer,
        payment_method: 'mobile_money', // ou 'card'
        return_url: input.returnUrl,
        webhook_url: input.webhookUrl,
      });

      return {
        providerPaymentId: transaction.id,
        paymentUrl: transaction.payment_url,
        status: transaction.status,
        raw: transaction,
      };
    } catch (error) {
      console.error('❌ FedaPay createPayment error:', error);
      throw error;
    }
  }

  async getPayment(providerPaymentId) {
    try {
      const transaction = await FedaPay.Transaction.retrieve(providerPaymentId);
      return {
        providerPaymentId: transaction.id,
        status: transaction.status,
        raw: transaction,
      };
    } catch (error) {
      console.error('❌ FedaPay getPayment error:', error);
      throw error;
    }
  }

  async verifyWebhook(payload, signature) {
    try {
      // FedaPay utilise le header x-fedapay-signature
      const secret = process.env.FEDAPAY_WEBHOOK_SECRET || '';
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature || ''),
        Buffer.from(expectedSignature)
      );

      return {
        valid: isValid,
        data: payload,
      };
    } catch (error) {
      console.error('❌ FedaPay verifyWebhook error:', error);
      return { valid: false, data: null };
    }
  }

  async refundPayment(providerPaymentId, amount) {
    try {
      const transaction = await FedaPay.Transaction.retrieve(providerPaymentId);
      const refund = await transaction.refund(amount ? { amount } : undefined);
      return {
        status: refund.status || 'refunded',
        raw: refund,
      };
    } catch (error) {
      console.error('❌ FedaPay refundPayment error:', error);
      throw error;
    }
  }
}

module.exports = { FedaPayProvider };