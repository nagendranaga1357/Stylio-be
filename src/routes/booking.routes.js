import { Router } from 'express';
import {
  getBookings,
  getBooking,
  createBooking,
  cancelBooking,
  getUpcomingBookings,
  getPastBookings,
  getAvailableSlots,
} from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public route for checking available slots
router.get('/available-slots', getAvailableSlots);

// Protected routes
router.use(authenticate);
router.get('/', getBookings);
router.get('/upcoming', getUpcomingBookings);
router.get('/past', getPastBookings);
router.get('/:id', getBooking);
router.post('/', createBooking);
router.post('/:id/cancel', cancelBooking);

export default router;

