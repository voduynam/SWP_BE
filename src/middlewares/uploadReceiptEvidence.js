const multer = require('multer');
const cloudinary = require('cloudinary');
const CloudinaryStorage = require('multer-storage-cloudinary');

// Cloudinary storage configuration for receipt evidence (photos + videos)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'receipt-evidence',
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'avi', 'mkv', 'webm'],
  params: (req, file) => {
    // Determine resource type based on file type
    const isVideo = file.mimetype.startsWith('video/');
    return {
      resource_type: isVideo ? 'video' : 'image'
    };
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const shipmentId = req?.params?.id;
    const sanitize = v => String(v ?? 'receipt').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeShipmentId = sanitize(shipmentId);
    const fileType = file.mimetype.startsWith('video/') ? 'video' : 'photo';
    cb(null, `Receipt_${safeShipmentId}_${fileType}_${timestamp}`);
  }
});

// File filter to allow images and videos
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|mov|avi|mkv|webm/;
  
  const isImage = file.mimetype.startsWith('image/') && allowedImageTypes.test(file.mimetype);
  const isVideo = file.mimetype.startsWith('video/') && allowedVideoTypes.test(file.mimetype);
  
  if (isImage || isVideo) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) and video files (mp4, mov, avi, mkv, webm) are allowed'));
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (for videos)
    files: 5 // Maximum 5 files (photos + videos combined)
  }
});

module.exports = upload;