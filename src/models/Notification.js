import mongoose from 'mongoose';

const NOTIFICATION_TYPES = [
  'booking_created',     // When booking is first created (pending)
  'booking_confirmed',   // When salon confirms booking
  'booking_started',     // When service starts (in_progress)
  'booking_completed',   // When service is done
  'booking_cancelled',   // When booking is cancelled
  'booking_no_show',     // When customer doesn't show up
  'booking_reminder',    // Reminder before appointment
  'review_request',      // Ask customer to leave review
  'promo',               // Promotional notification
  'general',             // General notifications
];

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
  },
  notificationType: {
    type: String,
    enum: NOTIFICATION_TYPES,
    required: [true, 'Notification type is required'],
  },
  relatedBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

