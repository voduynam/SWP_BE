const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const routes = require('./routes');
const config = require('./config/config');

const { errorHandler } = require('./middlewares/errorHandler');
const { notFound } = require('./middlewares/notFound');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.clientUrl || '*',
  credentials: true
}));

// Logging middleware
app.use(morgan('dev'));

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

module.exports = app;
