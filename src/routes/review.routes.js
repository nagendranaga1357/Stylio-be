import { Router } from 'express';
import {
  getSalonReviews,
  createSalonReview,
  getProviderReviews,
  createProviderReview,
  deleteReview,
} from '../controllers/review.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Salon reviews
router.get('/salon', getSalonReviews);
router.post('/salon', authenticate, createSalonReview);

// Provider reviews
router.get('/provider', getProviderReviews);
router.post('/provider', authenticate, createProviderReview);

// Delete review
router.delete('/:type/:id', authenticate, deleteReview);

export default router;

