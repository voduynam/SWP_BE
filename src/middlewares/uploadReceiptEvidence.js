const multer = require('multer');
const cloudinary = require('cloudinary');
const CloudinaryStorage = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'receipt-evidence',
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mkv', 'webm'],
  params: {
    // Tự động nhận kiểu (hình ảnh/video)
    resource_type: 'auto'
  },
  // `filename` trong multer-storage-cloudinary tương ứng với `public_id` trên Cloudinary.
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const shipmentId = req?.params?.id;

    // Cloudinary public_id không nên chứa ký tự lạ (space, /, \, ...).
    const sanitize = v => String(v ?? 'receipt').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeShipmentId = sanitize(shipmentId);
    const fileType = file.mimetype.startsWith('video/') ? 'video' : 'photo';

    cb(null, `Receipt_${safeShipmentId}_${fileType}_${timestamp}`);
  }
});

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

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (for videos)
    files: 5 // Maximum 5 files (photos + videos combined)
  }
});

module.exports = upload;