import mongoose from 'mongoose';

// Provider Availability Schema (embedded)
const availabilitySchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
});

// Provider Service Schema (embedded)
const providerServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: Number, required: true }, // minutes
});

const SPECIALIZATIONS = [
  'Haircut',
  'Hair Styling',
  'Hair Coloring',
  'Spa',
  'Massage',
  'Facial',
  'Makeup',
  'Nails',
  'Bridal',
  'Mehndi',
  'All Services',
];

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Service Provider Schema
const serviceProviderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    unique: true,
  },
  // V1: Provider name (can be different from user name)
  name: {
    type: String,
    required: [true, 'Provider name is required'],
    trim: true,
    maxlength: 100,
  },
  salon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon',
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true,
    maxlength: 15,
  },
  avatar: {
    type: String,
  },
  bio: {
    type: String,
    trim: true,
  },
  // V1: Multiple specializations
  specializations: [{
    type: String,
    enum: SPECIALIZATIONS,
  }],
  // Legacy single specialization (kept for backward compatibility)
  specialization: {
    type: String,
    trim: true,
  },
  // V1: Target audience
  audience: [{
    type: String,
    enum: ['men', 'women', 'kids', 'unisex'],
  }],
  experienceYears: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Alias for V1 spec
  experience: {
    type: Number,
    default: 0,
    min: 0,
  },
  certifications: {
    type: String,
    trim: true,
  },
  providesHomeService: {
    type: Boolean,
    default: false,
  },
  homeServiceAreas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
  }],
  homeServiceFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  // V1: Provider's own services (for home service providers)
  services: [providerServiceSchema],
  // V1: Gallery images
  gallery: [{
    type: String,
  }],
  // V1: Location for geo-search (home service providers)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0],
    },
  },
  // V1: City and Area references
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    index: true,
  },
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
    index: true,
  },
  // V1: Average rating (pre-computed for faster queries)
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    index: true,
  },
  // Legacy rating field
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  // Alias for V1 spec
  reviewCount: {
    type: Number,
    default: 0,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  availability: [availabilitySchema],
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

// Virtual for specialization display name
serviceProviderSchema.virtual('specializationDisplay').get(function() {
  const displayNames = {
    haircut: 'Hair Cutting',
    styling: 'Hair Styling',
    coloring: 'Hair Coloring',
    spa: 'Spa Services',
    massage: 'Massage',
    facial: 'Facial',
    makeup: 'Makeup',
    nails: 'Nail Services',
    all: 'All Services',
  };
  return displayNames[this.specialization] || this.specialization;
});

// Method to update rating
serviceProviderSchema.methods.updateRating = async function() {
  const Review = mongoose.model('ProviderReview');
  const stats = await Review.aggregate([
    { $match: { provider: this._id } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    this.rating = Math.round(stats[0].avgRating * 100) / 100;
    this.totalReviews = stats[0].count;
  } else {
    this.rating = 0;
    this.totalReviews = 0;
  }

  await this.save();
};

// Static method to get day name
serviceProviderSchema.statics.getDayName = function(dayNumber) {
  return DAY_NAMES[dayNumber] || '';
};

// =====================
// INDEXES
// =====================

serviceProviderSchema.index({ salon: 1 });
serviceProviderSchema.index({ rating: -1 });
serviceProviderSchema.index({ averageRating: -1 });
serviceProviderSchema.index({ location: '2dsphere' });
serviceProviderSchema.index({ city: 1, area: 1, isActive: 1 });
serviceProviderSchema.index({ audience: 1, isActive: 1 });
serviceProviderSchema.index({ specializations: 1, isActive: 1 });

// =====================
// PRE-SAVE HOOKS
// =====================

// Keep fields in sync
serviceProviderSchema.pre('save', function(next) {
  // Sync experience with experienceYears
  if (this.isModified('experienceYears')) {
    this.experience = this.experienceYears;
  }
  // Sync rating with averageRating
  if (this.isModified('averageRating')) {
    this.rating = this.averageRating;
  }
  // Sync reviewCount with totalReviews
  if (this.isModified('totalReviews')) {
    this.reviewCount = this.totalReviews;
  }
  next();
});

const ServiceProvider = mongoose.model('ServiceProvider', serviceProviderSchema);

export default ServiceProvider;

