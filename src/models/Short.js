import mongoose from 'mongoose';

// Platform types for V1
const PLATFORMS = ['youtube', 'instagram', 'tiktok', 'local'];

// V1 Categories for salon/beauty content
const CATEGORIES = [
  'haircut',     // Fade tutorials, haircut transformations, barber skills
  'hairstyle',   // Men's/women's hairstyle trends, styling tips
  'makeup',      // Bridal makeup, everyday looks, transformations
  'skincare',    // Skincare routines, product reviews, glass skin tips
  'nailart',     // Nail designs, nail art tutorials, seasonal trends
  'spa',         // Spa treatments, relaxation techniques, wellness
  'grooming',    // Beard grooming, men's grooming tips
  'fashion',     // Fashion tips related to beauty/salon visits
  'haircolor',   // Hair color transformations, coloring techniques
  'beauty',      // General beauty tips and tricks
  'bridal',      // Bridal looks and wedding prep
  'transformation', // Before/after transformations
];

// Short Comment Schema (V1 Enhanced)
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
  // V1: Support both 'comment' and 'text' field names
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    maxlength: 500,
  },
  // V1: Parent comment for replies
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShortComment',
  },
  // V1: Like count
  likeCount: {
    type: Number,
    default: 0,
  },
  // V1: Reply count
  replyCount: {
    type: Number,
    default: 0,
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      ret.text = ret.comment; // Alias for frontend
      ret.likes = ret.likeCount;
      ret.replies = ret.replyCount;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

shortCommentSchema.index({ short: 1, createdAt: -1 });
shortCommentSchema.index({ parent: 1 });

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

// Short Bookmark Schema (NEW for V1)
const shortBookmarkSchema = new mongoose.Schema({
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

shortBookmarkSchema.index({ short: 1, user: 1 }, { unique: true });
shortBookmarkSchema.index({ user: 1, createdAt: -1 }); // For fetching user's bookmarks

// Short Comment Like Schema (NEW for V1)
const shortCommentLikeSchema = new mongoose.Schema({
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShortComment',
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

shortCommentLikeSchema.index({ comment: 1, user: 1 }, { unique: true });

// Creator Follow Schema (NEW for V1)
const creatorFollowSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  creatorUsername: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: true,
});

creatorFollowSchema.index({ follower: 1, creatorUsername: 1 }, { unique: true });
creatorFollowSchema.index({ creatorUsername: 1 }); // For counting followers

// V1 Creator Schema (embedded)
const creatorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  followers: {
    type: String, // Formatted string like "12.5K"
  },
}, { _id: false });

// Main Short Schema - V1 Enhanced
const shortSchema = new mongoose.Schema({
  // V1: Title and description
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  
  // V1: Media URLs
  thumbnail: {
    type: String,
    required: [true, 'Thumbnail is required'],
  },
  videoUrl: {
    type: String, // Local/direct video URL
    trim: true,
  },
  youtubeUrl: {
    type: String, // YouTube video URL
    trim: true,
  },
  instagramUrl: {
    type: String, // Instagram reel URL
    trim: true,
  },
  
  // V1: Platform type
  platform: {
    type: String,
    enum: PLATFORMS,
    default: 'local',
    index: true,
  },
  
  // V1: Duration as string (e.g., "0:45")
  duration: {
    type: String,
    default: '0:30',
  },
  // Legacy: duration in seconds
  durationSeconds: {
    type: Number,
    default: 30,
    min: 0,
  },
  
  // V1: Engagement counts
  viewCount: {
    type: Number,
    default: 0,
    index: true,
  },
  likeCount: {
    type: Number,
    default: 0,
  },
  commentCount: {
    type: Number,
    default: 0,
  },
  shareCount: {
    type: Number,
    default: 0,
  },
  
  // Legacy field names (for backward compatibility)
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
  
  // V1: Creator info (embedded for external content)
  creator: creatorSchema,
  
  // V1: Reference to User who created (for local content)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // V1: Music/audio track
  music: {
    type: String,
    trim: true,
  },
  
  // V1: Tags as array
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  
  // V1: Category
  category: {
    type: String,
    enum: CATEGORIES,
    index: true,
  },
  
  // Salon association (optional)
  salon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon',
  },
  salonLink: {
    type: String,
    trim: true,
  },
  
  // Status flags
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  
  publishedAt: {
    type: Date,
    default: Date.now,
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
// VIRTUALS
// =====================

// Formatted views (e.g., "2.3M")
shortSchema.virtual('views').get(function() {
  return formatCount(this.viewCount || this.viewsCount);
});

// Formatted likes (e.g., "89K")
shortSchema.virtual('likes').get(function() {
  return formatCount(this.likeCount || this.likesCount);
});

// Formatted comments
shortSchema.virtual('comments').get(function() {
  return formatCount(this.commentCount || this.commentsCount);
});

// Formatted shares
shortSchema.virtual('shares').get(function() {
  return formatCount(this.shareCount || this.sharesCount);
});

// =====================
// HELPER FUNCTIONS
// =====================

function formatCount(num) {
  if (!num || num === 0) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

// =====================
// METHODS
// =====================

shortSchema.methods.incrementViews = async function() {
  this.viewCount += 1;
  this.viewsCount += 1; // Keep in sync
  await this.save();
};

shortSchema.methods.incrementLikes = async function() {
  this.likeCount += 1;
  this.likesCount += 1; // Keep in sync
  await this.save();
};

shortSchema.methods.decrementLikes = async function() {
  if (this.likeCount > 0) {
    this.likeCount -= 1;
    this.likesCount = Math.max(0, this.likesCount - 1);
    await this.save();
  }
};

shortSchema.methods.incrementComments = async function() {
  this.commentCount += 1;
  this.commentsCount += 1;
  await this.save();
};

shortSchema.methods.decrementComments = async function() {
  if (this.commentCount > 0) {
    this.commentCount -= 1;
    this.commentsCount = Math.max(0, this.commentsCount - 1);
    await this.save();
  }
};

shortSchema.methods.incrementShares = async function() {
  this.shareCount += 1;
  this.sharesCount += 1; // Keep in sync
  await this.save();
};

// =====================
// PRE-SAVE HOOKS
// =====================

shortSchema.pre('save', function(next) {
  // Keep counts in sync
  if (this.isModified('viewCount')) {
    this.viewsCount = this.viewCount;
  }
  if (this.isModified('likeCount')) {
    this.likesCount = this.likeCount;
  }
  if (this.isModified('commentCount')) {
    this.commentsCount = this.commentCount;
  }
  if (this.isModified('shareCount')) {
    this.sharesCount = this.shareCount;
  }
  
  // Convert durationSeconds to duration string
  if (this.isModified('durationSeconds') && !this.duration) {
    const mins = Math.floor(this.durationSeconds / 60);
    const secs = this.durationSeconds % 60;
    this.duration = `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  next();
});

// =====================
// INDEXES
// =====================

shortSchema.index({ salon: 1 });
shortSchema.index({ category: 1, isActive: 1 });
shortSchema.index({ viewCount: -1 }); // For popular sorting
shortSchema.index({ createdAt: -1, viewCount: -1 });
shortSchema.index({ platform: 1, isActive: 1 });
shortSchema.index({ tags: 1 });

export const Short = mongoose.model('Short', shortSchema);
export const ShortLike = mongoose.model('ShortLike', shortLikeSchema);
export const ShortComment = mongoose.model('ShortComment', shortCommentSchema);
export const ShortBookmark = mongoose.model('ShortBookmark', shortBookmarkSchema);
export const ShortCommentLike = mongoose.model('ShortCommentLike', shortCommentLikeSchema);
export const CreatorFollow = mongoose.model('CreatorFollow', creatorFollowSchema);
