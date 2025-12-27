import mongoose from 'mongoose';

// Service Category Schema
const serviceCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  icon: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
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

// Service Type Schema
const serviceTypeSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCategory',
    required: [true, 'Category is required'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Service type name is required'],
    trim: true,
    maxlength: [100, 'Service type name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  icon: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
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

serviceTypeSchema.index({ category: 1, slug: 1 }, { unique: true });

// Service Schema (actual services offered by salons)
const serviceSchema = new mongoose.Schema({
  salon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon',
    required: [true, 'Salon is required'],
    index: true,
  },
  serviceType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceType',
    required: [true, 'Service type is required'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [200, 'Service name cannot exceed 200 characters'],
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
  // Base price (original price)
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    index: true,
  },
  // Alias for consistency with V1 spec
  basePrice: {
    type: Number,
    min: [0, 'Base price cannot be negative'],
  },
  discountedPrice: {
    type: Number,
    min: [0, 'Discounted price cannot be negative'],
  },
  // Home service price (may differ from salon price)
  homeServicePrice: {
    type: Number,
    min: [0, 'Home service price cannot be negative'],
  },
  durationMinutes: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
  },
  // Tags for search
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  // Booking count for popularity sorting
  bookingCount: {
    type: Number,
    default: 0,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isPopular: {
    type: Boolean,
    default: false,
    index: true,
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

// Text index for full-text search
serviceSchema.index(
  { name: 'text', description: 'text', tags: 'text' },
  { 
    weights: { name: 10, tags: 5, description: 2 },
    name: 'service_text_search'
  }
);

// Compound indexes for V1 search patterns
serviceSchema.index({ mode: 1, audience: 1, isActive: 1 });
serviceSchema.index({ salon: 1, mode: 1, audience: 1 });
serviceSchema.index({ price: 1, isActive: 1 });
serviceSchema.index({ serviceType: 1, isActive: 1 });
serviceSchema.index({ bookingCount: -1, isActive: 1 });

// =====================
// VIRTUALS
// =====================

// Virtual for final price (considers discount)
serviceSchema.virtual('finalPrice').get(function() {
  return this.discountedPrice || this.price;
});

// =====================
// PRE-SAVE HOOKS
// =====================

// Sync basePrice with price
serviceSchema.pre('save', function(next) {
  if (this.isModified('price') && !this.basePrice) {
    this.basePrice = this.price;
  }
  next();
});

// =====================
// METHODS
// =====================

// Increment booking count
serviceSchema.methods.incrementBookingCount = async function() {
  this.bookingCount += 1;
  await this.save();
};

export const ServiceCategory = mongoose.model('ServiceCategory', serviceCategorySchema);
export const ServiceType = mongoose.model('ServiceType', serviceTypeSchema);
export const Service = mongoose.model('Service', serviceSchema);
