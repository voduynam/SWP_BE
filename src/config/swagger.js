const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Central Kitchen & Franchise Management System API',
      version: '1.0.0',
      description: 'API documentation organized by business workflow - From Order to Delivery',
      contact: {
        name: 'API Support',
        email: 'support@centralkitchen.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port || 5001}`,
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: '1. Authentication',
        description: '🔐 Login, Register, Password Management'
      },
      {
        name: '2. Master Data',
        description: '📋 Categories, Suppliers, Org Units, Locations, Items, Recipes'
      },
      {
        name: '3. Order Flow',
        description: '📝 Internal Orders: Create → Submit → Approve → Process'
      },
      {
        name: '4. Production Flow', 
        description: '🏭 Production Orders: Plan → Execute → Record Output'
      },
      {
        name: '5. Shipment Flow',
        description: '🚚 Shipments: Create → Ship → Track Delivery'
      },
      {
        name: '6. Receipt Flow',
        description: '📦 Goods Receipts: Receive → Inspect → Confirm'
      },
      {
        name: '7. Return Flow',
        description: '↩️ Return Requests: Request → Approve → Process'
      },
      {
        name: '8. Inventory Management',
        description: '📊 Inventory Balances, Transactions, Adjustments, Lots'
      },
      {
        name: '9. Supply Coordination',
        description: '🚛 Consolidated Orders, Delivery Routes, Exception Handling'
      },
      {
        name: '10. Alerts & Notifications',
        description: '🔔 Expiry Alerts, Low Stock, Real-time Notifications'
      },
      {
        name: '11. Dashboard & Analytics',
        description: '📈 Performance Metrics, Reports, Business Intelligence'
      },
      {
        name: '12. User Management',
        description: '👥 User Administration, Role Management'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            statusCode: {
              type: 'integer',
              example: 400
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
