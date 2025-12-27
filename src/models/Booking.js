import mongoose from 'mongoose';
import crypto from 'crypto';

// Booking Service Schema (embedded for services in a booking)
const bookingServiceSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
});

const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

const BOOKING_TYPES = ['salon', 'home'];

// Main Booking Schema
const bookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    unique: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required'],
  },
  salon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon',
    required: [true, 'Salon is required'],
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceProvider',
  },
  bookingType: {
    type: String,
    enum: BOOKING_TYPES,
    default: 'salon',
  },
  bookingDate: {
    type: Date,
    required: [true, 'Booking date is required'],
  },
  bookingTime: {
    type: String,
    required: [true, 'Booking time is required'],
  },
  services: [bookingServiceSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: BOOKING_STATUSES,
    default: 'pending',
  },
  homeAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  customerNotes: {
    type: String,
    trim: true,
  },
  salonNotes: {
    type: String,
    trim: true,
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  cancellationReason: {
    type: String,
    trim: true,
  },
  cancelledAt: {
    type: Date,
  },
  promoCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromoCode',
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

// Generate booking number before saving
bookingSchema.pre('save', function(next) {
  if (!this.bookingNumber) {
    this.bookingNumber = 'BK' + crypto.randomInt(10000000, 99999999).toString();
  }
  next();
});

// Virtual for services count
bookingSchema.virtual('servicesCount').get(function() {
  return this.services?.length || 0;
});

// Indexes
bookingSchema.index({ customer: 1, bookingDate: -1 });
bookingSchema.index({ salon: 1, bookingDate: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ bookingNumber: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;

