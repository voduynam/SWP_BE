const multer = require('multer');
const cloudinaryModule = require('cloudinary');
const CloudinaryStorage = require('multer-storage-cloudinary');

// Package multer-storage-cloudinary cần opts.cloudinary có .v2 (root module), không phải cloudinary.v2
cloudinaryModule.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinaryModule,
    folder: 'delivery-proof',
    allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    params: { resource_type: 'auto' },
    filename: (req, file, cb) => cb(undefined, 'delivery_' + String(Date.now()))
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
