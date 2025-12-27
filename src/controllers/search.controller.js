import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import Salon from '../models/Salon.js';
import { Service, ServiceType, ServiceCategory } from '../models/Service.js';
import ServiceProvider from '../models/Provider.js';
import {
  buildPaginationResponse,
  buildTextSearchFilter,
  buildServiceTextSearchFilter,
} from '../utils/searchHelpers.js';

/**
 * @desc    Unified search across salons, services, and providers
 * @route   GET /api/search
 * @access  Public
 * 
 * @example Search all resources:
 *   GET /api/search?q=haircut&lat=12.9716&lng=77.5946&mode=toHome
 * 
 * @example Search only salons:
 *   GET /api/search?q=style%20studio&type=salons
 * 
 * @example Search services near user:
 *   GET /api/search?q=manicure&lat=12.9716&lng=77.5946&radius=5000&type=services
 */
export const unifiedSearch = asyncHandler(async (req, res) => {
  const {
    q,
    lat,
    lng,
    radius = 5000,
    mode,
    audience,
    type = 'all',
    limit = 10,
  } = req.query;

  if (!q || q.trim().length === 0) {
    throw new ApiError(400, 'Search query (q) is required');
  }

  const isGeoSearch = lat !== undefined && lng !== undefined;
  const searchLimit = parseInt(limit);
  
  const results = {};

  // Prepare common filters
  const modeFilter = mode ? { mode: { $in: [mode, 'both'] } } : {};
  const audienceFilter = audience ? { audience: { $in: [audience, 'unisex'] } } : {};

  // =====================
  // SEARCH SALONS
  // =====================
  if (type === 'all' || type === 'salons') {
    let salonResults;

    if (isGeoSearch) {
      // Geo-based search with text filter
      const textFilter = buildTextSearchFilter(q);
      const matchFilter = {
        isActive: true,
        ...textFilter,
        ...modeFilter,
        ...audienceFilter,
      };

      salonResults = await Salon.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            distanceField: 'distanceInMeters',
            maxDistance: parseInt(radius),
            spherical: true,
            query: matchFilter,
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
          $lookup: {
            from: 'cities',
            localField: 'areaData.city',
            foreignField: '_id',
            as: 'cityData',
          },
        },
        { $unwind: { path: '$cityData', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            mode: 1,
            audience: 1,
            averageRating: 1,
            priceLevel: 1,
            thumbnailUrl: 1,
            coverImage: 1,
            address: 1,
            distanceInMeters: { $round: ['$distanceInMeters', 0] },
            city: { _id: '$cityData._id', name: '$cityData.name' },
            area: { _id: '$areaData._id', name: '$areaData.name' },
          },
        },
        { $limit: searchLimit },
      ]);
    } else {
      // Standard text search
      const textFilter = buildTextSearchFilter(q);
      const filter = {
        isActive: true,
        ...textFilter,
        ...modeFilter,
        ...audienceFilter,
      };

      salonResults = await Salon.find(filter)
        .populate('area', 'name')
        .populate('city', 'name')
        .select('name slug mode audience averageRating priceLevel thumbnailUrl coverImage address')
        .sort('-popularityScore')
        .limit(searchLimit)
        .lean();
    }

    results.salons = {
      data: salonResults.map(salon => ({
        id: salon._id,
        name: salon.name,
        slug: salon.slug,
        mode: salon.mode || 'toSalon',
        audience: salon.audience || [],
        averageRating: salon.averageRating || 0,
        priceLevel: salon.priceLevel || 2,
        thumbnailUrl: salon.thumbnailUrl || salon.coverImage,
        address: salon.address,
        distanceInMeters: salon.distanceInMeters,
        city: salon.city || salon.cityData,
        area: salon.area || salon.areaData,
      })),
      count: salonResults.length,
    };
  }

  // =====================
  // SEARCH SERVICES
  // =====================
  if (type === 'all' || type === 'services') {
    let serviceFilter = {
      isActive: true,
      ...buildServiceTextSearchFilter(q),
    };

    if (mode) {
      serviceFilter.mode = { $in: [mode, 'both'] };
    }
    if (audience) {
      serviceFilter.audience = { $in: [audience, 'unisex'] };
    }

    // If geo search, filter by salons in radius
    if (isGeoSearch) {
      const nearbySalons = await Salon.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            distanceField: 'distance',
            maxDistance: parseInt(radius),
            spherical: true,
            query: { isActive: true },
          },
        },
        { $project: { _id: 1 } },
      ]);
      
      if (nearbySalons.length > 0) {
        serviceFilter.salon = { $in: nearbySalons.map(s => s._id) };
      } else {
        // No salons in radius, return empty
        serviceFilter._id = null;
      }
    }

    const serviceResults = await Service.find(serviceFilter)
      .populate('salon', 'name slug averageRating')
      .populate({
        path: 'serviceType',
        select: 'name slug',
        populate: { path: 'category', select: 'name slug' },
      })
      .select('name description price discountedPrice durationMinutes mode audience salon serviceType')
      .sort('price')
      .limit(searchLimit)
      .lean();

    results.services = {
      data: serviceResults.map(service => ({
        id: service._id,
        name: service.name,
        description: service.description,
        price: service.price,
        discountedPrice: service.discountedPrice,
        finalPrice: service.discountedPrice || service.price,
        durationMinutes: service.durationMinutes,
        mode: service.mode || 'toSalon',
        audience: service.audience || [],
        salon: service.salon,
        serviceType: service.serviceType,
      })),
      count: serviceResults.length,
    };
  }

  // =====================
  // SEARCH PROVIDERS
  // =====================
  if (type === 'all' || type === 'providers') {
    // Search providers by name (through User) or specialization
    const searchRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    let providerFilter = {
      isAvailable: true,
      $or: [
        { specialization: searchRegex },
        { bio: searchRegex },
      ],
    };

    // If geo search, filter by salons in radius
    if (isGeoSearch) {
      const nearbySalons = await Salon.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            distanceField: 'distance',
            maxDistance: parseInt(radius),
            spherical: true,
            query: { isActive: true },
          },
        },
        { $project: { _id: 1 } },
      ]);
      
      if (nearbySalons.length > 0) {
        providerFilter.salon = { $in: nearbySalons.map(s => s._id) };
      } else {
        providerFilter._id = null;
      }
    }

    const providerResults = await ServiceProvider.find(providerFilter)
      .populate('user', 'firstName lastName username avatar')
      .populate('salon', 'name slug')
      .select('user salon specialization rating experienceYears bio')
      .sort('-rating')
      .limit(searchLimit)
      .lean();

    // Also search by user name
    const userSearchResults = await ServiceProvider.find({
      isAvailable: true,
      ...(providerFilter.salon ? { salon: providerFilter.salon } : {}),
    })
      .populate({
        path: 'user',
        match: {
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { username: searchRegex },
          ],
        },
        select: 'firstName lastName username avatar',
      })
      .populate('salon', 'name slug')
      .select('user salon specialization rating experienceYears bio')
      .sort('-rating')
      .limit(searchLimit)
      .lean();

    // Merge and dedupe
    const allProviders = [...providerResults, ...userSearchResults.filter(p => p.user)];
    const uniqueProviders = Array.from(
      new Map(allProviders.filter(p => p.user).map(p => [p._id.toString(), p])).values()
    ).slice(0, searchLimit);

    results.providers = {
      data: uniqueProviders.map(provider => ({
        id: provider._id,
        user: provider.user,
        salon: provider.salon,
        specialization: provider.specialization,
        rating: provider.rating || 0,
        experienceYears: provider.experienceYears || 0,
        bio: provider.bio,
      })),
      count: uniqueProviders.length,
    };
  }

  res.json({
    success: true,
    query: q,
    filters: {
      mode,
      audience,
      location: isGeoSearch ? { lat: parseFloat(lat), lng: parseFloat(lng), radius: parseInt(radius) } : null,
    },
    data: results,
  });
});

/**
 * @desc    Get search suggestions (autocomplete)
 * @route   GET /api/search/suggestions
 * @access  Public
 * 
 * @example
 *   GET /api/search/suggestions?q=hair&limit=5
 */
export const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q, limit = 5 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.json({
      success: true,
      data: { suggestions: [] },
    });
  }

  const searchLimit = parseInt(limit);
  const searchRegex = new RegExp(`^${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');

  // Get suggestions from different sources
  const [salonSuggestions, serviceSuggestions, categorySuggestions] = await Promise.all([
    // Salon name suggestions
    Salon.find({ name: searchRegex, isActive: true })
      .select('name slug')
      .limit(searchLimit)
      .lean(),
    
    // Service name suggestions
    Service.find({ name: searchRegex, isActive: true })
      .select('name')
      .limit(searchLimit)
      .lean(),
    
    // Category/type suggestions
    ServiceCategory.find({ name: searchRegex, isActive: true })
      .select('name slug')
      .limit(searchLimit)
      .lean(),
  ]);

  const suggestions = [
    ...salonSuggestions.map(s => ({ type: 'salon', name: s.name, slug: s.slug })),
    ...serviceSuggestions.map(s => ({ type: 'service', name: s.name })),
    ...categorySuggestions.map(s => ({ type: 'category', name: s.name, slug: s.slug })),
  ].slice(0, searchLimit * 2);

  res.json({
    success: true,
    data: { 
      suggestions,
      query: q,
    },
  });
});

/**
 * @desc    Get trending searches
 * @route   GET /api/search/trending
 * @access  Public
 */
export const getTrendingSearches = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  // Get popular categories
  const popularCategories = await ServiceCategory.find({ isActive: true })
    .sort('order')
    .limit(parseInt(limit))
    .select('name slug icon')
    .lean();

  // Get popular services
  const popularServices = await Service.find({ isActive: true, isPopular: true })
    .select('name')
    .limit(parseInt(limit))
    .lean();

  // Get top-rated salons
  const topSalons = await Salon.find({ isActive: true })
    .sort('-averageRating -popularityScore')
    .limit(5)
    .select('name slug')
    .lean();

  res.json({
    success: true,
    data: {
      categories: popularCategories,
      popularServices: popularServices.map(s => s.name),
      topSalons: topSalons.map(s => ({ name: s.name, slug: s.slug })),
    },
  });
});

