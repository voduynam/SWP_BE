const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const itemRoutes = require('./item.routes');
const internalOrderRoutes = require('./internalOrder.routes');
const productionOrderRoutes = require('./productionOrder.routes');
const shipmentRoutes = require('./shipment.routes');
const goodsReceiptRoutes = require('./goodsReceipt.routes');
const inventoryRoutes = require('./inventory.routes');
const recipeRoutes = require('./recipe.routes');
const lotRoutes = require('./lot.routes');
const masterDataRoutes = require('./masterData.routes');
// const returnRequestRoutes = require('./returnRequest.routes'); // DISABLED - Not needed for current project
const alertRoutes = require('./alert.routes');
const dashboardRoutes = require('./dashboard.routes');
const deliveryRouteRoutes = require('./deliveryRoute.routes');
const consolidatedOrderRoutes = require('./consolidatedOrder.routes');
const exceptionRoutes = require('./exception.routes');
const performanceMetricsRoutes = require('./performanceMetrics.routes');
const notificationRoutes = require('./notification.routes');

// Define routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/items', itemRoutes);
router.use('/internal-orders', internalOrderRoutes);
router.use('/production-orders', productionOrderRoutes);
router.use('/shipments', shipmentRoutes);
router.use('/goods-receipts', goodsReceiptRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/recipes', recipeRoutes);
router.use('/lots', lotRoutes);
router.use('/master-data', masterDataRoutes);
// router.use('/return-requests', returnRequestRoutes); // DISABLED - Not needed for current project
router.use('/alerts', alertRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/delivery-routes', deliveryRouteRoutes);
router.use('/consolidated-orders', consolidatedOrderRoutes);
router.use('/exceptions', exceptionRoutes);
router.use('/performance-metrics', performanceMetricsRoutes);
router.use('/notifications', notificationRoutes);

// Default route
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Central Kitchen and Franchise Store Management System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      items: '/api/items',
      'internal-orders': '/api/internal-orders',
      'production-orders': '/api/production-orders',
      shipments: '/api/shipments',
      'goods-receipts': '/api/goods-receipts',
      inventory: '/api/inventory',
      recipes: '/api/recipes',
      lots: '/api/lots',
      'master-data': '/api/master-data',
      // 'return-requests': '/api/return-requests', // DISABLED - Not needed for current project
      alerts: '/api/alerts',
      dashboard: '/api/dashboard',
      'delivery-routes': '/api/delivery-routes',
      'consolidated-orders': '/api/consolidated-orders',
      exceptions: '/api/exceptions',
      'performance-metrics': '/api/performance-metrics'
    }
  });
});

module.exports = router;
