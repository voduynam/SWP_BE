const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = require('./src/app');
const connectDB = require('./src/config/database');

// Debug: Check if JWT_SECRET is loaded
console.log('=== Environment Variables Check ===');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ Loaded' : '✗ NOT FOUND');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✓ Loaded' : '✗ NOT FOUND');
console.log('===================================');

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
