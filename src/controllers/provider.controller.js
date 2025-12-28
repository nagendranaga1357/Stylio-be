import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import ServiceProvider from '../models/Provider.js';
import { ProviderReview } from '../models/Review.js';

/**
 * @desc    Get all providers
 * @route   GET /api/providers
 * @access  Public
 * 
 * Query Parameters (V1):
 * - lat, lng, radius: Geo search
 * - audience: men, women, kids, unisex
 * - minRating: Minimum rating filter
 * - serviceType: Filter by specialization
 * - salon: Filter by salon ID
 * - homeService: Filter home service providers
 * - area: Filter by area
 * - sortBy: rating, distance, experience
 * - page, limit: Pagination
 */
export const getProviders = asyncHandler(async (req, res) => {
  const {
    salon,
    specialization,
    serviceType,
    homeService,
    area,
    audience,
    minRating,
    lat,
    lng,
    radius = 5000,
    search,
    sortBy = 'rating',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = Math.min(parseInt(limit), 50);

  // Check if geo search
  const hasGeoSearch = lat && lng;

  if (hasGeoSearch) {
    // Use aggregation for geo search
    const pipeline = [];

    // $geoNear must be first stage
    pipeline.push({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        distanceField: 'distanceInMeters',
        maxDistance: parseInt(radius),
        spherical: true,
        query: { isActive: true, isAvailable: true },
      },
    });

    // Additional filters
    const matchFilters = {};

    if (salon) matchFilters.salon = new mongoose.Types.ObjectId(salon);
    if (homeService === 'true') matchFilters.providesHomeService = true;
    if (area) matchFilters.homeServiceAreas = new mongoose.Types.ObjectId(area);
    if (audience) matchFilters.audience = audience;
    if (minRating) matchFilters.averageRating = { $gte: parseFloat(minRating) };
    if (specialization || serviceType) {
      matchFilters.specializations = specialization || serviceType;
    }

    if (Object.keys(matchFilters).length > 0) {
      pipeline.push({ $match: matchFilters });
    }

    // Sorting
    const sortOptions = {};
    if (sortBy === 'distance') {
      sortOptions.distanceInMeters = 1;
    } else if (sortBy === 'experience') {
      sortOptions.experienceYears = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.averageRating = sortOrder === 'asc' ? 1 : -1;
    }
    pipeline.push({ $sort: sortOptions });

    // Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    // Lookups for population
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          { $project: { firstName: 1, lastName: 1, username: 1, avatar: 1 } },
        ],
      },
    });
    pipeline.push({ $unwind: { path: '$user', preserveNullAndEmptyArrays: true } });

    pipeline.push({
      $lookup: {
        from: 'salons',
        localField: 'salon',
        foreignField: '_id',
        as: 'salon',
        pipeline: [
          { $project: { name: 1 } },
        ],
      },
    });
    pipeline.push({ $unwind: { path: '$salon', preserveNullAndEmptyArrays: true } });

    pipeline.push({
      $lookup: {
        from: 'cities',
        localField: 'city',
        foreignField: '_id',
        as: 'cityDoc',
        pipeline: [{ $project: { name: 1 } }],
      },
    });
    pipeline.push({ $unwind: { path: '$cityDoc', preserveNullAndEmptyArrays: true } });

    pipeline.push({
      $lookup: {
        from: 'areas',
        localField: 'area',
        foreignField: '_id',
        as: 'areaDoc',
        pipeline: [{ $project: { name: 1 } }],
      },
    });
    pipeline.push({ $unwind: { path: '$areaDoc', preserveNullAndEmptyArrays: true } });

    // Project final shape
    pipeline.push({
      $project: {
        id: '$_id',
        _id: 0,
        name: 1,
        avatar: 1,
        isVerified: 1,
        experience: '$experienceYears',
        averageRating: 1,
        reviewCount: '$totalReviews',
        specializations: 1,
        audience: 1,
        distanceInMeters: { $round: ['$distanceInMeters', 0] },
        location: {
          city: '$cityDoc.name',
          area: '$areaDoc.name',
        },
        services: 1,
        gallery: 1,
        user: 1,
        salon: 1,
      },
    });

    const providers = await ServiceProvider.aggregate(pipeline);

    // Get total count
    const countPipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: 'distanceInMeters',
          maxDistance: parseInt(radius),
          spherical: true,
          query: { isActive: true, isAvailable: true },
        },
      },
    ];
    if (Object.keys(matchFilters).length > 0) {
      countPipeline.push({ $match: matchFilters });
    }
    countPipeline.push({ $count: 'total' });

    const countResult = await ServiceProvider.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        data: providers,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasNextPage: skip + limitNum < total,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
    return;
  }

  // Non-geo query
  const query = { isActive: true, isAvailable: true };

  if (salon) query.salon = salon;
  if (specialization || serviceType) {
    query.specializations = specialization || serviceType;
  }
  if (homeService === 'true') query.providesHomeService = true;
  if (area) query.homeServiceAreas = area;
  if (audience) query.audience = audience;
  if (minRating) query.averageRating = { $gte: parseFloat(minRating) };

  // Sorting
  let sortOptions = {};
  if (sortBy === 'experience') {
    sortOptions.experienceYears = sortOrder === 'asc' ? 1 : -1;
  } else {
    sortOptions.averageRating = sortOrder === 'asc' ? 1 : -1;
  }

  // Build search pipeline
  if (search) {
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
      .populate('city', 'name')
      .populate('area', 'name')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    // Filter out null users (didn't match search)
    const filteredProviders = providers.filter((p) => p.user);

    res.json({
      success: true,
      data: {
        data: filteredProviders.map(formatProvider),
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total: filteredProviders.length,
          pages: 1,
          hasNextPage: false,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
    return;
  }

  const [providers, total] = await Promise.all([
    ServiceProvider.find(query)
      .populate('user', 'firstName lastName username avatar')
      .populate('salon', 'name')
      .populate('city', 'name')
      .populate('area', 'name')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum),
    ServiceProvider.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      data: providers.map(formatProvider),
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNextPage: skip + limitNum < total,
        hasPrevPage: parseInt(page) > 1,
      },
    },
  });
});

/**
 * Format provider for V1 response
 */
function formatProvider(provider) {
  const p = provider.toObject ? provider.toObject() : provider;
  return {
    id: p._id || p.id,
    name: p.name || p.user?.fullName || `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim(),
    avatar: p.avatar || p.user?.avatar,
    isVerified: p.isVerified,
    experience: p.experienceYears || p.experience,
    averageRating: p.averageRating || p.rating,
    reviewCount: p.totalReviews || p.reviewCount,
    specializations: p.specializations || (p.specialization ? [p.specialization] : []),
    audience: p.audience || [],
    services: p.services || [],
    gallery: p.gallery || [],
    location: {
      city: p.city?.name || null,
      area: p.area?.name || null,
    },
    user: p.user,
    salon: p.salon,
  };
}

/**
 * @desc    Get single provider
 * @route   GET /api/providers/:id
 * @access  Public
 */
export const getProvider = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findById(req.params.id)
    .populate('user', 'firstName lastName username email avatar')
    .populate('salon', 'name address rating coverImage')
    .populate('homeServiceAreas', 'name')
    .populate('city', 'name')
    .populate('area', 'name');

  if (!provider) {
    throw new ApiError(404, 'Provider not found');
  }

  const formattedProvider = {
    ...formatProvider(provider),
    bio: provider.bio,
    phone: provider.phone,
    homeServiceAreas: provider.homeServiceAreas,
    providesHomeService: provider.providesHomeService,
    homeServiceFee: provider.homeServiceFee,
  };

  res.json({
    success: true,
    data: { provider: formattedProvider },
  });
});

/**
 * @desc    Get provider reviews
 * @route   GET /api/providers/:id/reviews
 * @access  Public
 */
export const getProviderReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = Math.min(parseInt(limit), 50);

  const [reviews, total] = await Promise.all([
    ProviderReview.find({ provider: req.params.id })
      .populate('customer', 'firstName lastName username avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum),
    ProviderReview.countDocuments({ provider: req.params.id }),
  ]);

  res.json({
    success: true,
    data: {
      reviews,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNextPage: skip + limitNum < total,
        hasPrevPage: parseInt(page) > 1,
      },
    },
  });
});

/**
 * @desc    Get provider availability
 * @route   GET /api/providers/:id/availability
 * @access  Public
 */
export const getProviderAvailability = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const provider = await ServiceProvider.findById(req.params.id).select('availability');

  if (!provider) {
    throw new ApiError(404, 'Provider not found');
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // If date provided, get availability for that specific day
  if (date) {
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();
    const dayAvailability = provider.availability.find(a => a.dayOfWeek === dayOfWeek);

    if (!dayAvailability || !dayAvailability.isAvailable) {
      return res.json({
        success: true,
        data: {
          date,
          day: dayNames[dayOfWeek],
          isAvailable: false,
          slots: [],
        },
      });
    }

    // Generate time slots
    const slots = generateTimeSlots(dayAvailability.startTime, dayAvailability.endTime);

    return res.json({
      success: true,
      data: {
        date,
        day: dayNames[dayOfWeek],
        isAvailable: true,
        startTime: dayAvailability.startTime,
        endTime: dayAvailability.endTime,
        slots,
      },
    });
  }

  // Return full weekly availability
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

/**
 * Generate time slots from start to end time
 */
function generateTimeSlots(startTime, endTime, intervalMinutes = 30) {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let current = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

  while (current < end) {
    const hours = Math.floor(current / 60);
    const mins = current % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    current += intervalMinutes;
  }

  return slots;
}
