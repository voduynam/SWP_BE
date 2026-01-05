const express = require('express');
const router = express.Router();

// Import route modules
const userRoutes = require('./user.routes');
const authRoutes = require('./auth.routes');

// Define routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// Default route
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to SWP391 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users'
    }
  });
});

module.exports = router;
