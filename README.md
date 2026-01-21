# 🍳 Central Kitchen and Franchise Store Management System - Backend API

> Hệ thống quản lý toàn diện cho mô hình bếp trung tâm và chuỗi cửa hàng franchise

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.18-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v8.0-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Backend API được xây dựng với Node.js, Express và MongoDB, cung cấp giải pháp quản lý đầy đủ cho chuỗi cung ứng từ bếp trung tâm đến các cửa hàng franchise.

---

## 📋 Mục lục

- [Tính năng chính](#-tính-năng-chính)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cài đặt](#-cài-đặt)
- [Cấu hình](#-cấu-hình)
- [Chạy ứng dụng](#-chạy-ứng-dụng)
- [API Documentation](#-api-documentation)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Testing](#-testing)
- [Deployment](#-deployment)

---

## ✨ Tính năng chính

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing với bcrypt
- Token expiration management

### 📦 Quản lý Đơn hàng Nội bộ
- Tạo và quản lý đơn đặt hàng từ cửa hàng
- Workflow: DRAFT → SUBMITTED → APPROVED → PROCESSING → SHIPPED → RECEIVED
- Order fulfillment tracking
- Multi-line orders với pricing

### 🏭 Quản lý Sản xuất
- Lập kế hoạch sản xuất theo recipe
- Ghi nhận tiêu hao nguyên liệu
- Tracking sản phẩm đầu ra theo lô
- Production efficiency monitoring

### 🚚 Quản lý Giao hàng
- Tạo shipment từ orders
- Lot-based tracking
- Multi-location support
- Shipment status tracking

### 📥 Quản lý Nhận hàng
- Goods receipt từ shipments
- Quality control (received/rejected qty)
- Tự động cập nhật tồn kho
- Integration với inventory system

### 📊 Quản lý Tồn kho
- Real-time inventory balance
- Lot-based inventory tracking
- Transaction history
- Inventory adjustment
- Multi-location inventory

### 🔄 Return/Refund Flow ⭐ NEW
- Xử lý hàng trả lại từ cửa hàng
- Defect type tracking
- Tự động cập nhật tồn kho
- Approval workflow

### ⚠️ Alert System ⭐ NEW
- Expiry alerts (EXPIRED, CRITICAL, HIGH, MEDIUM)
- Low stock alerts
- Real-time monitoring
- Severity-based filtering

### 📈 Dashboard & Analytics ⭐ NEW
- Overview metrics (orders, production, inventory, shipments)
- Order statistics với trend analysis
- Production efficiency tracking
- Inventory insights by location/type
- Shipment performance metrics

### ✅ Validation System ⭐ NEW
- Comprehensive input validation
- Custom validation rules
- Clear error messages
- Applied across all endpoints

### 📖 Quản lý Công thức
- Recipe với version control
- Material requirements planning
- Scrap rate calculation
- Effective date management

### 🏷️ Quản lý Lô hàng
- Lot code generation
- Manufacturing & expiry date tracking
- Traceability support

### 🗂️ Master Data Management
- Items (RAW/FINISHED)
- UOM (Unit of Measure)
- Categories
- Suppliers
- Organization Units (Kitchen/Store)
- Locations
- Roles & Permissions

---

## 🛠️ Công nghệ sử dụng

### Core Technologies
- **Node.js** (v18+) - Runtime environment
- **Express.js** (v4.18) - Web framework
- **MongoDB** (v8.0) - NoSQL database
- **Mongoose** (v8.0) - ODM for MongoDB

### Security & Authentication
- **JWT** (jsonwebtoken) - Token-based authentication
- **Bcrypt.js** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-Origin Resource Sharing

### Validation & Utilities
- **Express Validator** - Input validation
- **Morgan** - HTTP request logger
- **Dotenv** - Environment variables

### Development Tools
- **Nodemon** - Auto-restart on file changes

---

## 🚀 Cài đặt

### Prerequisites
- Node.js v18 trở lên
- MongoDB v8.0 trở lên
- npm hoặc yarn

### Bước 1: Clone repository
```bash
git clone <repository-url>
cd BE
```

### Bước 2: Cài đặt dependencies
```bash
npm install
```

### Bước 3: Tạo file môi trường
```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

### Bước 4: Cấu hình database
Cập nhật file `.env` với thông tin MongoDB của bạn:
```env
MONGODB_URI=mongodb://localhost:27017/central_kitchen
```

---

## ⚙️ Cấu hình

### Environment Variables

Tạo file `.env` trong thư mục root với các biến sau:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/central_kitchen

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
```

### Database Setup

1. **Cài đặt MongoDB:**
   - Download từ [mongodb.com](https://www.mongodb.com/try/download/community)
   - Hoặc sử dụng MongoDB Atlas (cloud)

2. **Khởi động MongoDB:**
   ```bash
   # Windows
   mongod

   # Linux/Mac
   sudo systemctl start mongod
   ```

3. **Tạo database:**
   ```bash
   mongosh
   use central_kitchen
   ```

---

## 🏃 Chạy ứng dụng

### Development mode (với auto-restart)
```bash
npm run dev
```

### Production mode
```bash
npm start
```

### Server sẽ chạy tại
```
http://localhost:5000
```

### Health Check
```bash
curl http://localhost:5000/health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Server is running",
  "timestamp": "2024-01-18T10:30:00.000Z"
}
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
Hầu hết các endpoints yêu cầu JWT token trong header:
```
Authorization: Bearer <your_jwt_token>
```

### API Endpoints Overview

#### 🔐 Authentication
- `POST /api/auth/register` - Đăng ký user mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `POST /api/auth/logout` - Đăng xuất ⭐ NEW
- `PUT /api/auth/change-password` - Đổi mật khẩu ⭐ NEW
- `PUT /api/auth/reset-password/:userId` - Reset mật khẩu (Admin) ⭐ NEW

#### 👥 Users
- `GET /api/users` - Danh sách users
- `GET /api/users/:id` - Chi tiết user
- `PUT /api/users/:id` - Cập nhật user
- `DELETE /api/users/:id` - Xóa user

#### 📦 Items
- `GET /api/items` - Danh sách items
- `POST /api/items` - Tạo item mới
- `GET /api/items/:id` - Chi tiết item
- `PUT /api/items/:id` - Cập nhật item
- `DELETE /api/items/:id` - Xóa item

#### 🛒 Internal Orders
- `GET /api/internal-orders` - Danh sách đơn hàng
- `POST /api/internal-orders` - Tạo đơn hàng
- `GET /api/internal-orders/:id` - Chi tiết đơn hàng
- `PUT /api/internal-orders/:id/status` - Cập nhật trạng thái
- `POST /api/internal-orders/:id/lines` - Thêm dòng vào đơn

#### 🏭 Production Orders
- `GET /api/production-orders` - Danh sách lệnh sản xuất
- `POST /api/production-orders` - Tạo lệnh sản xuất
- `GET /api/production-orders/:id` - Chi tiết lệnh sản xuất
- `PUT /api/production-orders/:id/status` - Cập nhật trạng thái
- `POST /api/production-orders/:id/consumption` - Ghi nhận tiêu hao
- `POST /api/production-orders/:id/output` - Ghi nhận sản phẩm

#### 🚚 Shipments
- `GET /api/shipments` - Danh sách lô hàng
- `POST /api/shipments` - Tạo lô hàng
- `GET /api/shipments/:id` - Chi tiết lô hàng
- `PUT /api/shipments/:id/status` - Cập nhật trạng thái

#### 📥 Goods Receipts
- `GET /api/goods-receipts` - Danh sách phiếu nhận hàng
- `POST /api/goods-receipts` - Tạo phiếu nhận hàng
- `GET /api/goods-receipts/:id` - Chi tiết phiếu nhận
- `PUT /api/goods-receipts/:id/confirm` - Xác nhận và cập nhật tồn kho

#### 📊 Inventory
- `GET /api/inventory/balances` - Số dư tồn kho
- `GET /api/inventory/transactions` - Lịch sử giao dịch
- `GET /api/inventory/summary` - Tổng hợp tồn kho
- `POST /api/inventory/adjust` - Điều chỉnh tồn kho

#### 📖 Recipes
- `GET /api/recipes` - Danh sách công thức
- `POST /api/recipes` - Tạo công thức
- `GET /api/recipes/:id` - Chi tiết công thức
- `PUT /api/recipes/:id` - Cập nhật công thức
- `POST /api/recipes/:id/lines` - Thêm dòng vào công thức
- `DELETE /api/recipes/:id/lines/:lineId` - Xóa dòng công thức

#### 🏷️ Lots
- `GET /api/lots` - Danh sách lô hàng
- `POST /api/lots` - Tạo lô hàng
- `GET /api/lots/:id` - Chi tiết lô hàng
- `PUT /api/lots/:id` - Cập nhật lô hàng

#### 🔄 Return Requests ⭐ NEW
- `GET /api/return-requests` - Danh sách yêu cầu trả hàng
- `POST /api/return-requests` - Tạo yêu cầu trả hàng
- `GET /api/return-requests/:id` - Chi tiết yêu cầu
- `PUT /api/return-requests/:id/status` - Cập nhật trạng thái
- `PUT /api/return-requests/:id/process` - Xử lý trả hàng

#### ⚠️ Alerts ⭐ NEW
- `GET /api/alerts/expiry` - Cảnh báo hết hạn
- `GET /api/alerts/low-stock` - Cảnh báo tồn kho thấp
- `GET /api/alerts/summary` - Tổng hợp cảnh báo

#### 📈 Dashboard ⭐ NEW
- `GET /api/dashboard/overview` - Tổng quan hệ thống
- `GET /api/dashboard/orders` - Thống kê đơn hàng
- `GET /api/dashboard/production` - Thống kê sản xuất
- `GET /api/dashboard/inventory` - Thống kê tồn kho
- `GET /api/dashboard/shipments` - Thống kê giao hàng

#### 🗂️ Master Data
- `GET /api/master-data/uoms` - Đơn vị tính
- `GET /api/master-data/categories` - Danh mục
- `POST /api/master-data/categories` - Tạo danh mục
- `GET /api/master-data/suppliers` - Nhà cung cấp
- `POST /api/master-data/suppliers` - Tạo nhà cung cấp
- `GET /api/master-data/org-units` - Đơn vị tổ chức
- `POST /api/master-data/org-units` - Tạo đơn vị tổ chức
- `GET /api/master-data/locations` - Vị trí kho
- `POST /api/master-data/locations` - Tạo vị trí kho
- `GET /api/master-data/roles` - Vai trò

### Chi tiết API
Xem file [TEST_GUIDE.md](./TEST_GUIDE.md) để biết chi tiết về cách sử dụng từng API endpoint.

---

## Cấu trúc thư mục

```
BE/
├── src/
│   ├── config/          # Cấu hình database và các config khác
│   ├── controllers/     # Controllers xử lý logic
│   ├── middlewares/     # Middlewares (auth, error handler, validator)
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   └── app.js           # Express app configuration
├── server.js            # Server entry point
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore file
└── package.json         # Dependencies và scripts
```

## API Endpoints

### Health Check
- `GET /health` - Kiểm tra trạng thái server

### Authentication
- `POST /api/auth/register` - Đăng ký user mới (Admin only)
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại (Private)

### Users
- `GET /api/users` - Lấy danh sách users (Admin/Manager)
- `GET /api/users/:id` - Lấy user theo ID (Private)
- `PUT /api/users/:id` - Cập nhật user (Private)
- `DELETE /api/users/:id` - Xóa user (Admin)

### Items
- `GET /api/items` - Lấy danh sách items (Private)
- `GET /api/items/:id` - Lấy item theo ID (Private)
- `POST /api/items` - Tạo item mới (Manager/Admin)
- `PUT /api/items/:id` - Cập nhật item (Manager/Admin)
- `DELETE /api/items/:id` - Xóa item (Admin)

### Internal Orders
- `GET /api/internal-orders` - Lấy danh sách đơn hàng nội bộ (Private)
- `GET /api/internal-orders/:id` - Lấy đơn hàng theo ID (Private)
- `POST /api/internal-orders` - Tạo đơn hàng mới (Store Staff/Manager/Admin)
- `PUT /api/internal-orders/:id/status` - Cập nhật trạng thái đơn hàng (Private)
- `POST /api/internal-orders/:id/lines` - Thêm dòng vào đơn hàng (Private)

### Production Orders
- `GET /api/production-orders` - Lấy danh sách lệnh sản xuất (Private)
- `GET /api/production-orders/:id` - Lấy lệnh sản xuất theo ID (Private)
- `POST /api/production-orders` - Tạo lệnh sản xuất mới (Chef/Manager/Admin)
- `PUT /api/production-orders/:id/status` - Cập nhật trạng thái lệnh sản xuất (Chef/Manager/Admin)
- `POST /api/production-orders/:id/consumption` - Ghi nhận tiêu hao nguyên liệu (Chef/Manager/Admin)
- `POST /api/production-orders/:id/output` - Ghi nhận sản phẩm đầu ra (Chef/Manager/Admin)

### Shipments
- `GET /api/shipments` - Lấy danh sách lô hàng (Private)
- `GET /api/shipments/:id` - Lấy lô hàng theo ID (Private)
- `POST /api/shipments` - Tạo lô hàng mới (Chef/Manager/Admin)
- `PUT /api/shipments/:id/status` - Cập nhật trạng thái lô hàng (Private)

### Goods Receipts
- `GET /api/goods-receipts` - Lấy danh sách phiếu nhận hàng (Private)
- `GET /api/goods-receipts/:id` - Lấy phiếu nhận hàng theo ID (Private)
- `POST /api/goods-receipts` - Tạo phiếu nhận hàng mới (Store Staff/Manager/Admin)
- `PUT /api/goods-receipts/:id/confirm` - Xác nhận phiếu nhận hàng và cập nhật tồn kho (Store Staff/Manager/Admin)

### Inventory
- `GET /api/inventory/balances` - Lấy số dư tồn kho (Private)
- `GET /api/inventory/transactions` - Lấy lịch sử giao dịch tồn kho (Private)
- `GET /api/inventory/summary` - Lấy tổng hợp tồn kho (Private)
- `POST /api/inventory/adjust` - Điều chỉnh tồn kho (Manager/Admin)

### Recipes
- `GET /api/recipes` - Lấy danh sách công thức (Private)
- `GET /api/recipes/:id` - Lấy công thức theo ID (Private)
- `POST /api/recipes` - Tạo công thức mới (Manager/Admin)
- `PUT /api/recipes/:id` - Cập nhật công thức (Manager/Admin)
- `POST /api/recipes/:id/lines` - Thêm dòng vào công thức (Manager/Admin)
- `DELETE /api/recipes/:id/lines/:lineId` - Xóa dòng công thức (Manager/Admin)

### Lots
- `GET /api/lots` - Lấy danh sách lô hàng (Private)
- `GET /api/lots/:id` - Lấy lô hàng theo ID (Private)
- `POST /api/lots` - Tạo lô hàng mới (Chef/Manager/Admin)
- `PUT /api/lots/:id` - Cập nhật lô hàng (Chef/Manager/Admin)

### Master Data
- `GET /api/master-data/uoms` - Lấy danh sách đơn vị tính (Private)
- `GET /api/master-data/categories` - Lấy danh sách danh mục (Private)
- `POST /api/master-data/categories` - Tạo danh mục mới (Manager/Admin)
- `GET /api/master-data/suppliers` - Lấy danh sách nhà cung cấp (Private)
- `POST /api/master-data/suppliers` - Tạo nhà cung cấp mới (Manager/Admin)
- `GET /api/master-data/org-units` - Lấy danh sách đơn vị tổ chức (Private)
- `POST /api/master-data/org-units` - Tạo đơn vị tổ chức mới (Admin)
- `GET /api/master-data/locations` - Lấy danh sách vị trí kho (Private)
- `POST /api/master-data/locations` - Tạo vị trí kho mới (Manager/Admin)
- `GET /api/master-data/roles` - Lấy danh sách vai trò (Private)

## Technologies

- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Helmet** - Security headers
- **Morgan** - HTTP request logger
- **CORS** - Cross-Origin Resource Sharing

## Development

- Code được tổ chức theo pattern MVC
- Sử dụng async/await cho xử lý bất đồng bộ
- Error handling tập trung
- Validation với express-validator
- JWT authentication middleware

## Notes

- Các controller hiện tại chỉ là template, cần implement logic cụ thể
- Cần kết nối database trước khi sử dụng các tính năng CRUD
- Nhớ thay đổi JWT_SECRET trong production

## 🏗️ Kiến trúc hệ thống

### Cấu trúc thư mục

```
BE/
├── src/
│   ├── config/              # Cấu hình database và app
│   │   ├── config.js
│   │   └── database.js
│   ├── controllers/         # Controllers xử lý logic
│   │   ├── auth.controller.js
│   │   ├── item.controller.js
│   │   ├── internalOrder.controller.js
│   │   ├── productionOrder.controller.js
│   │   ├── shipment.controller.js
│   │   ├── goodsReceipt.controller.js
│   │   ├── inventory.controller.js
│   │   ├── recipe.controller.js
│   │   ├── lot.controller.js
│   │   ├── returnRequest.controller.js ⭐
│   │   ├── alert.controller.js ⭐
│   │   ├── dashboard.controller.js ⭐
│   │   ├── user.controller.js
│   │   └── masterData.controller.js
│   ├── middlewares/         # Middlewares
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   └── validation.js ⭐
│   ├── models/              # Database models (Mongoose)
│   │   ├── AppUser.js
│   │   ├── Item.js
│   │   ├── InternalOrder.js
│   │   ├── ProductionOrder.js
│   │   ├── Shipment.js
│   │   ├── GoodsReceipt.js
│   │   ├── InventoryBalance.js
│   │   ├── InventoryTransaction.js
│   │   ├── Recipe.js
│   │   ├── Lot.js
│   │   ├── ReturnRequest.js ⭐
│   │   ├── ReturnRequestLine.js ⭐
│   │   └── ... (28 models total)
│   ├── routes/              # API routes
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   ├── item.routes.js
│   │   ├── internalOrder.routes.js
│   │   ├── productionOrder.routes.js
│   │   ├── shipment.routes.js
│   │   ├── goodsReceipt.routes.js
│   │   ├── inventory.routes.js
│   │   ├── recipe.routes.js
│   │   ├── lot.routes.js
│   │   ├── returnRequest.routes.js ⭐
│   │   ├── alert.routes.js ⭐
│   │   ├── dashboard.routes.js ⭐
│   │   ├── user.routes.js
│   │   └── masterData.routes.js
│   ├── utils/               # Utility functions
│   │   ├── ApiResponse.js
│   │   ├── asyncHandler.js
│   │   └── jwt.js
│   └── app.js               # Express app configuration
├── server.js                # Server entry point
├── .env                     # Environment variables
├── .env.example             # Environment template
├── .gitignore              # Git ignore rules
├── package.json             # Dependencies
├── README.md                # This file
├── TEST_GUIDE.md            # API testing guide ⭐
└── IMPLEMENTATION_GUIDE.md  # Implementation details ⭐
```

### Design Patterns

#### MVC Pattern
- **Models:** Mongoose schemas định nghĩa data structure
- **Views:** JSON responses (RESTful API)
- **Controllers:** Business logic và data processing

#### Middleware Pattern
- Authentication & Authorization
- Error handling
- Request validation
- Logging

#### Repository Pattern
- Models encapsulate database operations
- Controllers không trực tiếp query database
- Dễ dàng test và maintain

### Database Schema

#### Core Entities
- **AppUser** - Users và authentication
- **Role** - Vai trò hệ thống
- **UserRole** - User-Role mapping (many-to-many)
- **OrgUnit** - Đơn vị tổ chức (Kitchen/Store)
- **Location** - Vị trí kho

#### Product Management
- **Item** - Sản phẩm (RAW/FINISHED)
- **Category** - Danh mục sản phẩm
- **UOM** - Đơn vị tính
- **ItemUOMConversion** - Quy đổi đơn vị

#### Order Management
- **InternalOrder** - Đơn hàng nội bộ
- **InternalOrderLine** - Chi tiết đơn hàng
- **OrderFulfillment** - Theo dõi fulfillment

#### Production Management
- **ProductionOrder** - Lệnh sản xuất
- **ProductionOrderLine** - Chi tiết sản xuất
- **ProductionConsumption** - Tiêu hao nguyên liệu
- **ProductionOutputLot** - Sản phẩm đầu ra
- **Recipe** - Công thức sản xuất
- **RecipeLine** - Chi tiết công thức

#### Logistics
- **Shipment** - Lô hàng
- **ShipmentLine** - Chi tiết lô hàng
- **ShipmentLineLot** - Lot tracking
- **GoodsReceipt** - Phiếu nhận hàng
- **GoodsReceiptLine** - Chi tiết nhận hàng

#### Inventory
- **InventoryBalance** - Số dư tồn kho
- **InventoryTransaction** - Lịch sử giao dịch
- **Lot** - Quản lý lô hàng

#### Returns ⭐
- **ReturnRequest** - Yêu cầu trả hàng
- **ReturnRequestLine** - Chi tiết trả hàng

#### Master Data
- **Supplier** - Nhà cung cấp

### API Response Format

#### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...},
  "statusCode": 200
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400,
  "errors": [...]
}
```

#### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  },
  "statusCode": 200
}
```

---

## 🧪 Testing

### Manual Testing
Xem chi tiết trong [TEST_GUIDE.md](./TEST_GUIDE.md)

### Automated Testing (TODO)
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage
npm run test:coverage
```

### Test với Postman
1. Import collection từ TEST_GUIDE.md
2. Set environment variables:
   - `base_url`: http://localhost:5000/api
   - `token`: JWT token từ login
3. Run collection

---

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production

#### 1. Build (nếu có TypeScript)
```bash
npm run build
```

#### 2. Start production server
```bash
npm start
```

#### 3. Using PM2 (Recommended)
```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start server.js --name central-kitchen-api

# Monitor
pm2 monit

# Logs
pm2 logs

# Restart
pm2 restart central-kitchen-api

# Stop
pm2 stop central-kitchen-api
```

### Environment Variables (Production)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-super-secret-production-key
JWT_EXPIRE=7d
CLIENT_URL=https://your-frontend-domain.com
```

### Docker (Optional)

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/central_kitchen
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongo

  mongo:
    image: mongo:8.0
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

**Run:**
```bash
docker-compose up -d
```

---

## 📖 Documentation

### API Documentation
- [TEST_GUIDE.md](./TEST_GUIDE.md) - Chi tiết tất cả API endpoints
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Hướng dẫn implementation

### Code Documentation
```bash
# Generate JSDoc (TODO)
npm run docs
```

### Database Schema
```bash
# Export schema diagram (TODO)
npm run schema:export
```

---

## 🤝 Contributing

### Development Workflow
1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Style
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful commit messages
- Add comments for complex logic

### Testing Requirements
- Write unit tests for new features
- Ensure all tests pass before PR
- Maintain test coverage > 80%

---

## 🐛 Known Issues

1. **Validation chưa áp dụng đầy đủ** - Cần thêm validation middleware vào tất cả routes
2. **Chưa có automated tests** - Cần implement unit và integration tests
3. **Chưa có API documentation (Swagger)** - Cần generate OpenAPI specs
4. **Performance chưa optimize** - Cần thêm indexing và caching

---

## 📝 Changelog

### Version 1.1.0 (2024-01-18) ⭐ NEW
- ✅ Added Return/Refund Flow
- ✅ Added Expiry Alert System
- ✅ Added Low Stock Alerts
- ✅ Added Dashboard & Analytics
- ✅ Added Comprehensive Validation Rules
- ✅ Updated models (ReturnRequest, ReturnRequestLine)
- ✅ Added new controllers (alert, dashboard, returnRequest)
- ✅ Added new routes
- ✅ Updated documentation

### Version 1.0.0 (2024-01-01)
- ✅ Initial release
- ✅ Authentication & Authorization
- ✅ Order Management
- ✅ Production Management
- ✅ Inventory Management
- ✅ Recipe Management
- ✅ Master Data Management

---

## 📞 Support

### Issues
Report bugs tại: [GitHub Issues](https://github.com/your-repo/issues)

### Contact
- Email: support@example.com
- Slack: #central-kitchen-support

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Express.js team
- MongoDB team
- Node.js community
- All contributors

---

## 🎯 Roadmap

### Phase 1 (Q1 2024) ✅
- [x] Core features implementation
- [x] Return/Refund flow
- [x] Alert system
- [x] Dashboard
- [x] Validation rules

### Phase 2 (Q2 2024)
- [ ] Automated testing suite
- [ ] API documentation (Swagger)
- [ ] Performance optimization
- [ ] Caching layer (Redis)
- [ ] Rate limiting

### Phase 3 (Q3 2024)
- [ ] Notification system (Email/Push)
- [ ] File upload (Images, Documents)
- [ ] Advanced reporting
- [ ] Data export (Excel/PDF)
- [ ] Audit logging

### Phase 4 (Q4 2024)
- [ ] Mobile app support
- [ ] Real-time updates (WebSocket)
- [ ] Advanced analytics
- [ ] Machine learning integration
- [ ] Multi-language support

---

**Made with ❤️ by the Central Kitchen Team**

**Last Updated:** 2026
