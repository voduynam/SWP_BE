# Nhánh Hoang – Ghi chú

## 1. Phân quyền (Role-based access)

Middleware `authorize(...roles)` trong `src/middlewares/auth.js` dùng để giới hạn route theo role. Các role dùng trong hệ thống: `ADMIN`, `MANAGER`, `CHEF`, `STORE_STAFF`, `DRIVER`, `SUPPLY_COORDINATOR`, v.v.

### Shipment (Phiếu giao hàng)
| Route | Method | Roles được phép |
|-------|--------|------------------|
| `/api/shipments` | GET | Đã đăng nhập (protect) |
| `/api/shipments/:id` | GET | Đã đăng nhập |
| **Tạo phiếu giao hàng** | **POST** | **CHEF, MANAGER, ADMIN** |
| Cập nhật status + ảnh giao hàng | PUT `/:id/status` | CHEF, DRIVER, SUPPLY_COORDINATOR, MANAGER, ADMIN |
| Xác nhận xuất kho (dispatch) | PUT `/:id/dispatch` | CHEF, MANAGER, ADMIN |

### Internal Order
| Route | Roles |
|-------|--------|
| Tạo đơn nội bộ | STORE_STAFF, MANAGER, ADMIN |
| Cập nhật trạng thái đơn | CHEF, MANAGER, ADMIN |
| Tạo production từ đơn | CHEF, MANAGER, ADMIN |

### Master Data
| Route | Roles |
|-------|--------|
| Categories (create) | MANAGER, ADMIN |
| Suppliers (create) | MANAGER, ADMIN |
| OrgUnits (create) | ADMIN |
| Locations (create) | MANAGER, ADMIN |
| Seed store locations | ADMIN, MANAGER, CHEF, SUPPLY_COORDINATOR |

### Delivery Route
| Route | Roles |
|-------|--------|
| My routes (driver) | DRIVER |
| List/Create/Update routes | ADMIN, MANAGER, SUPPLY_COORDINATOR (+, CHEF cho GET) |
| Update route status | ADMIN, MANAGER, SUPPLY_COORDINATOR, DRIVER |
| Add stop, update stop (delivery photo) | ADMIN, MANAGER, SUPPLY_COORDINATOR |

### User
| Route | Roles |
|-------|--------|
| Get all users | ADMIN, MANAGER |
| Get drivers list | ADMIN, MANAGER, SUPPLY_COORDINATOR |
| Delete user | ADMIN |
| Assign/Remove roles | ADMIN |

### Production Order
| Route | Roles |
|-------|--------|
| Create/Update status/Consumption/Output | CHEF, MANAGER, ADMIN |

### Recipe
| Route | Roles |
|-------|--------|
| CRUD recipe, lines | MANAGER, ADMIN |

### Return Request
| Route | Roles |
|-------|--------|
| Create | STORE_STAFF, MANAGER, ADMIN |
| Update status, Process | MANAGER, ADMIN |

---

## 2. Điều chỉnh kho nhận khi tạo phiếu giao hàng

- **API:** `POST /api/shipments`
- **Body:** `order_id`, `from_location_id`, **`to_location_id`** (kho nhận), `ship_date` (optional), `lines[]`.
- **Thay đổi BE (nhánh Hoang):**
  - Kho nhận (`to_location_id`) do client gửi lên khi tạo phiếu, **không** bắt buộc phải trùng với đơn (store). Cho phép chọn bất kỳ location hợp lệ làm kho nhận.
  - BE validate `from_location_id` và `to_location_id` phải tồn tại trong collection `Location` và đang ACTIVE trước khi tạo shipment.
- **Frontend:** Cần có dropdown/select danh sách location để user chọn **kho nhận** khi tạo phiếu giao hàng; có thể mặc định từ đơn nhưng cho phép đổi.

---

*Ghi chú này đi kèm nhánh `Hoang` (SWP_BE).*
