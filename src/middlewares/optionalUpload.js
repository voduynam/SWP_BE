const multer = require('multer');
const uploadReceiptEvidence = require('./uploadReceiptEvidence');

// Middleware to handle optional file uploads
const optionalUpload = (fieldName, maxCount) => {
  return (req, res, next) => {
    // Create a multer instance that doesn't fail when no files are provided
    const upload = uploadReceiptEvidence.array(fieldName, maxCount);
    
    upload(req, res, (err) => {
      if (err) {
        // If it's a multer error (like LIMIT_FILE_SIZE, etc.), pass it along
        if (err instanceof multer.MulterError) {
          return next(err);
        }
        // For other errors, also pass them along
        return next(err);
      }
      // No error, continue
      next();
    });
  };
};

module.exports = optionalUpload;
