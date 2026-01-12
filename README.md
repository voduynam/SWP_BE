# Central Kitchen and Franchise Store Management System - Backend API

Backend API cho hệ thống Quản lý Bếp Trung Tâm và Cửa hàng Franchise được xây dựng với Node.js, Express và MongoDB.

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd BE
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` từ `.env.example`:
```bash
copy .env.example .env
```

4. Cập nhật các biến môi trường trong file `.env`

## Chạy ứng dụng

### Development mode
```bash
npm run dev
```

### Production mode
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:5000`

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
