Backend API được xây dựng với Node.js, Express và MongoDB, cung cấp giải pháp quản lý đầy đủ cho chuỗi cung ứng từ bếp trung tâm (Central Kitchen) đến các cửa hàng franchise. Dự án hỗ trợ quản lý đơn hàng, sản xuất, tồn kho, và theo dõi lô hàng thời gian thực.

---

## ⚡ Quick Links
- 📖 [API Documentation (Swagger UI)](http://localhost:5001/api-docs)
- ✅ [Test Guide](./TEST_GUIDE.md)
- 🏗️ [Implementation Details](./IMPLEMENTATION_GUIDE.md)

---

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

### 🔄 Return/Refund Flow ⭐ DISABLED
- ~~Xử lý hàng trả lại từ cửa hàng~~ (Currently disabled - not needed for current project phase)
- ~~Defect type tracking~~
- ~~Tự động cập nhật tồn kho~~
- ~~Approval workflow~~

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

### 🛠️ Công nghệ sử dụng
- **Backend:** Node.js (v18+), Express.js (v4.18)
- **Database:** MongoDB (v8.0), Mongoose (v8.0)
- **Security:** JWT, Bcrypt.js, Helmet, CORS
- **Real-time:** Socket.io
- **Documentation:** Swagger JSDoc, Swagger UI
- **Utilities:** Express Validator, Morgan, Dotenv, Nodemon

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



## ⚙️ Cấu hình

### Environment Variables

Tạo file `.env` trong thư mục root với các biến đã gửi riêng
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

## 📖 Documentation & API Endpoints

Hệ thống cung cấp tài liệu API đầy đủ qua Swagger UI. Các hướng dẫn chi tiết về luồng nghiệp vụ có thể tìm thấy trong các file guide.

- � [API Documentation (Swagger UI)](http://localhost:5001/api-docs)
- ✅ [Chi tiết API & Hướng dẫn Test](./TEST_GUIDE.md)
- 🏗️ [Chi tiết Implementation](./IMPLEMENTATION_GUIDE.md)

### Base URL
`http://localhost:5001/api`

### Authentication
Hầu hết các endpoints yêu cầu JWT token trong header:
```
Authorization: Bearer <your_jwt_token>
```

### API Details
Vui lòng truy cập [Swagger UI](http://localhost:5001/api-docs) để xem chi tiết tham số và test trực tiếp các endpoint.

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

## 🔐 Roles & Permissions

Hệ thống sử dụng Role-Based Access Control (RBAC) với các vai trò chính:

| Role | Responsibility |
| :--- | :--- |
| **ADMIN** | Quản lý toàn bộ hệ thống, User và Org Units |
| **MANAGER** | Quản lý Master Data, Inventory, Approval |
| **CHEF** | Quản lý Recipe, Production Paper, Shipment |
| **STORE_STAFF** | Tạo Order, Nhận hàng (Goods Receipt), Trả hàng |
| **SUPPLY_COORDINATOR** | Điều hành Logistics và Xử lý sự cố |

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

1. **Unit Tests** - Cần bổ sung độ phủ test cho các module nghiệp vụ mới
2. **Performance** - Cần tối ưu hóa Indexing cho các query Dashboard phức tạp

---

## 📝 Changelog

### Version 1.1.0 (2024-01-18) ⭐ NEW
- ~~✅ Added Return/Refund Flow~~ (Currently disabled)
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
- ~~[x] Return/Refund flow~~ (Currently disabled)
- [x] Alert system
- [x] Dashboard
- [x] Validation rules

### Phase 2 (Q1 2026) 🏗️
- [x] API documentation (Swagger UI) - **DONE**
- [x] Real-time updates (Socket.io) - **DONE**
- [ ] Automated testing suite (Coverage > 80%)
- [ ] Performance optimization (Indexing & Redis)
- [ ] Rate limiting & Security Hardening

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
