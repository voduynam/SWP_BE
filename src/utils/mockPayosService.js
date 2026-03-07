/**
 * Mock PayOS Service - Dùng khi không có internet
 * Tạm thời để test khi developer không thể kết nối tới PayOS thực
 */

const mockPaymentIntents = new Map();

class MockPayOSService {
  constructor() {
    this.clientId = process.env.PAYOS_CLIENT_ID;
    this.apiKey = process.env.PAYOS_API_KEY;
    this.checksumKey = process.env.PAYOS_CHECKSUM_KEY;
    this.baseUrl = 'https://mock-payos.local'; // Mock URL
  }

  generateSignature(data) {
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', this.checksumKey)
      .update(JSON.stringify(data))
      .digest('hex');
    return signature;
  }

  async createQRCode(amount, description, referenceCode) {
    console.log('🎭 MOCK: Creating QR code');
    const QRCode = require('qrcode');
    
    try {
      const bankCode = process.env.BANK_CODE || 'VIETCOMBANK';
      const accountNumber = process.env.BANK_ACCOUNT_NUMBER;
      const accountName = process.env.BANK_ACCOUNT_NAME;

      const data = {
        bankCode,
        accountNumber,
        accountName,
        amount,
        description,
        referenceCode
      };

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
      console.error('Mock QR Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createPaymentIntent(paymentData) {
    console.log('🎭 MOCK: Creating payment intent', {
      orderCode: paymentData.orderCode,
      amount: paymentData.amount
    });

    const { orderCode, amount, description } = paymentData;

    // Simulate PayOS response
    const mockResponse = {
      id: `mock_${orderCode}`,
      orderCode: parseInt(orderCode),
      amount: parseInt(amount),
      description: description,
      status: 'PENDING',
      checkoutUrl: `https://mock-payos.local/checkout/${orderCode}`,
      createdAt: new Date().toISOString()
    };

    // Lưu vào memory
    mockPaymentIntents.set(orderCode, mockResponse);

    return {
      success: true,
      data: mockResponse
    };
  }

  async getPaymentInfo(orderCode) {
    console.log('🎭 MOCK: Getting payment info');
    
    const payment = mockPaymentIntents.get(orderCode);
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found'
      };
    }

    return {
      success: true,
      data: payment
    };
  }

  async cancelPayment(orderCode) {
    console.log('🎭 MOCK: Cancelling payment');
    
    const payment = mockPaymentIntents.get(orderCode);
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found'
      };
    }

    payment.status = 'CANCELLED';
    return {
      success: true,
      data: payment
    };
  }

  verifyWebhookSignature(data, signature) {
    console.log('🎭 MOCK: Verifying signature');
    // Mock: Luôn trả về true
    return true;
  }
}

module.exports = new MockPayOSService();
