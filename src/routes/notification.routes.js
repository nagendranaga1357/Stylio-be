import { Router } from 'express';
import {
  getNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getNotifications);
router.get('/unread', getUnreadNotifications);
router.post('/read-all', markAllAsRead);
router.post('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;

