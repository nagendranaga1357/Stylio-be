import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { Short, ShortLike, ShortComment } from '../models/Short.js';

/**
 * @desc    Get shorts
 * @route   GET /api/shorts
 * @access  Public
 */
export const getShorts = asyncHandler(async (req, res) => {
  const { salon, featured, videoType, page = 1, limit = 20 } = req.query;

  const query = { isActive: true };

  if (salon) {
    query.salon = salon;
  }

  if (featured === 'true') {
    query.isFeatured = true;
  }

  if (videoType) {
    query.videoType = videoType;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [shorts, total] = await Promise.all([
    Short.find(query)
      .populate('salon', 'name coverImage')
      .populate('createdBy', 'firstName lastName username')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    Short.countDocuments(query),
  ]);

  // Check if user liked each short
  let shortsWithLikeStatus = shorts;
  if (req.user) {
    const userLikes = await ShortLike.find({
      user: req.user._id,
      short: { $in: shorts.map((s) => s._id) },
    }).select('short');

    const likedIds = new Set(userLikes.map((l) => l.short.toString()));

    shortsWithLikeStatus = shorts.map((s) => ({
      ...s.toJSON(),
      isLiked: likedIds.has(s._id.toString()),
    }));
  }

  res.json({
    success: true,
    data: {
      shorts: shortsWithLikeStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * @desc    Get single short
 * @route   GET /api/shorts/:id
 * @access  Public
 */
export const getShort = asyncHandler(async (req, res) => {
  const short = await Short.findById(req.params.id)
    .populate('salon', 'name address coverImage rating')
    .populate('createdBy', 'firstName lastName username avatar');

  if (!short || !short.isActive) {
    throw new ApiError(404, 'Short not found');
  }

  // Check if liked
  let isLiked = false;
  if (req.user) {
    const like = await ShortLike.findOne({ short: short._id, user: req.user._id });
    isLiked = !!like;
  }

  res.json({
    success: true,
    data: {
      short: {
        ...short.toJSON(),
        isLiked,
      },
    },
  });
});

/**
 * @desc    Record view
 * @route   GET /api/shorts/:id/view
 * @access  Public
 */
export const recordView = asyncHandler(async (req, res) => {
  const short = await Short.findById(req.params.id);

  if (!short) {
    throw new ApiError(404, 'Short not found');
  }

  await short.incrementViews();

  res.json({
    success: true,
    data: { viewsCount: short.viewsCount },
  });
});

/**
 * @desc    Like/unlike short
 * @route   POST /api/shorts/:id/like
 * @access  Private
 */
export const toggleLike = asyncHandler(async (req, res) => {
  const short = await Short.findById(req.params.id);

  if (!short) {
    throw new ApiError(404, 'Short not found');
  }

  const existingLike = await ShortLike.findOne({
    short: short._id,
    user: req.user._id,
  });

  if (existingLike) {
    await existingLike.deleteOne();
    await short.decrementLikes();
    res.json({
      success: true,
      message: 'Short unliked',
      data: { isLiked: false, likesCount: short.likesCount },
    });
  } else {
    await ShortLike.create({ short: short._id, user: req.user._id });
    await short.incrementLikes();
    res.json({
      success: true,
      message: 'Short liked',
      data: { isLiked: true, likesCount: short.likesCount },
    });
  }
});

/**
 * @desc    Get comments
 * @route   GET /api/shorts/:id/comments
 * @access  Public
 */
export const getComments = asyncHandler(async (req, res) => {
  const comments = await ShortComment.find({ short: req.params.id })
    .populate('user', 'firstName lastName username avatar')
    .sort('-createdAt');

  res.json({
    success: true,
    data: { comments },
  });
});

/**
 * @desc    Add comment
 * @route   POST /api/shorts/:id/comments
 * @access  Private
 */
export const addComment = asyncHandler(async (req, res) => {
  const { comment: text } = req.body;

  if (!text) {
    throw new ApiError(400, 'Comment text is required');
  }

  const short = await Short.findById(req.params.id);
  if (!short) {
    throw new ApiError(404, 'Short not found');
  }

  const comment = await ShortComment.create({
    short: short._id,
    user: req.user._id,
    comment: text,
  });

  // Update comments count
  short.commentsCount += 1;
  await short.save();

  const populatedComment = await ShortComment.findById(comment._id)
    .populate('user', 'firstName lastName username avatar');

  res.status(201).json({
    success: true,
    data: { comment: populatedComment },
  });
});

/**
 * @desc    Get trending shorts
 * @route   GET /api/shorts/trending
 * @access  Public
 */
export const getTrendingShorts = asyncHandler(async (req, res) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const shorts = await Short.find({
    isActive: true,
    createdAt: { $gte: weekAgo },
  })
    .populate('salon', 'name coverImage')
    .populate('createdBy', 'firstName lastName')
    .sort('-viewsCount -likesCount')
    .limit(20);

  res.json({
    success: true,
    data: { shorts },
  });
});

