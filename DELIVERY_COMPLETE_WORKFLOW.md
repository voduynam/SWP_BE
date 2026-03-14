# 🚚 Delivery Workflow - Hướng Dẫn Hoàn Chỉnh

## 📋 Tổng Quan Quy Trình Giao Hàng

**1 Route = 1 Shipment (Giao Trực Tiếp)**

Quy trình giao hàng bao gồm 6 bước chính:

```
1. Tạo Shipment (DRAFT)
   ↓
2. Xác nhận Shipment (PICKED)
   ↓
3. Tạo DeliveryRoute cho Shipment (PLANNED)
   ↓
4. Tài xế bắt đầu giao hàng (Route: IN_PROGRESS, Shipment: IN_TRANSIT)
   ↓
5. Tài xế nhận hàng từ người nhận (Hoàn thành giao)
   ↓
6. Upload ảnh chứng minh + Cập nhật Shipment = DELIVERED (Route: COMPLETED)
```

---

## 🔄 Các Status Flow

### Shipment Status Flow
```
DRAFT → PICKED → IN_TRANSIT → DELIVERED
```

### Delivery Route Status Flow
```
PLANNED → IN_PROGRESS → COMPLETED
```

---

## 🔌 API Endpoints

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| GET | `/api/shipments` | Lấy danh sách shipments |
| POST | `/api/shipments` | Tạo shipment mới |
| PUT | `/api/shipments/:shipmentId/status` | Cập nhật status + upload ảnh (khi DELIVERED) |
| GET | `/api/delivery-routes` | Lấy danh sách routes |
| POST | `/api/delivery-routes` | Tạo route mới (1 shipment) |
| GET | `/api/delivery-routes/:id` | Chi tiết route |
| PUT | `/api/delivery-routes/:id/status` | Cập nhật status route |

---

## 🔗 Mapping ID - Lấy Từ Đâu

**Các ID quan trọng trong workflow:**

| Parameter | Lấy Từ | Ví Dụ |
|-----------|--------|-------|
| `shipment_id` | BƯỚC 1 response → `_id` | `shipment_001` |
| `route_id` (`:id`) | BƯỚC 3 response → `_id` | `route_100` |
| `driver_id` | GET `/api/users/drivers/list` | `driver_456` |

**Ví dụ flow hoàn chỉnh:**
```
BƯỚC 1: POST /api/shipments → Response: { "_id": "shipment_001", ... }
  ↓ Lưu shipment_id = shipment_001
  
BƯỚC 3: POST /api/delivery-routes (gồm shipment_001) → Response: { "_id": "route_100", ... }
  ↓ Lưu route_id = route_100
  
BƯỚC 4-6: PUT /api/delivery-routes/route_100/status, /api/shipments/shipment_001/status
  ✅ Dùng shipment_id + route_id từ trên
```

---

## 📝 Hướng Dẫn Chi Tiết - Từng Bước

### ✅ BƯỚC 1: Tạo Shipment

**Endpoint:** POST `/api/shipments` (hoặc từ Order)

**Yêu cầu:**
```json
{
  "order_id": "order_123",
  "from_location_id": "warehouse_001",
  "to_location_id": "store_001",
  "ship_date": "2024-03-15"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "shipment_001",
    "shipment_no": "SHP001",
    "order_id": "order_123",
    "status": "DRAFT",
    "ship_date": "2024-03-15"
  }
}
```

**Lưu ý:**
- Status ban đầu là DRAFT
- ⚠️ **KHÔNG** có driver_id, vehicle_id ở Shipment
- Driver được assign ở BƯỚC 3 (khi tạo DeliveryRoute)

---

### ✅ BƯỚC 2: Xác Nhận Shipment (Pick Items)

**Endpoint:** PUT `/api/shipments/:shipmentId/status`

**Yêu cầu:**
```json
{
  "status": "PICKED",
  "notes": "Đã nhặt hàng, đóng gói xong"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "shipment_001",
    "status": "PICKED",
    "picked_at": "2024-03-14T10:30:00Z"
  }
}
```

**Lưu ý:**
- Xác nhận rằng tất cả items đã nhặt từ kho
- Chuẩn bị hàng để giao

---

### ✅ BƯỚC 3: Tạo Delivery Route cho Shipment

**Bước tiền kiến:** Lấy danh sách tài xế

**Endpoint:** GET `/api/users/drivers/list`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "driver_456",
      "full_name": "Nguyễn Văn A",
      "email": "nguyena@company.com",
      "phone": "0912345678",
      "status": "ACTIVE"
    }
  ]
}
```

**Tạo DeliveryRoute:**

**Endpoint:** POST `/api/delivery-routes`

**Yêu cầu (Lưu ý: shipment_ids chứa 1 shipment):**
```json
{
  "route_name": "Route-HCM-001",
  "driver_id": "driver_456",
  "vehicle_no": "BKS-29A12345",
  "vehicle_type": "Xe tải 5 tấn",
  "planned_date": "2024-03-15",
  "shipment_ids": ["shipment_001"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "route_100",
    "route_no": "RT-20240315-001",
    "route_name": "Route-HCM-001",
    "driver_id": "driver_456",
    "driver_name": "Nguyễn Văn A",
    "driver_phone": "0912345678",
    "vehicle_no": "BKS-29A12345",
    "status": "PLANNED",
    "shipment_ids": ["shipment_001"],
    "created_by": "manager_123"
  }
}
```

**✅ Điểm quan trọng:**
- ⚠️ **driver_id là REQUIRED**
- **shipment_ids chỉ chứa 1 shipment** (vì 1 route = 1 shipment)
- vehicle_no, vehicle_type tùy chọn
- Route ban đầu status = PLANNED

---

### ✅ BƯỚC 4: Tài Xế Bắt Đầu Giao Hàng

**Endpoint 1:** PUT `/api/delivery-routes/:id/status`

**Yêu cầu:**
```json
{
  "status": "IN_PROGRESS"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "route_100",
    "status": "IN_PROGRESS",
    "started_at": "2024-03-15T08:00:00Z"
  }
}
```

---

**Endpoint 2:** PUT `/api/shipments/:shipmentId/status`

Cập nhật Shipment sang IN_TRANSIT

**Yêu cầu:**
```json
{
  "status": "IN_TRANSIT"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "shipment_001",
    "status": "IN_TRANSIT",
    "updated_at": "2024-03-15T08:00:00Z"
  }
}
```

**Lưu ý:**
- 📍 Tài xế vừa nhận hàng từ kho, đang trên đường giao
- Route: PLANNED → IN_PROGRESS
- Shipment: PICKED → IN_TRANSIT

---

### ✅ BƯỚC 5: Tài Xế Hoàn Thành Giao Hàng + Upload Ảnh Chứng Minh

Người nhận đã nhận hàng → Tài xế upload ảnh + update status DELIVERED (cùng 1 request)

**Endpoint:** PUT `/api/shipments/:shipmentId/status`

**📝 Tham số:**
- `:shipmentId` = shipment_id (ví dụ: `shipment_001`)

Ví dụ: `PUT /api/shipments/shipment_001/status`

#### Cách 1: Dùng Postman - **KHUYẾN NGHỊ**

1. Mở Postman
2. Tạo request **PUT**: 
   ```
   http://localhost:5001/api/shipments/shipment_001/status
   ```
3. Tab **Headers**: 
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```
4. Tab **Body** → Chọn **form-data**
5. Thêm fields:
   - Key: `status`, Value: `DELIVERED`, Type: Text
   - Key: `delivery_photo`, Value: (chọn file ảnh), Type: File
6. Click **Send**

**Response:**
```json
{
  "success": true,
  "message": "Shipment status updated successfully",
  "data": {
    "_id": "shipment_001",
    "shipment_no": "SHP20240315001",
    "status": "DELIVERED",
    "updated_at": "2024-03-15T09:25:00Z",
    "delivery_photo_url": "https://res.cloudinary.com/deiz2fc0h/image/upload/v1/delivery-proof/Shipment_shipment_001_1710489900000.jpg",
    "delivery_photo_uploaded_at": "2024-03-15T09:25:00Z"
  }
}
```

#### Cách 2: Dùng cURL

```bash
TOKEN="YOUR_JWT_TOKEN"

curl -X PUT "http://localhost:5001/api/shipments/shipment_001/status" \
  -H "Authorization: Bearer $TOKEN" \
  -F "status=DELIVERED" \
  -F "delivery_photo=@/path/to/delivery_photo.jpg"
```

#### Cách 3: Dùng JavaScript/Fetch

```javascript
const formData = new FormData();
formData.append('status', 'DELIVERED');

// Thêm ảnh từ file input
if (fileInput.files[0]) {
  formData.append('delivery_photo', fileInput.files[0]);
}

const response = await fetch(
  '/api/shipments/shipment_001/status',
  {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  }
);

const data = await response.json();
if (data.success) {
  console.log('✅ Giao hàng hoàn thành + ảnh upload!');
  console.log('📸 Ảnh URL:', data.data.delivery_photo_url);
} else {
  console.error('❌ Lỗi:', data.message);
}
```

**✅ Điểm quan trọng:**
- ✅ 1 request = 1 bước (vừa upload ảnh, vừa update status)
- ✅ Ảnh tự động upload lên Cloudinary
- ✅ Status: IN_TRANSIT → DELIVERED
- ✅ Nếu không upload ảnh, vẫn có thể update status (photo optional)

---

### ✅ BƯỚC 6: Cập Nhật Trạng Thái Hoàn Thành

Sau khi upload ảnh → Cập nhật Shipment và Route sang COMPLETED

**Endpoint 1:** PUT `/api/shipments/:shipmentId/status`

**Yêu cầu:**
```json
{
  "status": "DELIVERED"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "shipment_001",
    "status": "DELIVERED",
    "delivered_at": "2024-03-15T09:25:00Z"
  }
}
```

---

**Endpoint 2:** PUT `/api/delivery-routes/:id/status`

**Yêu cầu:**
```json
{
  "status": "COMPLETED"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "route_100",
    "status": "COMPLETED",
    "completed_at": "2024-03-15T09:25:00Z"
  }
}
```

**Lưu ý:**
- ✅ Shipment: IN_TRANSIT → DELIVERED
- ✅ Route: IN_PROGRESS → COMPLETED
- ✅ Giao hàng hoàn thành!

---

## 🧪 Hướng Dẫn Test Bằng Postman

### Setup Ban Đầu

1. **Tạo collection mới:** "Direct Delivery Workflow"
2. **Thêm environment variables:**
   ```
   base_url: http://localhost:5001
   token: [JWT_TOKEN_CỦA_BẠN]
   shipment_id: [SẼ_TẠO_TRONG_TEST]
   route_id: [SẼ_TẠO_TRONG_TEST]
   ```

3. **Headers mặc định cho tất cả requests:**
   ```
   Authorization: Bearer {{token}}
   Content-Type: application/json
   ```

### Test Script Hoàn Chỉnh

#### Test 1: Lấy Danh Sách Tài Xế (Chuẩn Bị)
```
GET {{base_url}}/api/users/drivers/list
Headers: Authorization: Bearer {{token}}
Response: Lưu driver_id từ response
```

---

#### Test 2: Tạo Shipment
```
POST {{base_url}}/api/shipments
Headers: Authorization: Bearer {{token}}
Body (JSON):
{
  "order_id": "order_123",
  "from_location_id": "warehouse_001",
  "to_location_id": "store_001",
  "ship_date": "2024-03-15"
}
```
**➜ Lưu shipment_id từ response:**
```javascript
// Postman Scripts tab → Post-response
pm.environment.set("shipment_id", pm.response.json().data._id);
```

---

#### Test 3: Xác Nhận Shipment (PICKED)
```
PUT {{base_url}}/api/shipments/{{shipment_id}}/status
Headers: Authorization: Bearer {{token}}
Body (JSON):
{
  "status": "PICKED"
}
```

---

#### Test 4: Tạo Delivery Route (1 Shipment) ⭐
```
POST {{base_url}}/api/delivery-routes
Headers: Authorization: Bearer {{token}}
Body (JSON):
{
  "route_name": "Route-Direct-001",
  "driver_id": "driver_456",
  "vehicle_no": "BKS-29A12345",
  "vehicle_type": "Xe tải 5 tấn",
  "planned_date": "2024-03-15",
  "shipment_ids": ["{{shipment_id}}"]
}
```
**➜ Lưu route_id từ response:**
```javascript
pm.environment.set("route_id", pm.response.json().data._id);
```

---

#### Test 5: Bắt Đầu Giao Hàng (Route: IN_PROGRESS)
```
PUT {{base_url}}/api/delivery-routes/{{route_id}}/status
Headers: Authorization: Bearer {{token}}
Body (JSON):
{
  "status": "IN_PROGRESS"
}
```

---

#### Test 6: Cập Nhật Shipment = IN_TRANSIT
```
PUT {{base_url}}/api/shipments/{{shipment_id}}/status
Headers: Authorization: Bearer {{token}}
Body (JSON):
{
  "status": "IN_TRANSIT"
}
```

---

#### Test 7: Upload Ảnh + Hoàn Thành Giao Hàng (DELIVERED) ⭐⭐⭐

**Cách mới: 1 request, mọi thứ xong luôn**

```
PUT {{base_url}}/api/shipments/{{shipment_id}}/status
Headers: Authorization: Bearer {{token}}

Body (form-data):
  status: DELIVERED (text)
  delivery_photo: [chọn file .jpg/.png] (file)
```

**✅ Kết quả mong đợi:**
- Status = DELIVERED
- delivery_photo_url = URL Cloudinary
- delivery_photo_uploaded_at = timestamp

---

#### Test 8: Hoàn Thành Route
```
PUT {{base_url}}/api/delivery-routes/{{route_id}}/status
Headers: Authorization: Bearer {{token}}
Body (JSON):
{
  "status": "COMPLETED"
}
```

**✅ Hoàn tất toàn bộ quy trình giao hàng!**

---

## 📊 Ví Dụ Dữ Liệu Thực Tế

### Shipment Sample Data
```json
{
  "_id": "shipment_001",
  "shipment_no": "SHP20240315001",
  "order_id": "order_789",
  "from_location_id": "warehouse_001",
  "to_location_id": "store_001",
  "status": "DELIVERED",
  "ship_date": "2024-03-15",
  "created_at": "2024-03-14T10:00:00Z"
}
```

### DeliveryRoute Sample Data (1 Shipment)
```json
{
  "_id": "route_100",
  "route_no": "RT-20240315-001",
  "route_name": "Route-HCM-Direct-001",
  "driver_id": "driver_456",
  "driver_name": "Nguyễn Văn A",
  "driver_phone": "0912345678",
  "vehicle_no": "BKS-29A12345",
  "vehicle_type": "Xe tải 5 tấn",
  "status": "COMPLETED",
  "shipment_ids": ["shipment_001"],
  "planned_date": "2024-03-15",
  "delivery_photo_url": "https://res.cloudinary.com/deiz2fc0h/image/upload/v1/delivery-proof/Route_route_100_1710489900000.jpg",
  "delivery_photo_uploaded_at": "2024-03-15T09:25:00Z",
  "created_at": "2024-03-14T14:00:00Z",
  "completed_at": "2024-03-15T09:25:00Z"
}
```

---

## ⚠️ Các Lỗi Thường Gặp & Cách Khắc Phục

| Lỗi | Nguyên Nhân | Giải Pháp |
|-----|-----------|----------|
| 401 Unauthorized | Token hết hạn hoặc sai | Lấy token mới bằng login |
| 404 Not Found | Route/Shipment ID sai | Kiểm tra lại ID |
| 400 Route Not Found | CreateDeliveryRoute thiếu driver_id | Thêm driver_id bắt buộc |
| 413 Payload Too Large | File ảnh quá lớn (>5MB) | Nén ảnh xuống dưới 5MB |
| FileBackend Not a File | Upload không phải file | Chọn file trong form-data |
| 400 Invalid Status | Status không hợp lệ | Chỉ dùng: PICKED, IN_TRANSIT, DELIVERED |

---

## 🔒 Bảo mật & Phân Quyền

### Ai có thể thực hiện các hành động?

| Endpoint | ADMIN | MANAGER | SUPPLY_COORDINATOR | DRIVER |
|----------|-------|---------|-------------------|--------|
| Create Shipment | ✅ | ✅ | ✅ | ❌ |
| Update Shipment Status | ✅ | ✅ | ✅ | ✅ |
| Get Drivers | ✅ | ✅ | ✅ | ✅ |
| Create Route | ✅ | ✅ | ✅ | ❌ |
| Update Route Status | ✅ | ✅ | ✅ | ✅ |
| Upload Proof Photo | ✅ | ✅ | ✅ | ✅ |

**Lưu ý:** Có thể mở rộng quyền DRIVER để upload ảnh chứng minh thực tế

---

## 📈 Monitoring & Analytics

### Theo dõi trạng thái delivery
```json
GET /api/delivery-routes/[route_id]
Response:
{
  "_id": "route_100",
  "status": "COMPLETED",
  "shipment_ids": ["shipment_001"],
  "delivery_photo_url": "https://...",
  "delivery_photo_uploaded_at": "2024-03-15T09:25:00Z"
}
```

### Báo cáo giao hàng
- Tổng routes hoàn thành hôm nay
- Số photos uploaded
- Thời gian trung bình per delivery
- Hàng hóa đã giao thành công

---

## ✅ Checklist Hoàn Thành

- [ ] Tạo Shipment (DRAFT)
- [ ] Xác nhận Shipment (PICKED)
- [ ] Lấy driver_id từ danh sách
- [ ] Tạo Delivery Route với 1 shipment
- [ ] Bắt đầu Route (IN_PROGRESS)
- [ ] Cập nhật Shipment → IN_TRANSIT
- [ ] Upload ảnh chứng minh giao hàng
- [ ] Cập nhật Shipment → DELIVERED
- [ ] Hoàn thành Route (COMPLETED)
- [ ] Kiểm tra delivery_photo_url trong database

---

## 🎯 Tiếp Theo

1. **Mobile App**: Tài xế dùng app để upload ảnh + tracking real-time
2. **Socket.io**: Real-time update delivery status cho manager
3. **Notification**: Gửi thông báo khi delivery completed
4. **Multi-Photo**: Cho phép upload nhiều ảnh per delivery
5. **GPS Tracking**: Theo dõi vị trí tài xế trên map

---

**Tạo ngày:** 2024-03-10  
**Cập nhật:** 2024-03-10 (Chuyển sang Direct Delivery - 1 Route = 1 Shipment)  
**Version:** 2.0 (Simplified)
