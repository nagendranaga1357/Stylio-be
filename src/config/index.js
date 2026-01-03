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
    // Channel for sending OTP: 'email' | 'sms' | 'both'
    channel: process.env.OTP_CHANNEL || 'email',
  },
  
  // Email Settings (SMTP)
  // Supports: Gmail, Mailtrap, SendGrid, or any SMTP server
  // 
  // For Gmail:
  //   SMTP_HOST=smtp.gmail.com
  //   SMTP_PORT=587
  //   SMTP_USER=your-email@gmail.com
  //   SMTP_PASS=your-app-password (generate at https://myaccount.google.com/apppasswords)
  //
  // For Mailtrap (free testing):
  //   SMTP_HOST=sandbox.smtp.mailtrap.io
  //   SMTP_PORT=2525
  //   SMTP_USER=your-mailtrap-user
  //   SMTP_PASS=your-mailtrap-password
  //
  // For Brevo (free tier: 300 emails/day):
  //   SMTP_HOST=smtp-relay.brevo.com
  //   SMTP_PORT=587
  //   SMTP_USER=your-brevo-login
  //   SMTP_PASS=your-brevo-smtp-key
  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@stylio.app',
    fromName: process.env.SMTP_FROM_NAME || 'Stylio',
    // Set to true to enable email sending (requires valid SMTP config)
    enabled: process.env.EMAIL_ENABLED === 'true' || !!process.env.SMTP_HOST,
  },

  // SMS Settings
  // Providers: 'console' (dev), 'textbelt' (free tier), 'custom'
  //
  // TextBelt (https://textbelt.com):
  //   SMS_PROVIDER=textbelt
  //   SMS_API_KEY=textbelt (free: 1 SMS/day) or your paid key
  //
  // Custom HTTP API:
  //   SMS_PROVIDER=custom
  //   SMS_API_URL=https://your-sms-api.com/send
  //   SMS_API_KEY=your-api-key
  sms: {
    provider: process.env.SMS_PROVIDER || 'console', // 'console' | 'textbelt' | 'custom'
    apiKey: process.env.SMS_API_KEY || '',
    apiUrl: process.env.SMS_API_URL || '',
    // Set to true to enable SMS sending for booking notifications
    enabled: process.env.SMS_ENABLED === 'true',
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
