import mongoose from 'mongoose';

// Salon Review Schema
const salonReviewSchema = new mongoose.Schema({
  salon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon',
    required: [true, 'Salon is required'],
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required'],
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
  },
  cleanlinessRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  serviceRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  valueRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  isVerified: {
    type: Boolean,
    default: false,
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

// Update salon rating after save
salonReviewSchema.post('save', async function() {
  const Salon = mongoose.model('Salon');
  const salon = await Salon.findById(this.salon);
  if (salon) {
    await salon.updateRating();
  }
});

salonReviewSchema.index({ salon: 1, customer: 1, booking: 1 }, { unique: true });

// Provider Review Schema
const providerReviewSchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceProvider',
    required: [true, 'Provider is required'],
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required'],
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
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

// Update provider rating after save
providerReviewSchema.post('save', async function() {
  const ServiceProvider = mongoose.model('ServiceProvider');
  const provider = await ServiceProvider.findById(this.provider);
  if (provider) {
    await provider.updateRating();
  }
});

providerReviewSchema.index({ provider: 1, customer: 1, booking: 1 }, { unique: true });

export const SalonReview = mongoose.model('SalonReview', salonReviewSchema);
export const ProviderReview = mongoose.model('ProviderReview', providerReviewSchema);

