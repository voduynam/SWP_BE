# SWP391 Backend API

Backend API cho dự án SWP391 được xây dựng với Node.js và Express.

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
- `POST /api/auth/register` - Đăng ký user mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Users
- `GET /api/users` - Lấy danh sách users
- `GET /api/users/:id` - Lấy user theo ID
- `PUT /api/users/:id` - Cập nhật user
- `DELETE /api/users/:id` - Xóa user

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
