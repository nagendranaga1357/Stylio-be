import dotenv from 'dotenv';

dotenv.config();

/**
 * Application Configuration
 * 
 * Environment variables are loaded from .env file in development
 * and from Render's environment in production.
 */
const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  
  // Database
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/salon_booking',
  },
  
  // JWT Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  // OTP Settings
  otp: {
    expiresMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES, 10) || 15,
  },
  
  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB
    dir: process.env.UPLOAD_DIR || 'uploads',
  },
  
  // CORS
  cors: {
    // In production, set FRONTEND_URL to your app's domain
    // Use '*' for development or mobile app access
    frontendUrl: process.env.FRONTEND_URL || '*',
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // 100 requests per window
  },
  
  // App Info (for health check)
  app: {
    name: 'Stylio API',
    version: '1.0.0',
  },
};

// Validate required environment variables in production
if (config.env === 'production') {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

export default config;
