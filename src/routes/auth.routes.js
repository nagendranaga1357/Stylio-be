import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  verifyOtp,
  resendOtp,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.use(authenticate);
router.post('/logout', logout);
router.get('/me', getMe);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);

export default router;

