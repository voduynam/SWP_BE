# 📚 Swagger API Documentation - Cập Nhật Hoàn Chỉnh

## 🎯 Vấn đề Tìm Thấy

**Trước đây Swagger không có:**
- ❌ JSON mẫu (examples)
- ❌ Mô tả chi tiết cho các trường
- ❌ Giá trị mặc định (default values)
- ❌ Các trường giá cả (cost_price, base_sell_price)
- ❌ Hướng dẫn cách sử dụng

---

## ✅ Những Gì Đã Được Cập Nhật

### 1. 📦 **Item Schema** 
**File:** `src/routes/item.routes.js`

#### Cải thiện:
✅ Thêm **tất cả 10 trường** từ Item model:
- `_id`, `sku`, `name`, `item_type`
- `base_uom_id`, `category_id`
- **`cost_price`** ← Giá vốn (thêm mới)
- **`base_sell_price`** ← Giá bán cơ bản (thêm mới)
- `tracking_type`, `shelf_life_days`, `status`

✅ Thêm **ví dụ JSON đầy đủ:**
```json
{
  "_id": "item_1710241234567",
  "sku": "PRD-001",
  "name": "Sản phẩm A",
  "item_type": "FINISHED",
  "base_uom_id": "uom_kg",
  "category_id": "cat_001",
  "tracking_type": "LOT_EXPIRY",
  "shelf_life_days": 365,
  "cost_price": 50000,
  "base_sell_price": 75000,
  "status": "ACTIVE"
}
```

✅ Thêm **mô tả chi tiết** cho mỗi trường
✅ Sửa `enum` cho `item_type`: `[RAW, FINISHED]` (chuẩn model)

---

### 2. 📋 **Internal Order Schema**
**File:** `src/routes/internalOrder.routes.js`

#### Cải thiện Item Schema:
✅ Thêm **14 trường chi tiết** cho InternalOrder
✅ Thêm **description giải thích** cho mỗi trường
✅ Đặt `required` fields: `lines` bắt buộc
✅ Thêm **JSON ví dụ đầy đủ**

#### Cải thiện InternalOrderLine Schema:
✅ Thêm **`unit_price` với ghi chú quan trọng:**
```markdown
(OPTIONAL) - Auto-fetched from Item.base_sell_price if not provided
```

#### 🆕 **Cập Nhật POST /api/internal-orders:**

**Mô tả mới:**
- 📝 Hướng dẫn rõ ràng về **auto-fetch price**
- 📝 2 ví dụ JSON:
  1. **RECOMMENDED**: Auto-fetch price (không cần unit_price)
  2. **Override**: Cung cấp unit_price nếu cần

```javascript
// ✅ VÍ DỤ 1: Tự động lấy giá (RECOMMENDED)
{
  "lines": [
    {
      "item_id": "item_001",
      "qty_ordered": 10,
      "uom_id": "uom_kg"
      // Không cần unit_price → auto-fetch từ Item
    }
  ],
  "is_urgent": false
}

// VÍ DỤ 2: Override giá nếu cần
{
  "lines": [
    {
      "item_id": "item_001",
      "qty_ordered": 10,
      "uom_id": "uom_kg",
      "unit_price": 85000  // Override
    }
  ],
  "is_urgent": false
}
```

#### 🆕 **Cập Nhật POST /api/internal-orders/{id}/lines:**
✅ Thêm **chi tiết về DRAFT status requirement**
✅ 2 ví dụ: auto-fetch vs override price

---

### 3. 🚚 **Shipment Schema**
**File:** `src/routes/shipment.routes.js`

#### Cải thiện:
✅ Thêm **tất cả 9 trường** từ Shipment model:
- `_id`, `shipment_no`, `order_id`
- `from_location_id`, `to_location_id`, `ship_date`
- `status`, `delivery_photo_url`, `delivery_photo_uploaded_at`
- `created_by`

✅ Thêm **ví dụ JSON hoàn chỉnh**
✅ Mô tả `nullable` cho delivery_photo
✅ Shipment status enum: `[DRAFT, PICKED, SHIPPED, IN_TRANSIT, DELIVERED, CANCELLED]`

#### Cải thiện ShipmentLine:
✅ Thêm **5 trường** đầy đủ
✅ Ghi chú `nullable` cho `order_line_id`

---

### 4. 📦 **Goods Receipt Schema** (MỚI)
**File:** `src/routes/goodsReceipt.routes.js`

#### Thêm Schema Mới:
✅ GoodsReceipt schema:
- `_id`, `receipt_no`, `shipment_id`
- `received_date`, `status`, `received_by`
- Status enum: `[DRAFT, RECEIVED, PARTIAL, CANCELLED]`

✅ GoodsReceiptLine schema:
- `_id`, `receipt_id`, `shipment_line_id`
- `item_id`, `qty_received`, `qty_rejected`

✅ Thêm **JSON examples đầy đủ**
✅ Cập nhật POST endpoint với **mô tả hoạt động workflow**

---

## 📊 Swagger JSON Examples - Chi Tiết

### Item Example
```json
{
  "_id": "item_1710241234567",
  "sku": "PRD-001",
  "name": "Sản phẩm A",
  "item_type": "FINISHED",
  "base_uom_id": "uom_kg",
  "category_id": "cat_001",
  "tracking_type": "LOT_EXPIRY",
  "shelf_life_days": 365,
  "cost_price": 50000,
  "base_sell_price": 75000,
  "status": "ACTIVE"
}
```

### InternalOrder Example
```json
{
  "_id": "ord_1710241234567",
  "order_no": "SO-0001",
  "store_org_unit_id": "store_001",
  "order_date": "2026-03-12T10:30:00Z",
  "status": "DRAFT",
  "total_amount": 750000,
  "currency": "VND",
  "is_urgent": false,
  "created_by": "user_123"
}
```

### InternalOrderLine Example
```json
{
  "_id": "ord_line_1710241234567_0",
  "order_id": "ord_1710241234567",
  "item_id": "item_001",
  "qty_ordered": 10,
  "uom_id": "uom_kg",
  "unit_price": 75000,
  "line_total": 750000
}
```

### Shipment Example
```json
{
  "_id": "ship_1710241234567",
  "shipment_no": "SHP-0001",
  "order_id": "ord_1710241234567",
  "from_location_id": "loc_kitchen",
  "to_location_id": "loc_store_001",
  "ship_date": "2026-03-12T14:00:00Z",
  "status": "SHIPPED",
  "delivery_photo_url": null,
  "delivery_photo_uploaded_at": null,
  "created_by": "user_123"
}
```

### GoodsReceipt Example
```json
{
  "_id": "gr_1710241234567",
  "receipt_no": "GR-0001",
  "shipment_id": "ship_1710241234567",
  "received_date": "2026-03-12T15:30:00Z",
  "status": "RECEIVED",
  "received_by": "user_456"
}
```

---

## 🎨 Swagger UI Hiển Thị

Khi mở Swagger tại `http://localhost:3000/api-docs`:

### Trước:
```
❌ Trống trơn, không có ví dụ
❌ Chỉ liệt kê tên field
❌ Người dùng phải đoán giá trị
```

### Sau:
```
✅ JSON mẫu hoàn chỉnh
✅ Mỗi field có mô tả chi tiết
✅ Hiển thị kiểu dữ liệu, giá trị mặc định
✅ Ví dụ có thể copy-paste trực tiếp
✅ Hướng dẫn cách sử dụng (auto-fetch price, etc)
```

---

## 🔍 Cách Kiểm Tra

### 1. **Kiểm Tra Swagger UI:**
```bash
# Khởi động server
npm start
# Hoặc node server.js

# Truy cập:
http://localhost:3000/api-docs
```

### 2. **Click vào các endpoint để xem:**
- `GET /api/items` - Xem Item schema & example
- `POST /api/internal-orders` - Xem 2 ví dụ request
- `GET /api/shipments/{id}` - Xem Shipment schema
- `GET /api/goods-receipts` - Xem GoodsReceipt schema

---

## 📝 Files Đã Cập Nhật

| File | Cải thiện |
|------|----------|
| `src/routes/item.routes.js` | ✅ Item schema + examples |
| `src/routes/internalOrder.routes.js` | ✅ InternalOrder/Line schemas + 2 request examples |
| `src/routes/shipment.routes.js` | ✅ Shipment/Line schemas + examples |
| `src/routes/goodsReceipt.routes.js` | ✅ GoodsReceipt/Line schemas (NEW) |

---

## ⚡ Lợi Ích

| Trước | Sau |
|-------|-----|
| ❌ Không biết format request | ✅ JSON examples sẵn sàng copy |
| ❌ Thiếu kiến thức về fields | ✅ Mô tả chi tiết mỗi field |
| ❌ Không hiểu giá cách để | ✅ Giải thích auto-fetch price |
| ❌ Hay nhập sai | ✅ Ví dụ chính xác để follow |
| ❌ Tốn thời gian | ✅ Nhanh hơn, clear hơn |

---

## 🚀 Next Steps

Khi cần thêm schema mới:

```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     MySchema:
 *       type: object
 *       required:
 *         - field1
 *       properties:
 *         field1:
 *           type: string
 *           description: "Mô tả chi tiết"
 *           example: "ví dụ giá trị"
 *       example:
 *         field1: "value1"
 *         field2: "value2"
 */
```

---

**Ngày cập nhật:** 12/03/2026  
**Status:** ✅ Hoàn thành & Kiểm tra syntax
