const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = 'uploads/delivery-proof';
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Lưu file local - khớp DELIVERY_COMPLETE_WORKFLOW: form-data status + delivery_photo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safeId = (req.params.id || 'upload').replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `Shipment_${safeId}_${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error(`Only image files are allowed. Received: ${file.mimetype}`), false);
  }
};

module.exports = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter
});
