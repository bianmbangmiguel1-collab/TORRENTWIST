// payments/payment.factory.js
const { FedaPayProvider } = require('./providers/fedapay.provider');

// Si tu ajoutes Stripe plus tard :
// const { StripeProvider } = require('./providers/stripe.provider');

const PROVIDER_MAP = {
  fedapay: FedaPayProvider,
  // stripe: StripeProvider,
};

function getPaymentProvider(providerName) {
  const ProviderClass = PROVIDER_MAP[providerName];
  if (!ProviderClass) {
    throw new Error(`Provider non supporté: ${providerName}`);
  }
  return new ProviderClass();
}

// Provider par défaut depuis .env
function getDefaultPaymentProvider() {
  const providerName = process.env.PAYMENT_PROVIDER || 'fedapay';
  return getPaymentProvider(providerName);
}

module.exports = {
  getPaymentProvider,
  getDefaultPaymentProvider,
};