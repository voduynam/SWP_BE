const normalizeOrigin = (s) => s.trim().replace(/\/+$/, '');

const splitOrigins = (value, fallback) => {
  const raw = value || fallback;
  return [...new Set(raw.split(',').map(normalizeOrigin).filter(Boolean))];
};

/** Origins allowed for CORS + Socket.io (must match browser Origin when credentials: true). */
const corsOrigins = (() => {
  const base = splitOrigins(
    process.env.CORS_ORIGINS || process.env.CLIENT_URL,
    'http://localhost:3000'
  );
  if (process.env.NODE_ENV === 'production') return base;
  const devExtras = [
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
  return [...new Set([...base, ...devExtras])];
})();

module.exports = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  mongoUri: process.env.MONGODB_URI,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  corsOrigins,
};
