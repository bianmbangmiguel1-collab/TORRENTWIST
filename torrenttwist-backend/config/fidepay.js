// config/fidepay.js
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { getCache, setCache } = require('./redis');

class FidePayService {
  constructor() {
    this.publicKey = process.env.FIDEPAY_PUBLIC_KEY;
    this.secretKey = process.env.FIDEPAY_SECRET_KEY;
    this.mode = process.env.FIDEPAY_MODE || 'sandbox';
    
    this.baseUrl = this.mode === 'live'
      ? 'https://admin.fide-pay.com/api/merchant'
      : 'https://admin.fide-pay.com/api/merchant/sandbox';
    
    this.timeout = parseInt(process.env.FIDEPAY_TIMEOUT) || 30000;
    this.maxRetries = parseInt(process.env.FIDEPAY_RETRIES) || 3;
    
    // Configuration Axios avec retry
    this.client = axios.create({
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Intercepteur pour logging
    this.client.interceptors.request.use(request => {
      logger.info(`📤 FidePay Request: ${request.method.toUpperCase()} ${request.url}`);
      return request;
    });

    this.client.interceptors.response.use(
      response => {
        logger.info(`📥 FidePay Response: ${response.status} ${response.config.url}`);
        return response;
      },
      error => {
        logger.error(`❌ FidePay Error: ${error.message}`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Obtenir le token d'accès avec cache Redis
   */
  async getAccessToken() {
    const cacheKey = 'fidepay:access_token';
    
    try {
      // Vérifier le cache
      const cached = await getCache(cacheKey);
      if (cached) {
        logger.info('🔑 Token FidePay récupéré depuis le cache');
        return cached;
      }

      logger.info('🔑 Génération du token d\'accès FidePay...');
      
      const response = await this.client.post(
        `${this.baseUrl}/access-token`,
        { public_key: this.publicKey }
      );

      if (response.data.status === 'success') {
        const token = response.data.payment_url;
        
        // Cache pour 55 minutes (les tokens expirent après 1h)
        await setCache(cacheKey, token, 3300);
        
        logger.info('✅ Token d\'accès généré avec succès');
        return token;
      }

      throw new Error('Impossible d\'obtenir le token d\'accès');
    } catch (error) {
      logger.error('❌ Erreur lors de l\'obtention du token:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Créer un paiement
   */
  async createPayment(orderData) {
    const startTime = Date.now();
    
    try {
      // Validation des données
      this.validatePaymentData(orderData);

      // Récupérer le token
      const token = await this.getAccessToken();
      
      // Générer transaction ID unique
      const transactionId = this.generateTransactionId();
      
      const payload = {
        amount: parseFloat(orderData.totalAmount.toFixed(2)),
        currency: orderData.currency || 'XOF',
        transaction_id: transactionId,
        description: this.truncateDescription(orderData.description || `Commande ${orderData.orderNumber}`),
        ipn_url: `${process.env.BACKEND_URL}/api/webhooks/fidepay/ipn`,
        callback_url: `${process.env.FRONTEND_URL}/payment/confirmation?order=${orderData.orderNumber}`,
        customer_name: orderData.customerName || 'Client',
        customer_email: orderData.customerEmail || 'client@email.com'
      };

      logger.info(`📝 Création paiement FidePay: ${transactionId}`);
      logger.debug('Payload:', JSON.stringify(payload, null, 2));

      // Tentative avec retry
      let lastError;
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const response = await this.client.post(
            `${this.baseUrl}/make-payment`,
            payload,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          if (response.data.status === 'success') {
            const duration = Date.now() - startTime;
            logger.info(`✅ Paiement créé en ${duration}ms: ${transactionId}`);
            
            return {
              success: true,
              paymentUrl: response.data.payment_url,
              transactionId: transactionId,
              raw: response.data
            };
          }

          throw new Error('Réponse FidePay invalide');
        } catch (error) {
          lastError = error;
          
          // Si erreur 401, rafraîchir le token
          if (error.response?.status === 401) {
            logger.warn('⚠️ Token expiré, tentative de rafraîchissement...');
            await this.invalidateToken();
            continue;
          }
          
          // Si erreur 400 (transaction_id déjà utilisé)
          if (error.response?.status === 400 && 
              error.response?.data?.message?.includes('already been taken')) {
            logger.warn('⚠️ Transaction ID déjà utilisé, régénération...');
            payload.transaction_id = this.generateTransactionId();
            continue;
          }

          // Si tentative < maxRetries, attendre avant de réessayer
          if (attempt < this.maxRetries) {
            const waitTime = attempt * 1000;
            logger.warn(`⏳ Attente ${waitTime}ms avant retry ${attempt}/${this.maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      throw lastError;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Échec du paiement après ${duration}ms:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Vérifier la signature IPN
   */
  verifyIPN(data, signature) {
    try {
      // Extraire les données nécessaires
      const dataObj = typeof data === 'string' ? JSON.parse(data) : data;
      
      // La signature est basée sur transaction_id + total_amount
      const dataToHash = `${dataObj.transaction_id}${dataObj.total_amount}`;
      const generatedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(dataToHash)
        .digest('hex');
      
      const isValid = generatedSignature === signature;
      
      if (!isValid) {
        logger.warn('⚠️ Signature IPN invalide', {
          received: signature,
          generated: generatedSignature,
          data: dataObj
        });
      }
      
      return isValid;
    } catch (error) {
      logger.error('❌ Erreur vérification signature IPN:', error);
      return false;
    }
  }

  /**
   * Générer un ID de transaction unique
   */
  generateTransactionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Valider les données de paiement
   */
  validatePaymentData(data) {
    const required = ['totalAmount', 'orderNumber'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Champs manquants: ${missing.join(', ')}`);
    }
    
    if (data.totalAmount <= 0) {
      throw new Error('Le montant doit être supérieur à 0');
    }
    
    if (data.currency && !/^[A-Z]{3,4}$/.test(data.currency)) {
      throw new Error('Devise invalide');
    }
  }

  /**
   * Tronquer la description à 20 caractères
   */
  truncateDescription(description) {
    return description.length > 20 
      ? description.substring(0, 17) + '...'
      : description;
  }

  /**
   * Invalider le token en cache
   */
  async invalidateToken() {
    await setCache('fidepay:access_token', null, 0);
  }

  /**
   * Gérer les erreurs
   */
  handleError(error) {
    if (error.response) {
      // Erreur de l'API FidePay
      const status = error.response.status;
      const data = error.response.data;
      
      let message = 'Erreur FidePay: ';
      
      switch (status) {
        case 400:
          message += 'Données invalides - ' + (data.message?.join(', ') || data.message || '');
          break;
        case 401:
          message += 'Authentification échouée - Vérifiez vos clés API';
          break;
        case 404:
          message += 'Endpoint non trouvé';
          break;
        case 429:
          message += 'Trop de requêtes - Attendez quelques secondes';
          break;
        case 500:
          message += 'Erreur serveur FidePay - Réessayez plus tard';
          break;
        default:
          message += data.message || error.message;
      }
      
      const customError = new Error(message);
      customError.status = status;
      customError.code = 'FIDEPAY_API_ERROR';
      customError.original = error;
      return customError;
    }
    
    if (error.code === 'ECONNABORTED') {
      const timeoutError = new Error('Timeout FidePay - Le serveur ne répond pas');
      timeoutError.code = 'FIDEPAY_TIMEOUT';
      return timeoutError;
    }
    
    return error;
  }

  /**
   * Vérifier le statut d'une transaction
   */
  async checkTransactionStatus(transactionId) {
    try {
      const token = await this.getAccessToken();
      
      const response = await this.client.get(
        `${this.baseUrl}/transaction/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      logger.error('❌ Erreur vérification transaction:', error);
      throw this.handleError(error);
    }
  }
}

module.exports = new FidePayService();