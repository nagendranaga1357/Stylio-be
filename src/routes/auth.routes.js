import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  verifyOtp,
  resendOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  savePushToken,
  removePushToken,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

// Protected routes
router.use(authenticate);
router.post('/logout', logout);
router.get('/me', getMe);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/push-token', savePushToken);
router.delete('/push-token', removePushToken);

export default router;

