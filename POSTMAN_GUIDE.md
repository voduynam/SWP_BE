# Hướng dẫn Test API với Postman

File này hướng dẫn cách test các API endpoints của hệ thống Quản lý Bếp Trung Tâm và Cửa hàng Franchise qua Postman.

## Cấu hình cơ bản

### Base URL
```
http://localhost:5000/api
```

### Headers mặc định
Đối với các API yêu cầu authentication, thêm header:
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

---

## 1. Authentication APIs

### 1.1. Đăng ký User (Register)
**POST** `/api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "_id": "user_test_001",
  "org_unit_id": "org_store_q1",
  "username": "testuser",
  "password": "123456",
  "full_name": "Nguyễn Văn Test",
  "role_ids": ["role_store"]
}
```

**Response mẫu:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_test_001",
      "username": "testuser",
      "full_name": "Nguyễn Văn Test",
      "org_unit_id": "org_store_q1"
    }
  },
  "statusCode": 201
}
```

---

### 1.2. Đăng nhập (Login)
**POST** `/api/auth/login`

**Body (JSON):**
```json
{
  "username": "admin",
  "password": "123456"
}
```

**Response mẫu:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_admin",
      "username": "admin",
      "full_name": "System Admin",
      "org_unit_id": "org_kitchen_hcm",
      "roles": [
        {
          "id": "role_admin",
          "code": "ADMIN",
          "name": "Administrator"
        }
      ]
    }
  },
  "statusCode": 200
}
```

**Lưu ý:** Copy token từ response để sử dụng cho các API khác.

---

### 1.3. Lấy thông tin User hiện tại
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response mẫu:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "user_admin",
    "username": "admin",
    "full_name": "System Admin",
    "org_unit_id": "org_kitchen_hcm",
    "org_unit": {
      "_id": "org_kitchen_hcm",
      "name": "Bếp Trung Tâm HCM"
    },
    "status": "ACTIVE",
    "roles": [...]
  },
  "statusCode": 200
}
```

---

## 2. Item APIs

### 2.1. Tạo Item mới
**POST** `/api/items`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "_id": "item_test_001",
  "sku": "RM999",
  "name": "Thịt heo ba chỉ",
  "item_type": "RAW",
  "base_uom_id": "uom_kg",
  "category_id": "cat_meat",
  "tracking_type": "LOT_EXPIRY",
  "shelf_life_days": 5,
  "cost_price": 120000,
  "base_sell_price": 0,
  "status": "ACTIVE"
}
```

**Body mẫu cho Finished Product:**
```json
{
  "_id": "item_test_002",
  "sku": "FP999",
  "name": "Sốt Carbonara (Túi 500g)",
  "item_type": "FINISHED",
  "base_uom_id": "uom_pack",
  "category_id": "cat_sauce",
  "tracking_type": "LOT_EXPIRY",
  "shelf_life_days": 30,
  "cost_price": 0,
  "base_sell_price": 150000,
  "status": "ACTIVE"
}
```

---

### 2.2. Lấy danh sách Items
**GET** `/api/items?item_type=RAW&status=ACTIVE&page=1&limit=10`

**Query Parameters:**
- `item_type`: RAW hoặc FINISHED
- `status`: ACTIVE hoặc INACTIVE
- `category_id`: ID của category
- `search`: Tìm kiếm theo tên hoặc SKU
- `page`: Số trang (mặc định: 1)
- `limit`: Số items mỗi trang (mặc định: 10)

---

### 2.3. Lấy Item theo ID
**GET** `/api/items/item_beef`

---

### 2.4. Cập nhật Item
**PUT** `/api/items/item_test_001`

**Body (JSON):**
```json
{
  "name": "Thịt heo ba chỉ (đã cập nhật)",
  "cost_price": 130000
}
```

---

## 3. Internal Order APIs

### 3.1. Tạo Internal Order
**POST** `/api/internal-orders`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "store_org_unit_id": "org_store_q1",
  "order_date": "2023-10-10",
  "lines": [
    {
      "item_id": "item_sauce_bol",
      "qty_ordered": 20,
      "uom_id": "uom_pack",
      "unit_price": 250000,
      "line_total": 5000000
    },
    {
      "item_id": "item_beef",
      "qty_ordered": 10,
      "uom_id": "uom_kg",
      "unit_price": 150000,
      "line_total": 1500000
    }
  ]
}
```

**Response mẫu:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "ord_1696934400000",
    "order_no": "SO-1002",
    "store_org_unit_id": {...},
    "order_date": "2023-10-10T00:00:00.000Z",
    "status": "DRAFT",
    "total_amount": 6500000,
    "lines": [...]
  },
  "statusCode": 201
}
```

---

### 3.2. Lấy danh sách Internal Orders
**GET** `/api/internal-orders?status=SUBMITTED&page=1&limit=10`

**Query Parameters:**
- `status`: DRAFT, SUBMITTED, APPROVED, PROCESSING, SHIPPED, RECEIVED, CANCELLED
- `store_org_unit_id`: ID của cửa hàng
- `start_date`: Ngày bắt đầu (YYYY-MM-DD)
- `end_date`: Ngày kết thúc (YYYY-MM-DD)
- `page`: Số trang
- `limit`: Số orders mỗi trang

---

### 3.3. Lấy Internal Order theo ID
**GET** `/api/internal-orders/ord_001`

---

### 3.4. Cập nhật trạng thái Order
**PUT** `/api/internal-orders/ord_001/status`

**Body (JSON):**
```json
{
  "status": "SUBMITTED"
}
```

**Các trạng thái hợp lệ:**
- `DRAFT` → `SUBMITTED`
- `SUBMITTED` → `APPROVED`
- `APPROVED` → `PROCESSING`
- `PROCESSING` → `SHIPPED`
- `SHIPPED` → `RECEIVED`

---

### 3.5. Thêm dòng vào Order
**POST** `/api/internal-orders/ord_001/lines`

**Body (JSON):**
```json
{
  "item_id": "item_tomato",
  "qty_ordered": 5,
  "uom_id": "uom_kg",
  "unit_price": 20000
}
```

---

## 4. Production Order APIs

### 4.1. Tạo Production Order
**POST** `/api/production-orders`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "planned_start": "2023-10-15T08:00:00.000Z",
  "planned_end": "2023-10-15T17:00:00.000Z",
  "lines": [
    {
      "item_id": "item_sauce_bol",
      "recipe_id": "recipe_sauce_v1",
      "planned_qty": 50,
      "uom_id": "uom_pack"
    }
  ]
}
```

---

### 4.2. Cập nhật trạng thái Production Order
**PUT** `/api/production-orders/po_001/status`

**Body (JSON):**
```json
{
  "status": "IN_PROGRESS",
  "actual_start": "2023-10-15T08:30:00.000Z"
}
```

**Các trạng thái hợp lệ:**
- `DRAFT` → `PLANNED` → `RELEASED` → `IN_PROGRESS` → `DONE`

---

### 4.3. Ghi nhận tiêu hao nguyên liệu
**POST** `/api/production-orders/po_001/consumption`

**Body (JSON):**
```json
{
  "prod_order_line_id": "po_line_01",
  "material_item_id": "item_beef",
  "lot_id": "lot_beef_A",
  "qty": 25,
  "uom_id": "uom_kg"
}
```

---

### 4.4. Ghi nhận sản phẩm đầu ra
**POST** `/api/production-orders/po_001/output`

**Body (JSON):**
```json
{
  "prod_order_line_id": "po_line_01",
  "lot_id": "lot_sauce_B",
  "qty": 50,
  "uom_id": "uom_pack"
}
```

---

## 5. Shipment APIs

### 5.1. Tạo Shipment từ Order
**POST** `/api/shipments`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "order_id": "ord_001",
  "from_location_id": "loc_ck_fg",
  "to_location_id": "loc_str_q1",
  "ship_date": "2023-10-07",
  "lines": [
    {
      "item_id": "item_sauce_bol",
      "qty": 10,
      "uom_id": "uom_pack",
      "order_line_id": "ord_line_01",
      "lots": [
        {
          "lot_id": "lot_sauce_B",
          "qty": 10
        }
      ]
    }
  ]
}
```

---

### 5.2. Cập nhật trạng thái Shipment
**PUT** `/api/shipments/ship_001/status`

**Body (JSON):**
```json
{
  "status": "SHIPPED"
}
```

**Các trạng thái hợp lệ:**
- `DRAFT` → `PICKED` → `SHIPPED` → `IN_TRANSIT` → `DELIVERED`

---

## 6. Goods Receipt APIs

### 6.1. Tạo Goods Receipt từ Shipment
**POST** `/api/goods-receipts`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "shipment_id": "ship_001",
  "received_date": "2023-10-07",
  "lines": [
    {
      "shipment_line_id": "ship_line_01",
      "item_id": "item_sauce_bol",
      "qty_received": 10,
      "qty_rejected": 0
    }
  ]
}
```

---

### 6.2. Xác nhận Goods Receipt (cập nhật tồn kho)
**PUT** `/api/goods-receipts/gr_001/confirm`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Lưu ý:** API này sẽ:
- Cập nhật inventory balance
- Tạo inventory transaction
- Cập nhật order fulfillment
- Cập nhật trạng thái shipment và order

---

## 7. Inventory APIs

### 7.1. Lấy số dư tồn kho
**GET** `/api/inventory/balances?location_id=loc_ck_raw&item_id=item_beef`

**Query Parameters:**
- `location_id`: ID của location
- `item_id`: ID của item
- `lot_id`: ID của lot (optional)
- `page`: Số trang
- `limit`: Số records mỗi trang

---

### 7.2. Lấy lịch sử giao dịch tồn kho
**GET** `/api/inventory/transactions?location_id=loc_ck_raw&start_date=2023-10-01&end_date=2023-10-31`

**Query Parameters:**
- `location_id`: ID của location
- `item_id`: ID của item
- `lot_id`: ID của lot
- `txn_type`: Loại giao dịch (RECEIPT, ISSUE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, etc.)
- `start_date`: Ngày bắt đầu
- `end_date`: Ngày kết thúc

---

### 7.3. Lấy tổng hợp tồn kho
**GET** `/api/inventory/summary?location_id=loc_ck_raw`

---

### 7.4. Điều chỉnh tồn kho
**POST** `/api/inventory/adjust`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "location_id": "loc_ck_raw",
  "item_id": "item_beef",
  "lot_id": "lot_beef_A",
  "qty": 5,
  "uom_id": "uom_kg",
  "reason": "Kiểm kê phát hiện thiếu"
}
```

**Lưu ý:** 
- `qty` dương để tăng tồn kho
- `qty` âm để giảm tồn kho (phải đảm bảo đủ tồn kho)

---

## 8. Recipe APIs

### 8.1. Tạo Recipe
**POST** `/api/recipes`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "_id": "recipe_test_001",
  "item_id": "item_sauce_bol",
  "version": "2.0",
  "effective_from": "2023-10-01",
  "effective_to": null,
  "lines": [
    {
      "material_item_id": "item_beef",
      "qty_per_batch": 5,
      "uom_id": "uom_kg",
      "scrap_rate": 0.05
    },
    {
      "material_item_id": "item_tomato",
      "qty_per_batch": 8,
      "uom_id": "uom_kg",
      "scrap_rate": 0.10
    }
  ]
}
```

---

### 8.2. Thêm dòng vào Recipe
**POST** `/api/recipes/recipe_sauce_v1/lines`

**Body (JSON):**
```json
{
  "material_item_id": "item_tomato",
  "qty_per_batch": 3,
  "uom_id": "uom_kg",
  "scrap_rate": 0.05
}
```

---

## 9. Lot APIs

### 9.1. Tạo Lot
**POST** `/api/lots`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "_id": "lot_test_001",
  "item_id": "item_beef",
  "lot_code": "L-BEEF-002",
  "mfg_date": "2023-10-10",
  "exp_date": "2023-10-17"
}
```

---

## 10. Master Data APIs

### 10.1. Lấy danh sách UOM
**GET** `/api/master-data/uoms`

---

### 10.2. Lấy danh sách Categories
**GET** `/api/master-data/categories`

---

### 10.3. Tạo Category mới
**POST** `/api/master-data/categories`

**Body (JSON):**
```json
{
  "_id": "cat_test",
  "name": "Đồ uống",
  "parent_id": null
}
```

---

### 10.4. Lấy danh sách Suppliers
**GET** `/api/master-data/suppliers`

---

### 10.5. Tạo Supplier mới
**POST** `/api/master-data/suppliers`

**Body (JSON):**
```json
{
  "_id": "sup_test",
  "name": "Nhà cung cấp Test",
  "tax_code": "030123",
  "address": "Hà Nội"
}
```

---

### 10.6. Lấy danh sách Org Units
**GET** `/api/master-data/org-units?type=STORE`

**Query Parameters:**
- `type`: KITCHEN hoặc STORE
- `status`: ACTIVE hoặc INACTIVE

---

### 10.7. Lấy danh sách Locations
**GET** `/api/master-data/locations?org_unit_id=org_kitchen_hcm`

---

### 10.8. Tạo Location mới
**POST** `/api/master-data/locations`

**Body (JSON):**
```json
{
  "_id": "loc_test",
  "org_unit_id": "org_kitchen_hcm",
  "code": "WH_TEST",
  "name": "Kho Test"
}
```

---

## Workflow Test - Quy trình đầy đủ

### Bước 1: Đăng nhập
```
POST /api/auth/login
Body: {"username": "admin", "password": "123456"}
→ Lưu token
```

### Bước 2: Tạo Internal Order
```
POST /api/internal-orders
Body: {...}
→ Lưu order_id
```

### Bước 3: Submit Order
```
PUT /api/internal-orders/{order_id}/status
Body: {"status": "SUBMITTED"}
```

### Bước 4: Tạo Production Order (nếu cần sản xuất)
```
POST /api/production-orders
Body: {...}
→ Lưu prod_order_id
```

### Bước 5: Ghi nhận sản xuất
```
POST /api/production-orders/{prod_order_id}/consumption
POST /api/production-orders/{prod_order_id}/output
```

### Bước 6: Tạo Shipment
```
POST /api/shipments
Body: {"order_id": "...", ...}
→ Lưu shipment_id
```

### Bước 7: Cập nhật Shipment status
```
PUT /api/shipments/{shipment_id}/status
Body: {"status": "SHIPPED"}
```

### Bước 8: Tạo Goods Receipt
```
POST /api/goods-receipts
Body: {"shipment_id": "...", ...}
→ Lưu receipt_id
```

### Bước 9: Xác nhận Goods Receipt
```
PUT /api/goods-receipts/{receipt_id}/confirm
→ Tự động cập nhật tồn kho
```

### Bước 10: Kiểm tra tồn kho
```
GET /api/inventory/balances?location_id=...
```

---

## Lưu ý khi test

1. **Authentication**: Hầu hết các API đều yêu cầu token. Copy token từ response login và thêm vào header `Authorization: Bearer <token>`

2. **Role-based Access**: Một số API chỉ dành cho roles cụ thể:
   - ADMIN: Tất cả quyền
   - MANAGER: Quản lý items, recipes, inventory
   - CHEF: Quản lý production orders, shipments
   - STORE_STAFF: Tạo orders, nhận hàng

3. **IDs**: Sử dụng IDs từ master data hoặc tạo mới với format phù hợp

4. **Dates**: Format ngày tháng: `YYYY-MM-DD` hoặc ISO 8601

5. **Status Flow**: Tuân thủ flow trạng thái hợp lệ (không thể skip bước)

6. **Inventory**: Khi confirm goods receipt, hệ thống tự động cập nhật tồn kho và tạo transaction

---

## Collection Postman

Bạn có thể import file này vào Postman để có sẵn các requests:
1. Tạo Collection mới trong Postman
2. Thêm các requests theo hướng dẫn trên
3. Set biến `base_url` = `http://localhost:5000/api`
4. Set biến `token` và sử dụng trong Authorization header

---

## Troubleshooting

### Lỗi 401 Unauthorized
- Kiểm tra token có hợp lệ không
- Token có thể đã hết hạn (mặc định 7 ngày)
- Đăng nhập lại để lấy token mới

### Lỗi 403 Forbidden
- Kiểm tra user có đủ quyền (role) không
- Một số API chỉ dành cho ADMIN hoặc MANAGER

### Lỗi 404 Not Found
- Kiểm tra ID có đúng không
- Kiểm tra resource có tồn tại trong database không

### Lỗi 400 Bad Request
- Kiểm tra body JSON có đúng format không
- Kiểm tra các trường required có đầy đủ không
- Kiểm tra validation rules (ví dụ: status phải là giá trị hợp lệ)
