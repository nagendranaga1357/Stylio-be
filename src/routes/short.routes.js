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
  recordShare,
  toggleCommentLike,
  toggleCreatorFollow,
  getCommentReplies,
} from '../controllers/short.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Public routes with optional auth for like/bookmark status
router.get('/trending', optionalAuth, getTrendingShorts);

// Bookmarks (must be before /:id routes)
router.get('/bookmarks', authenticate, getBookmarkedShorts);

// Comment routes (must be before /:id routes)
router.post('/comments/:commentId/like', authenticate, toggleCommentLike);
router.get('/comments/:commentId/replies', optionalAuth, getCommentReplies);

// Creator follow (must be before /:id routes)
router.post('/creators/:creatorUsername/follow', authenticate, toggleCreatorFollow);

// Main shorts list
router.get('/', optionalAuth, getShorts);
router.get('/:id', optionalAuth, getShort);

// View and share recording
router.get('/:id/view', recordView);
router.post('/:id/view', recordView);
router.post('/:id/share', recordShare);

// Comments
router.get('/:id/comments', optionalAuth, getComments);
router.post('/:id/comments', authenticate, addComment);

// Protected routes - like and bookmark
router.post('/:id/like', authenticate, toggleLike);
router.post('/:id/bookmark', authenticate, toggleBookmark);

export default router;
