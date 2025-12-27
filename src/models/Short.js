import mongoose from 'mongoose';

const VIDEO_TYPES = ['youtube', 'vimeo', 'direct', 'uploaded'];

// Short Comment Schema
const shortCommentSchema = new mongoose.Schema({
  short: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Short',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
  },
  isEdited: {
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

// Short Like Schema
const shortLikeSchema = new mongoose.Schema({
  short: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Short',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

shortLikeSchema.index({ short: 1, user: 1 }, { unique: true });

// Main Short Schema
const shortSchema = new mongoose.Schema({
  salon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon',
    required: [true, 'Salon is required'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required'],
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required'],
    trim: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
  },
  thumbnail: {
    type: String,
  },
  durationSeconds: {
    type: Number,
    default: 0,
    min: 0,
  },
  videoType: {
    type: String,
    enum: VIDEO_TYPES,
    default: 'direct',
  },
  viewsCount: {
    type: Number,
    default: 0,
  },
  likesCount: {
    type: Number,
    default: 0,
  },
  commentsCount: {
    type: Number,
    default: 0,
  },
  sharesCount: {
    type: Number,
    default: 0,
  },
  salonLink: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  tags: {
    type: String,
    trim: true,
  },
  publishedAt: {
    type: Date,
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

// Methods
shortSchema.methods.incrementViews = async function() {
  this.viewsCount += 1;
  await this.save();
};

shortSchema.methods.incrementLikes = async function() {
  this.likesCount += 1;
  await this.save();
};

shortSchema.methods.decrementLikes = async function() {
  if (this.likesCount > 0) {
    this.likesCount -= 1;
    await this.save();
  }
};

shortSchema.index({ salon: 1 });
shortSchema.index({ createdAt: -1, viewsCount: -1 });

export const Short = mongoose.model('Short', shortSchema);
export const ShortLike = mongoose.model('ShortLike', shortLikeSchema);
export const ShortComment = mongoose.model('ShortComment', shortCommentSchema);

