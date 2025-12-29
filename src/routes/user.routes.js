import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  getProfile, 
  updateProfile, 
  updatePassword, 
  uploadAvatar,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  deleteAccount,
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import config from '../config/index.js';

const router = Router();

// Ensure upload directory exists (for local development)
const uploadDir = path.join(config.upload.dir, 'avatars');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('Could not create upload directory:', err.message);
}

// Configure multer for avatar uploads (optional - will fall back to base64)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `avatar-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  },
});

// Middleware to handle multer errors gracefully
const optionalUpload = (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    // If there's a multer error (like directory not found), continue without file
    if (err) {
      console.warn('File upload failed, continuing with base64 fallback:', err.message);
    }
    next();
  });
};

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.patch('/password', updatePassword);
router.post('/avatar', optionalUpload, uploadAvatar);

// Address routes
router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.patch('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);

// Account management
router.delete('/account', deleteAccount);

export default router;

