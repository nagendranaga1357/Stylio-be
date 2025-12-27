import mongoose from 'mongoose';

// Salon Image Schema (embedded)
const salonImageSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
    maxlength: 200,
  },
  order: {
    type: Number,
    default: 0,
  },
}, { _id: true, timestamps: true });

// Main Salon Schema
const salonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Salon name is required'],
    trim: true,
    maxlength: [200, 'Salon name cannot exceed 200 characters'],
  },
  slug: {
    type: String,
    lowercase: true,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
  // V1: Service mode - supports "To Salon", "To Home" or both
  mode: {
    type: String,
    enum: ['toSalon', 'toHome', 'both'],
    default: 'toSalon',
    index: true,
  },
  // V1: Target audience
  audience: [{
    type: String,
    enum: ['men', 'women', 'kids', 'unisex'],
  }],
  // Location references
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
    required: [true, 'Area is required'],
    index: true,
  },
  // Denormalized city reference for faster queries
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    index: true,
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
  },
  // GeoJSON Point for geospatial queries
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
  // Tags for enhanced search
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  phone: {
    type: String,
    trim: true,
    maxlength: 15,
  },
  mobile: {
    type: String,
    trim: true,
    maxlength: 15,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
  openingTime: {
    type: String,
    default: '09:00',
  },
  closingTime: {
    type: String,
    default: '21:00',
  },
  isOpenSunday: {
    type: Boolean,
    default: true,
  },
  coverImage: {
    type: String,
  },
  logo: {
    type: String,
  },
  thumbnailUrl: {
    type: String,
  },
  galleryImages: [salonImageSchema],
  // V1: Pre-computed average rating for faster sorting
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    index: true,
  },
  // Legacy field - kept for backward compatibility
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
  // V1: Price level indicator (1=budget, 2=moderate, 3=premium, 4=luxury)
  priceLevel: {
    type: Number,
    min: 1,
    max: 4,
    default: 2,
    index: true,
  },
  // Popularity score for sorting
  popularityScore: {
    type: Number,
    default: 0,
    index: true,
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
  features: {
    hasParking: { type: Boolean, default: false },
    hasWifi: { type: Boolean, default: false },
    hasAc: { type: Boolean, default: false },
    acceptsCards: { type: Boolean, default: true },
    homeServiceAvailable: { type: Boolean, default: false },
  },
  // Owner reference
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

// =====================
// INDEXES
// =====================

// Geospatial index for location-based queries
salonSchema.index({ location: '2dsphere' });

// Text index for full-text search on name, description, address, tags
salonSchema.index(
  { name: 'text', description: 'text', address: 'text', tags: 'text' },
  { 
    weights: { name: 10, tags: 5, description: 2, address: 1 },
    name: 'salon_text_search'
  }
);

// Compound indexes for common query patterns
salonSchema.index({ city: 1, area: 1, isActive: 1 });
salonSchema.index({ mode: 1, audience: 1, isActive: 1 });
salonSchema.index({ averageRating: -1, isActive: 1 });
salonSchema.index({ priceLevel: 1, isActive: 1 });
salonSchema.index({ popularityScore: -1, isActive: 1 });

// =====================
// VIRTUALS
// =====================

// Virtual for services
salonSchema.virtual('services', {
  ref: 'Service',
  localField: '_id',
  foreignField: 'salon',
});

// Virtual for providers
salonSchema.virtual('providers', {
  ref: 'ServiceProvider',
  localField: '_id',
  foreignField: 'salon',
});

// =====================
// PRE-SAVE HOOKS
// =====================

// Auto-generate slug from name
salonSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  // Keep rating in sync with averageRating for backward compatibility
  if (this.isModified('averageRating')) {
    this.rating = this.averageRating;
  }
  next();
});

// =====================
// METHODS
// =====================

// Method to update rating
salonSchema.methods.updateRating = async function() {
  const Review = mongoose.model('SalonReview');
  const stats = await Review.aggregate([
    { $match: { salon: this._id } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    this.averageRating = Math.round(stats[0].avgRating * 100) / 100;
    this.rating = this.averageRating;
    this.totalReviews = stats[0].count;
  } else {
    this.averageRating = 0;
    this.rating = 0;
    this.totalReviews = 0;
  }

  await this.save();
};

// Method to update popularity score
salonSchema.methods.updatePopularityScore = async function() {
  const Booking = mongoose.model('Booking');
  const Favorite = mongoose.model('Favorite');
  
  // Calculate score based on bookings, reviews, favorites
  const [bookingsCount, favoritesCount] = await Promise.all([
    Booking.countDocuments({ salon: this._id, status: 'completed' }),
    Favorite.countDocuments({ salon: this._id }),
  ]);
  
  // Weighted formula: rating * 20 + bookings * 2 + reviews * 3 + favorites
  this.popularityScore = 
    (this.averageRating * 20) + 
    (bookingsCount * 2) + 
    (this.totalReviews * 3) + 
    favoritesCount;
  
  await this.save();
};

const Salon = mongoose.model('Salon', salonSchema);

export default Salon;
