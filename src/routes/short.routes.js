import { Router } from 'express';
import {
  getShorts,
  getShort,
  recordView,
  toggleLike,
  getComments,
  addComment,
  getTrendingShorts,
} from '../controllers/short.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Public routes with optional auth for like status
router.get('/trending', getTrendingShorts);
router.get('/', optionalAuth, getShorts);
router.get('/:id', optionalAuth, getShort);
router.get('/:id/view', recordView);
router.get('/:id/comments', getComments);

// Protected routes
router.post('/:id/like', authenticate, toggleLike);
router.post('/:id/comments', authenticate, addComment);

export default router;

