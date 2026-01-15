# 🧪 HƯỚNG DẪN TEST API - Central Kitchen Management System

> Hướng dẫn chi tiết test tất cả API endpoints với Postman

## 📋 Mục lục

1. [Chuẩn bị](#chuẩn-bị)
2. [Authentication](#1-authentication)
3. [Master Data](#2-master-data)
4. [Items](#3-items)
5. [Recipes](#4-recipes)
6. [Lots](#5-lots)
7. [Internal Orders](#6-internal-orders)
8. [Production Orders](#7-production-orders)
9. [Shipments](#8-shipments)
10. [Goods Receipts](#9-goods-receipts)
11. [Inventory](#10-inventory)
12. [Return Requests](#11-return-requests)
13. [Alerts](#12-alerts)
14. [Dashboard](#13-dashboard)
15. [Users](#14-users)

---

## Chuẩn bị

### Base URL
```
http://localhost:5000/api
```

### Environment Variables trong Postman
Tạo environment mới với các biến:
- `base_url`: `http://localhost:5000/api`
- `token`: (sẽ được set sau khi login)

### Headers mặc định
Tất cả request (trừ login/register) cần header:
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

---

## 1. Authentication

### 1.1 Register User (Đăng ký)
**POST** `/auth/register`

**Body (JSON):**
```json
{
  "username": "testuser",
  "password": "123456",
  "full_name": "Test User",
  "org_unit_id": "org_kitchen_hcm",
  "role_ids": ["role_manager"]
}
```

**Response Success (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_1234567890",
      "username": "testuser",
      "full_name": "Test User",
      "org_unit_id": "org_kitchen_hcm"
    }
  },
  "statusCode": 201
}
```

**Lưu token vào environment variable:**
- Copy token từ response
- Set vào biến `token` trong Postman environment

### 1.2 Login (Đăng nhập)
**POST** `/auth/login`

**Body (JSON):**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response Success (200):**
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

### 1.3 Get Current User
**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_admin",
    "username": "admin",
    "full_name": "System Admin",
    "org_unit_id": "org_kitchen_hcm",
    "org_unit": {
      "_id": "org_kitchen_hcm",
      "name": "Bếp Trung Tâm HCM",
      "code": "CK_HCM",
      "type": "KITCHEN"
    },
    "status": "ACTIVE",
    "roles": [...]
  },
  "statusCode": 200
}
```

### 1.4 Logout (Đăng xuất) ⭐ NEW
**POST** `/auth/logout`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": null,
  "statusCode": 200
}
```

**Note:** 
- Logout chủ yếu được xử lý ở client side (xóa token)
- Endpoint này để log activity và consistency

### 1.5 Change Password (Đổi mật khẩu) ⭐ NEW
**PUT** `/auth/change-password`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Body (JSON):**
```json
{
  "current_password": "admin123",
  "new_password": "newpassword456"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null,
  "statusCode": 200
}
```

**Response Error - Wrong Current Password (401):**
```json
{
  "success": false,
  "message": "Current password is incorrect",
  "statusCode": 401
}
```

**Response Error - Password Too Short (400):**
```json
{
  "success": false,
  "message": "New password must be at least 6 characters",
  "statusCode": 400
}
```

**Validation Rules:**
- `current_password`: Required
- `new_password`: Required, minimum 6 characters

### 1.6 Reset Password (Admin Only) ⭐ NEW
**PUT** `/auth/reset-password/:userId`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Body (JSON):**
```json
{
  "new_password": "resetpassword123"
}
```

**Example:**
```
PUT /auth/reset-password/user_store1
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": null,
  "statusCode": 200
}
```

**Response Error - Not Admin (403):**
```json
{
  "success": false,
  "message": "Access denied. Required roles: ADMIN",
  "statusCode": 403
}
```

**Use Case:**
- Admin có thể reset password cho bất kỳ user nào
- Không cần biết current password
- Hữu ích khi user quên mật khẩu

---

## 2. Master Data

### 2.1 Get UOMs (Đơn vị tính)
**GET** `/master-data/uoms`

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "uom_kg",
      "code": "KG",
      "name": "Kilogram"
    },
    {
      "_id": "uom_g",
      "code": "G",
      "name": "Gram"
    }
  ],
  "statusCode": 200
}
```

### 2.2 Get Categories (Danh mục)
**GET** `/master-data/categories`

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "cat_meat",
      "name": "Thịt & Hải Sản",
      "parent_id": null
    }
  ],
  "statusCode": 200
}
```

### 2.3 Create Category
**POST** `/master-data/categories`

**Body (JSON):**
```json
{
  "name": "Đồ uống",
  "parent_id": null
}
```

### 2.4 Get Suppliers (Nhà cung cấp)
**GET** `/master-data/suppliers`

### 2.5 Create Supplier
**POST** `/master-data/suppliers`

**Body (JSON):**
```json
{
  "name": "Công ty TNHH ABC",
  "tax_code": "0123456789",
  "address": "123 Đường ABC, Quận 1, TP.HCM",
  "phone": "0901234567",
  "email": "contact@abc.com"
}
```

### 2.6 Get Org Units (Đơn vị tổ chức)
**GET** `/master-data/org-units`

### 2.7 Get Locations (Vị trí kho)
**GET** `/master-data/locations`

**Query Parameters:**
- `org_unit_id`: Filter theo đơn vị tổ chức
- `status`: ACTIVE hoặc INACTIVE

### 2.8 Create Location
**POST** `/master-data/locations`

**Body (JSON):**
```json
{
  "org_unit_id": "org_kitchen_hcm",
  "code": "WH_NEW",
  "name": "Kho Mới",
  "status": "ACTIVE"
}
```

### 2.9 Get Roles (Vai trò)
**GET** `/master-data/roles`

---

## 3. Items

### 3.1 Get All Items
**GET** `/items`

**Query Parameters:**
- `page`: Số trang (default: 1)
- `limit`: Số items mỗi trang (default: 10)
- `item_type`: RAW hoặc FINISHED
- `category_id`: Filter theo danh mục
- `status`: ACTIVE hoặc INACTIVE
- `search`: Tìm kiếm theo sku hoặc name

**Example:**
```
GET /items?page=1&limit=10&item_type=RAW&status=ACTIVE
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "item_beef",
      "sku": "RM001",
      "name": "Thịt bò xay",
      "item_type": "RAW",
      "base_uom_id": {
        "_id": "uom_kg",
        "code": "KG",
        "name": "Kilogram"
      },
      "category_id": {
        "_id": "cat_meat",
        "name": "Thịt & Hải Sản"
      },
      "tracking_type": "LOT_EXPIRY",
      "shelf_life_days": 7,
      "cost_price": 150000,
      "status": "ACTIVE"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  },
  "statusCode": 200
}
```

### 3.2 Get Single Item
**GET** `/items/:id`

**Example:**
```
GET /items/item_beef
```

### 3.3 Create Item
**POST** `/items`

**Body (JSON) - Raw Material:**
```json
{
  "sku": "RM010",
  "name": "Gà ta nguyên con",
  "item_type": "RAW",
  "base_uom_id": "uom_kg",
  "category_id": "cat_meat",
  "tracking_type": "LOT_EXPIRY",
  "shelf_life_days": 5,
  "cost_price": 120000,
  "status": "ACTIVE"
}
```

**Body (JSON) - Finished Product:**
```json
{
  "sku": "FP010",
  "name": "Cơm gà xối mỡ (Hộp)",
  "item_type": "FINISHED",
  "base_uom_id": "uom_unit",
  "category_id": "cat_finished",
  "tracking_type": "LOT_EXPIRY",
  "shelf_life_days": 3,
  "base_sell_price": 45000,
  "status": "ACTIVE"
}
```

### 3.4 Update Item
**PUT** `/items/:id`

**Body (JSON):**
```json
{
  "name": "Thịt bò xay cao cấp",
  "cost_price": 160000,
  "status": "ACTIVE"
}
```

### 3.5 Delete Item (Soft Delete)
**DELETE** `/items/:id`

**Response Success (200):**
```json
{
  "success": true,
  "message": "Item deleted successfully",
  "statusCode": 200
}
```

---

## 4. Recipes

### 4.1 Get All Recipes
**GET** `/recipes`

**Query Parameters:**
- `item_id`: Filter theo sản phẩm
- `status`: ACTIVE, INACTIVE, DRAFT

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "recipe_sauce_v1",
      "item_id": {
        "_id": "item_sauce_bol",
        "sku": "FP001",
        "name": "Sốt Bolognese (Túi 1kg)"
      },
      "version": "1.0",
      "status": "ACTIVE",
      "effective_from": "2023-01-01T00:00:00.000Z",
      "effective_to": null
    }
  ],
  "statusCode": 200
}
```

### 4.2 Get Single Recipe with Lines
**GET** `/recipes/:id`

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "_id": "recipe_sauce_v1",
    "item_id": {...},
    "version": "1.0",
    "status": "ACTIVE",
    "lines": [
      {
        "_id": "recipe_line_1",
        "material_item_id": {
          "_id": "item_beef",
          "sku": "RM001",
          "name": "Thịt bò xay"
        },
        "qty_per_batch": 5,
        "uom_id": {
          "_id": "uom_kg",
          "code": "KG"
        },
        "scrap_rate": 0.05
      }
    ]
  },
  "statusCode": 200
}
```

### 4.3 Create Recipe
**POST** `/recipes`

**Body (JSON):**
```json
{
  "item_id": "item_sauce_bol",
  "version": "2.0",
  "status": "DRAFT",
  "effective_from": "2024-01-01",
  "effective_to": null
}
```

### 4.4 Update Recipe
**PUT** `/recipes/:id`

**Body (JSON):**
```json
{
  "status": "ACTIVE",
  "effective_from": "2024-01-15"
}
```

### 4.5 Add Recipe Line
**POST** `/recipes/:id/lines`

**Body (JSON):**
```json
{
  "material_item_id": "item_tomato",
  "qty_per_batch": 8,
  "uom_id": "uom_kg",
  "scrap_rate": 0.10
}
```

### 4.6 Delete Recipe Line
**DELETE** `/recipes/:id/lines/:lineId`

---

## 5. Lots

### 5.1 Get All Lots
**GET** `/lots`

**Query Parameters:**
- `item_id`: Filter theo sản phẩm
- `location_id`: Filter theo vị trí kho
- `status`: ACTIVE, EXPIRED

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "lot_beef_A",
      "item_id": {
        "_id": "item_beef",
        "sku": "RM001",
        "name": "Thịt bò xay"
      },
      "lot_code": "L-BEEF-001",
      "mfg_date": "2023-10-01T00:00:00.000Z",
      "exp_date": "2023-10-08T00:00:00.000Z"
    }
  ],
  "statusCode": 200
}
```

### 5.2 Get Single Lot
**GET** `/lots/:id`

### 5.3 Create Lot
**POST** `/lots`

**Body (JSON):**
```json
{
  "item_id": "item_beef",
  "lot_code": "L-BEEF-002",
  "mfg_date": "2024-01-15",
  "exp_date": "2024-01-22"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "message": "Lot created successfully",
  "data": {
    "_id": "lot_1234567890",
    "item_id": "item_beef",
    "lot_code": "L-BEEF-002",
    "mfg_date": "2024-01-15T00:00:00.000Z",
    "exp_date": "2024-01-22T00:00:00.000Z"
  },
  "statusCode": 201
}
```

### 5.4 Update Lot
**PUT** `/lots/:id`

**Body (JSON):**
```json
{
  "exp_date": "2024-01-25"
}
```

---

## 6. Internal Orders

### 6.1 Get All Internal Orders
**GET** `/internal-orders`

**Query Parameters:**
- `page`: Số trang (default: 1)
- `limit`: Số items mỗi trang (default: 10)
- `status`: DRAFT, SUBMITTED, APPROVED, PROCESSING, SHIPPED, RECEIVED, CANCELLED
- `store_org_unit_id`: Filter theo cửa hàng
- `start_date`: Từ ngày (YYYY-MM-DD)
- `end_date`: Đến ngày (YYYY-MM-DD)

**Example:**
```
GET /internal-orders?status=SUBMITTED&page=1&limit=10
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ord_001",
      "order_no": "SO-1001",
      "store_org_unit_id": {
        "_id": "org_store_q1",
        "name": "Cửa hàng Quận 1",
        "code": "STR_Q1",
        "type": "STORE"
      },
      "order_date": "2023-10-05T00:00:00.000Z",
      "status": "SUBMITTED",
      "total_amount": 2500000,
      "currency": "VND",
      "created_by": {
        "_id": "user_store1",
        "username": "staff_lan",
        "full_name": "NV Lan"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  },
  "statusCode": 200
}
```

### 6.2 Get Single Internal Order
**GET** `/internal-orders/:id`

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "_id": "ord_001",
    "order_no": "SO-1001",
    "store_org_unit_id": {...},
    "order_date": "2023-10-05T00:00:00.000Z",
    "status": "SUBMITTED",
    "total_amount": 2500000,
    "currency": "VND",
    "lines": [
      {
        "_id": "ord_line_01",
        "item_id": {
          "_id": "item_sauce_bol",
          "sku": "FP001",
          "name": "Sốt Bolognese (Túi 1kg)"
        },
        "qty_ordered": 10,
        "uom_id": {
          "_id": "uom_pack",
          "code": "PACK"
        },
        "unit_price": 250000,
        "line_total": 2500000,
        "fulfillment": {
          "qty_shipped_total": 0,
          "qty_received_total": 0
        }
      }
    ]
  },
  "statusCode": 200
}
```

### 6.3 Create Internal Order
**POST** `/internal-orders`

**Body (JSON):**
```json
{
  "store_org_unit_id": "org_store_q1",
  "order_date": "2024-01-15",
  "lines": [
    {
      "item_id": "item_sauce_bol",
      "qty_ordered": 20,
      "uom_id": "uom_pack",
      "unit_price": 250000
    },
    {
      "item_id": "item_beef",
      "qty_ordered": 50,
      "uom_id": "uom_kg",
      "unit_price": 150000
    }
  ]
}
```

**Response Success (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "ord_1705305600000",
    "order_no": "SO-1002",
    "store_org_unit_id": {...},
    "status": "DRAFT",
    "total_amount": 12500000,
    "lines": [...]
  },
  "statusCode": 201
}
```

### 6.4 Update Order Status
**PUT** `/internal-orders/:id/status`

**Body (JSON):**
```json
{
  "status": "SUBMITTED"
}
```

**Valid Status Transitions:**
- DRAFT → SUBMITTED
- SUBMITTED → APPROVED
- APPROVED → PROCESSING
- PROCESSING → SHIPPED
- SHIPPED → RECEIVED
- Any → CANCELLED

**Response Success (200):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "_id": "ord_001",
    "order_no": "SO-1001",
    "status": "SUBMITTED",
    ...
  },
  "statusCode": 200
}
```

### 6.5 Add Order Line
**POST** `/internal-orders/:id/lines`

**Body (JSON):**
```json
{
  "item_id": "item_tomato",
  "qty_ordered": 30,
  "uom_id": "uom_kg",
  "unit_price": 20000
}
```

**Note:** Chỉ có thể thêm line vào order có status = DRAFT

---

## 7. Production Orders

### 7.1 Get All Production Orders
**GET** `/production-orders`

**Query Parameters:**
- `page`, `limit`: Phân trang
- `status`: PLANNED, IN_PROGRESS, DONE, CANCELLED
- `start_date`, `end_date`: Filter theo ngày

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "po_001",
      "prod_order_no": "PO-2310-01",
      "planned_start": "2023-10-06T00:00:00.000Z",
      "planned_end": "2023-10-06T00:00:00.000Z",
      "status": "DONE",
      "created_by": {
        "_id": "user_chef",
        "username": "chef_tuan",
        "full_name": "Bếp Trưởng Tuấn"
      }
    }
  ],
  "pagination": {...},
  "statusCode": 200
}
```

### 7.2 Get Single Production Order
**GET** `/production-orders/:id`

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "_id": "po_001",
    "prod_order_no": "PO-2310-01",
    "status": "DONE",
    "lines": [
      {
        "_id": "po_line_01",
        "item_id": {
          "_id": "item_sauce_bol",
          "sku": "FP001",
          "name": "Sốt Bolognese (Túi 1kg)"
        },
        "recipe_id": {
          "_id": "recipe_sauce_v1",
          "version": "1.0"
        },
        "planned_qty": 20,
        "actual_qty": 20,
        "uom_id": {
          "_id": "uom_pack",
          "code": "PACK"
        }
      }
    ]
  },
  "statusCode": 200
}
```

### 7.3 Create Production Order
**POST** `/production-orders`

**Body (JSON):**
```json
{
  "planned_start": "2024-01-16",
  "planned_end": "2024-01-16",
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

**Response Success (201):**
```json
{
  "success": true,
  "message": "Production order created successfully",
  "data": {
    "_id": "po_1705363200000",
    "prod_order_no": "PO-2401-02",
    "status": "PLANNED",
    "lines": [...]
  },
  "statusCode": 201
}
```

### 7.4 Update Production Order Status
**PUT** `/production-orders/:id/status`

**Body (JSON):**
```json
{
  "status": "IN_PROGRESS"
}
```

**Valid Statuses:**
- PLANNED
- IN_PROGRESS
- DONE
- CANCELLED

### 7.5 Record Production Consumption (Ghi nhận tiêu hao)
**POST** `/production-orders/:id/consumption`

**Body (JSON):**
```json
{
  "prod_order_line_id": "po_line_01",
  "material_item_id": "item_beef",
  "lot_id": "lot_beef_A",
  "qty": 10,
  "uom_id": "uom_kg"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "message": "Consumption recorded successfully",
  "data": {
    "_id": "consumption_123",
    "prod_order_line_id": "po_line_01",
    "material_item_id": "item_beef",
    "lot_id": "lot_beef_A",
    "qty": 10,
    "uom_id": "uom_kg"
  },
  "statusCode": 201
}
```

### 7.6 Record Production Output (Ghi nhận sản phẩm)
**POST** `/production-orders/:id/output`

**Body (JSON):**
```json
{
  "prod_order_line_id": "po_line_01",
  "lot_id": "lot_sauce_B",
  "qty": 20,
  "uom_id": "uom_pack"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "message": "Output recorded successfully",
  "data": {
    "_id": "output_123",
    "prod_order_line_id": "po_line_01",
    "lot_id": "lot_sauce_B",
    "qty": 20,
    "uom_id": "uom_pack"
  },
  "statusCode": 201
}
```

---

## 8. Shipments

### 8.1 Get All Shipments
**GET** `/shipments`

**Query Parameters:**
- `page`, `limit`: Phân trang
- `status`: PENDING, SHIPPED, DELIVERED, CANCELLED
- `order_id`: Filter theo đơn hàng
- `from_location_id`, `to_location_id`: Filter theo vị trí

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ship_001",
      "shipment_no": "SH-1001",
      "order_id": {
        "_id": "ord_001",
        "order_no": "SO-1001"
      },
      "from_location_id": {
        "_id": "loc_ck_fg",
        "name": "Kho Thành Phẩm"
      },
      "to_location_id": {
        "_id": "loc_str_q1",
        "name": "Kho Cửa Hàng"
      },
      "ship_date": "2023-10-07T00:00:00.000Z",
      "status": "SHIPPED"
    }
  ],
  "pagination": {...},
  "statusCode": 200
}
```

### 8.2 Get Single Shipment
**GET** `/shipments/:id`

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "_id": "ship_001",
    "shipment_no": "SH-1001",
    "order_id": {...},
    "from_location_id": {...},
    "to_location_id": {...},
    "ship_date": "2023-10-07T00:00:00.000Z",
    "status": "SHIPPED",
    "lines": [
      {
        "_id": "ship_line_01",
        "item_id": {
          "_id": "item_sauce_bol",
          "sku": "FP001",
          "name": "Sốt Bolognese (Túi 1kg)"
        },
        "qty": 10,
        "uom_id": {
          "_id": "uom_pack",
          "code": "PACK"
        },
        "lots": [
          {
            "lot_id": {
              "_id": "lot_sauce_B",
              "lot_code": "L-SAUCE-001"
            },
            "qty": 10
          }
        ]
      }
    ]
  },
  "statusCode": 200
}
```

### 8.3 Create Shipment
**POST** `/shipments`

**Body (JSON):**
```json
{
  "order_id": "ord_001",
  "from_location_id": "loc_ck_fg",
  "to_location_id": "loc_str_q1",
  "ship_date": "2024-01-16",
  "lines": [
    {
      "order_line_id": "ord_line_01",
      "item_id": "item_sauce_bol",
      "qty": 10,
      "uom_id": "uom_pack",
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

**Response Success (201):**
```json
{
  "success": true,
  "message": "Shipment created successfully",
  "data": {
    "_id": "ship_1705363200000",
    "shipment_no": "SH-1002",
    "status": "PENDING",
    "lines": [...]
  },
  "statusCode": 201
}
```

### 8.4 Update Shipment Status
**PUT** `/shipments/:id/status`

**Body (JSON):**
```json
{
  "status": "SHIPPED"
}
```

**Valid Statuses:**
- PENDING
- SHIPPED
- DELIVERED
- CANCELLED

---

## 9. Goods Receipts

### 9.1 Get All Goods Receipts
**GET** `/goods-receipts`

**Query Parameters:**
- `page`, `limit`: Phân trang
- `status`: PENDING, RECEIVED, REJECTED
- `shipment_id`: Filter theo lô hàng
- `start_date`, `end_date`: Filter theo ngày nhận

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "gr_001",
      "receipt_no": "GR-1001",
      "shipment_id": {
        "_id": "ship_001",
        "shipment_no": "SH-1001"
      },
      "received_date": "2023-10-07T00:00:00.000Z",
      "status": "RECEIVED",
      "received_by": {
        "_id": "user_store1",
        "username": "staff_lan",
        "full_name": "NV Lan"
      }
    }
  ],
  "pagination": {...},
  "statusCode": 200
}
```

### 9.2 Get Single Goods Receipt
**GET** `/goods-receipts/:id`

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "_id": "gr_001",
    "receipt_no": "GR-1001",
    "shipment_id": {...},
    "received_date": "2023-10-07T00:00:00.000Z",
    "status": "RECEIVED",
    "lines": [
      {
        "_id": "gr_line_01",
        "shipment_line_id": {
          "_id": "ship_line_01"
        },
        "item_id": {
          "_id": "item_sauce_bol",
          "sku": "FP001",
          "name": "Sốt Bolognese (Túi 1kg)"
        },
        "qty_received": 10,
        "qty_rejected": 0
      }
    ]
  },
  "statusCode": 200
}
```

### 9.3 Create Goods Receipt
**POST** `/goods-receipts`

**Body (JSON):**
```json
{
  "shipment_id": "ship_001",
  "received_date": "2024-01-16",
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

**Response Success (201):**
```json
{
  "success": true,
  "message": "Goods receipt created successfully",
  "data": {
    "_id": "gr_1705363200000",
    "receipt_no": "GR-1002",
    "status": "PENDING",
    "lines": [...]
  },
  "statusCode": 201
}
```

### 9.4 Confirm Goods Receipt (Update Inventory)
**PUT** `/goods-receipts/:id/confirm`

**Body (JSON):**
```json
{
  "status": "RECEIVED"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Goods receipt confirmed and inventory updated",
  "data": {
    "_id": "gr_001",
    "receipt_no": "GR-1001",
    "status": "RECEIVED",
    ...
  },
  "statusCode": 200
}
```

**Note:** Khi confirm, hệ thống sẽ tự động:
- Cập nhật inventory balance
- Tạo inventory transaction
- Cập nhật order fulfillment

---

## 10. Inventory

### 10.1 Get Inventory Balances
**GET** `/inventory/balances`

**Query Parameters:**
- `location_id`: Filter theo vị trí kho
- `item_id`: Filter theo sản phẩm
- `lot_id`: Filter theo lô hàng
- `min_qty`: Số lượng tối thiểu

**Example:**
```
GET /inventory/balances?location_id=loc_ck_fg&min_qty=10
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "balance_123",
      "location_id": {
        "_id": "loc_ck_fg",
        "code": "WH_FG",
        "name": "Kho Thành Phẩm"
      },
      "item_id": {
        "_id": "item_sauce_bol",
        "sku": "FP001",
        "name": "Sốt Bolognese (Túi 1kg)"
      },
      "lot_id": {
        "_id": "lot_sauce_B",
        "lot_code": "L-SAUCE-001",
        "exp_date": "2023-11-02T00:00:00.000Z"
      },
      "qty_on_hand": 50,
      "qty_reserved": 0,
      "qty_available": 50,
      "updated_at": "2023-10-07T00:00:00.000Z"
    }
  ],
  "statusCode": 200
}
```

### 10.2 Get Inventory Transactions
**GET** `/inventory/transactions`

**Query Parameters:**
- `location_id`: Filter theo vị trí
- `item_id`: Filter theo sản phẩm
- `lot_id`: Filter theo lô hàng
- `txn_type`: TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, PRODUCTION_IN, PRODUCTION_OUT
- `start_date`, `end_date`: Filter theo ngày
- `page`, `limit`: Phân trang

**Example:**
```
GET /inventory/transactions?location_id=loc_ck_fg&txn_type=TRANSFER_OUT&page=1&limit=20
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "txn_123",
      "txn_time": "2023-10-07T00:00:00.000Z",
      "location_id": {
        "_id": "loc_ck_fg",
        "name": "Kho Thành Phẩm"
      },
      "item_id": {
        "_id": "item_sauce_bol",
        "sku": "FP001",
        "name": "Sốt Bolognese (Túi 1kg)"
      },
      "lot_id": {
        "_id": "lot_sauce_B",
        "lot_code": "L-SAUCE-001"
      },
      "qty": -10,
      "uom_id": {
        "_id": "uom_pack",
        "code": "PACK"
      },
      "txn_type": "TRANSFER_OUT",
      "ref_type": "SHIPMENT",
      "ref_id": "ship_001",
      "created_by": {
        "_id": "user_chef",
        "username": "chef_tuan"
      }
    }
  ],
  "pagination": {...},
  "statusCode": 200
}
```

### 10.3 Get Inventory Summary
**GET** `/inventory/summary`

**Query Parameters:**
- `location_id`: Filter theo vị trí
- `item_type`: RAW hoặc FINISHED

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "location_id": {
        "_id": "loc_ck_fg",
        "name": "Kho Thành Phẩm"
      },
      "total_items": 25,
      "total_qty": 1250,
      "total_value": 125000000,
      "by_category": [
        {
          "category_name": "Sốt & Gia Vị",
          "item_count": 10,
          "total_qty": 500
        }
      ]
    }
  ],
  "statusCode": 200
}
```

### 10.4 Adjust Inventory
**POST** `/inventory/adjust`

**Body (JSON):**
```json
{
  "location_id": "loc_ck_fg",
  "item_id": "item_sauce_bol",
  "lot_id": "lot_sauce_B",
  "qty_adjustment": 5,
  "uom_id": "uom_pack",
  "reason": "Kiểm kê phát hiện thừa 5 gói",
  "adjustment_type": "COUNT_ADJUSTMENT"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Inventory adjusted successfully",
  "data": {
    "balance": {
      "location_id": "loc_ck_fg",
      "item_id": "item_sauce_bol",
      "lot_id": "lot_sauce_B",
      "qty_on_hand": 55,
      "qty_reserved": 0,
      "qty_available": 55
    },
    "transaction": {
      "_id": "txn_1705363200000",
      "txn_type": "ADJUSTMENT",
      "qty": 5,
      "reason": "Kiểm kê phát hiện thừa 5 gói"
    }
  },
  "statusCode": 200
}
```

**Adjustment Types:**
- COUNT_ADJUSTMENT: Điều chỉnh kiểm kê
- DAMAGE: Hàng hỏng
- EXPIRED: Hàng hết hạn
- LOST: Hàng mất
- OTHER: Lý do khác

---

## 11. Return Requests

### 11.1 Get All Return Requests
**GET** `/return-requests`

**Query Parameters:**
- `page`, `limit`: Phân trang
- `status`: REQUESTED, APPROVED, REJECTED, PROCESSING, COMPLETED
- `store_org_unit_id`: Filter theo cửa hàng
- `start_date`, `end_date`: Filter theo ngày

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ret_req_01",
      "return_no": "RET-1001",
      "store_org_unit_id": {
        "_id": "org_store_q1",
        "name": "Cửa hàng Quận 1"
      },
      "source_receipt_id": {
        "_id": "gr_001",
        "receipt_no": "GR-1001"
      },
      "request_date": "2024-01-15T00:00:00.000Z",
      "status": "REQUESTED",
      "created_by": {
        "_id": "user_store1",
        "username": "staff_lan"
      }
    }
  ],
  "pagination": {...},
  "statusCode": 200
}
```

### 11.2 Get Single Return Request
**GET** `/return-requests/:id`

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "_id": "ret_req_01",
    "return_no": "RET-1001",
    "store_org_unit_id": {...},
    "source_receipt_id": {...},
    "request_date": "2024-01-15T00:00:00.000Z",
    "status": "REQUESTED",
    "lines": [
      {
        "_id": "ret_line_01",
        "source_receipt_line_id": {
          "_id": "gr_line_01"
        },
        "item_id": {
          "_id": "item_sauce_bol",
          "sku": "FP001",
          "name": "Sốt Bolognese (Túi 1kg)"
        },
        "lot_id": {
          "_id": "lot_sauce_B",
          "lot_code": "L-SAUCE-001"
        },
        "qty_requested": 1,
        "disposition": "RESTOCK",
        "defect_type": "DAMAGED",
        "notes": "Bao bì bị rách"
      }
    ]
  },
  "statusCode": 200
}
```

### 11.3 Create Return Request
**POST** `/return-requests`

**Body (JSON):**
```json
{
  "store_org_unit_id": "org_store_q1",
  "source_receipt_id": "gr_001",
  "request_date": "2024-01-16",
  "lines": [
    {
      "source_receipt_line_id": "gr_line_01",
      "item_id": "item_sauce_bol",
      "lot_id": "lot_sauce_B",
      "qty_requested": 2,
      "disposition": "RESTOCK",
      "defect_type": "DAMAGED",
      "notes": "Bao bì bị rách, sản phẩm vẫn còn tốt"
    },
    {
      "source_receipt_line_id": "gr_line_02",
      "item_id": "item_beef",
      "lot_id": "lot_beef_C",
      "qty_requested": 5,
      "disposition": "SCRAP",
      "defect_type": "EXPIRED",
      "notes": "Hàng đã hết hạn"
    }
  ]
}
```

**Disposition Types:**
- RESTOCK: Nhập lại kho
- SCRAP: Hủy bỏ
- RETURN_TO_SUPPLIER: Trả lại nhà cung cấp

**Defect Types:**
- DAMAGED: Hư hỏng
- EXPIRED: Hết hạn
- WRONG_ITEM: Sai sản phẩm
- QUALITY_ISSUE: Vấn đề chất lượng
- OTHER: Lý do khác

**Response Success (201):**
```json
{
  "success": true,
  "message": "Return request created successfully",
  "data": {
    "_id": "ret_req_1705363200000",
    "return_no": "RET-1002",
    "status": "REQUESTED",
    "lines": [...]
  },
  "statusCode": 201
}
```

### 11.4 Update Return Status
**PUT** `/return-requests/:id/status`

**Body (JSON):**
```json
{
  "status": "APPROVED"
}
```

**Valid Statuses:**
- REQUESTED
- APPROVED
- REJECTED
- PROCESSING
- COMPLETED

**Response Success (200):**
```json
{
  "success": true,
  "message": "Return request status updated",
  "data": {
    "_id": "ret_req_01",
    "status": "APPROVED",
    ...
  },
  "statusCode": 200
}
```

### 11.5 Process Return (Update Inventory)
**PUT** `/return-requests/:id/process`

**Body (JSON):**
```json
{
  "process_date": "2024-01-17"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Return processed and inventory updated",
  "data": {
    "_id": "ret_req_01",
    "status": "COMPLETED",
    "inventory_updated": true
  },
  "statusCode": 200
}
```

**Note:** Khi process return, hệ thống sẽ:
- Cập nhật inventory balance theo disposition
- Tạo inventory transaction
- Đổi status thành COMPLETED

---

## 12. Alerts

### 12.1 Get Expiry Alerts
**GET** `/alerts/expiry`

**Query Parameters:**
- `severity`: EXPIRED, CRITICAL, HIGH, MEDIUM, LOW
- `location_id`: Filter theo vị trí kho
- `item_id`: Filter theo sản phẩm

**Example:**
```
GET /alerts/expiry?severity=CRITICAL&location_id=loc_ck_fg
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "severity": "CRITICAL",
      "item_id": {
        "_id": "item_beef",
        "sku": "RM001",
        "name": "Thịt bò xay"
      },
      "lot_id": {
        "_id": "lot_beef_C",
        "lot_code": "L-BEEF-003",
        "exp_date": "2024-01-17T00:00:00.000Z"
      },
      "location_id": {
        "_id": "loc_ck_raw",
        "name": "Kho Nguyên Liệu"
      },
      "qty_on_hand": 25,
      "days_until_expiry": 1,
      "message": "Sắp hết hạn trong 1 ngày"
    },
    {
      "severity": "EXPIRED",
      "item_id": {...},
      "lot_id": {
        "_id": "lot_tomato_A",
        "lot_code": "L-TOMATO-001",
        "exp_date": "2024-01-14T00:00:00.000Z"
      },
      "location_id": {...},
      "qty_on_hand": 10,
      "days_until_expiry": -2,
      "message": "Đã hết hạn 2 ngày"
    }
  ],
  "statusCode": 200
}
```

**Severity Levels:**
- EXPIRED: Đã hết hạn
- CRITICAL: Còn 1-2 ngày
- HIGH: Còn 3-5 ngày
- MEDIUM: Còn 6-10 ngày
- LOW: Còn 11-15 ngày

### 12.2 Get Low Stock Alerts
**GET** `/alerts/low-stock`

**Query Parameters:**
- `location_id`: Filter theo vị trí kho
- `item_type`: RAW hoặc FINISHED
- `min_threshold`: Ngưỡng tối thiểu (default: 10)

**Example:**
```
GET /alerts/low-stock?location_id=loc_ck_fg&min_threshold=20
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "item_id": {
        "_id": "item_sauce_bol",
        "sku": "FP001",
        "name": "Sốt Bolognese (Túi 1kg)",
        "item_type": "FINISHED"
      },
      "location_id": {
        "_id": "loc_ck_fg",
        "name": "Kho Thành Phẩm"
      },
      "qty_on_hand": 15,
      "qty_reserved": 5,
      "qty_available": 10,
      "threshold": 20,
      "message": "Tồn kho thấp: 10 / 20"
    }
  ],
  "statusCode": 200
}
```

### 12.3 Get Alerts Summary
**GET** `/alerts/summary`

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "expiry_alerts": {
      "total": 15,
      "by_severity": {
        "EXPIRED": 3,
        "CRITICAL": 5,
        "HIGH": 4,
        "MEDIUM": 2,
        "LOW": 1
      }
    },
    "low_stock_alerts": {
      "total": 8,
      "by_location": {
        "loc_ck_fg": 5,
        "loc_ck_raw": 3
      }
    },
    "total_alerts": 23
  },
  "statusCode": 200
}
```

---

## 13. Dashboard

### 13.1 Get Dashboard Overview
**GET** `/dashboard/overview`

**Query Parameters:**
- `start_date`: Từ ngày (YYYY-MM-DD)
- `end_date`: Đến ngày (YYYY-MM-DD)

**Example:**
```
GET /dashboard/overview?start_date=2024-01-01&end_date=2024-01-31
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "orders": {
      "total": 125,
      "by_status": {
        "DRAFT": 5,
        "SUBMITTED": 10,
        "APPROVED": 8,
        "PROCESSING": 12,
        "SHIPPED": 15,
        "RECEIVED": 70,
        "CANCELLED": 5
      },
      "total_amount": 312500000
    },
    "production": {
      "total_orders": 45,
      "by_status": {
        "PLANNED": 5,
        "IN_PROGRESS": 8,
        "DONE": 30,
        "CANCELLED": 2
      },
      "total_output": 2500
    },
    "inventory": {
      "total_items": 150,
      "total_value": 450000000,
      "low_stock_count": 8,
      "expiry_alerts": 15
    },
    "shipments": {
      "total": 98,
      "by_status": {
        "PENDING": 5,
        "SHIPPED": 10,
        "DELIVERED": 80,
        "CANCELLED": 3
      }
    }
  },
  "statusCode": 200
}
```

### 13.2 Get Order Statistics
**GET** `/dashboard/orders`

**Query Parameters:**
- `start_date`, `end_date`: Khoảng thời gian
- `store_org_unit_id`: Filter theo cửa hàng
- `group_by`: day, week, month (default: day)

**Example:**
```
GET /dashboard/orders?start_date=2024-01-01&end_date=2024-01-31&group_by=week
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_orders": 125,
      "total_amount": 312500000,
      "avg_order_value": 2500000,
      "completed_orders": 70,
      "completion_rate": 0.56
    },
    "by_period": [
      {
        "period": "2024-W01",
        "order_count": 25,
        "total_amount": 62500000,
        "avg_amount": 2500000
      },
      {
        "period": "2024-W02",
        "order_count": 30,
        "total_amount": 75000000,
        "avg_amount": 2500000
      }
    ],
    "by_store": [
      {
        "store_id": "org_store_q1",
        "store_name": "Cửa hàng Quận 1",
        "order_count": 45,
        "total_amount": 112500000
      }
    ],
    "top_items": [
      {
        "item_id": "item_sauce_bol",
        "item_name": "Sốt Bolognese (Túi 1kg)",
        "total_qty": 500,
        "total_amount": 125000000
      }
    ]
  },
  "statusCode": 200
}
```

### 13.3 Get Production Statistics
**GET** `/dashboard/production`

**Query Parameters:**
- `start_date`, `end_date`: Khoảng thời gian
- `group_by`: day, week, month

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_orders": 45,
      "completed_orders": 30,
      "completion_rate": 0.67,
      "total_output_qty": 2500,
      "avg_output_per_order": 83.33
    },
    "by_period": [
      {
        "period": "2024-01-15",
        "order_count": 5,
        "output_qty": 250,
        "efficiency": 0.95
      }
    ],
    "by_item": [
      {
        "item_id": "item_sauce_bol",
        "item_name": "Sốt Bolognese (Túi 1kg)",
        "production_count": 15,
        "total_output": 1500,
        "avg_output": 100
      }
    ],
    "efficiency_metrics": {
      "avg_production_time": 4.5,
      "on_time_completion": 0.85,
      "material_utilization": 0.92
    }
  },
  "statusCode": 200
}
```

### 13.4 Get Inventory Statistics
**GET** `/dashboard/inventory`

**Query Parameters:**
- `location_id`: Filter theo vị trí kho
- `item_type`: RAW hoặc FINISHED

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_items": 150,
      "total_value": 450000000,
      "total_qty": 5000,
      "avg_value_per_item": 3000000
    },
    "by_location": [
      {
        "location_id": "loc_ck_fg",
        "location_name": "Kho Thành Phẩm",
        "item_count": 50,
        "total_qty": 2000,
        "total_value": 200000000
      },
      {
        "location_id": "loc_ck_raw",
        "location_name": "Kho Nguyên Liệu",
        "item_count": 80,
        "total_qty": 2500,
        "total_value": 200000000
      }
    ],
    "by_type": [
      {
        "item_type": "RAW",
        "item_count": 80,
        "total_value": 200000000
      },
      {
        "item_type": "FINISHED",
        "item_count": 70,
        "total_value": 250000000
      }
    ],
    "alerts": {
      "low_stock": 8,
      "expiry_critical": 5,
      "expiry_high": 4
    },
    "turnover": {
      "avg_days": 15,
      "fast_moving_items": 25,
      "slow_moving_items": 10
    }
  },
  "statusCode": 200
}
```

### 13.5 Get Shipment Statistics
**GET** `/dashboard/shipments`

**Query Parameters:**
- `start_date`, `end_date`: Khoảng thời gian
- `from_location_id`, `to_location_id`: Filter theo vị trí

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_shipments": 98,
      "completed_shipments": 80,
      "completion_rate": 0.82,
      "avg_delivery_time": 1.5
    },
    "by_period": [
      {
        "period": "2024-01-15",
        "shipment_count": 8,
        "on_time_delivery": 7,
        "on_time_rate": 0.875
      }
    ],
    "by_route": [
      {
        "from_location": "Kho Thành Phẩm",
        "to_location": "Cửa hàng Quận 1",
        "shipment_count": 45,
        "avg_delivery_time": 1.2
      }
    ],
    "performance": {
      "on_time_delivery_rate": 0.85,
      "avg_items_per_shipment": 3.5,
      "damage_rate": 0.02
    }
  },
  "statusCode": 200
}
```

---

## 14. Users

### 14.1 Get All Users
**GET** `/users`

**Query Parameters:**
- `page`, `limit`: Phân trang
- `org_unit_id`: Filter theo đơn vị tổ chức
- `status`: ACTIVE hoặc INACTIVE
- `search`: Tìm kiếm theo username hoặc full_name

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "user_admin",
      "username": "admin",
      "full_name": "System Admin",
      "org_unit_id": {
        "_id": "org_kitchen_hcm",
        "name": "Bếp Trung Tâm HCM"
      },
      "status": "ACTIVE",
      "roles": [
        {
          "id": "role_admin",
          "code": "ADMIN",
          "name": "Administrator"
        }
      ]
    }
  ],
  "pagination": {...},
  "statusCode": 200
}
```

### 14.2 Get Single User
**GET** `/users/:id`

### 14.3 Update User
**PUT** `/users/:id`

**Body (JSON):**
```json
{
  "full_name": "Admin Updated",
  "status": "ACTIVE"
}
```

### 14.4 Delete User
**DELETE** `/users/:id`

**Note:** Chỉ Admin mới có quyền xóa user

---

## 📝 Common Response Codes

### Success Codes
- `200 OK`: Request thành công
- `201 Created`: Tạo mới thành công

### Error Codes
- `400 Bad Request`: Dữ liệu không hợp lệ
- `401 Unauthorized`: Chưa đăng nhập hoặc token không hợp lệ
- `403 Forbidden`: Không có quyền truy cập
- `404 Not Found`: Không tìm thấy resource
- `500 Internal Server Error`: Lỗi server

### Error Response Format
```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400,
  "errors": [
    {
      "field": "username",
      "message": "Username is required"
    }
  ]
}
```

---

## 🔄 Workflow Examples

### Example 1: Tạo đơn hàng và xử lý hoàn chỉnh

**Bước 1: Tạo đơn hàng (Store Staff)**
```
POST /internal-orders
Body: { store_org_unit_id, order_date, lines: [...] }
→ Status: DRAFT
```

**Bước 2: Submit đơn hàng**
```
PUT /internal-orders/:id/status
Body: { status: "SUBMITTED" }
```

**Bước 3: Approve đơn hàng (Manager)**
```
PUT /internal-orders/:id/status
Body: { status: "APPROVED" }
```

**Bước 4: Tạo shipment (Kitchen)**
```
POST /shipments
Body: { order_id, from_location_id, to_location_id, lines: [...] }
```

**Bước 5: Ship hàng**
```
PUT /shipments/:id/status
Body: { status: "SHIPPED" }
```

**Bước 6: Tạo goods receipt (Store)**
```
POST /goods-receipts
Body: { shipment_id, received_date, lines: [...] }
```

**Bước 7: Confirm receipt (cập nhật inventory)**
```
PUT /goods-receipts/:id/confirm
Body: { status: "RECEIVED" }
```

### Example 2: Quy trình sản xuất

**Bước 1: Tạo production order (Chef)**
```
POST /production-orders
Body: { planned_start, planned_end, lines: [{ item_id, recipe_id, planned_qty }] }
→ Status: PLANNED
```

**Bước 2: Bắt đầu sản xuất**
```
PUT /production-orders/:id/status
Body: { status: "IN_PROGRESS" }
```

**Bước 3: Ghi nhận tiêu hao nguyên liệu**
```
POST /production-orders/:id/consumption
Body: { prod_order_line_id, material_item_id, lot_id, qty, uom_id }
```

**Bước 4: Ghi nhận sản phẩm đầu ra**
```
POST /production-orders/:id/output
Body: { prod_order_line_id, lot_id, qty, uom_id }
```

**Bước 5: Hoàn thành sản xuất**
```
PUT /production-orders/:id/status
Body: { status: "DONE" }
```

### Example 3: Xử lý hàng trả lại

**Bước 1: Tạo return request (Store Staff)**
```
POST /return-requests
Body: { 
  store_org_unit_id, 
  source_receipt_id, 
  lines: [{ 
    source_receipt_line_id, 
    item_id, 
    lot_id, 
    qty_requested, 
    disposition, 
    defect_type, 
    notes 
  }] 
}
→ Status: REQUESTED
```

**Bước 2: Approve return (Manager)**
```
PUT /return-requests/:id/status
Body: { status: "APPROVED" }
```

**Bước 3: Process return (cập nhật inventory)**
```
PUT /return-requests/:id/process
Body: { process_date: "2024-01-17" }
→ Status: COMPLETED
→ Inventory được cập nhật theo disposition
```

---

## 🧪 Testing Tips

### 1. Setup Environment
- Tạo Postman environment với `base_url` và `token`
- Import tất cả requests vào collection
- Organize theo folders (Auth, Orders, Production, etc.)

### 2. Test Flow
- Luôn test login trước để lấy token
- Test theo workflow thực tế (tạo order → ship → receive)
- Kiểm tra inventory sau mỗi transaction

### 3. Common Test Cases
- **Happy Path**: Test flow bình thường
- **Validation**: Test với dữ liệu không hợp lệ
- **Authorization**: Test với user không có quyền
- **Edge Cases**: Test với số lượng = 0, ngày hết hạn, etc.

### 4. Data Verification
- Sau khi tạo order, check inventory balance
- Sau khi ship, check fulfillment status
- Sau khi receive, verify inventory transaction

### 5. Postman Scripts

**Pre-request Script (Set token):**
```javascript
pm.request.headers.add({
  key: 'Authorization',
  value: 'Bearer ' + pm.environment.get('token')
});
```

**Test Script (Save token after login):**
```javascript
if (pm.response.code === 200) {
  var jsonData = pm.response.json();
  pm.environment.set('token', jsonData.data.token);
}
```

**Test Script (Verify response):**
```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
  var jsonData = pm.response.json();
  pm.expect(jsonData.success).to.eql(true);
});
```

---

## 📚 Additional Resources

### Sample Data
Xem file `masterData.txt` để có dữ liệu mẫu đầy đủ

### API Documentation
- README.md: Tổng quan hệ thống
- Source code: `/src/routes/` và `/src/controllers/`

### Support
- GitHub Issues: Report bugs
- Email: support@example.com

---

**Last Updated:** January 18, 2024
**Version:** 1.1.0

---

**Happy Testing! 🚀**
