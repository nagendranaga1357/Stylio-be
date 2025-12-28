import { Router } from 'express';
import multer from 'multer';
import path from 'path';
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

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(config.upload.dir, 'avatars'));
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

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.patch('/password', updatePassword);
router.post('/avatar', upload.single('avatar'), uploadAvatar);

// Address routes
router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.patch('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);

// Account management
router.delete('/account', deleteAccount);

export default router;

