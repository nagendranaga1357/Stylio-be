import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import Booking from '../models/Booking.js';
import Salon from '../models/Salon.js';
import { Service } from '../models/Service.js';
import Notification from '../models/Notification.js';

/**
 * @desc    Get user's bookings
 * @route   GET /api/bookings
 * @access  Private
 */
export const getBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = { customer: req.user._id };

  if (status) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('salon', 'name address coverImage')
      .populate({ path: 'provider', populate: { path: 'user', select: 'firstName lastName' } })
      .populate('services.service', 'name durationMinutes')
      .sort('-bookingDate -bookingTime')
      .skip(skip)
      .limit(parseInt(limit)),
    Booking.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * @desc    Get single booking
 * @route   GET /api/bookings/:id
 * @access  Private
 */
export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    customer: req.user._id,
  })
    .populate('salon', 'name address phone coverImage openingTime closingTime')
    .populate({ path: 'provider', populate: { path: 'user', select: 'firstName lastName' } })
    .populate('services.service', 'name durationMinutes');

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  res.json({
    success: true,
    data: { booking },
  });
});

/**
 * @desc    Create new booking
 * @route   POST /api/bookings
 * @access  Private
 */
export const createBooking = asyncHandler(async (req, res) => {
  const {
    salon: salonId,
    provider,
    bookingType,
    bookingDate,
    bookingTime,
    services: serviceIds,
    homeAddress,
    customerNotes,
  } = req.body;

  // Validate salon
  const salon = await Salon.findById(salonId);
  if (!salon || !salon.isActive) {
    throw new ApiError(404, 'Salon not found');
  }

  // Validate services
  const services = await Service.find({
    _id: { $in: serviceIds },
    salon: salonId,
    isActive: true,
  });

  if (services.length !== serviceIds.length) {
    throw new ApiError(400, 'One or more services are invalid');
  }

  // Calculate totals
  const totalAmount = services.reduce((sum, s) => sum + (s.discountedPrice || s.price), 0);

  // Create booking services
  const bookingServices = services.map((service) => ({
    service: service._id,
    quantity: 1,
    price: service.discountedPrice || service.price,
  }));

  // Create booking
  const booking = await Booking.create({
    customer: req.user._id,
    salon: salonId,
    provider,
    bookingType,
    bookingDate: new Date(bookingDate),
    bookingTime,
    services: bookingServices,
    totalAmount,
    discountAmount: 0,
    finalAmount: totalAmount,
    homeAddress: bookingType === 'home' ? homeAddress : undefined,
    customerNotes,
    status: 'pending',
  });

  // Populate for response
  const populatedBooking = await Booking.findById(booking._id)
    .populate('salon', 'name address')
    .populate('services.service', 'name');

  // Create notification (booking is pending, not confirmed yet)
  await Notification.create({
    user: req.user._id,
    title: 'Booking Requested',
    message: `Your booking at ${salon.name} on ${bookingDate} at ${bookingTime} has been requested. Waiting for confirmation.`,
    notificationType: 'booking_created',
    relatedBooking: booking._id,
  });

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: { booking: populatedBooking },
  });
});

/**
 * @desc    Cancel booking
 * @route   POST /api/bookings/:id/cancel
 * @access  Private
 */
export const cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const booking = await Booking.findOne({
    _id: req.params.id,
    customer: req.user._id,
  });

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (['completed', 'cancelled'].includes(booking.status)) {
    throw new ApiError(400, 'Cannot cancel a completed or already cancelled booking');
  }

  booking.status = 'cancelled';
  booking.cancelledBy = req.user._id;
  booking.cancellationReason = reason || '';
  booking.cancelledAt = new Date();

  await booking.save();

  // Create notification
  await Notification.create({
    user: req.user._id,
    title: 'Booking Cancelled',
    message: `Your booking #${booking.bookingNumber} has been cancelled.`,
    notificationType: 'booking_cancelled',
    relatedBooking: booking._id,
  });

  res.json({
    success: true,
    message: 'Booking cancelled successfully',
    data: { booking },
  });
});

/**
 * @desc    Get upcoming bookings
 * @route   GET /api/bookings/upcoming
 * @access  Private
 */
export const getUpcomingBookings = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookings = await Booking.find({
    customer: req.user._id,
    bookingDate: { $gte: today },
    status: { $in: ['pending', 'confirmed'] },
  })
    .populate('salon', 'name address coverImage')
    .populate('services.service', 'name')
    .sort('bookingDate bookingTime');

  res.json({
    success: true,
    data: { bookings },
  });
});

/**
 * @desc    Get past bookings
 * @route   GET /api/bookings/past
 * @access  Private
 */
export const getPastBookings = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookings = await Booking.find({
    customer: req.user._id,
    $or: [
      { bookingDate: { $lt: today } },
      { status: 'completed' },
    ],
  })
    .populate('salon', 'name address coverImage')
    .populate('services.service', 'name')
    .sort('-bookingDate -bookingTime');

  res.json({
    success: true,
    data: { bookings },
  });
});

/**
 * @desc    Update booking status
 * @route   PATCH /api/bookings/:id/status
 * @access  Private (Admin/Salon Owner)
 */
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status: newStatus } = req.body;

  const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
  
  if (!newStatus || !validStatuses.includes(newStatus)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const booking = await Booking.findById(req.params.id)
    .populate('salon', 'name');

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  // Status transition validation
  const allowedTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['in_progress', 'cancelled', 'no_show'],
    'in_progress': ['completed', 'cancelled'],
    'completed': [], // Terminal state
    'cancelled': [], // Terminal state
    'no_show': [], // Terminal state
  };

  if (!allowedTransitions[booking.status]?.includes(newStatus)) {
    throw new ApiError(400, `Cannot transition from '${booking.status}' to '${newStatus}'`);
  }

  const oldStatus = booking.status;
  booking.status = newStatus;

  // Set additional fields for specific status changes
  if (newStatus === 'cancelled') {
    booking.cancelledBy = req.user._id;
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body.reason || '';
  }

  await booking.save();

  // Create notification based on status change
  const notificationMessages = {
    'confirmed': {
      title: 'Booking Confirmed',
      message: `Your booking #${booking.bookingNumber} at ${booking.salon.name} has been confirmed.`,
      type: 'booking_confirmed',
    },
    'in_progress': {
      title: 'Service Started',
      message: `Your service at ${booking.salon.name} has started.`,
      type: 'booking_started',
    },
    'completed': {
      title: 'Service Completed',
      message: `Your booking #${booking.bookingNumber} has been completed. Thank you for visiting ${booking.salon.name}!`,
      type: 'booking_completed',
    },
    'cancelled': {
      title: 'Booking Cancelled',
      message: `Your booking #${booking.bookingNumber} has been cancelled.`,
      type: 'booking_cancelled',
    },
    'no_show': {
      title: 'Missed Appointment',
      message: `You missed your appointment #${booking.bookingNumber} at ${booking.salon.name}.`,
      type: 'booking_no_show',
    },
  };

  if (notificationMessages[newStatus]) {
    await Notification.create({
      user: booking.customer,
      title: notificationMessages[newStatus].title,
      message: notificationMessages[newStatus].message,
      notificationType: notificationMessages[newStatus].type,
      relatedBooking: booking._id,
    });
  }

  res.json({
    success: true,
    message: `Booking status updated to '${newStatus}'`,
    data: { 
      booking,
      previousStatus: oldStatus,
      newStatus,
    },
  });
});

/**
 * @desc    Confirm a pending booking
 * @route   POST /api/bookings/:id/confirm
 * @access  Private (Salon Owner/Admin)
 */
export const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('salon', 'name');

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.status !== 'pending') {
    throw new ApiError(400, `Cannot confirm booking with status '${booking.status}'`);
  }

  booking.status = 'confirmed';
  await booking.save();

  // Create notification
  await Notification.create({
    user: booking.customer,
    title: 'Booking Confirmed',
    message: `Your booking #${booking.bookingNumber} at ${booking.salon.name} has been confirmed.`,
    notificationType: 'booking_confirmed',
    relatedBooking: booking._id,
  });

  res.json({
    success: true,
    message: 'Booking confirmed successfully',
    data: { booking },
  });
});

/**
 * @desc    Mark booking as completed
 * @route   POST /api/bookings/:id/complete
 * @access  Private (Salon Owner/Admin)
 */
export const completeBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('salon', 'name');

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (!['confirmed', 'in_progress'].includes(booking.status)) {
    throw new ApiError(400, `Cannot complete booking with status '${booking.status}'`);
  }

  booking.status = 'completed';
  await booking.save();

  // Create notification
  await Notification.create({
    user: booking.customer,
    title: 'Service Completed',
    message: `Your booking #${booking.bookingNumber} has been completed. Thank you for visiting ${booking.salon.name}!`,
    notificationType: 'booking_completed',
    relatedBooking: booking._id,
  });

  res.json({
    success: true,
    message: 'Booking completed successfully',
    data: { booking },
  });
});

/**
 * @desc    Mark booking as no-show
 * @route   POST /api/bookings/:id/no-show
 * @access  Private (Salon Owner/Admin)
 */
export const markNoShow = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('salon', 'name');

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.status !== 'confirmed') {
    throw new ApiError(400, `Cannot mark as no-show for booking with status '${booking.status}'`);
  }

  booking.status = 'no_show';
  await booking.save();

  // Create notification
  await Notification.create({
    user: booking.customer,
    title: 'Missed Appointment',
    message: `You missed your appointment #${booking.bookingNumber} at ${booking.salon.name}.`,
    notificationType: 'booking_no_show',
    relatedBooking: booking._id,
  });

  res.json({
    success: true,
    message: 'Booking marked as no-show',
    data: { booking },
  });
});

/**
 * @desc    Get available slots
 * @route   GET /api/bookings/available-slots
 * @access  Public
 */
export const getAvailableSlots = asyncHandler(async (req, res) => {
  const { salon: salonId, date } = req.query;

  if (!salonId || !date) {
    throw new ApiError(400, 'Salon and date are required');
  }

  const salon = await Salon.findById(salonId);
  if (!salon) {
    throw new ApiError(404, 'Salon not found');
  }

  const bookingDate = new Date(date);
  bookingDate.setHours(0, 0, 0, 0);

  // Get existing bookings for that day
  const existingBookings = await Booking.find({
    salon: salonId,
    bookingDate,
    status: { $in: ['pending', 'confirmed'] },
  }).select('bookingTime');

  const bookedTimes = existingBookings.map((b) => b.bookingTime);

  // Generate slots based on opening/closing time
  const slots = [];
  const [openHour, openMin] = salon.openingTime.split(':').map(Number);
  const [closeHour, closeMin] = salon.closingTime.split(':').map(Number);

  let currentHour = openHour;
  let currentMin = openMin;

  while (
    currentHour < closeHour ||
    (currentHour === closeHour && currentMin < closeMin)
  ) {
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    
    slots.push({
      time: timeStr,
      available: !bookedTimes.includes(timeStr),
    });

    // Increment by 30 minutes
    currentMin += 30;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour += 1;
    }
  }

  res.json({
    success: true,
    data: { slots },
  });
});

