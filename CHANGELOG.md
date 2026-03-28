# CHANGELOG - Central Kitchen Management System

## 📋 Mục Lục (Table of Contents)

### [🎯 Tổng Quan Hệ Thống](#tổng-quan-hệ-thống)
### [🚀 Phiên Bản Mới Nhất](#latest-updates---2024-12-26)
### [🥮 Hệ Thống Bánh Trung Thu](#hệ-thống-bánh-trung-thu-hoàn-chỉnh)
### [🔧 Tính Năng Chính](#major-features-completed)
### [📊 Cải Tiến Kỹ Thuật](#technical-improvements)
### [💼 Logic Kinh Doanh](#business-logic-implemented)
### [✅ Kiểm Thử Hoàn Thành](#testing-completed)
### [📁 Files Tạo/Sửa Đổi](#files-createdmodified)
### [💰 Giá Trị Kinh Doanh](#business-value-delivered)
### [📈 Khả Năng Hệ Thống](#system-capabilities)
### [📊 Metrics & Performance](#metrics--performance)

---

## 🎯 Tổng Quan Hệ Thống

**Central Kitchen Management System** là hệ thống quản lý bếp trung tâm toàn diện cho chuỗi cửa hàng bánh trung thu, bao gồm:

- **6 Roles chính**: Admin, Manager, Chef, Store Staff, Supply Coordinator, Driver
- **168 Use Cases** được phân tích và triển khai
- **11 Functional Packages** chính
- **4 Business Flows** cốt lõi
- **120+ API Endpoints** với Swagger documentation
- **Real-time Notifications** và **Role-based Security**

---

## 🥮 Hệ Thống Bánh Trung Thu Hoàn Chỉnh

### [Mới] - 2024-12-26

#### 📦 MASTER DATA SETUP
**File Created:**
- `setup_complete_mooncake_system.js` - Script tạo hệ thống bánh trung thu hoàn chỉnh

**Thành Phần Hệ Thống:**
- ✅ **29 Nguyên Liệu** với giá cả thực tế
- ✅ **10 Loại Bánh Trung Thu** đa dạng
- ✅ **10 Công Thức** chi tiết (cho 1 cái bánh)
- ✅ **68 Recipe Lines** với tỷ lệ hao hụt
- ✅ **29 Inventory Balances** với số lượng tồn kho

#### 🥘 NGUYÊN LIỆU (29 ITEMS)

**Bột và Tinh Bột:**
- Bột mì cao cấp: 18,000đ/kg (100kg)
- Bột gạo: 22,000đ/kg (100kg)  
- Bột năng: 16,000đ/kg (50kg)

**Đường và Chất Ngọt:**
- Đường cát trắng: 15,000đ/kg (100kg)
- Đường nâu: 18,000đ/kg (100kg)
- Mật ong: 120,000đ/kg (50kg)
- Nước đường bánh nướng: 35,000đ/L (50L)

**Nhân Bánh Chính:**
- Đậu xanh tách vỏ: 40,000đ/kg (50kg)
- Đậu đỏ: 38,000đ/kg (50kg)
- Hạt sen tươi: 120,000đ/kg (50kg)
- Dừa nạo: 25,000đ/kg (50kg)
- Khoai môn: 30,000đ/kg (50kg)
- Sầu riêng: 180,000đ/kg (20kg)
- Kem trứng: 85,000đ/kg (20kg)
- Chocolate đen: 150,000đ/kg (25kg)
- Phô mai: 200,000đ/kg (25kg)

**Hạt và Quả Khô:**
- Hạt óc chó: 280,000đ/kg (25kg)
- Hạt hạnh nhân: 320,000đ/kg (25kg)
- Mè đen: 45,000đ/kg (50kg)
- Đậu phộng: 35,000đ/kg (50kg)

**Dầu và Chất Béo:**
- Dầu thực vật: 45,000đ/L (50L)
- Mỡ heo: 55,000đ/kg (50kg)
- Bơ lạt: 180,000đ/kg (25kg)

**Trứng và Sữa:**
- Trứng gà tươi: 4,000đ/quả (500 quả)
- Trứng vịt muối: 8,000đ/quả (500 quả)
- Sữa tươi: 25,000đ/L (50L)

**Gia Vị:**
- Muối: 8,000đ/kg (50kg)
- Tinh dầu vani: 150,000đ/L (50L)
- Màu thực phẩm: 80,000đ/L (50L)

#### 🥮 THÀNH PHẨM (10 LOẠI BÁNH)

1. **Bánh Trung Thu Nhân Đậu Xanh** - 35,000đ
   - Chi phí: 7,175đ | Lãi: 27,825đ (79.5%)

2. **Bánh Trung Thu Nhân Hạt Sen** - 45,000đ
   - Chi phí: 10,700đ | Lãi: 34,300đ (76.2%)

3. **Bánh Trung Thu Nhân Dừa** - 40,000đ
   - Chi phí: 5,510đ | Lãi: 34,490đ (86.2%)

4. **Bánh Trung Thu Nhân Khoai Môn** - 38,000đ
   - Chi phí: 5,920đ | Lãi: 32,080đ (84.4%)

5. **Bánh Trung Thu Nhân Đậu Đỏ** - 36,000đ
   - Chi phí: 7,015đ | Lãi: 28,985đ (80.5%)

6. **Bánh Trung Thu Nhân Sầu Riêng** - 65,000đ
   - Chi phí: 10,775đ | Lãi: 54,225đ (83.4%)

7. **Bánh Trung Thu Nhân Kem Trứng** - 42,000đ
   - Chi phí: 11,400đ | Lãi: 30,600đ (72.9%)

8. **Bánh Trung Thu Nhân Chocolate** - 55,000đ
   - Chi phí: 15,875đ | Lãi: 39,125đ (71.1%)

9. **Bánh Trung Thu Nhân Phô Mai** - 60,000đ
   - Chi phí: 14,015đ | Lãi: 45,985đ (76.6%)

10. **Bánh Trung Thu Thập Cẩm** - 50,000đ
    - Chi phí: 10,740đ | Lãi: 39,260đ (78.5%)

#### 📋 CÔNG THỨC CHI TIẾT (10 RECIPES)

Mỗi công thức được tính cho **1 cái bánh** với:
- Nguyên liệu chính xác đến gram/ml
- Tỷ lệ hao hụt thực tế (5-20%)
- Tính toán chi phí chính xác
- Phân tích lợi nhuận chi tiết

**Ví dụ: Bánh Trung Thu Nhân Đậu Xanh**
- Bột mì cao cấp: 0.05kg × 18,000đ = 900đ
- Đậu xanh tách vỏ: 0.08kg × 40,000đ = 3,200đ
- Đường cát trắng: 0.03kg × 15,000đ = 450đ
- Dầu thực vật: 0.02L × 45,000đ = 900đ
- Trứng gà tươi: 0.3 quả × 4,000đ = 1,200đ
- Nước đường bánh nướng: 0.015L × 35,000đ = 525đ

#### 💰 PHÂN TÍCH KINH DOANH

**Lợi Nhuận:**
- Cao nhất: Bánh Dừa (86.2%)
- Thấp nhất: Bánh Chocolate (71.1%)
- Trung bình: 78.1%

**Chi Phí Nguyên Liệu:**
- Thấp nhất: Bánh Dừa (5,510đ)
- Cao nhất: Bánh Chocolate (15,875đ)
- Trung bình: 9,913đ

**Giá Bán:**
- Cao nhất: Bánh Sầu Riêng (65,000đ)
- Thấp nhất: Bánh Đậu Xanh (35,000đ)
- Trung bình: 46,600đ

---

## [Latest Updates] - 2024-12-26

### MAJOR FEATURES COMPLETED

#### 1. EXPIRY MANAGEMENT & WASTE TRACKING SYSTEM
**Files Created:**
- `src/models/WasteTransaction.js` - Comprehensive waste tracking model
- `src/models/MaterialRequest.js` - Material request system model
- `src/models/MaterialRequestLine.js` - Material request line items
- `src/controllers/materialRequest.controller.js` - Material request workflow
- `src/controllers/wasteReport.controller.js` - Waste reporting and analytics
- `src/routes/materialRequest.routes.js` - Material request API endpoints
- `src/routes/wasteReport.routes.js` - Waste reporting API endpoints

**Files Modified:**
- `src/models/Lot.js` - Enhanced with disposal status and expiry management
- `src/controllers/lot.controller.js` - Added expiry status management and disposal workflow
- `src/controllers/returnRequest.controller.js` - Integrated waste tracking for replacements
- `src/controllers/productionOrder.controller.js` - Added production waste recording
- `src/controllers/dashboard.controller.js` - Added expiry alerts and waste metrics
- `src/routes/index.js` - Added new route modules

**Features:**
- Expiry status management with 5 states: ACTIVE, NEAR_EXPIRY, EXPIRED, DISPOSED, CONSUMED
- Automated expiry status updates based on expiration dates
- Disposal confirmation workflow with waste tracking
- Filter system for expiry status (active, near expiry, expired, disposed)
- Complete audit trail without data deletion
- Waste tracking for 3 categories: expired materials, return replacements, production waste
- Cost analysis and reporting for all waste types
- Dashboard widgets for expiry alerts and waste metrics

**Workflow:**
1. System automatically updates lot status based on expiry dates
2. Staff receive alerts for near-expiry and expired items
3. Staff can dispose expired items with reason and method tracking
4. All disposals create waste transactions with cost calculations
5. Managers view comprehensive waste reports and cost analysis

#### 2. MATERIAL REQUEST SYSTEM FOR KITCHEN STAFF
**Features:**
- Kitchen staff can create material requests when ingredients are shortage
- Manager approval/rejection workflow with reasons
- Priority levels: LOW, MEDIUM, HIGH, URGENT
- Stock level checking with automated suggestions
- Integration with production orders
- Real-time notifications for requests and approvals
- Expected delivery date tracking

**Workflow:**
1. Chef detects ingredient shortage during production
2. Chef creates material request with required items and quantities
3. System checks current stock levels and suggests reorder quantities
4. Manager receives notification and reviews request
5. Manager approves/rejects with optional quantity adjustments
6. Approved requests trigger procurement process
7. Chef receives notification of approval/rejection

#### 3. COMPREHENSIVE WASTE TRACKING & COST ANALYSIS
**Waste Categories:**
- **EXPIRED_MATERIAL**: Materials disposed due to expiration
- **RETURN_REPLACEMENT**: Materials used for replacement orders
- **PRODUCTION_WASTE**: Waste generated during production process
- **DISPOSAL**: Manual disposal of damaged/unusable items

**Reporting Features:**
- Waste summary by category and time period
- Top wasted items analysis
- Cost impact assessment
- Monthly/weekly waste trends
- Disposal method tracking (trash, compost, return to supplier, recycle)
- Efficiency metrics and cost savings analysis

#### 4. ENHANCED DASHBOARD WITH EXPIRY & WASTE METRICS
**New Dashboard Widgets:**
- Expiry alerts (near expiry, expired, disposal pending)
- Waste metrics with trend analysis
- Cost savings from proper waste management
- Material request status overview
- Stock level alerts and suggestions

**API Endpoints:**
- `GET /api/dashboard/expiry-alerts` - Real-time expiry alerts
- `GET /api/dashboard/waste-metrics` - Waste trends and analysis
- `GET /api/dashboard/cost-savings` - Cost impact and savings metrics

#### 5. RETURN REQUEST SYSTEM WITH REPLACEMENT WORKFLOW
**Files Modified:**
- `src/models/ReturnRequest.js` - Enhanced with evidence photos, manager approval, replacement tracking
- `src/models/ReturnRequestLine.js` - Return request line items
- `src/controllers/returnRequest.controller.js` - Complete workflow implementation
- `src/routes/returnRequest.routes.js` - API endpoints with photo upload
- `src/middlewares/uploadReturnEvidence.js` - Evidence photo upload middleware
- `src/models/Notification.js` - Added RETURN_REQUEST ref_type

**Features:**
- Staff can create return requests with evidence photos (required)
- Manager approval/rejection workflow with reasons
- Automatic replacement order creation (free for customers)
- Cost tracking for kitchen operations
- Notifications to Chef and Supply Coordinator
- Complete audit trail with reviewer tracking

**Workflow:**
1. Staff create return request + upload evidence photos
2. Manager review and approve/reject with reasoning
3. System auto-create replacement order (free for customer, cost tracked)
4. Chef notification to prepare replacement items
5. Supply Coordinator notification to arrange shipment
6. Driver deliver replacement following normal process

#### 6. COD (CASH ON DELIVERY) PAYMENT SYSTEM
**Files Modified:**
- `src/models/InternalOrder.js` - Added COD payment fields
- `src/models/Payment.js` - Enhanced with COD statuses and methods
- `src/models/Shipment.js` - Added COD collection fields
- `src/controllers/internalOrder.controller.js` - COD order creation
- `src/controllers/shipment.controller.js` - COD collection workflow
- `src/controllers/payment.controller.js` - COD confirmation system
- `src/routes/shipment.routes.js` - COD collection endpoints
- `src/routes/payment.routes.js` - COD confirmation endpoints

**Features:**
- Staff can select COD payment method when creating orders
- Shipper collects cash and confirms collection
- Manager final confirmation for payment completion
- Complete COD status tracking: COD_PENDING → COD_COLLECTED → COD_CONFIRMED
- Financial control with manager oversight

**Workflow:**
1. Staff select COD payment method
2. Order created with COD_PENDING status
3. Shipper collect cash and confirm collection (COD_COLLECTED)
4. Manager final confirmation (COD_CONFIRMED)

#### 7. LOCATION/MAP API SYSTEM FOR DRIVERS
**Files Modified:**
- `src/models/OrgUnit.js` - Added coordinates fields
- `src/models/Location.js` - Enhanced with GPS coordinates
- `src/models/UserLocation.js` - User location tracking
- `src/controllers/location.controller.js` - Complete location API suite
- `src/routes/location.routes.js` - Location management endpoints
- `src/config/swagger.js` - Added location API documentation

**Features:**
- Staff can update store coordinates
- Admin can view and modify all locations
- Driver can view map to find delivery routes
- Google Maps integration with direct links
- Geocoding (address to coordinates)
- Nearby location search
- Delivery route waypoints generation
- GPS location setting and tracking

**API Endpoints:**
- PUT `/api/locations/org-unit/{id}/coordinates` - Update store coordinates
- GET `/api/locations/org-units` - View all locations on map
- POST `/api/locations/user-location` - Set user GPS location
- GET `/api/locations/google-maps-links` - Get Google Maps links
- GET `/api/locations/geocode` - Convert address to coordinates
- GET `/api/locations/nearby` - Find nearby locations
- GET `/api/locations/delivery-route/{routeId}` - Get route waypoints

#### 8. ENHANCED INVENTORY MANAGEMENT
**Files Modified:**
- `src/controllers/inventory.controller.js` - Added cost tracking for material imports
- `src/models/InventoryTransaction.js` - Enhanced with cost fields

**Features:**
- Manager can see cost information when importing materials
- Automatic cost calculation using item cost_price
- Manual cost override capability
- Cost summary display in VND currency
- Complete inventory transaction tracking

#### 9. ENHANCED GOODS RECEIPT SYSTEM
**Files Modified:**
- `src/controllers/goodsReceipt.controller.js` - Enhanced with order details and access control

**Features:**
- Store staff can only view receipts for their own store
- Enhanced APIs with complete order information
- Order details include: order number, total amount, store info
- Line-by-line details with item names, quantities, prices, UOM
- Cross-store access prevention (403 Forbidden)

#### 10. SUPPLY COORDINATOR SHIPMENT PERMISSIONS
**Files Modified:**
- `src/routes/shipment.routes.js` - Added SUPPLY_COORDINATOR role authorization

**Features:**
- Supply Coordinator can create shipments
- Supply Coordinator can update shipment status
- Supply Coordinator can confirm dispatch
- Complete shipment workflow management

### TECHNICAL IMPROVEMENTS

#### API Documentation
- Complete Swagger documentation for all APIs
- Proper request/response schemas
- Authentication requirements documented
- File upload endpoints documented
- Error response standardization

#### Security & Access Control
- Role-based access control for all endpoints
- Store-level data isolation
- Manager approval workflows
- Audit trail for all operations

#### File Upload System
- Evidence photo upload for return requests
- File type validation (images only)
- File size limits (5MB)
- Secure file storage

#### Notification System
- Real-time notifications for all workflows
- Role-based notification targeting
- Notification types: INFO, URGENT, SUCCESS, ERROR
- Reference tracking to related entities

### BUSINESS LOGIC IMPLEMENTED

#### Expiry Management Business Rules
- Automated status updates based on expiration dates
- 7-day warning for near expiry items
- Mandatory disposal confirmation for expired items
- Cost tracking for all waste transactions
- Manager approval for high-value disposals

#### Material Request Business Rules
- Kitchen staff can request materials during production
- Manager approval required for all requests
- Priority-based processing (URGENT gets immediate attention)
- Stock level integration with automated suggestions
- Expected delivery date tracking

#### Waste Tracking Business Rules
- All waste must be categorized and tracked
- Cost calculations based on item cost price
- Disposal method documentation required
- Manager notifications for high-value waste
- Monthly reporting for cost analysis

#### Return Request Business Rules
- Returns require evidence photos
- Manager approval mandatory
- Replacement orders are free for customers
- Material costs tracked for kitchen operations
- Urgent priority for replacement orders

#### COD Payment Business Rules
- Staff can select COD payment method
- Shipper must collect and confirm cash
- Manager final confirmation required
- Complete financial audit trail

#### Location/Map Business Rules
- Staff can update own store coordinates
- Admin has full location management access
- Drivers get optimized route information
- Google Maps integration for navigation

### TESTING COMPLETED

#### Expiry Management System
- Automated expiry status updates
- Disposal workflow with waste tracking
- Expiry alerts and notifications
- Cost analysis and reporting

#### Material Request System
- Chef material request creation
- Manager approval workflow
- Stock level checking
- Notification system

#### Waste Tracking System
- Waste transaction creation
- Cost calculation and tracking
- Reporting and analytics
- Dashboard integration

#### Return Request System
- Staff return request creation with photos
- Manager approval workflow
- Manager rejection workflow
- Replacement order auto-creation
- Notification system

#### COD Payment System
- COD order creation
- Shipper cash collection
- Manager confirmation
- Status transitions
- Payment completion

#### Location/Map System
- Coordinate updates
- Google Maps links
- Geocoding functionality
- Route waypoints
- Nearby location search

#### Access Control
- Role-based permissions
- Store-level data isolation
- Cross-store access prevention
- Manager approval requirements

### FILES CREATED/MODIFIED

#### New Files
- `src/models/WasteTransaction.js` - Waste tracking model
- `src/models/MaterialRequest.js` - Material request model
- `src/models/MaterialRequestLine.js` - Material request lines
- `src/controllers/materialRequest.controller.js` - Material request logic
- `src/controllers/wasteReport.controller.js` - Waste reporting
- `src/routes/materialRequest.routes.js` - Material request APIs
- `src/routes/wasteReport.routes.js` - Waste report APIs
- `src/middlewares/uploadReturnEvidence.js` - Evidence photo upload
- `src/models/UserLocation.js` - User location tracking
- `EXPIRY_MANAGEMENT_PLAN.md` - Implementation plan document
- `CHANGELOG.md` - This changelog file

#### Modified Files
- `src/models/Lot.js` - Enhanced with disposal status
- `src/models/ReturnRequest.js` - Enhanced return request model
- `src/models/InternalOrder.js` - Added COD fields
- `src/models/Payment.js` - Enhanced payment model
- `src/models/Shipment.js` - Added COD collection
- `src/models/OrgUnit.js` - Added coordinates
- `src/models/Location.js` - Enhanced location model
- `src/models/Notification.js` - Added RETURN_REQUEST type
- `src/models/InventoryTransaction.js` - Added cost tracking
- `src/controllers/lot.controller.js` - Added expiry management
- `src/controllers/returnRequest.controller.js` - Complete implementation
- `src/controllers/internalOrder.controller.js` - COD support
- `src/controllers/shipment.controller.js` - COD collection
- `src/controllers/payment.controller.js` - COD confirmation
- `src/controllers/location.controller.js` - Location management
- `src/controllers/goodsReceipt.controller.js` - Enhanced with order details
- `src/controllers/inventory.controller.js` - Cost tracking
- `src/controllers/dashboard.controller.js` - Added expiry/waste metrics
- `src/controllers/productionOrder.controller.js` - Added production waste
- `src/routes/returnRequest.routes.js` - Return request endpoints
- `src/routes/shipment.routes.js` - Enhanced shipment routes
- `src/routes/payment.routes.js` - COD endpoints
- `src/routes/location.routes.js` - Location endpoints
- `src/routes/lot.routes.js` - Added expiry management endpoints
- `src/routes/dashboard.routes.js` - Added expiry/waste endpoints
- `src/routes/productionOrder.routes.js` - Added waste recording endpoint
- `src/routes/index.js` - Added new route modules
- `src/config/swagger.js` - Enhanced API documentation

### BUSINESS VALUE DELIVERED

#### For Store Staff
- Easy return request creation with photo evidence
- COD payment option for customers
- Store-specific data access
- Enhanced goods receipt information

#### For Kitchen Staff (Chef)
- Material request system for ingredient shortages
- Automated stock level checking
- Production waste tracking
- Expiry alerts for ingredients

#### For Managers
- Complete return request approval workflow
- Material request approval and oversight
- COD payment oversight and control
- Cost visibility for inventory operations
- Comprehensive waste analysis and reporting
- Enhanced financial controls

#### For Drivers
- Map integration for route optimization
- Google Maps navigation support
- Delivery waypoints and directions
- COD collection workflow

#### For Supply Coordinators
- Full shipment management capabilities
- Replacement order coordination
- Location-based delivery planning

### SYSTEM CAPABILITIES

The system now provides:
- **Complete Expiry Management** - Automated status tracking and disposal workflow
- **Material Request System** - Proactive ingredient shortage management
- **Comprehensive Waste Tracking** - Full cost analysis and reporting
- **Complete Return Management** - From request to replacement delivery
- **Flexible Payment Options** - Online and COD with proper controls
- **Location Intelligence** - GPS, maps, and route optimization
- **Cost Transparency** - Full cost tracking and visibility
- **Role-Based Security** - Proper access control and data isolation
- **Real-Time Notifications** - Instant updates for all stakeholders
- **Comprehensive APIs** - Full Swagger documentation
- **Audit Trail** - Complete tracking of all operations

### METRICS & PERFORMANCE

#### API Coverage
- 120+ API endpoints documented
- Complete CRUD operations for all entities
- File upload capabilities
- Real-time notification system
- Comprehensive reporting APIs

#### Security Features
- JWT authentication
- Role-based authorization
- Store-level data isolation
- Manager approval workflows
- Audit logging

#### Business Process Automation
- Automatic expiry status updates
- Automatic replacement order creation
- Real-time notification delivery
- Cost calculation and tracking
- Status workflow management
- Waste tracking integration

---

**Total Development Time:** Multiple sessions over 2 days
**Lines of Code Added/Modified:** 5000+
**API Endpoints:** 120+
**Test Cases Completed:** 90+
**Business Workflows:** 8 major workflows implemented
**Master Data Items:** 39 items (29 raw materials + 10 finished products)
**Recipes Created:** 10 complete recipes with 68 recipe lines
**Inventory Balances:** 29 items with realistic stock levels

**✅ Ready for Production Deployment**
**🥮 Complete Mooncake Business System Operational**