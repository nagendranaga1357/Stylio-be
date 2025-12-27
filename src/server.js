import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import config from './config/index.js';
import connectDB from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import cityRoutes from './routes/city.routes.js';
import areaRoutes from './routes/area.routes.js';
import salonRoutes from './routes/salon.routes.js';
import serviceRoutes from './routes/service.routes.js';
import providerRoutes from './routes/provider.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import reviewRoutes from './routes/review.routes.js';
import favoriteRoutes from './routes/favorite.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import promoCodeRoutes from './routes/promoCode.routes.js';
import shortRoutes from './routes/short.routes.js';
import searchRoutes from './routes/search.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy (required for Render and other PaaS)
app.set('trust proxy', 1);

// Connect to Database
connectDB();

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
// Allow all origins for mobile app access, or restrict in production
const corsOptions = {
  origin: config.cors.frontendUrl === '*' 
    ? true  // Allow all origins
    : config.cors.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: config.app.name,
    version: config.app.version,
    documentation: '/api/health',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      salons: '/api/salons',
      services: '/api/services',
      search: '/api/search',
    },
  });
});

// Health check endpoint (used by Render for health monitoring)
app.get('/api/health', async (req, res) => {
  const healthcheck = {
    status: 'ok',
    app: config.app.name,
    version: config.app.version,
    environment: config.env,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
    },
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };

  try {
    // Quick database ping
    await mongoose.connection.db.admin().ping();
    res.json(healthcheck);
  } catch (error) {
    healthcheck.status = 'degraded';
    healthcheck.database = 'error';
    res.status(503).json(healthcheck);
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/salons', salonRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/promo-codes', promoCodeRoutes);
app.use('/api/shorts', shortRoutes);
app.use('/api/search', searchRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ${config.app.name} v${config.app.version}`);
  console.log(`   Environment: ${config.env}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});

export default app;
