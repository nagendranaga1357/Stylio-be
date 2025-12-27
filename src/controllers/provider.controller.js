import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import ServiceProvider from '../models/Provider.js';
import { ProviderReview } from '../models/Review.js';

/**
 * @desc    Get all providers
 * @route   GET /api/providers
 * @access  Public
 */
export const getProviders = asyncHandler(async (req, res) => {
  const {
    salon,
    specialization,
    homeService,
    area,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const query = { isAvailable: true };

  if (salon) {
    query.salon = salon;
  }

  if (specialization) {
    query.specialization = specialization;
  }

  if (homeService === 'true') {
    query.providesHomeService = true;
  }

  if (area) {
    query.homeServiceAreas = area;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build search pipeline
  let matchStage = { ...query };
  
  if (search) {
    // We need to do a lookup first for search
    const providers = await ServiceProvider.find(query)
      .populate({
        path: 'user',
        match: {
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
          ],
        },
        select: 'firstName lastName username avatar',
      })
      .populate('salon', 'name')
      .sort('-rating')
      .skip(skip)
      .limit(parseInt(limit));

    // Filter out null users (didn't match search)
    const filteredProviders = providers.filter((p) => p.user);

    res.json({
      success: true,
      data: {
        providers: filteredProviders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredProviders.length,
        },
      },
    });
    return;
  }

  const [providers, total] = await Promise.all([
    ServiceProvider.find(query)
      .populate('user', 'firstName lastName username avatar')
      .populate('salon', 'name')
      .sort('-rating')
      .skip(skip)
      .limit(parseInt(limit)),
    ServiceProvider.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      providers,
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
 * @desc    Get single provider
 * @route   GET /api/providers/:id
 * @access  Public
 */
export const getProvider = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findById(req.params.id)
    .populate('user', 'firstName lastName username email avatar')
    .populate('salon', 'name address rating coverImage')
    .populate('homeServiceAreas', 'name');

  if (!provider) {
    throw new ApiError(404, 'Provider not found');
  }

  res.json({
    success: true,
    data: { provider },
  });
});

/**
 * @desc    Get provider reviews
 * @route   GET /api/providers/:id/reviews
 * @access  Public
 */
export const getProviderReviews = asyncHandler(async (req, res) => {
  const reviews = await ProviderReview.find({ provider: req.params.id })
    .populate('customer', 'firstName lastName username avatar')
    .sort('-createdAt');

  res.json({
    success: true,
    data: { reviews },
  });
});

/**
 * @desc    Get provider availability
 * @route   GET /api/providers/:id/availability
 * @access  Public
 */
export const getProviderAvailability = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findById(req.params.id).select('availability');

  if (!provider) {
    throw new ApiError(404, 'Provider not found');
  }

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const availability = provider.availability.map((a) => ({
    day: dayNames[a.dayOfWeek],
    dayNumber: a.dayOfWeek,
    startTime: a.startTime,
    endTime: a.endTime,
    isAvailable: a.isAvailable,
  }));

  res.json({
    success: true,
    data: { availability },
  });
});

