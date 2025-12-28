import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { Short, ShortLike, ShortComment, ShortBookmark, ShortCommentLike, CreatorFollow } from '../models/Short.js';
import { buildPaginationResponse } from '../utils/searchHelpers.js';

/**
 * Format a short for V1 API response
 */
function formatShortResponse(short, isLiked = false, isBookmarked = false) {
  const shortObj = short.toJSON ? short.toJSON() : short;
  
  return {
    id: shortObj._id || shortObj.id,
    title: shortObj.title,
    description: shortObj.description,
    thumbnail: shortObj.thumbnail,
    videoUrl: shortObj.videoUrl,
    youtubeUrl: shortObj.youtubeUrl,
    instagramUrl: shortObj.instagramUrl,
    platform: shortObj.platform || 'local',
    duration: shortObj.duration || '0:30',
    
    // Formatted string counts
    views: shortObj.views || formatCount(shortObj.viewCount || shortObj.viewsCount),
    likes: shortObj.likes || formatCount(shortObj.likeCount || shortObj.likesCount),
    comments: shortObj.comments || formatCount(shortObj.commentCount || shortObj.commentsCount),
    shares: shortObj.shares || formatCount(shortObj.shareCount || shortObj.sharesCount),
    
    // Raw counts
    viewCount: shortObj.viewCount || shortObj.viewsCount || 0,
    likeCount: shortObj.likeCount || shortObj.likesCount || 0,
    commentCount: shortObj.commentCount || shortObj.commentsCount || 0,
    shareCount: shortObj.shareCount || shortObj.sharesCount || 0,
    
    // Creator info
    creator: shortObj.creator || {
      name: shortObj.createdBy?.firstName 
        ? `${shortObj.createdBy.firstName} ${shortObj.createdBy.lastName || ''}`.trim()
        : shortObj.createdBy?.username || 'Unknown',
      username: shortObj.createdBy?.username || '@stylio',
      avatar: shortObj.createdBy?.avatar || null,
      verified: shortObj.isVerified || false,
      followers: '0',
    },
    
    // Metadata
    music: shortObj.music,
    tags: shortObj.tags || [],
    category: shortObj.category,
    salon: shortObj.salon,
    isActive: shortObj.isActive,
    isFeatured: shortObj.isFeatured,
    isLiked,
    isBookmarked,
    createdAt: shortObj.createdAt,
  };
}

/**
 * Format count to human-readable string (e.g., 2.3M, 89K)
 */
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

/**
 * @desc    Get shorts
 * @route   GET /api/shorts
 * @access  Public
 * 
 * @query {string} category - Filter by category (haircut, makeup, nail, etc.)
 * @query {string} platform - Filter by platform (youtube, instagram, tiktok, local)
 * @query {string} salon - Filter by salon ID
 * @query {string} creatorId - Filter by creator
 * @query {boolean} popular - Sort by popularity
 * @query {boolean} featured - Only featured shorts
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10)
 */
export const getShorts = asyncHandler(async (req, res) => {
  const { 
    salon, 
    category,
    platform,
    creatorId,
    featured, 
    popular,
    page = 1, 
    limit = 10 
  } = req.query;

  const query = { isActive: true };

  if (salon) {
    query.salon = salon;
  }

  if (category) {
    query.category = category;
  }

  if (platform) {
    query.platform = platform;
  }

  if (creatorId) {
    query.createdBy = creatorId;
  }

  if (featured === 'true') {
    query.isFeatured = true;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = Math.min(parseInt(limit), 50);

  // Sorting
  let sortOptions = { createdAt: -1 };
  if (popular === 'true') {
    sortOptions = { viewCount: -1, likeCount: -1, createdAt: -1 };
  }

  const [shorts, total] = await Promise.all([
    Short.find(query)
      .populate('salon', 'name coverImage slug')
      .populate('createdBy', 'firstName lastName username avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum),
    Short.countDocuments(query),
  ]);

  // Check if user liked/bookmarked each short
  let likedIds = new Set();
  let bookmarkedIds = new Set();
  if (req.user) {
    const [userLikes, userBookmarks] = await Promise.all([
      ShortLike.find({
        user: req.user._id,
        short: { $in: shorts.map((s) => s._id) },
      }).select('short'),
      ShortBookmark.find({
        user: req.user._id,
        short: { $in: shorts.map((s) => s._id) },
      }).select('short'),
    ]);

    likedIds = new Set(userLikes.map((l) => l.short.toString()));
    bookmarkedIds = new Set(userBookmarks.map((b) => b.short.toString()));
  }

  const formattedShorts = shorts.map((s) => 
    formatShortResponse(s, likedIds.has(s._id.toString()), bookmarkedIds.has(s._id.toString()))
  );

  res.json({
    success: true,
    data: {
      data: formattedShorts,
      pagination: buildPaginationResponse(parseInt(page), limitNum, total),
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
    .populate('salon', 'name address coverImage rating slug')
    .populate('createdBy', 'firstName lastName username avatar');

  if (!short || !short.isActive) {
    throw new ApiError(404, 'Short not found');
  }

  // Check if liked/bookmarked
  let isLiked = false;
  let isBookmarked = false;
  if (req.user) {
    const [like, bookmark] = await Promise.all([
      ShortLike.findOne({ short: short._id, user: req.user._id }),
      ShortBookmark.findOne({ short: short._id, user: req.user._id }),
    ]);
    isLiked = !!like;
    isBookmarked = !!bookmark;
  }

  res.json({
    success: true,
    data: formatShortResponse(short, isLiked, isBookmarked),
  });
});

/**
 * @desc    Record view
 * @route   GET /api/shorts/:id/view
 * @route   POST /api/shorts/:id/view
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
    data: { 
      viewCount: short.viewCount,
      views: formatCount(short.viewCount),
    },
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
      data: { 
        isLiked: false, 
        likeCount: short.likeCount,
        likes: formatCount(short.likeCount),
      },
    });
  } else {
    await ShortLike.create({ short: short._id, user: req.user._id });
    await short.incrementLikes();
    res.json({
      success: true,
      message: 'Short liked',
      data: { 
        isLiked: true, 
        likeCount: short.likeCount,
        likes: formatCount(short.likeCount),
      },
    });
  }
});

/**
 * @desc    Get comments
 * @route   GET /api/shorts/:id/comments
 * @access  Public (with optional auth)
 */
export const getComments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = Math.min(parseInt(limit), 50);

  // Only get top-level comments (no parent)
  const query = { 
    short: req.params.id,
    parent: { $exists: false },
    isActive: true,
  };

  const [comments, total] = await Promise.all([
    ShortComment.find(query)
      .populate('user', 'firstName lastName username avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum),
    ShortComment.countDocuments(query),
  ]);

  // Check if user liked each comment
  let likedIds = new Set();
  if (req.user) {
    const userLikes = await ShortCommentLike.find({
      user: req.user._id,
      comment: { $in: comments.map((c) => c._id) },
    }).select('comment');

    likedIds = new Set(userLikes.map((l) => l.comment.toString()));
  }

  const formattedComments = comments.map((comment) => ({
    ...comment.toJSON(),
    isLiked: likedIds.has(comment._id.toString()),
  }));

  res.json({
    success: true,
    data: { 
      comments: formattedComments,
      pagination: buildPaginationResponse(parseInt(page), limitNum, total),
    },
  });
});

/**
 * @desc    Add comment
 * @route   POST /api/shorts/:id/comments
 * @access  Private
 */
export const addComment = asyncHandler(async (req, res) => {
  // Support both 'comment' and 'text' field names
  const text = req.body.comment || req.body.text;
  const { parentId } = req.body;

  if (!text) {
    throw new ApiError(400, 'Comment text is required');
  }

  const short = await Short.findById(req.params.id);
  if (!short) {
    throw new ApiError(404, 'Short not found');
  }

  const commentData = {
    short: short._id,
    user: req.user._id,
    comment: text,
  };

  // If this is a reply, validate parent exists and update its reply count
  if (parentId) {
    const parentComment = await ShortComment.findById(parentId);
    if (!parentComment) {
      throw new ApiError(404, 'Parent comment not found');
    }
    commentData.parent = parentId;
    parentComment.replyCount += 1;
    await parentComment.save();
  }

  const comment = await ShortComment.create(commentData);

  // Update comments count
  await short.incrementComments();

  const populatedComment = await ShortComment.findById(comment._id)
    .populate('user', 'firstName lastName username avatar');

  res.status(201).json({
    success: true,
    data: { 
      comment: populatedComment,
      commentCount: short.commentCount,
      comments: formatCount(short.commentCount),
    },
  });
});

/**
 * @desc    Get trending shorts
 * @route   GET /api/shorts/trending
 * @access  Public
 */
export const getTrendingShorts = asyncHandler(async (req, res) => {
  const { limit = 20, category } = req.query;
  
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const query = {
    isActive: true,
    createdAt: { $gte: weekAgo },
  };

  if (category) {
    query.category = category;
  }

  const shorts = await Short.find(query)
    .populate('salon', 'name coverImage slug')
    .populate('createdBy', 'firstName lastName username avatar')
    .sort('-viewCount -likeCount')
    .limit(parseInt(limit));

  // Check if user liked each short
  let likedIds = new Set();
  if (req.user) {
    const userLikes = await ShortLike.find({
      user: req.user._id,
      short: { $in: shorts.map((s) => s._id) },
    }).select('short');

    likedIds = new Set(userLikes.map((l) => l.short.toString()));
  }

  // Check if user bookmarked each short
  let bookmarkedIds = new Set();
  if (req.user) {
    const userBookmarks = await ShortBookmark.find({
      user: req.user._id,
      short: { $in: shorts.map((s) => s._id) },
    }).select('short');

    bookmarkedIds = new Set(userBookmarks.map((b) => b.short.toString()));
  }

  const formattedShorts = shorts.map((s) => 
    formatShortResponse(s, likedIds.has(s._id.toString()), bookmarkedIds.has(s._id.toString()))
  );

  res.json({
    success: true,
    data: { 
      data: formattedShorts,
      count: formattedShorts.length,
    },
  });
});

/**
 * @desc    Toggle bookmark on short
 * @route   POST /api/shorts/:id/bookmark
 * @access  Private
 */
export const toggleBookmark = asyncHandler(async (req, res) => {
  const short = await Short.findById(req.params.id);

  if (!short) {
    throw new ApiError(404, 'Short not found');
  }

  const existingBookmark = await ShortBookmark.findOne({
    short: short._id,
    user: req.user._id,
  });

  if (existingBookmark) {
    await existingBookmark.deleteOne();
    res.json({
      success: true,
      message: 'Short removed from bookmarks',
      data: { isBookmarked: false },
    });
  } else {
    await ShortBookmark.create({ short: short._id, user: req.user._id });
    res.json({
      success: true,
      message: 'Short bookmarked',
      data: { isBookmarked: true },
    });
  }
});

/**
 * @desc    Get user's bookmarked shorts
 * @route   GET /api/shorts/bookmarks
 * @access  Private
 */
export const getBookmarkedShorts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = Math.min(parseInt(limit), 50);

  // Get user's bookmark IDs
  const [bookmarks, total] = await Promise.all([
    ShortBookmark.find({ user: req.user._id })
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .select('short'),
    ShortBookmark.countDocuments({ user: req.user._id }),
  ]);

  const shortIds = bookmarks.map(b => b.short);

  // Get the actual shorts
  const shorts = await Short.find({ _id: { $in: shortIds }, isActive: true })
    .populate('salon', 'name coverImage slug')
    .populate('createdBy', 'firstName lastName username avatar');

  // Get user's likes for these shorts
  const userLikes = await ShortLike.find({
    user: req.user._id,
    short: { $in: shortIds },
  }).select('short');

  const likedIds = new Set(userLikes.map((l) => l.short.toString()));

  // Order shorts by bookmark order (most recent first)
  const shortMap = new Map(shorts.map(s => [s._id.toString(), s]));
  const orderedShorts = shortIds
    .map(id => shortMap.get(id.toString()))
    .filter(Boolean);

  const formattedShorts = orderedShorts.map((s) => 
    formatShortResponse(s, likedIds.has(s._id.toString()), true)
  );

  res.json({
    success: true,
    data: {
      data: formattedShorts,
      pagination: buildPaginationResponse(parseInt(page), limitNum, total),
    },
  });
});

/**
 * @desc    Increment share count
 * @route   POST /api/shorts/:id/share
 * @access  Public
 */
export const recordShare = asyncHandler(async (req, res) => {
  const short = await Short.findById(req.params.id);

  if (!short) {
    throw new ApiError(404, 'Short not found');
  }

  await short.incrementShares();

  res.json({
    success: true,
    data: { 
      shareCount: short.shareCount,
      shares: formatCount(short.shareCount),
    },
  });
});

/**
 * @desc    Like/unlike comment
 * @route   POST /api/shorts/comments/:commentId/like
 * @access  Private
 */
export const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  
  const comment = await ShortComment.findById(commentId);

  if (!comment || !comment.isActive) {
    throw new ApiError(404, 'Comment not found');
  }

  const existingLike = await ShortCommentLike.findOne({
    comment: comment._id,
    user: req.user._id,
  });

  if (existingLike) {
    await existingLike.deleteOne();
    comment.likeCount = Math.max(0, comment.likeCount - 1);
    await comment.save();
    
    res.json({
      success: true,
      message: 'Comment unliked',
      data: { 
        isLiked: false, 
        likeCount: comment.likeCount,
        likes: comment.likeCount,
      },
    });
  } else {
    await ShortCommentLike.create({ comment: comment._id, user: req.user._id });
    comment.likeCount += 1;
    await comment.save();
    
    res.json({
      success: true,
      message: 'Comment liked',
      data: { 
        isLiked: true, 
        likeCount: comment.likeCount,
        likes: comment.likeCount,
      },
    });
  }
});

/**
 * @desc    Follow/unfollow creator
 * @route   POST /api/shorts/creators/:creatorUsername/follow
 * @access  Private
 */
export const toggleCreatorFollow = asyncHandler(async (req, res) => {
  const { creatorUsername } = req.params;
  
  if (!creatorUsername) {
    throw new ApiError(400, 'Creator username is required');
  }

  // Normalize username (remove @ if present)
  const normalizedUsername = creatorUsername.startsWith('@') 
    ? creatorUsername 
    : `@${creatorUsername}`;

  const existingFollow = await CreatorFollow.findOne({
    follower: req.user._id,
    creatorUsername: normalizedUsername,
  });

  // Get current follower count for this creator
  const currentCount = await CreatorFollow.countDocuments({ creatorUsername: normalizedUsername });

  if (existingFollow) {
    await existingFollow.deleteOne();
    
    res.json({
      success: true,
      message: 'Unfollowed creator',
      data: { 
        isFollowing: false, 
        followersCount: Math.max(0, currentCount - 1),
      },
    });
  } else {
    await CreatorFollow.create({ 
      follower: req.user._id, 
      creatorUsername: normalizedUsername,
    });
    
    res.json({
      success: true,
      message: 'Following creator',
      data: { 
        isFollowing: true, 
        followersCount: currentCount + 1,
      },
    });
  }
});

/**
 * @desc    Get comment replies
 * @route   GET /api/shorts/comments/:commentId/replies
 * @access  Public
 */
export const getCommentReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = Math.min(parseInt(limit), 50);

  const [replies, total] = await Promise.all([
    ShortComment.find({ parent: commentId, isActive: true })
      .populate('user', 'firstName lastName username avatar')
      .sort('createdAt')
      .skip(skip)
      .limit(limitNum),
    ShortComment.countDocuments({ parent: commentId, isActive: true }),
  ]);

  // Check if user liked each reply
  let likedIds = new Set();
  if (req.user) {
    const userLikes = await ShortCommentLike.find({
      user: req.user._id,
      comment: { $in: replies.map((r) => r._id) },
    }).select('comment');

    likedIds = new Set(userLikes.map((l) => l.comment.toString()));
  }

  const formattedReplies = replies.map((reply) => ({
    ...reply.toJSON(),
    isLiked: likedIds.has(reply._id.toString()),
  }));

  res.json({
    success: true,
    data: { 
      replies: formattedReplies,
      pagination: buildPaginationResponse(parseInt(page), limitNum, total),
    },
  });
});
