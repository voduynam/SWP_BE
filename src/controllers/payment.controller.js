const Payment = require('../models/Payment');
const InternalOrder = require('../models/InternalOrder');
const payosService = require('../utils/payosServiceSelector');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

/**
 * @desc    Tạo payment (tiền mặt hoặc chuyển khoản)
 * @route   POST /api/payments/create
 * @access  Private
 */
exports.createPayment = asyncHandler(async (req, res) => {
  const { order_id, payment_type } = req.body;
  const user_id = req.user._id || req.user.id;

  console.log('🔵 Create Payment Debug:', {
    user_id,
    user: req.user,
    order_id,
    payment_type
  });

  // Validate input
  if (!user_id) {
    return res.status(401).json(
      ApiResponse.error('User không được xác thực', 401)
    );
  }

  if (!order_id || !payment_type) {
    return res.status(400).json(
      ApiResponse.error('order_id và payment_type là bắt buộc', 400)
    );
  }

  if (!['CASH', 'BANK_TRANSFER'].includes(payment_type)) {
    return res.status(400).json(
      ApiResponse.error('payment_type phải là CASH hoặc BANK_TRANSFER', 400)
    );
  }

  // Kiểm tra đơn hàng
  const order = await InternalOrder.findById(order_id);
  if (!order) {
    return res.status(404).json(ApiResponse.error('Đơn hàng không tồn tại', 404));
  }

  // Kiểm tra nếu đã thanh toán
  if (order.payment_status === 'PAID') {
    return res.status(400).json(
      ApiResponse.error('Đơn hàng này đã được thanh toán', 400)
    );
  }

  try {
    const paymentId = uuidv4();
    const paymentNo = `PAY-${Date.now()}`;

    // TH1: Thanh toán tiền mặt
    if (payment_type === 'CASH') {
      const payment = await Payment.create({
        _id: paymentId,
        payment_no: paymentNo,
        order_id: order_id,
        amount: order.total_amount,
        currency: order.currency,
        payment_method: 'CASH',
        payment_type: 'CASH',
        payment_status: 'COMPLETED',
        description: `Thanh toán tiền mặt cho đơn hàng ${order.order_no}`,
        created_by: user_id,
        paid_at: new Date()
      });

      // Cập nhật status đơn hàng
      order.payment_id = paymentId;
      order.payment_status = 'PAID';
      await order.save();

      return res.status(201).json(
        ApiResponse.success(
          {
            payment: payment,
            order: order,
            message: 'Thanh toán tiền mặt thành công'
          },
          'Tạo thanh toán tiền mặt thành công',
          201
        )
      );
    }

    // TH2: Thanh toán chuyển khoản (PayOS)
    if (payment_type === 'BANK_TRANSFER') {
      // Tạo order code cho PayOS
      const orderCode = `${Date.now()}`;
      const referenceCode = `${order.order_no}`;

      // Tạo payment intent với PayOS (lấy QR code từ đây)
      const paymentIntentResult = await payosService.createPaymentIntent({
        orderCode: orderCode,
        amount: order.total_amount,
        description: referenceCode, // Ngắn gọn, max 25 ký tự
        buyerName: req.user.full_name || 'Customer',
        buyerEmail: req.user.email || 'customer@example.com',
        buyerPhone: req.user.phone || '0000000000',
        items: [
          {
            name: `Đơn hàng ${order.order_no}`,
            quantity: 1,
            price: order.total_amount
          }
        ]
      });

      if (!paymentIntentResult.success) {
        console.error('PayOS Error:', paymentIntentResult.error);
        return res.status(500).json(
          ApiResponse.error(
            'Lỗi tạo payment intent với PayOS: ' + JSON.stringify(paymentIntentResult.error),
            500
          )
        );
      }

      // Lấy QR code từ PayOS response (chính thức từ PayOS)
      const payosQRCode = paymentIntentResult.data?.data?.qrCode || null;
      const checkoutUrl = paymentIntentResult.data?.data?.checkoutUrl || null;

      // Tạo VietQR thêm vào (cho trường hợp dự phòng)
      const qrResult = await payosService.createQRCode(
        order.total_amount,
        referenceCode,
        referenceCode
      );

      // Lưu payment vào database
      const payment = await Payment.create({
        _id: paymentId,
        payment_no: paymentNo,
        order_id: order_id,
        amount: order.total_amount,
        currency: order.currency,
        payment_method: 'TRANSFER',
        payment_type: 'BANK_TRANSFER',
        payment_status: 'PENDING',
        qr_code_base64: payosQRCode ? `data:image/png;base64,${payosQRCode}` : qrResult.qr_code, // Dùng PayOS QR nếu có
        payos_request_id: paymentIntentResult.data?.data?.id || orderCode,
        order_code: orderCode,
        reference_code: referenceCode,
        bank_account_name: paymentIntentResult.data?.data?.accountName || process.env.BANK_ACCOUNT_NAME || 'N/A',
        bank_account_number: paymentIntentResult.data?.data?.accountNumber || process.env.BANK_ACCOUNT_NUMBER || 'N/A',
        bank_code: paymentIntentResult.data?.data?.bin || process.env.BANK_CODE || 'BIDV',
        description: `Thanh toán chuyển khoản cho đơn hàng ${order.order_no}`,
        created_by: user_id,
        metadata: {
          payos_response: paymentIntentResult.data
        }
      });

      // Cập nhật order
      order.payment_id = paymentId;
      order.payment_status = 'UNPAID';
      await order.save();

      return res.status(201).json(
        ApiResponse.success(
          {
            payment: payment,
            qr_code: payment.qr_code_base64, // QR code từ PayOS
            payos_qr: payosQRCode ? `data:image/png;base64,${payosQRCode}` : null, // QR base64
            checkout_url: checkoutUrl, // Link checkout PayOS
            bank_info: {
              bank_code: payment.bank_code,
              account_number: payment.bank_account_number,
              account_name: payment.bank_account_name
            },
            message: 'Tạo yêu cầu thanh toán thành công'
          },
          'Tạo thanh toán chuyển khoản thành công',
          201
        )
      );
    }
  } catch (error) {
    console.error('Error creating payment:', error);
    return res.status(500).json(
      ApiResponse.error('Lỗi tạo thanh toán: ' + error.message, 500)
    );
  }
});

/**
 * @desc    Lấy thông tin thanh toán
 * @route   GET /api/payments/:payment_id
 * @access  Private
 */
exports.getPaymentById = asyncHandler(async (req, res) => {
  const { payment_id } = req.params;

  const payment = await Payment.findById(payment_id).lean();
  if (!payment) {
    return res.status(404).json(ApiResponse.error('Thanh toán không tồn tại', 404));
  }

  return res.status(200).json(
    ApiResponse.success(payment, 'Lấy thông tin thanh toán thành công')
  );
});

/**
 * @desc    Lấy danh sách thanh toán theo đơn hàng
 * @route   GET /api/payments/order/:order_id
 * @access  Private
 */
exports.getPaymentsByOrder = asyncHandler(async (req, res) => {
  const { order_id } = req.params;

  const payments = await Payment.find({ order_id: order_id }).lean();

  return res.status(200).json(
    ApiResponse.success(payments, 'Lấy danh sách thanh toán thành công')
  );
});

/**
 * @desc    Webhook từ PayOS - xác nhận thanh toán thành công
 * @route   POST /api/payments/webhook/payos
 * @access  Public (nhưng cần verify signature)
 */
exports.payosWebhook = asyncHandler(async (req, res) => {
  console.log('\n' + '='.repeat(80));
  console.log('🔵 [WEBHOOK] PayOS Webhook Received');
  console.log('='.repeat(80));
  console.log('Webhook Payload:', JSON.stringify(req.body, null, 2));
  console.log('='.repeat(80) + '\n');

  const { data, signature } = req.body;

  // Verify signature
  console.log('🔐 [WEBHOOK] Verifying webhook signature...');
  const isValid = payosService.verifyWebhookSignature(data, signature);
  
  if (!isValid) {
    console.error('❌ [WEBHOOK] Signature verification FAILED');
    console.error('   Provided Signature:', signature);
    console.error('   Data used for verification:', data);
    return res.status(400).json(
      ApiResponse.error('Signature không hợp lệ', 400)
    );
  }
  
  console.log('✅ [WEBHOOK] Signature verified successfully');

  try {
    const { code, desc, data: paymentData } = data;

    console.log('📊 [WEBHOOK] Payment Data:', {
      code,
      desc,
      paymentDataKeys: Object.keys(paymentData || {})
    });

    // code = '00' nghĩa là thành công
    if (code !== '00') {
      console.log('⚠️ [WEBHOOK] Payment failed with code:', code);
      console.log('   Description:', desc);
      return res.status(200).json(
        ApiResponse.success({ message: 'Payment failed' })
      );
    }

    console.log('✅ [WEBHOOK] Payment code is 00 (SUCCESS)');

    const { orderCode, transactionDateTime, accountNumber } = paymentData;
    console.log('📝 [WEBHOOK] Extracting payment data:', {
      orderCode,
      transactionDateTime,
      reference: paymentData.reference
    });

    // Tìm payment theo order_code - Try multiple formats
    console.log('🔍 [WEBHOOK] Searching for payment with orderCode variants...');
    
    let payment = null;
    const searchVariants = [
      { type: 'string', value: orderCode },
      { type: 'number', value: parseInt(orderCode) },
      { type: 'string-trimmed', value: String(orderCode).trim() }
    ];

    for (const variant of searchVariants) {
      console.log(`   → Try ${variant.type}: ${variant.value}`);
      payment = await Payment.findOne({ order_code: variant.value });
      if (payment) {
        console.log(`   ✅ Found with ${variant.type}!`);
        break;
      }
    }

    if (!payment) {
      console.error('❌ [WEBHOOK] Payment NOT FOUND with any orderCode variant:', orderCode);
      console.error('   Please verify order_code format in database');
      return res.status(404).json(
        ApiResponse.error('Thanh toán không tồn tại', 404)
      );
    }

    console.log('✅ [WEBHOOK] Found payment:', {
      paymentId: payment._id,
      orderId: payment.order_id,
      currentStatus: payment.payment_status
    });

    // Nếu đã được callback update trước đó
    if (payment.payment_status === 'COMPLETED') {
      console.log('ℹ️  [WEBHOOK] Payment already COMPLETED (callback got here first)');
      return res.status(200).json(
        ApiResponse.success({ message: 'Payment already processed' })
      );
    }

    // Cập nhật payment status
    console.log('📝 [WEBHOOK] Updating payment status: PENDING → COMPLETED');
    payment.payment_status = 'COMPLETED';
    payment.payos_transaction_id = paymentData.reference;  // ✅ Fixed: was referenceCode
    payment.paid_at = new Date(paymentData.transactionDateTime);
    const savedPayment = await payment.save();
    console.log('   ✅ Payment saved with status: ' + savedPayment.payment_status);

    // Cập nhật order status
    console.log('📝 [WEBHOOK] Updating order status: UNPAID → PAID');
    const order = await InternalOrder.findById(payment.order_id);
    if (order) {
      order.payment_status = 'PAID';
      const savedOrder = await order.save();
      console.log('   ✅ Order saved with status: ' + savedOrder.payment_status);
    } else {
      console.warn('⚠️ [WEBHOOK] Order not found, but payment updated');
    }

    console.log('\n✅ [WEBHOOK] SUCCESS - All Updates Complete:');
    console.log({
      orderCode,
      paymentId: payment._id,
      orderId: payment.order_id,
      newPaymentStatus: payment.payment_status,
      newOrderStatus: order?.payment_status,
      paidAt: payment.paid_at,
      transactionId: paymentData.reference
    });
    console.log('='.repeat(80) + '\n');

    return res.status(200).json(
      ApiResponse.success({ message: 'Payment processed successfully' })
    );
  } catch (error) {
    console.error('❌ [WEBHOOK] ERROR Processing Webhook:');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('='.repeat(80) + '\n');
    
    return res.status(500).json(
      ApiResponse.error('Lỗi xử lý webhook: ' + error.message, 500)
    );
  }
});

/**
 * @desc    Check trạng thái thanh toán từ PayOS
 * @route   GET /api/payments/:payment_id/status
 * @access  Private
 */
exports.checkPaymentStatus = asyncHandler(async (req, res) => {
  const { payment_id } = req.params;

  const payment = await Payment.findById(payment_id);
  if (!payment) {
    return res.status(404).json(ApiResponse.error('Thanh toán không tồn tại', 404));
  }

  // Nếu là tiền mặt hoặc đã thanh toán, trả về luôn
  if (payment.payment_type === 'CASH' || payment.payment_status === 'COMPLETED') {
    return res.status(200).json(
      ApiResponse.success(
        {
          payment_status: payment.payment_status,
          payment_type: payment.payment_type,
          amount: payment.amount
        },
        'Lấy trạng thái thanh toán thành công'
      )
    );
  }

  // Nếu là chuyển khoản, check lại với PayOS
  if (payment.payment_type === 'BANK_TRANSFER' && payment.order_code) {
    const paymentInfo = await payosService.getPaymentInfo(payment.order_code);

    if (paymentInfo.success) {
      const { status, ...rest } = paymentInfo.data;

      // Cập nhật status nếu thay đổi
      if (status === 'PAID' && payment.payment_status !== 'COMPLETED') {
        payment.payment_status = 'COMPLETED';
        payment.paid_at = new Date();
        await payment.save();

        // Cập nhật order
        const order = await InternalOrder.findById(payment.order_id);
        if (order) {
          order.payment_status = 'PAID';
          await order.save();
        }
      }

      return res.status(200).json(
        ApiResponse.success(
          {
            payment_status: payment.payment_status,
            payment_type: payment.payment_type,
            payos_status: status,
            amount: payment.amount,
            paid_at: payment.paid_at
          },
          'Lấy trạng thái thanh toán thành công'
        )
      );
    }
  }

  return res.status(200).json(
    ApiResponse.success(
      {
        payment_status: payment.payment_status,
        payment_type: payment.payment_type,
        amount: payment.amount
      },
      'Lấy trạng thái thanh toán thành công'
    )
  );
});

/**
 * @desc    Hủy thanh toán
 * @route   PUT /api/payments/:payment_id/cancel
 * @access  Private
 */
exports.cancelPayment = asyncHandler(async (req, res) => {
  const { payment_id } = req.params;

  const payment = await Payment.findById(payment_id);
  if (!payment) {
    return res.status(404).json(ApiResponse.error('Thanh toán không tồn tại', 404));
  }

  // Không được hủy thanh toán đã hoàn thành
  if (payment.payment_status === 'COMPLETED') {
    return res.status(400).json(
      ApiResponse.error('Không thể hủy thanh toán đã hoàn thành', 400)
    );
  }

  // Nếu là chuyển khoản, hủy tại PayOS
  if (payment.payment_type === 'BANK_TRANSFER' && payment.order_code) {
    const cancelResult = await payosService.cancelPayment(payment.order_code);
    if (!cancelResult.success) {
      return res.status(500).json(
        ApiResponse.error('Lỗi hủy thanh toán tại PayOS', 500)
      );
    }
  }

  // Cập nhật payment status
  payment.payment_status = 'CANCELLED';
  await payment.save();

  // Cập nhật order status
  const order = await InternalOrder.findById(payment.order_id);
  if (order) {
    order.payment_status = 'UNPAID';
    await order.save();
  }

  return res.status(200).json(
    ApiResponse.success(payment, 'Hủy thanh toán thành công')
  );
});

/**
 * @desc    Lấy danh sách tất cả thanh toán (Admin)
 * @route   GET /api/payments
 * @access  Private (Admin only)
 */
exports.getAllPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, payment_type, order_id } = req.query;

  const filter = {};
  if (status) filter.payment_status = status;
  if (payment_type) filter.payment_type = payment_type;
  if (order_id) filter.order_id = order_id;

  const payments = await Payment.find(filter)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Payment.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.success(
      {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      },
      'Lấy danh sách thanh toán thành công'
    )
  );
});

/**
 * @desc    PayOS return URL callback (khi khách hàng thanh toán xong)
 * @route   GET /api/payments/callback
 * @access  Public
 */
exports.paymentCallback = asyncHandler(async (req, res) => {
  try {
    const { code, id, cancel, status, orderCode } = req.query;

    console.log('\n' + '='.repeat(80));
    console.log('🔵 [CALLBACK] Payment Callback Received');
    console.log('='.repeat(80));
    console.log('Query Parameters:', {
      code,
      id,
      cancel,
      status,
      orderCode,
      timestamp: new Date().toISOString()
    });
    console.log('='.repeat(80) + '\n');

    // Nếu khách hàng cancel
    if (cancel === 'true' || code !== '00') {
      console.log('⚠️ [CALLBACK] Payment cancelled by user or failed');
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-failed?orderCode=${orderCode}&reason=cancelled`
      );
    }

    // Tìm Payment theo orderCode - Try multiple formats
    console.log('🔍 [CALLBACK] Searching for payment with orderCode variants...');
    
    let payment = null;
    const searchVariants = [
      { type: 'string', value: orderCode },
      { type: 'number', value: parseInt(orderCode) },
      { type: 'string-trimmed', value: String(orderCode).trim() }
    ];

    for (const variant of searchVariants) {
      console.log(`   → Try ${variant.type}: ${variant.value}`);
      payment = await Payment.findOne({ order_code: variant.value });
      if (payment) {
        console.log(`   ✅ Found with ${variant.type}!`);
        break;
      }
    }

    if (!payment) {
      console.error('❌ [CALLBACK] Payment NOT FOUND with any orderCode variant:', orderCode);
      console.error('   Please check:');
      console.error('   1. Order code format in database');
      console.error('   2. Run: db.payment.findOne({ order_code: "' + orderCode + '" })');
      console.error('   3. Run: db.payment.findOne({ order_code: ' + parseInt(orderCode) + ' })');
      
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-failed?orderCode=${orderCode}&reason=not_found`
      );
    }

    console.log('✅ [CALLBACK] Found payment:', {
      paymentId: payment._id,
      orderId: payment.order_id,
      currentStatus: payment.payment_status,
      paymentType: payment.payment_type
    });

    // Nếu payment đã được webhook xử lý trước đó
    if (payment.payment_status === 'COMPLETED') {
      console.log('✅ [CALLBACK] Payment already COMPLETED (processed by webhook earlier)');
      console.log('   Redirecting to success page...\n');
      
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?orderCode=${orderCode}&paymentId=${payment._id}`
      );
    }

    // Update payment status (callback priority)
    console.log('📝 [CALLBACK] Updating payment status: PENDING → COMPLETED');
    payment.payment_status = 'COMPLETED';
    payment.payos_transaction_id = id;
    payment.paid_at = new Date();
    const savedPayment = await payment.save();
    console.log('   ✅ Payment saved with status: ' + savedPayment.payment_status);

    // Update order status
    console.log('📝 [CALLBACK] Updating order status: UNPAID → PAID');
    const order = await InternalOrder.findById(payment.order_id);
    if (order) {
      order.payment_status = 'PAID';
      const savedOrder = await order.save();
      console.log('   ✅ Order saved with status: ' + savedOrder.payment_status);
    } else {
      console.warn('⚠️ [CALLBACK] Order not found, but payment updated');
    }

    console.log('\n✅ [CALLBACK] SUCCESS - All Updates Complete:');
    console.log({
      orderCode,
      paymentId: payment._id,
      orderId: payment.order_id,
      newPaymentStatus: payment.payment_status,
      newOrderStatus: order?.payment_status,
      paidAt: payment.paid_at,
      transactionId: id
    });
    console.log('='.repeat(80) + '\n');

    // Redirect về trang success
    return res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?orderCode=${orderCode}&paymentId=${payment._id}`
    );
  } catch (error) {
    console.error('\n❌ [CALLBACK] ERROR Processing Payment Callback:');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('='.repeat(80) + '\n');
    
    return res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-error?error=${encodeURIComponent(error.message)}`
    );
  }
});
