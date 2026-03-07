# 💳 HƯỚNG DẪN TÍCH HỢP THANH TOÁN PAYOS

## 📋 Tổng quan

Hệ thống thanh toán hỗ trợ **2 phương thức**:
1. **Tiền mặt (CASH)** - Thanh toán trực tiếp, trạng thái `PAID` ngay lập tức
2. **Chuyển khoản (BANK_TRANSFER)** - Tạo mã QR và tích hợp PayOS

---

## 🚀 BƯỚC 1: Cài đặt Dependencies

```bash
npm install
```

Các package sẽ được cài:
- `axios` - Gọi API PayOS
- `qrcode` - Tạo mã QR

---

## 🔑 BƯỚC 2: Đăng ký PayOS

### 2.1 Tạo tài khoản PayOS
- Truy cập: https://dashboard.payos.vn
- Đăng ký tài khoản merchant
- Xác minh email

### 2.2 Lấy thông tin API
1. Vào Dashboard → Settings → API Keys
2. Copy 3 thông tin này:
   - **Client ID** (PAYOS_CLIENT_ID)
   - **API Key** (PAYOS_API_KEY)
   - **Checksum Key** (PAYOS_CHECKSUM_KEY)

### 2.3 Lấy thông tin tài khoản ngân hàng
1. Vào Settings → Bank Account
2. Copy:
   - Bank Code (ví dụ: VIETCOMBANK)
   - Account Number
   - Account Name

---

## 📝 BƯỚC 3: Cấu hình .env

Sao chép từ `.env.example` và điền thông tin:

```env
# PayOS Configuration
PAYOS_CLIENT_ID=cli_xxxxxxxxxx
PAYOS_API_KEY=xxx-yyy-zzz
PAYOS_CHECKSUM_KEY=checksum_key_here
PAYOS_BASE_URL=https://api.payos.vn
PAYOS_RETURN_URL=http://localhost:3000/api/payments/callback

# Bank Account Information
BANK_CODE=VIETCOMBANK
BANK_ACCOUNT_NUMBER=1234567890
BANK_ACCOUNT_NAME=Restaurant ABC
```

---

## 🔄 BƯỚC 4: Flow sử dụng

### Flow A: Thanh toán Tiền mặt

```
1. Khách hàng tạo đơn hàng
   POST /api/internal-orders
   {
     store_org_unit_id: "store-123",
     // ... dữ liệu đơn hàng khác
   }
   Response: { order_id, total_amount, ... }

2. Khách hàng tạo thanh toán CASH
   POST /api/payments/create
   {
     order_id: "order-123",
     payment_type: "CASH"
   }
   
   Response:
   {
     payment: {
       _id: "payment-uuid",
       payment_no: "PAY-1234567890",
       payment_status: "COMPLETED",  ✅ Thanh toán ngay
       payment_type: "CASH",
       amount: 500000,
       paid_at: "2026-03-07T10:00:00Z"
     }
   }

3. Lấy thông tin thanh toán
   GET /api/payments/:payment_id
```

**Luồng tiền mặt:**
- Tạo payment → Status = COMPLETED (ngay)
- Update order.payment_status = PAID
- Khách hàng thanh toán trực tiếp tại quầy

---

### Flow B: Thanh toán Chuyển khoản (PayOS)

```
1. Khách hàng tạo đơn hàng
   POST /api/internal-orders
   {
     store_org_unit_id: "store-123",
     total_amount: 500000,
     // ...
   }
   Response: { order_id, total_amount, ... }

2. Khách hàng tạo thanh toán TRANSFER
   POST /api/payments/create
   {
     order_id: "order-123",
     payment_type: "BANK_TRANSFER"
   }
   
   Response:
   {
     payment: {
       _id: "payment-uuid",
       payment_no: "PAY-1234567890",
       payment_status: "PENDING",      ⏳ Chờ thanh toán
       payment_type: "BANK_TRANSFER",
       amount: 500000,
       order_code: "1234567890",
       reference_code: "ORD-2026-001"
     },
     qr_code: "data:image/png;base64,...",  📱 QR code
     bank_info: {
       bank_code: "VIETCOMBANK",
       account_number: "1234567890",
       account_name: "Restaurant ABC"
     },
     payos_link: "https://payos.vn/checkout?id=xxxx"
   }

3. Khách hàng quét mã QR hoặc click payos_link
   - Nhập số tiền: 500000
   - Nội dung: "Thanh toán đơn hàng ORD-2026-001"
   - Gửi ngân hàng

4. PayOS xác nhận → Gửi webhook
   POST /api/payments/webhook/payos
   
5. Backend cập nhật:
   - payment.payment_status = COMPLETED
   - order.payment_status = PAID
   - payment.paid_at = Date.now()

6. Check trạng thái (tuỳ chọn)
   GET /api/payments/:payment_id/status
   
   Response:
   {
     payment_status: "COMPLETED",
     payment_type: "BANK_TRANSFER",
     amount: 500000,
     paid_at: "2026-03-07T10:15:00Z"
   }
```

**Luồng chuyển khoản:**
- Tạo payment → Status = PENDING
- Trả về QR code + PayOS link
- Khách hàng quét QR → Chuyển khoản
- PayOS webhook → Cập nhật status = COMPLETED
- Update order.payment_status = PAID

---

## 📡 API ENDPOINTS

### **1. Tạo thanh toán**
```
POST /api/payments/create
Header: Authorization: Bearer {token}

Body:
{
  "order_id": "order-uuid",
  "payment_type": "CASH" | "BANK_TRANSFER"
}

Response (CASH):
{
  "success": true,
  "data": {
    "payment": { ... },
    "order": { ... },
    "message": "Thanh toán tiền mặt thành công"
  }
}

Response (BANK_TRANSFER):
{
  "success": true,
  "data": {
    "payment": { ... },
    "qr_code": "data:image/png;base64,...",
    "bank_info": { ... },
    "payos_link": "https://payos.vn/checkout?...",
    "message": "Thanh toán chuyển khoản thành công"
  }
}
```

### **2. Lấy thông tin thanh toán**
```
GET /api/payments/:payment_id
Header: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "_id": "payment-uuid",
    "payment_no": "PAY-1234567890",
    "order_id": "order-uuid",
    "amount": 500000,
    "payment_type": "BANK_TRANSFER" | "CASH",
    "payment_status": "PENDING" | "COMPLETED" | "FAILED",
    ...
  }
}
```

### **3. Lấy thanh toán theo đơn hàng**
```
GET /api/payments/order/:order_id
Header: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [ { ... } ]
}
```

### **4. Check trạng thái thanh toán**
```
GET /api/payments/:payment_id/status
Header: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "payment_status": "COMPLETED",
    "payment_type": "BANK_TRANSFER",
    "amount": 500000,
    "paid_at": "2026-03-07T10:15:00Z"
  }
}
```

### **5. Hủy thanh toán**
```
PUT /api/payments/:payment_id/cancel
Header: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": { ... }
}
```

### **6. Webhook từ PayOS**
```
POST /api/payments/webhook/payos
(Công khai - không cần token)

Body:
{
  "data": { ... },
  "signature": "signature_string"
}

Response:
{
  "success": true,
  "data": {
    "message": "Payment processed successfully"
  }
}
```

### **7. Danh sách thanh toán (Admin)**
```
GET /api/payments?page=1&limit=20&status=COMPLETED&payment_type=CASH
Header: Authorization: Bearer {token}
(Cần role ADMIN hoặc MANAGER)

Response:
{
  "success": true,
  "data": {
    "payments": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

---

## 🧪 TESTING VỚI POSTMAN

### Test Case 1: Thanh toán Tiền mặt

1. **Tạo đơn hàng**
```
POST http://localhost:3000/api/internal-orders
Header: Authorization: Bearer {your_token}

Body:
{
  "store_org_unit_id": "store-001",
  "items": [
    {
      "item_id": "item-001",
      "quantity": 2,
      "unit_price": 250000
    }
  ]
}
```

2. **Tạo thanh toán CASH**
```
POST http://localhost:3000/api/payments/create
Header: Authorization: Bearer {your_token}

Body:
{
  "order_id": "{order_id_from_step_1}",
  "payment_type": "CASH"
}
```

3. **Kiểm tra kết quả**: Status phải là `COMPLETED` ngay

---

### Test Case 2: Thanh toán Chuyển khoản

1. **Tạo đơn hàng**
```
POST http://localhost:3000/api/internal-orders
Header: Authorization: Bearer {your_token}

Body:
{
  "store_org_unit_id": "store-001",
  "items": [
    {
      "item_id": "item-001",
      "quantity": 2,
      "unit_price": 250000
    }
  ]
}
```

2. **Tạo thanh toán TRANSFER**
```
POST http://localhost:3000/api/payments/create
Header: Authorization: Bearer {your_token}

Body:
{
  "order_id": "{order_id_from_step_1}",
  "payment_type": "BANK_TRANSFER"
}
```

3. **Kiểm tra kết quả**:
   - Status: `PENDING`
   - Có `qr_code` (hình ảnh PNG dạng base64)
   - Có `bank_info` (thông tin tài khoản ngân hàng)
   - Có `payos_link` (link thanh toán PayOS)

4. **Check trạng thái**
```
GET http://localhost:3000/api/payments/{payment_id}/status
Header: Authorization: Bearer {your_token}
```

---

## ⚙️ WEBHOOK CONFIGURATION

### Setup Webhook tại PayOS Dashboard

1. Vào Dashboard → Webhooks
2. Thêm URL webhook:
   ```
   https://yourdomain.com/api/payments/webhook/payos
   ```
3. Chọn events:
   - Payment successful
   - Payment failed
   - Payment expired

### Test Webhook locally (dùng ngrok)

```bash
# Cài đặt ngrok
# https://ngrok.com/download

# Chạy ngrok
ngrok http 3000

# Ngrok sẽ cho URL như:
# https://abc123.ngrok.io

# Update PAYOS_RETURN_URL trong .env
PAYOS_RETURN_URL=https://abc123.ngrok.io/api/payments/callback
```

---

## 📊 DATABASE SCHEMA

### Payment Collection

```javascript
{
  _id: UUID,
  payment_no: "PAY-1234567890",           // Unique payment number
  order_id: "order-uuid",                  // FK to InternalOrder
  amount: 500000,                          // Amount in VND
  currency: "VND",
  payment_method: "CASH" | "TRANSFER",     // Payment method
  payment_status: "PENDING" | "COMPLETED" | "FAILED",
  payment_type: "CASH" | "BANK_TRANSFER",
  
  // PayOS fields
  payos_transaction_id: "txn-123",
  payos_request_id: "req-123",
  qr_code: "data:image/png;base64,...",
  qr_code_base64: "data:image/...",
  
  // Bank info
  bank_account_name: "Restaurant ABC",
  bank_account_number: "1234567890",
  bank_code: "VIETCOMBANK",
  
  // Reference
  reference_code: "ORD-2026-001",
  order_code: "1234567890",
  
  // Metadata
  created_by: "user-uuid",
  paid_at: ISODate,
  metadata: {},
  created_at: ISODate,
  updated_at: ISODate
}
```

### InternalOrder updated fields

```javascript
{
  // ... existing fields
  payment_id: "payment-uuid",              // NEW: FK to Payment
  payment_status: "UNPAID" | "PAID" | "FAILED" | "CANCELLED"  // NEW
}
```

---

## 🔒 SECURITY

### Signature Verification
- Mọi webhook từ PayOS đều có signature
- Server verify signature bằng checksum key
- Bảo vệ chống giả mạo webhook

### Best Practices
1. **Luôn verify signature** khi nhận webhook
2. **Không lưu API key** trong code - dùng .env
3. **HTTPS only** - dùng ngrok hoặc domain thực
4. **Idempotent webhooks** - xử lý webhook duplicate
5. **Timeout** - đặt timeout cho API calls

---

## ❌ TROUBLESHOOTING

### 1. Lỗi: "Signature không hợp lệ"
- Kiểm tra PAYOS_CHECKSUM_KEY có chính xác không
- Đảm bảo payload không bị thay đổi
- Log payload để debug

### 2. Lỗi: "Payment intent creation failed"
- Kiểm tra PAYOS_CLIENT_ID và PAYOS_API_KEY
- Kiểm tra amount > 0
- Kiểm tra kết nối internet

### 3. QR code không hiển thị
- Kiểm tra BANK_ACCOUNT_NUMBER có hợp lệ
- Kiểm tra BANK_CODE
- Thử tạo QR lại

### 4. Webhook không nhận
- Kiểm tra webhook URL tại PayOS Dashboard
- Dùng ngrok để test local
- Check firewall/security groups
- Verify signature bị sai

---

## 📚 REFERENCES

- [PayOS Documentation](https://docs.payos.vn)
- [QR Code Standard](https://www.mbbank.com.vn/vqr)
- [PayOS Webhook Guide](https://docs.payos.vn/webhooks)

---

## ✅ CHECKLIST

- [x] Cài đặt dependencies (axios, qrcode)
- [x] Tạo Payment Model
- [x] Cập nhật InternalOrder Model
- [x] Tạo PayOS Service
- [x] Tạo Payment Controller
- [x] Tạo Payment Routes
- [x] Cập nhật routes/index.js
- [x] Tạo .env.example
- [ ] Đăng ký PayOS account
- [ ] Lấy API keys
- [ ] Copy .env.example → .env
- [ ] Điền PayOS config
- [ ] Test CASH payment
- [ ] Test BANK_TRANSFER payment
- [ ] Setup webhook tại PayOS
- [ ] Test webhook
- [ ] Deploy to production

---

## 🎯 TIẾP THEO

1. **Thêm Promotion/Discount** - Giảm giá trên payment
2. **Payment History** - Lịch sử thanh toán chi tiết
3. **Refund** - Hoàn tiền
4. **Multi-currency** - Hỗ trợ nhiều đơn vị tiền tệ
5. **E-Invoice** - Xuất hóa đơn điện tử
