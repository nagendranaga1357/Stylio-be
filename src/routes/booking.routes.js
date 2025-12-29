import { Router } from 'express';
import {
  getBookings,
  getBooking,
  createBooking,
  cancelBooking,
  getUpcomingBookings,
  getPastBookings,
  getAvailableSlots,
  updateBookingStatus,
  confirmBooking,
  completeBooking,
  markNoShow,
} from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public route for checking available slots
router.get('/available-slots', getAvailableSlots);

// Protected routes
router.use(authenticate);

// List bookings
router.get('/', getBookings);
router.get('/upcoming', getUpcomingBookings);
router.get('/past', getPastBookings);

// Single booking
router.get('/:id', getBooking);

// Create booking
router.post('/', createBooking);

// Status transitions
router.post('/:id/cancel', cancelBooking);
router.post('/:id/confirm', confirmBooking);
router.post('/:id/complete', completeBooking);
router.post('/:id/no-show', markNoShow);

// General status update (for admin/salon owner)
router.patch('/:id/status', updateBookingStatus);

export default router;
