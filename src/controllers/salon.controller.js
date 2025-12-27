import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import Salon from '../models/Salon.js';
import { Service, ServiceType, ServiceCategory } from '../models/Service.js';
import ServiceProvider from '../models/Provider.js';
import { SalonReview } from '../models/Review.js';
import { Area } from '../models/Location.js';
import {
  buildPaginationResponse,
  calculateSkip,
  buildSortObject,
  buildSalonFilter,
  buildSalonGeoSearchPipeline,
  buildTextSearchFilter,
  formatSalonResponse,
} from '../utils/searchHelpers.js';

/**
 * @desc    Get all salons with advanced search & filters (V1)
 * @route   GET /api/salons
 * @access  Public
 * 
 * @example Location-based search near user:
 *   GET /api/salons?lat=12.9716&lng=77.5946&radius=5000&mode=toHome&audience=women
 * 
 * @example Search by name with city filter:
 *   GET /api/salons?q=Looks%20Salon&cityId=507f1f77bcf86cd799439011
 * 
 * @example Filter with rating and price:
 *   GET /api/salons?cityId=...&minRating=4&minPriceLevel=2&sortBy=rating&sortOrder=desc
 * 
 * @example Pagination:
 *   GET /api/salons?page=2&limit=20&sortBy=popular
 */
export const getSalons = asyncHandler(async (req, res) => {
  const {
    // Location-based search
    lat,
    lng,
    radius = 5000,
    
    // City/Area based search
    cityId,
    areaId,
    city, // Legacy param
    area, // Legacy param
    
    // Text search
    q,
    search, // Legacy param
    
    // Category filters
    mode,
    audience,
    
    // Rating filters
    minRating,
    maxRating,
    
    // Price filters
    minPriceLevel,
    maxPriceLevel,
    
    // Feature filters (legacy)
    hasParking,
    hasWifi,
    hasAc,
    serviceType,
    
    // Pagination
    page = 1,
    limit = 20,
    
    // Sorting
    sortBy = 'popular',
    sortOrder = 'desc',
  } = req.query;

  // Determine if geo search is requested
  const isGeoSearch = lat !== undefined && lng !== undefined;
  const searchQuery = q || search;
  
  // Use effective cityId/areaId (support both new and legacy params)
  const effectiveCityId = cityId || city;
  const effectiveAreaId = areaId || area;

  // If geo search, use aggregation pipeline
  if (isGeoSearch) {
    const pipeline = buildSalonGeoSearchPipeline({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius: parseInt(radius),
      cityId: effectiveCityId,
      areaId: effectiveAreaId,
      mode,
      audience,
      minRating: minRating ? parseFloat(minRating) : undefined,
      maxRating: maxRating ? parseFloat(maxRating) : undefined,
      minPriceLevel: minPriceLevel ? parseInt(minPriceLevel) : undefined,
      maxPriceLevel: maxPriceLevel ? parseInt(maxPriceLevel) : undefined,
      hasParking: hasParking === 'true',
      hasWifi: hasWifi === 'true',
      hasAc: hasAc === 'true',
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
    });

    const [result] = await Salon.aggregate(pipeline);
    
    const salons = result?.data || [];
    const total = result?.totalCount?.[0]?.count || 0;

    return res.json({
      success: true,
      data: {
        salons: salons.map(formatSalonResponse),
        pagination: buildPaginationResponse(parseInt(page), parseInt(limit), total),
      },
    });
  }

  // Build standard query filter
  let filter = buildSalonFilter({
    cityId: effectiveCityId,
    areaId: effectiveAreaId,
    mode,
    audience,
    minRating: minRating ? parseFloat(minRating) : undefined,
    maxRating: maxRating ? parseFloat(maxRating) : undefined,
    minPriceLevel: minPriceLevel ? parseInt(minPriceLevel) : undefined,
    maxPriceLevel: maxPriceLevel ? parseInt(maxPriceLevel) : undefined,
    hasParking: hasParking === 'true',
    hasWifi: hasWifi === 'true',
    hasAc: hasAc === 'true',
  });

  // Handle cityId -> areaId lookup if only cityId provided (legacy behavior)
  if (effectiveCityId && !effectiveAreaId && !filter.city) {
    const areas = await Area.find({ city: effectiveCityId }).select('_id');
    filter.area = { $in: areas.map((a) => a._id) };
  }

  // Add text search filter
  if (searchQuery) {
    const textFilter = buildTextSearchFilter(searchQuery);
    filter = { ...filter, ...textFilter };
  }

  // Handle service type filter
  if (serviceType) {
    const type = await ServiceType.findOne({ slug: serviceType });
    if (type) {
      const services = await Service.find({ serviceType: type._id, isActive: true }).distinct('salon');
      filter._id = { $in: services };
    }
  }

  // Build sort object
  let sortObject;
  if (sortBy === 'popular') {
    sortObject = { popularityScore: sortOrder === 'asc' ? 1 : -1 };
  } else if (sortBy === 'rating') {
    sortObject = { averageRating: sortOrder === 'asc' ? 1 : -1 };
  } else if (sortBy === 'price') {
    sortObject = { priceLevel: sortOrder === 'asc' ? 1 : -1 };
  } else if (sortBy === 'name') {
    sortObject = { name: sortOrder === 'asc' ? 1 : -1 };
  } else {
    // Legacy sort behavior
    sortObject = buildSortObject(sortBy, sortOrder);
  }

  // Execute query
  const skip = calculateSkip(parseInt(page), parseInt(limit));
  
  const [salonsRaw, total] = await Promise.all([
    Salon.find(filter)
      .populate('area', 'name city')
      .populate({ path: 'area', populate: { path: 'city', select: 'name' } })
      .populate('city', 'name')
      .sort(sortObject)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Salon.countDocuments(filter),
  ]);

  // Transform salons to include flat areaName and cityName
  const salons = salonsRaw.map((salon) => ({
    ...salon,
    id: salon._id,
    areaName: salon.area?.name || '',
    cityName: salon.city?.name || salon.area?.city?.name || '',
    averageRating: salon.averageRating || salon.rating || 0,
    mode: salon.mode || 'toSalon',
    audience: salon.audience || [],
    priceLevel: salon.priceLevel || 2,
    thumbnailUrl: salon.thumbnailUrl || salon.coverImage,
  }));

  res.json({
    success: true,
    data: {
      salons,
      pagination: buildPaginationResponse(parseInt(page), parseInt(limit), total),
    },
  });
});

/**
 * @desc    Get single salon
 * @route   GET /api/salons/:id
 * @access  Public
 */
export const getSalon = asyncHandler(async (req, res) => {
  const salon = await Salon.findById(req.params.id)
    .populate({
      path: 'area',
      populate: { path: 'city', select: 'name state' },
    })
    .populate('city', 'name state');

  if (!salon || !salon.isActive) {
    throw new ApiError(404, 'Salon not found');
  }

  // Get counts
  const [servicesCount, providersCount] = await Promise.all([
    Service.countDocuments({ salon: salon._id, isActive: true }),
    ServiceProvider.countDocuments({ salon: salon._id, isAvailable: true }),
  ]);

  // Get available service modes and audiences
  const serviceStats = await Service.aggregate([
    { $match: { salon: salon._id, isActive: true } },
    {
      $group: {
        _id: null,
        modes: { $addToSet: '$mode' },
        audiences: { $addToSet: '$audience' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
  ]);

  const stats = serviceStats[0] || {
    modes: [],
    audiences: [],
    minPrice: null,
    maxPrice: null,
  };

  res.json({
    success: true,
    data: {
      salon: {
        ...salon.toJSON(),
        servicesCount,
        providersCount,
        areaName: salon.area?.name || '',
        cityName: salon.city?.name || salon.area?.city?.name || '',
        serviceModes: stats.modes,
        serviceAudiences: [...new Set(stats.audiences.flat())],
        priceRange: {
          min: stats.minPrice,
          max: stats.maxPrice,
        },
      },
    },
  });
});

/**
 * @desc    Get salon services
 * @route   GET /api/salons/:id/services
 * @access  Public
 */
export const getSalonServices = asyncHandler(async (req, res) => {
  const { category, mode, audience, minPrice, maxPrice } = req.query;

  const query = { salon: req.params.id, isActive: true };

  // Mode filter
  if (mode) {
    if (mode === 'both') {
      query.mode = { $in: ['both', 'toSalon', 'toHome'] };
    } else {
      query.mode = { $in: [mode, 'both'] };
    }
  }

  // Audience filter
  if (audience) {
    query.audience = { $in: [audience, 'unisex'] };
  }

  // Price filters
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Category filter
  if (category) {
    const cat = await ServiceCategory.findOne({ slug: category });
    if (cat) {
      const types = await ServiceType.find({ category: cat._id }).select('_id');
      query.serviceType = { $in: types.map((t) => t._id) };
    }
  }

  const services = await Service.find(query)
    .populate('serviceType', 'name slug category')
    .populate({ path: 'serviceType', populate: { path: 'category', select: 'name slug' } })
    .sort('price');

  // Group services by mode for easy display
  const groupedByMode = {
    toSalon: services.filter(s => s.mode === 'toSalon' || s.mode === 'both'),
    toHome: services.filter(s => s.mode === 'toHome' || s.mode === 'both'),
  };

  res.json({
    success: true,
    data: { 
      services,
      groupedByMode,
      count: services.length,
    },
  });
});

/**
 * @desc    Get salon providers
 * @route   GET /api/salons/:id/providers
 * @access  Public
 */
export const getSalonProviders = asyncHandler(async (req, res) => {
  const { mode, audience } = req.query;
  
  const query = {
    salon: req.params.id,
    isAvailable: true,
  };

  // Filter providers by specialization/services if needed
  // This would require additional logic based on provider's services

  const providers = await ServiceProvider.find(query)
    .populate('user', 'firstName lastName username avatar')
    .sort('-rating');

  res.json({
    success: true,
    data: { 
      providers,
      count: providers.length,
    },
  });
});

/**
 * @desc    Get salon reviews
 * @route   GET /api/salons/:id/reviews
 * @access  Public
 */
export const getSalonReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sortBy = '-createdAt' } = req.query;
  
  const skip = calculateSkip(parseInt(page), parseInt(limit));
  
  const [reviews, total] = await Promise.all([
    SalonReview.find({ salon: req.params.id })
      .populate('customer', 'firstName lastName username avatar')
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit)),
    SalonReview.countDocuments({ salon: req.params.id }),
  ]);

  // Calculate rating distribution
  const ratingDistribution = await SalonReview.aggregate([
    { $match: { salon: req.params.id } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  res.json({
    success: true,
    data: { 
      reviews,
      ratingDistribution,
      pagination: buildPaginationResponse(parseInt(page), parseInt(limit), total),
    },
  });
});

/**
 * @desc    Get salon gallery
 * @route   GET /api/salons/:id/gallery
 * @access  Public
 */
export const getSalonGallery = asyncHandler(async (req, res) => {
  const salon = await Salon.findById(req.params.id).select('galleryImages coverImage logo');

  if (!salon) {
    throw new ApiError(404, 'Salon not found');
  }

  res.json({
    success: true,
    data: { 
      images: salon.galleryImages,
      coverImage: salon.coverImage,
      logo: salon.logo,
    },
  });
});

/**
 * @desc    Get nearby salons
 * @route   GET /api/salons/nearby
 * @access  Public
 * 
 * @example
 *   GET /api/salons/nearby?lat=12.9716&lng=77.5946&radius=3000&limit=10
 */
export const getNearbySalons = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5000, limit = 10, mode, audience } = req.query;

  if (!lat || !lng) {
    throw new ApiError(400, 'Latitude and longitude are required');
  }

  const filter = { isActive: true };
  
  if (mode) {
    filter.mode = { $in: [mode, 'both'] };
  }
  if (audience) {
    filter.audience = { $in: [audience, 'unisex'] };
  }

  const salons = await Salon.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        distanceField: 'distanceInMeters',
        maxDistance: parseInt(radius),
        spherical: true,
        query: filter,
      },
    },
    {
      $lookup: {
        from: 'areas',
        localField: 'area',
        foreignField: '_id',
        as: 'areaData',
      },
    },
    { $unwind: { path: '$areaData', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        mode: 1,
        audience: 1,
        averageRating: 1,
        rating: 1,
        priceLevel: 1,
        thumbnailUrl: 1,
        coverImage: 1,
        distanceInMeters: { $round: ['$distanceInMeters', 0] },
        areaName: '$areaData.name',
      },
    },
    { $limit: parseInt(limit) },
  ]);

  res.json({
    success: true,
    data: {
      salons: salons.map(s => ({
        ...s,
        id: s._id,
        thumbnailUrl: s.thumbnailUrl || s.coverImage,
        averageRating: s.averageRating || s.rating || 0,
      })),
    },
  });
});
