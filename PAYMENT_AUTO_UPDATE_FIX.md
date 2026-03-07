# 🔧 FIX: Payment Status Not Auto-Updating - ROOT CAUSE FOUND & FIXED

## 🎯 Root Cause Identified

**Problem:** Curl test hoạt động nhưng real PayOS payment không tự động update status

**Root Cause:** ❌ **PAYOS_RETURN_URL trỏ sai**
```env
# ❌ WRONG (trỏ tới FRONTEND)
PAYOS_RETURN_URL=http://localhost:3000/api/payments/callback

# ✅ CORRECT (trỏ tới BACKEND)
PAYOS_RETURN_URL=http://localhost:5001/api/payments/callback
```

**Why?** 
- PayOS redirect qua `PAYOS_RETURN_URL` sau khi thanh toán
- Nếu trỏ tới frontend (3000), PayOS sẽ gửi request tới frontend
- Frontend không có endpoint `/api/payments/callback`
- Backend callback handler không được gọi → status không update

---

## ✅ Fixes Applied

### 1. **Fix .env Configuration**
**File:** `.env`

```env
# ✅ BEFORE
PAYOS_RETURN_URL=http://localhost:3000/api/payments/callback

# ✅ AFTER
PAYOS_RETURN_URL=http://localhost:5001/api/payments/callback
PAYOS_CANCEL_URL=http://localhost:3000/payment-failed
```

### 2. **Update payosService.js**
**File:** `src/utils/payosService.js`

**Change 1: Constructor**
```javascript
// ✅ ADDED
this.cancelUrl = process.env.PAYOS_CANCEL_URL || 'http://localhost:3000/payment-failed';

console.log('🔵 PayOS URLs:', {
  returnUrl: this.returnUrl,
  cancelUrl: this.cancelUrl
});
```

**Change 2: Payload in createPaymentIntent()**
```javascript
// ❌ OLD
cancelUrl: cancelUrl || `${this.returnUrl}?status=cancelled`,

// ✅ NEW
cancelUrl: cancelUrl || this.cancelUrl,
```

---

## 🚀 How It Works Now

### **Payment Flow After Fix:**

```
1. User creates order + payment
   ↓
2. Backend returns PayOS checkout_url with:
   - returnUrl: http://localhost:5001/api/payments/callback  ✅
   - cancelUrl: http://localhost:3000/payment-failed
   ↓
3. User scans QR or clicks checkout link
   ↓
4. User completes payment in PayOS
   ↓
5. PayOS redirects to: http://localhost:5001/api/payments/callback?code=00&id=...
   ↓
6. Backend callback handler processes:
   - Finds payment by orderCode
   - Updates payment_status → COMPLETED
   - Updates order_status → PAID
   - Saves to MongoDB
   ↓
7. Backend redirects to: http://localhost:3000/payment-success  ✅
   ↓
8. Frontend shows success page
```

---

## 🔍 Testing After Fix

### **Step 1: Restart Server**
```bash
# Stop current server (Ctrl+C)
# Then restart
npm start
```

**Look for this log:**
```
🔵 PayOS URLs: {
  returnUrl: 'http://localhost:5001/api/payments/callback',
  cancelUrl: 'http://localhost:3000/payment-failed'
}
```

### **Step 2: Create New Order & Payment**
```bash
POST http://localhost:5001/api/payments/create
Headers: Authorization: Bearer <TOKEN>
Body: { "order_id": "...", "payment_type": "BANK_TRANSFER" }
```

**Check response:**
```json
{
  "checkout_url": "https://payos-link.com/web/..."  // Should have returnUrl=localhost:5001
}
```

### **Step 3: Test Callback Manually**
```bash
curl "http://localhost:5001/api/payments/callback?code=00&id=test&orderCode=1234567890"
```

**Expected logs:**
```
🔵 [CALLBACK] Payment Callback Received
✅ [CALLBACK] Found payment: ...
📝 [CALLBACK] Updating payment status: PENDING → COMPLETED
✅ [CALLBACK] SUCCESS - All Updates Complete:
```

### **Step 4: Verify Database**
```bash
db.payment.findOne({ order_code: "1234567890" })
# Should show: payment_status: "COMPLETED", paid_at: <timestamp>
```

### **Step 5: Test With Real PayOS**
1. Create payment
2. Scan real QR code or click checkout link
3. Complete payment in PayOS
4. Should auto-redirect to success page
5. Check MongoDB for status update

---

## 📊 Comparison: Before vs After

| Component | Before ❌ | After ✅ |
|-----------|----------|---------|
| PAYOS_RETURN_URL | localhost:3000 | localhost:5001 |
| PAYOS_CANCEL_URL | Not set | localhost:3000/payment-failed |
| Callback on Payment | ❌ Not called | ✅ Called |
| Status Update | ❌ No | ✅ Yes |
| Frontend Redirect | ❌ No | ✅ Yes |

---

## 🔐 Production Deployment

When deploying to production, update `.env`:

```env
# ✅ PRODUCTION
PAYOS_RETURN_URL=https://api.yourdomain.com/api/payments/callback
PAYOS_CANCEL_URL=https://yourdomain.com/payment-failed
```

**Ensure:**
- SSL/HTTPS enabled
- Domain DNS configured
- PayOS webhook also configured with HTTPS URLs

---

## ✨ Summary

**The Issue:** ReturnUrl was pointing to frontend instead of backend  
**The Fix:** Changed PAYOS_RETURN_URL to backend API endpoint  
**The Result:** Callback handler now gets called → Status auto-updates  
**Testing:** Restart server and test with new order

---

## 📝 Checklist

- [x] Identified root cause: returnUrl pointing to frontend
- [x] Fixed `.env` PAYOS_RETURN_URL
- [x] Added PAYOS_CANCEL_URL to `.env`
- [x] Updated `payosService.js` to use cancelUrl from .env
- [x] Enhanced logging to show URLs on startup
- [ ] Restart server (NEXT STEP)
- [ ] Test with new order
- [ ] Verify database updates
- [ ] Test real PayOS flow

**Next:** Restart server and create new order to test! 🚀
