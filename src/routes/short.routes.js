import { Router } from 'express';
import {
  getShorts,
  getShort,
  recordView,
  toggleLike,
  toggleBookmark,
  getBookmarkedShorts,
  getComments,
  addComment,
  getTrendingShorts,
} from '../controllers/short.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Public routes with optional auth for like/bookmark status
router.get('/trending', optionalAuth, getTrendingShorts);

// Bookmarks (must be before /:id routes)
router.get('/bookmarks', authenticate, getBookmarkedShorts);

router.get('/', optionalAuth, getShorts);
router.get('/:id', optionalAuth, getShort);

// View recording (supports both GET and POST)
router.get('/:id/view', recordView);
router.post('/:id/view', recordView);

// Comments
router.get('/:id/comments', getComments);
router.post('/:id/comments', authenticate, addComment);

// Protected routes - like and bookmark
router.post('/:id/like', authenticate, toggleLike);
router.post('/:id/bookmark', authenticate, toggleBookmark);

export default router;

