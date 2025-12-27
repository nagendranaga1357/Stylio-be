import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { ServiceCategory, ServiceType, Service } from '../models/Service.js';
import Salon from '../models/Salon.js';
import {
  buildPaginationResponse,
  calculateSkip,
  buildServiceFilter,
  buildServiceTextSearchFilter,
  formatServiceResponse,
} from '../utils/searchHelpers.js';

/**
 * @desc    Get all service categories
 * @route   GET /api/services/categories
 * @access  Public
 */
export const getCategories = asyncHandler(async (req, res) => {
  const { mode, audience } = req.query;
  
  const categories = await ServiceCategory.find({ isActive: true }).sort('order name');

  // Add service types count for each category
  // Optionally filter by mode/audience if provided
  const categoriesWithCount = await Promise.all(
    categories.map(async (cat) => {
      const typeQuery = { category: cat._id, isActive: true };
      const count = await ServiceType.countDocuments(typeQuery);
      
      // Get service count with mode/audience filter
      let serviceQuery = { isActive: true };
      if (mode) {
        serviceQuery.mode = { $in: [mode, 'both'] };
      }
      if (audience) {
        serviceQuery.audience = { $in: [audience, 'unisex'] };
      }
      
      const types = await ServiceType.find({ category: cat._id }).select('_id');
      serviceQuery.serviceType = { $in: types.map(t => t._id) };
      const servicesCount = await Service.countDocuments(serviceQuery);
      
      return {
        ...cat.toJSON(),
        serviceTypesCount: count,
        servicesCount,
      };
    })
  );

  res.json({
    success: true,
    data: { categories: categoriesWithCount },
  });
});

/**
 * @desc    Get service types
 * @route   GET /api/services/types
 * @access  Public
 */
export const getServiceTypes = asyncHandler(async (req, res) => {
  const { category, mode, audience } = req.query;

  const query = { isActive: true };

  if (category) {
    const cat = await ServiceCategory.findOne({ slug: category });
    if (cat) {
      query.category = cat._id;
    }
  }

  const types = await ServiceType.find(query)
    .populate('category', 'name slug')
    .sort('name');

  // Optionally enrich with service count filtered by mode/audience
  const typesWithCount = await Promise.all(
    types.map(async (type) => {
      let serviceQuery = { serviceType: type._id, isActive: true };
      if (mode) {
        serviceQuery.mode = { $in: [mode, 'both'] };
      }
      if (audience) {
        serviceQuery.audience = { $in: [audience, 'unisex'] };
      }
      const count = await Service.countDocuments(serviceQuery);
      return {
        ...type.toJSON(),
        servicesCount: count,
      };
    })
  );

  res.json({
    success: true,
    data: { types: typesWithCount },
  });
});

/**
 * @desc    Get all services with advanced search & filters (V1)
 * @route   GET /api/services
 * @access  Public
 * 
 * @example Search with text and filters:
 *   GET /api/services?q=haircut&mode=toSalon&audience=men&minPrice=200&maxPrice=800
 * 
 * @example Filter by salon and category:
 *   GET /api/services?salonId=...&categoryId=...
 * 
 * @example Pagination and sorting:
 *   GET /api/services?page=1&limit=20&sortBy=price&sortOrder=asc
 */
export const getServices = asyncHandler(async (req, res) => {
  const {
    // Text search
    q,
    search, // Legacy param
    
    // Category filters
    mode,
    audience,
    
    // Relation filters
    salonId,
    salon, // Legacy param
    categoryId,
    category, // Legacy param (slug)
    typeId,
    type, // Legacy param (slug)
    
    // Price filters
    minPrice,
    maxPrice,
    
    // Other filters
    popular,
    
    // Pagination
    page = 1,
    limit = 50,
    
    // Sorting
    sortBy = 'price',
    sortOrder = 'asc',
  } = req.query;

  // Build base filter
  let filter = buildServiceFilter({
    salonId: salonId || salon,
    mode,
    audience,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    popular: popular === 'true',
  });

  // Handle type filter (by ID or slug)
  if (typeId) {
    filter.serviceType = typeId;
  } else if (type) {
    const serviceType = await ServiceType.findOne({ slug: type });
    if (serviceType) {
      filter.serviceType = serviceType._id;
    }
  }
  
  // Handle category filter (by ID or slug)
  if (!filter.serviceType && (categoryId || category)) {
    let cat;
    if (categoryId) {
      cat = await ServiceCategory.findById(categoryId);
    } else {
      cat = await ServiceCategory.findOne({ slug: category });
    }
    if (cat) {
      const types = await ServiceType.find({ category: cat._id }).select('_id');
      filter.serviceType = { $in: types.map((t) => t._id) };
    }
  }

  // Add text search filter
  const searchQuery = q || search;
  if (searchQuery) {
    const textFilter = buildServiceTextSearchFilter(searchQuery);
    filter = { ...filter, ...textFilter };
  }

  // Build sort object
  let sortObject;
  if (sortBy === 'price') {
    sortObject = { price: sortOrder === 'asc' ? 1 : -1 };
  } else if (sortBy === 'popular') {
    sortObject = { bookingCount: -1, isPopular: -1 };
  } else if (sortBy === 'name') {
    sortObject = { name: sortOrder === 'asc' ? 1 : -1 };
  } else if (sortBy === 'newest') {
    sortObject = { createdAt: -1 };
  } else {
    sortObject = { price: 1 };
  }

  const skip = calculateSkip(parseInt(page), parseInt(limit));

  const [services, total] = await Promise.all([
    Service.find(filter)
      .populate('salon', 'name slug averageRating priceLevel mode audience')
      .populate({
        path: 'serviceType',
        select: 'name slug',
        populate: { path: 'category', select: 'name slug' },
      })
      .sort(sortObject)
      .skip(skip)
      .limit(parseInt(limit)),
    Service.countDocuments(filter),
  ]);

  // Format response
  const formattedServices = services.map(service => {
    const serviceObj = service.toJSON();
    return {
      ...serviceObj,
      id: serviceObj._id,
      finalPrice: serviceObj.discountedPrice || serviceObj.price,
      mode: serviceObj.mode || 'toSalon',
      audience: serviceObj.audience || [],
    };
  });

  res.json({
    success: true,
    data: {
      services: formattedServices,
      pagination: buildPaginationResponse(parseInt(page), parseInt(limit), total),
    },
  });
});

/**
 * @desc    Get single service
 * @route   GET /api/services/:id
 * @access  Public
 */
export const getService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id)
    .populate('salon', 'name slug address averageRating priceLevel mode audience location area')
    .populate({
      path: 'salon',
      populate: { 
        path: 'area', 
        select: 'name',
        populate: { path: 'city', select: 'name' }
      }
    })
    .populate({
      path: 'serviceType',
      populate: { path: 'category', select: 'name slug' },
    });

  if (!service || !service.isActive) {
    throw new ApiError(404, 'Service not found');
  }

  // Get related services (same type, different salons)
  const relatedServices = await Service.find({
    serviceType: service.serviceType._id,
    salon: { $ne: service.salon._id },
    isActive: true,
  })
    .populate('salon', 'name averageRating')
    .limit(5)
    .sort('price');

  res.json({
    success: true,
    data: { 
      service: {
        ...service.toJSON(),
        id: service._id,
        finalPrice: service.discountedPrice || service.price,
        mode: service.mode || 'toSalon',
        audience: service.audience || [],
      },
      relatedServices: relatedServices.map(s => ({
        ...s.toJSON(),
        id: s._id,
        finalPrice: s.discountedPrice || s.price,
      })),
    },
  });
});

/**
 * @desc    Get popular services
 * @route   GET /api/services/popular
 * @access  Public
 */
export const getPopularServices = asyncHandler(async (req, res) => {
  const { mode, audience, limit = 10, cityId, areaId } = req.query;

  const filter = { isActive: true, isPopular: true };
  
  if (mode) {
    filter.mode = { $in: [mode, 'both'] };
  }
  if (audience) {
    filter.audience = { $in: [audience, 'unisex'] };
  }

  // If location filter, first get salons in that location
  if (cityId || areaId) {
    const salonFilter = { isActive: true };
    if (areaId) {
      salonFilter.area = areaId;
    } else if (cityId) {
      salonFilter.city = cityId;
    }
    const salonIds = await Salon.find(salonFilter).distinct('_id');
    filter.salon = { $in: salonIds };
  }

  const services = await Service.find(filter)
    .populate('salon', 'name slug averageRating')
    .populate({
      path: 'serviceType',
      select: 'name slug',
      populate: { path: 'category', select: 'name slug' },
    })
    .sort('-bookingCount -isPopular')
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: {
      services: services.map(s => ({
        ...s.toJSON(),
        id: s._id,
        finalPrice: s.discountedPrice || s.price,
        mode: s.mode || 'toSalon',
        audience: s.audience || [],
      })),
    },
  });
});

/**
 * @desc    Search services with geo-filtering
 * @route   GET /api/services/search
 * @access  Public
 * 
 * @example
 *   GET /api/services/search?q=haircut&lat=12.9716&lng=77.5946&radius=5000&mode=toHome
 */
export const searchServices = asyncHandler(async (req, res) => {
  const {
    q,
    lat,
    lng,
    radius = 5000,
    mode,
    audience,
    minPrice,
    maxPrice,
    page = 1,
    limit = 20,
  } = req.query;

  if (!q) {
    throw new ApiError(400, 'Search query is required');
  }

  // If geo search, first find salons in radius
  let salonIds = null;
  if (lat && lng) {
    const salonFilter = { isActive: true };
    if (mode) salonFilter.mode = { $in: [mode, 'both'] };
    
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
          query: salonFilter,
        },
      },
      { $project: { _id: 1 } },
    ]);
    
    salonIds = nearbySalons.map(s => s._id);
  }

  // Build service filter
  const filter = { isActive: true };
  
  if (salonIds) {
    filter.salon = { $in: salonIds };
  }
  
  if (mode) {
    filter.mode = { $in: [mode, 'both'] };
  }
  if (audience) {
    filter.audience = { $in: [audience, 'unisex'] };
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  // Text search
  const textFilter = buildServiceTextSearchFilter(q);
  Object.assign(filter, textFilter);

  const skip = calculateSkip(parseInt(page), parseInt(limit));

  const [services, total] = await Promise.all([
    Service.find(filter)
      .populate('salon', 'name slug averageRating location')
      .populate({
        path: 'serviceType',
        select: 'name slug',
        populate: { path: 'category', select: 'name' },
      })
      .sort('price')
      .skip(skip)
      .limit(parseInt(limit)),
    Service.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      services: services.map(s => ({
        ...s.toJSON(),
        id: s._id,
        finalPrice: s.discountedPrice || s.price,
        mode: s.mode || 'toSalon',
        audience: s.audience || [],
      })),
      pagination: buildPaginationResponse(parseInt(page), parseInt(limit), total),
    },
  });
});
