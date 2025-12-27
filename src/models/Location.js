import mongoose from 'mongoose';

// City Schema
const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'City name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'City name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    lowercase: true,
    trim: true,
    index: true,
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [100, 'State name cannot exceed 100 characters'],
  },
  country: {
    type: String,
    default: 'India',
    trim: true,
  },
  // Optional: GeoJSON polygon for city boundaries (for advanced geo filtering)
  geoBounds: {
    type: {
      type: String,
      enum: ['Polygon'],
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of [lng, lat] points
    },
  },
  // Center point for the city (for default map centering)
  center: {
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

// Auto-generate slug from name
citySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Indexes
citySchema.index({ name: 'text' });
citySchema.index({ geoBounds: '2dsphere' });
citySchema.index({ center: '2dsphere' });

// Area Schema
const areaSchema = new mongoose.Schema({
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: [true, 'City is required'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Area name is required'],
    trim: true,
    maxlength: [100, 'Area name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    lowercase: true,
    trim: true,
    index: true,
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    trim: true,
    maxlength: [10, 'Pincode cannot exceed 10 characters'],
  },
  // Optional: GeoJSON polygon for area boundaries
  geoBounds: {
    type: {
      type: String,
      enum: ['Polygon'],
    },
    coordinates: {
      type: [[[Number]]],
    },
  },
  // Center point for the area
  center: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
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

// Auto-generate slug from name
areaSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Compound unique index for area name within a city
areaSchema.index({ city: 1, name: 1 }, { unique: true });
areaSchema.index({ city: 1, slug: 1 });
areaSchema.index({ name: 'text' });
areaSchema.index({ geoBounds: '2dsphere' });
areaSchema.index({ center: '2dsphere' });

export const City = mongoose.model('City', citySchema);
export const Area = mongoose.model('Area', areaSchema);
