const axios = require('axios');
const crypto = require('crypto');
const QRCode = require('qrcode');

class PayOSService {
  constructor() {
    this.clientId = process.env.PAYOS_CLIENT_ID;
    this.apiKey = process.env.PAYOS_API_KEY;
    
    // PayOS checksum key - dùng như là string bình thường
    this.checksumKey = process.env.PAYOS_CHECKSUM_KEY;
    console.log('🔵 Using Checksum Key as UTF-8 string (NOT hex-decoded)');
    
    this.baseUrl = process.env.PAYOS_BASE_URL || 'https://api-merchant.payos.vn';
    this.returnUrl = process.env.PAYOS_RETURN_URL || 'http://localhost:5001/api/payments/callback';
    this.cancelUrl = process.env.PAYOS_CANCEL_URL || 'http://localhost:3000/payment-failed';
    
    console.log('🔵 PayOS URLs:', {
      returnUrl: this.returnUrl,
      cancelUrl: this.cancelUrl
    });
  }

  /**
   * Tạo chữ ký cho request (PayOS v2)
   * ✅ FORMAT CHÍNH XÁC:
   * amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl
   * 
   * QUAN TRỌNG:
   * - KHÔNG URL encode
   * - KHÔNG sort
   * - ĐÚNG thứ tự này!
   * - Dùng checksum key như string (NOT hex buffer)
   */
  generateSignature(data) {
    const { orderCode, amount, description, cancelUrl, returnUrl } = data;
    
    // ✅ FORMAT CHÍNH XÁC: amount=...&cancelUrl=...&description=...&orderCode=...&returnUrl=...
    const signatureString = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
    
    console.log('🔵 Signature String (CORRECT format):', signatureString);
    console.log('🔵 Checksum Key Type:', typeof this.checksumKey);
    
    const signature = crypto
      .createHmac('sha256', this.checksumKey)
      .update(signatureString)
      .digest('hex');
    
    console.log('🔵 Generated Signature:', signature);
    return signature;
  }

  /**
   * Tạo QR code để chuyển khoản
   */
  async createQRCode(amount, description, referenceCode) {
    try {
      const bankCode = process.env.BANK_CODE || 'BIDV';
      const accountNumber = process.env.BANK_ACCOUNT_NUMBER;
      const accountName = process.env.BANK_ACCOUNT_NAME;

      // Định dạng dữ liệu theo chuẩn VietQR
      const data = {
        bankCode,
        accountNumber,
        accountName,
        amount,
        description,
        referenceCode
      };

      // Tạo QR code dạng base64
      const qrCodeBase64 = await QRCode.toDataURL(JSON.stringify(data));
      
      return {
        success: true,
        qr_code: qrCodeBase64,
        bank_info: {
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: accountName
        }
      };
    } catch (error) {
      console.error('Error creating QR code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Tạo Payment Intent với PayOS
   */
  async createPaymentIntent(paymentData) {
    try {
      const {
        orderCode,
        amount,
        description,
        returnUrl,
        cancelUrl,
        buyerName,
        buyerEmail,
        buyerPhone,
        buyerAddress,
        items
      } = paymentData;

      console.log('🔵 Creating PaymentIntent with:', {
        orderCode,
        amount,
        description,
        buyerName,
        buyerEmail
      });

      const payload = {
        orderCode: parseInt(orderCode),
        amount: parseInt(amount),
        description: description || `Thanh toán đơn hàng ${orderCode}`,
        returnUrl: returnUrl || this.returnUrl,
        cancelUrl: cancelUrl || this.cancelUrl,
        signature: '',
        buyerName: buyerName || 'Customer',
        buyerEmail: buyerEmail || 'customer@example.com',
        buyerPhone: buyerPhone || '0000000000',
        buyerAddress: buyerAddress || 'N/A',
        items: items || [
          {
            name: 'Đơn hàng',
            quantity: 1,
            price: amount
          }
        ],
        expiredAt: Math.floor(Date.now() / 1000) + 3600 // 1 giờ
      };

      // Tạo signature (PayOS v2 format)
      payload.signature = this.generateSignature({
        orderCode: payload.orderCode,
        amount: payload.amount,
        description: payload.description,
        cancelUrl: payload.cancelUrl,
        returnUrl: payload.returnUrl
      });

      console.log('🔵 Sending to PayOS:', {
        url: `${this.baseUrl}/v2/payment-requests`,
        hasClientId: !!this.clientId,
        hasApiKey: !!this.apiKey
      });

      const response = await axios.post(
        `${this.baseUrl}/v2/payment-requests`,
        payload,
        {
          headers: {
            'x-client-id': this.clientId,
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('✅ PayOS Response:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ PayOS Error Details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });

      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Lấy thông tin Payment từ PayOS
   */
  async getPaymentInfo(orderCode) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v2/payment-requests/${orderCode}`,
        {
          headers: {
            'x-client-id': this.clientId,
            'x-api-key': this.apiKey
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error getting payment info:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Cancel Payment
   */
  async cancelPayment(orderCode) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/payment-requests/${orderCode}/cancel`,
        {},
        {
          headers: {
            'x-client-id': this.clientId,
            'x-api-key': this.apiKey
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error cancelling payment:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Xác minh signature từ webhook (payment-requests)
   * 
   * ✅ WEBHOOK FORMAT (khác với createPaymentIntent):
   * - PHẢI sort alphabetically theo key
   * - PHẢI URL encode các value
   * - Nếu value là null/undefined → ""
   * - Nếu value là array/object → JSON.stringify
   * 
   * Tham khảo: https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/
   */
  verifyWebhookSignature(data, signature) {
    try {
      // Bước 1: Sort keys alphabetically
      const sortedKeys = Object.keys(data).sort();
      
      // Bước 2: Build query string with URL encoding
      const queryParts = sortedKeys.map(key => {
        let value = data[key];
        
        // Handle null/undefined
        if (value === null || value === undefined) {
          value = '';
        }
        
        // Handle arrays and objects - stringify them
        if (Array.isArray(value) || (typeof value === 'object')) {
          value = JSON.stringify(value);
        }
        
        // URL encode both key and value
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(String(value));
        
        return `${encodedKey}=${encodedValue}`;
      });
      
      const queryString = queryParts.join('&');
      console.log('🔵 Webhook Signature String (sorted + URL encoded):', queryString);
      
      // Bước 3: Calculate HMAC-SHA256
      const computedSignature = crypto
        .createHmac('sha256', this.checksumKey)
        .update(queryString)
        .digest('hex');
      
      console.log('🔵 Computed Signature:', computedSignature);
      console.log('🔵 Provided Signature:', signature);
      console.log('✅ Signature Match:', computedSignature === signature);
      
      return computedSignature === signature;
    } catch (error) {
      console.error('❌ Error verifying webhook signature:', error);
      return false;
    }
  }
}

module.exports = new PayOSService();
