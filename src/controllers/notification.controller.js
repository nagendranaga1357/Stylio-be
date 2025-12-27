import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import Notification from '../models/Notification.js';

/**
 * @desc    Get user's notifications
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [notifications, total] = await Promise.all([
    Notification.find({ user: req.user._id })
      .populate('relatedBooking', 'bookingNumber')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    Notification.countDocuments({ user: req.user._id }),
  ]);

  res.json({
    success: true,
    data: {
      notifications,
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
 * @desc    Get unread notifications
 * @route   GET /api/notifications/unread
 * @access  Private
 */
export const getUnreadNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    user: req.user._id,
    isRead: false,
  })
    .populate('relatedBooking', 'bookingNumber')
    .sort('-createdAt');

  res.json({
    success: true,
    data: { notifications, count: notifications.length },
  });
});

/**
 * @desc    Mark notification as read
 * @route   POST /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  notification.isRead = true;
  await notification.save();

  res.json({
    success: true,
    message: 'Notification marked as read',
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   POST /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { isRead: true }
  );

  res.json({
    success: true,
    message: 'All notifications marked as read',
  });
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  res.json({
    success: true,
    message: 'Notification deleted',
  });
});

