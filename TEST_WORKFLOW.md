# 🧪 TEST WORKFLOW - Admin User Management

## 📋 Chuẩn bị

### 1. Seed database (tạo admin user)
```bash
node scripts/seedDatabase.js
```

Sẽ tạo:
- ✅ Admin user: `admin / admin123`
- ✅ Org unit: `org_001`
- ✅ Location: `loc_001`

### 2. Start server
```bash
npm run dev
```

### 3. Mở Swagger UI
```
http://localhost:5001/api-docs
```

---

## 🎯 TEST WORKFLOW

### BƯỚC 1: Login Admin

**API:** `POST /api/auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:** Copy `token` từ response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

**Action:** Click nút **"Authorize"** ở đầu trang Swagger → Nhập: `Bearer <token>`

---

### BƯỚC 2: Tạo Organization Unit (Cửa hàng/Kho)

**API:** `POST /api/master-data/org-units`

**Request:**
```json
{
  "type": "STORE",
  "code": "STORE_DN",
  "name": "Cửa hàng Đà Nẵng",
  "address": "456 Trần Phú",
  "district": "Hải Châu",
  "city": "Đà Nẵng"
}
```

**Expected:** Status 201, nhận về `_id` của org unit (ví dụ: `org_1737247200000`)

**Copy ID này** để dùng ở bước tiếp theo!

---

### BƯỚC 3: Tạo Location cho Organization Unit

**API:** `POST /api/master-data/locations`

**Request:**
```json
{
  "org_unit_id": "org_1737247200000",
  "code": "KHO_DN_1",
  "name": "Kho Đà Nẵng - Tầng 1"
}
```

**Expected:** Status 201, location được tạo thành công

---

### BƯỚC 4: Lấy danh sách Roles

**API:** `GET /api/master-data/roles`

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "role_admin",
      "code": "ADMIN",
      "name": "Administrator"
    },
    {
      "_id": "role_chef",
      "code": "CHEF",
      "name": "Central Kitchen Staff"
    },
    {
      "_id": "role_supply_coordinator",
      "code": "SUPPLY_COORDINATOR",
      "name": "Supply Coordinator"
    },
    {
      "_id": "role_manager",
      "code": "MANAGER",
      "name": "Operational Manager"
    },
    {
      "_id": "role_store_staff",
      "code": "STORE_STAFF",
      "name": "Franchise Store Staff"
    }
  ]
}
```

**Copy các `role_id`** để gán cho user!

---

### BƯỚC 5: Tạo User mới (Register)

**API:** `POST /api/auth/register`

**Request:**
```json
{
  "org_unit_id": "org_1737247200000",
  "username": "nguyen.van.a",
  "password": "temp123456",
  "full_name": "Nguyễn Văn A",
  "email": "duyvnse@fpt.edu.vn",
  "role_ids": ["role_manager", "role_store_staff"]
}
```

**Expected:** Status 201
```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": {
      "id": "user_1737247300000",
      "username": "nguyen.van.a",
      ...
    }
  },
  "message": "User registered successfully"
}
```

**Copy `user.id`** cho các bước tiếp theo!

---

### BƯỚC 6A: Gửi Email Setup Password (Khuyến nghị)

**API:** `POST /api/auth/send-password-setup/{userId}`

**URL:** `POST /api/auth/send-password-setup/user_1737247300000`

**Expected:** Status 200
```json
{
  "success": true,
  "data": {
    "email": "duyvnse@fpt.edu.vn",
    "message_id": "<xxxxx@gmail.com>"
  },
  "message": "Password setup link sent successfully"
}
```

**Check email:** User sẽ nhận email với link:
```
http://localhost:3000/set-password?token=abc123...
```

---

### BƯỚC 6B: User Set Password (Từ email link)

**API:** `POST /api/auth/set-password`

**Request:**
```json
{
  "token": "abc123def456...",
  "new_password": "myNewPassword123"
}
```

**Expected:** Status 200, user tự động login
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": { ... }
  },
  "message": "Password set successfully"
}
```

---

### BƯỚC 7: Quản lý Roles (Gán thêm/Xóa roles)

#### 7A. Gán thêm roles

**API:** `POST /api/users/{userId}/roles`

**Request:**
```json
{
  "role_ids": ["role_chef"]
}
```

**Expected:** Status 200
```json
{
  "success": true,
  "data": {
    "user_id": "user_1737247300000",
    "username": "nguyen.van.a",
    "roles": [
      { "id": "role_manager", "code": "MANAGER", "name": "Operational Manager" },
      { "id": "role_store_staff", "code": "STORE_STAFF", "name": "Franchise Store Staff" },
      { "id": "role_chef", "code": "CHEF", "name": "Central Kitchen Staff" }
    ]
  },
  "message": "Roles assigned successfully"
}
```

#### 7B. Xóa roles

**API:** `DELETE /api/users/{userId}/roles`

**Request:**
```json
{
  "role_ids": ["role_chef"]
}
```

**Expected:** Status 200, role đã được xóa

---

### BƯỚC 8: Xem danh sách Users

**API:** `GET /api/users`

**Query params:**
- `page=1`
- `limit=10`
- `org_unit_id=org_1737247200000` (optional)

**Expected:** Danh sách users với pagination

---

### BƯỚC 9: Reset Password (Admin)

**API:** `PUT /api/auth/reset-password/{userId}`

**Request:**
```json
{
  "new_password": "newTemp789"
}
```

**Expected:** Status 200, password đã reset

**Check email:** User sẽ nhận email thông báo mật khẩu mới

---

## ✅ Checklist Test

- [ ] Login admin thành công
- [ ] Tạo org unit thành công
- [ ] Tạo location thành công
- [ ] Lấy danh sách roles thành công
- [ ] Tạo user mới với roles thành công
- [ ] Gửi email setup password thành công
- [ ] Nhận email có link setup password
- [ ] User set password qua token thành công
- [ ] Gán thêm roles cho user thành công
- [ ] Xóa roles khỏi user thành công
- [ ] Xem danh sách users thành công
- [ ] Admin reset password thành công
- [ ] User nhận email reset password

---

## 🐛 Troubleshooting

### Lỗi 401 Unauthorized
→ Token hết hạn hoặc chưa authorize. Login lại và click Authorize.

### Lỗi 403 Forbidden
→ User không có quyền. Đảm bảo đang dùng admin token.

### Lỗi 400 "Organization unit not found"
→ org_unit_id không tồn tại. Kiểm tra lại ID từ bước 2.

### Email không gửi được
→ Kiểm tra `.env`:
- `EMAIL_USER` và `EMAIL_PASSWORD` đúng chưa
- Gmail: Phải dùng App Password, không phải password thường
- Check logs server: `Error sending email: ...`

### Token không hợp lệ (set password)
→ Token đã expire (24h). Yêu cầu admin gửi lại email.

---

## 📧 Test Email

Email template sẽ có dạng:

**Subject:** Setup Your Password - SWP391 System

**Body:**
```
Hello Nguyễn Văn A,

Your account has been created successfully!

Username: nguyen.van.a

Please click the button below to set your password:
[Set My Password] → http://localhost:3000/set-password?token=...

Important: This link will expire in 24 hours.
```

---

## 🎉 Hoàn thành!

Sau khi test xong tất cả các bước, workflow admin đã hoạt động đầy đủ:
1. ✅ Admin tạo org unit (cửa hàng)
2. ✅ Admin tạo location (kho)
3. ✅ Admin tạo user gắn org_unit_id
4. ✅ Admin gán roles
5. ✅ Gửi email setup password
6. ✅ User set password và login
7. ✅ Quản lý roles động
