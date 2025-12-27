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

const SPECIALIZATIONS = [
  'haircut',
  'styling',
  'coloring',
  'spa',
  'massage',
  'facial',
  'makeup',
  'nails',
  'all',
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
  specialization: {
    type: String,
    enum: SPECIALIZATIONS,
    required: [true, 'Specialization is required'],
  },
  experienceYears: {
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
  isAvailable: {
    type: Boolean,
    default: true,
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

serviceProviderSchema.index({ salon: 1 });
serviceProviderSchema.index({ rating: -1 });

const ServiceProvider = mongoose.model('ServiceProvider', serviceProviderSchema);

export default ServiceProvider;

