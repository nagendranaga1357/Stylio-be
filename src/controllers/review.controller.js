import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { SalonReview, ProviderReview } from '../models/Review.js';

/**
 * @desc    Get salon reviews
 * @route   GET /api/reviews/salon
 * @access  Public
 */
export const getSalonReviews = asyncHandler(async (req, res) => {
  const { salon, page = 1, limit = 20 } = req.query;

  const query = {};
  if (salon) {
    query.salon = salon;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reviews, total] = await Promise.all([
    SalonReview.find(query)
      .populate('customer', 'firstName lastName username avatar')
      .populate('salon', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    SalonReview.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      reviews,
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
 * @desc    Create salon review
 * @route   POST /api/reviews/salon
 * @access  Private
 */
export const createSalonReview = asyncHandler(async (req, res) => {
  const {
    salon,
    booking,
    rating,
    title,
    comment,
    cleanlinessRating,
    serviceRating,
    valueRating,
  } = req.body;

  // Check if user already reviewed this salon for this booking
  const existing = await SalonReview.findOne({
    salon,
    customer: req.user._id,
    ...(booking && { booking }),
  });

  if (existing) {
    throw new ApiError(400, 'You have already reviewed this salon');
  }

  const review = await SalonReview.create({
    salon,
    customer: req.user._id,
    booking,
    rating,
    title,
    comment,
    cleanlinessRating,
    serviceRating,
    valueRating,
    isVerified: !!booking,
  });

  const populatedReview = await SalonReview.findById(review._id)
    .populate('customer', 'firstName lastName username avatar');

  res.status(201).json({
    success: true,
    message: 'Review created successfully',
    data: { review: populatedReview },
  });
});

/**
 * @desc    Get provider reviews
 * @route   GET /api/reviews/provider
 * @access  Public
 */
export const getProviderReviews = asyncHandler(async (req, res) => {
  const { provider, page = 1, limit = 20 } = req.query;

  const query = {};
  if (provider) {
    query.provider = provider;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reviews, total] = await Promise.all([
    ProviderReview.find(query)
      .populate('customer', 'firstName lastName username avatar')
      .populate({
        path: 'provider',
        populate: { path: 'user', select: 'firstName lastName' },
      })
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    ProviderReview.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      reviews,
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
 * @desc    Create provider review
 * @route   POST /api/reviews/provider
 * @access  Private
 */
export const createProviderReview = asyncHandler(async (req, res) => {
  const { provider, booking, rating, title, comment } = req.body;

  // Check if user already reviewed this provider for this booking
  const existing = await ProviderReview.findOne({
    provider,
    customer: req.user._id,
    ...(booking && { booking }),
  });

  if (existing) {
    throw new ApiError(400, 'You have already reviewed this provider');
  }

  const review = await ProviderReview.create({
    provider,
    customer: req.user._id,
    booking,
    rating,
    title,
    comment,
    isVerified: !!booking,
  });

  const populatedReview = await ProviderReview.findById(review._id)
    .populate('customer', 'firstName lastName username avatar');

  res.status(201).json({
    success: true,
    message: 'Review created successfully',
    data: { review: populatedReview },
  });
});

/**
 * @desc    Delete review
 * @route   DELETE /api/reviews/:type/:id
 * @access  Private
 */
export const deleteReview = asyncHandler(async (req, res) => {
  const { type, id } = req.params;

  const Model = type === 'salon' ? SalonReview : ProviderReview;

  const review = await Model.findOneAndDelete({
    _id: id,
    customer: req.user._id,
  });

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  res.json({
    success: true,
    message: 'Review deleted successfully',
  });
});

