# Admin Flow - User Management Guide

## Tổng quan

Hệ thống đã được cập nhật với đầy đủ các chức năng quản lý user theo flow admin chuẩn.

## 📋 Flow đăng ký user mới (Admin only)

### Bước 1: Admin tạo Organization Unit (Cửa hàng/Kho)

**API:** `POST /api/master-data/org-units`

**Access:** Admin only (cần JWT token)

```json
{
  "type": "STORE",
  "code": "STORE_HCM",
  "name": "Kho Hồ Chí Minh",
  "address": "123 Nguyễn Văn Linh",
  "district": "Quận 7",
  "city": "TP. Hồ Chí Minh"
}
```

### Bước 2: Admin tạo Location cho OrgUnit

**API:** `POST /api/master-data/locations`

**Access:** Manager/Admin

```json
{
  "org_unit_id": "org_001",
  "code": "KHO_A",
  "name": "Kho A - Tầng 1"
}
```

### Bước 3: Admin tạo User và gắn OrgUnit + Roles

**API:** `POST /api/auth/register` (Đã sửa thành Admin only)

**Access:** Admin only

**Required fields:** `org_unit_id`, `username`, `password`, `full_name`

**Optional fields:** `email`, `phone`, `role_ids`

```json
{
  "org_unit_id": "org_001",
  "username": "warehouse_user",
  "password": "temp123456",
  "full_name": "Nguyễn Văn A",
  "email": "duyvnse@fpt.edu.vn",
  "phone": "0901234567",
  "role_ids": ["role_manager", "role_store_staff"]
}
```

**Validation rules:**
- `username`: Min 3 characters
- `password`: Min 6 characters
- `email`: Must be valid email format (optional but recommended for password setup)
- `phone`: Must be 10-11 digits, numbers only, no spaces/dashes (optional)
- `role_ids`: Array of role IDs

### Bước 4a: Gửi Email Setup Password (Khuyến nghị)

**API:** `POST /api/auth/send-password-setup/:userId`

**Access:** Admin only

Response: User sẽ nhận email với link setup password (valid 24h)

### Bước 4b: Hoặc cấp mật khẩu tạm

Admin cấp username + password tạm (từ bước 3) cho user, và yêu cầu user đổi mật khẩu sau khi đăng nhập.

## 🔐 APIs Password Management

### 1. Gửi link setup password (Mới)
```
POST /api/auth/send-password-setup/:userId
Authorization: Bearer <admin-token>
```

User sẽ nhận email với link dạng:
```
http://localhost:3000/set-password?token=abc123...
```

### 2. User set password qua token (Mới)
```
POST /api/auth/set-password
Body:
{
  "token": "abc123...",
  "new_password": "newpassword123"
}
```

Response: Tự động login, trả về JWT token

### 3. Admin reset password trực tiếp
```
PUT /api/auth/reset-password/:userId
Authorization: Bearer <admin-token>
Body:
{
  "new_password": "newtemp123"
}
```

User sẽ nhận email thông báo mật khẩu mới (nếu có email).

### 4. User đổi password (khi đã login)
```
PUT /api/auth/change-password
Authorization: Bearer <user-token>
Body:
{
  "current_password": "oldpass",
  "new_password": "newpass"
}
```

## 👥 APIs Role Management (Mới)

### Gán thêm roles cho user
```
POST /api/users/:id/roles
Authorization: Bearer <admin-token>
Body:
{
  "role_ids": ["role_admin", "role_manager"]
}
```

### Xóa roles khỏi user
```
DELETE /api/users/:id/roles
Authorization: Bearer <admin-token>
Body:
{
  "role_ids": ["role_warehouse"]
}
```

## 📧 Cấu hình Email

### Setup Gmail (Khuyến nghị cho development)

1. Tạo App Password trong Google Account:
   - Vào https://myaccount.google.com/security
   - Bật 2-Step Verification
   - Tạo App Password cho "Mail"

2. Cập nhật file `.env`:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-here
EMAIL_FROM_NAME=SWP391 System
CLIENT_URL=http://localhost:3000
```

### Các email service khác

- **SendGrid**: https://sendgrid.com/ (100 emails/day free)
- **Mailgun**: https://www.mailgun.com/ (5000 emails/month free)
- **AWS SES**: https://aws.amazon.com/ses/ (62000 emails/month free)

## 🚀 Testing với Swagger

1. Start server: `npm run dev`
2. Mở Swagger UI: http://localhost:5001/api-docs

### Test flow đầy đủ:

1. **Login với admin** (dùng user có sẵn hoặc seed data)
   - Lấy JWT token

2. **Tạo OrgUnit**
   - Master Data → POST /api/master-data/org-units
   - Click "Authorize" và nhập token

3. **Tạo Location**
   - Master Data → POST /api/master-data/locations

4. **Get danh sách Roles**
   - Master Data → GET /api/master-data/roles
   - Copy các role_id cần gán

5. **Register user mới**
   - Authentication → POST /api/auth/register
   - Gắn org_unit_id và role_ids

6. **Gửi email setup password**
   - Authentication → POST /api/auth/send-password-setup/{userId}

7. **Quản lý roles**
   - Users → POST /api/users/{id}/roles (gán thêm)
   - Users → DELETE /api/users/{id}/roles (xóa bớt)

## 📝 Notes quan trọng

### Security
- ✅ Register đã chuyển thành **Admin only**
- ✅ Email token có thời hạn **24 giờ**
- ✅ Token được hash trong database (SHA256)
- ✅ Password được hash với bcrypt

### Email Templates
Email đã được thiết kế đẹp với HTML:
- Welcome email với credentials
- Password reset notification
- Link setup password tự động expire

### Production Checklist
- [ ] Cập nhật `CLIENT_URL` trong .env
- [ ] Cấu hình SMTP service thật (không dùng Gmail)
- [ ] Enable SSL/TLS cho email
- [ ] Log tất cả actions của admin
- [ ] Thêm rate limiting cho email APIs

## 🔍 Kiểm tra errors

Xem logs trong console để debug email issues:
```bash
# Server sẽ log:
Email sent: <message-id>
# Hoặc
Error sending email: <error-message>
```

## 📦 Cài đặt thư viện

```bash
npm install nodemailer --save
```

Đã bao gồm trong package.json mới.
