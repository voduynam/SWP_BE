const multer = require('multer');
// multer-storage-cloudinary nội bộ sẽ gọi `opts.cloudinary.v2.uploader.*`,
// nên bắt buộc truyền `require('cloudinary')` (module gốc), KHÔNG phải `.v2`.
const cloudinary = require('cloudinary');
const CloudinaryStorage = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'delivery-proof',
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  params: {
    // Tự động nhận kiểu (hình ảnh sẽ ổn, nhưng giữ để Cloudinary suy luận đúng hơn)
    resource_type: 'auto'
  },
  // `filename` trong multer-storage-cloudinary tương ứng với `public_id` trên Cloudinary.
  // Phải theo signature (req, file, cb) để thư viện gọi cb đúng cách.
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const routeId = req?.params?.id;
    const stopId = req?.params?.stopId;

    // Cloudinary public_id không nên chứa ký tự lạ (space, /, \, ...).
    const sanitize = v => String(v ?? 'upload').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeRouteId = sanitize(routeId);
    const safeStopId = sanitize(stopId);

    const baseId = stopId
      ? `Route_${safeRouteId}_Stop_${safeStopId}`
      : `Shipment_${safeRouteId}`;
    cb(null, `${baseId}_${timestamp}`);
  }
});

const fileFilter = (req, file, cb) => {
    // Accept image files only
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error(`Only image files are allowed. Received: ${file.mimetype}`), false);
    }
};

module.exports = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB limit
    },
    fileFilter: fileFilter
});
