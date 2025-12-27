/**
 * V1 Search Helper Utilities
 * 
 * Centralized query-building logic for search & discovery features.
 * Keeps controllers clean and promotes code reuse.
 */

import mongoose from 'mongoose';

// =====================
// PAGINATION HELPER
// =====================

/**
 * Build pagination response object
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total item count
 * @returns {Object} Pagination metadata
 */
export const buildPaginationResponse = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Calculate skip value for pagination
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {number} Number of documents to skip
 */
export const calculateSkip = (page, limit) => (page - 1) * limit;

// =====================
// SORT BUILDER
// =====================

/**
 * Build sort object for MongoDB queries
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - 'asc' or 'desc'
 * @param {Object} fieldMapping - Maps sort field names to actual DB fields
 * @returns {Object} MongoDB sort object
 */
export const buildSortObject = (sortBy, sortOrder, fieldMapping = {}) => {
  const defaultMapping = {
    rating: 'averageRating',
    price: 'priceLevel',
    popular: 'popularityScore',
    name: 'name',
    distance: 'distance', // Used with $geoNear
    newest: 'createdAt',
  };

  const mapping = { ...defaultMapping, ...fieldMapping };
  const field = mapping[sortBy] || sortBy;
  const order = sortOrder === 'asc' ? 1 : -1;

  return { [field]: order };
};

// =====================
// FILTER BUILDERS
// =====================

/**
 * Build base filter object for salons
 * @param {Object} params - Query parameters
 * @returns {Object} MongoDB filter object
 */
export const buildSalonFilter = (params) => {
  const {
    cityId,
    areaId,
    mode,
    audience,
    minRating,
    maxRating,
    minPriceLevel,
    maxPriceLevel,
    hasParking,
    hasWifi,
    hasAc,
  } = params;

  const filter = { isActive: true };

  // Location filters
  if (areaId) {
    filter.area = new mongoose.Types.ObjectId(areaId);
  }
  if (cityId) {
    filter.city = new mongoose.Types.ObjectId(cityId);
  }

  // Mode filter
  if (mode) {
    if (mode === 'both') {
      filter.mode = { $in: ['both', 'toSalon', 'toHome'] };
    } else {
      filter.mode = { $in: [mode, 'both'] };
    }
  }

  // Audience filter
  if (audience) {
    // Match if salon serves this audience or is unisex
    filter.audience = { $in: [audience, 'unisex'] };
  }

  // Rating filters
  if (minRating !== undefined || maxRating !== undefined) {
    filter.averageRating = {};
    if (minRating !== undefined) filter.averageRating.$gte = minRating;
    if (maxRating !== undefined) filter.averageRating.$lte = maxRating;
  }

  // Price level filters
  if (minPriceLevel !== undefined || maxPriceLevel !== undefined) {
    filter.priceLevel = {};
    if (minPriceLevel !== undefined) filter.priceLevel.$gte = minPriceLevel;
    if (maxPriceLevel !== undefined) filter.priceLevel.$lte = maxPriceLevel;
  }

  // Feature filters
  if (hasParking) filter['features.hasParking'] = true;
  if (hasWifi) filter['features.hasWifi'] = true;
  if (hasAc) filter['features.hasAc'] = true;

  return filter;
};

/**
 * Build base filter object for services
 * @param {Object} params - Query parameters
 * @returns {Object} MongoDB filter object
 */
export const buildServiceFilter = (params) => {
  const {
    salonId,
    salon,
    categoryId,
    typeId,
    mode,
    audience,
    minPrice,
    maxPrice,
    popular,
  } = params;

  const filter = { isActive: true };

  // Relation filters
  const effectiveSalonId = salonId || salon;
  if (effectiveSalonId) {
    filter.salon = new mongoose.Types.ObjectId(effectiveSalonId);
  }
  if (typeId) {
    filter.serviceType = new mongoose.Types.ObjectId(typeId);
  }

  // Mode filter
  if (mode) {
    if (mode === 'both') {
      filter.mode = { $in: ['both', 'toSalon', 'toHome'] };
    } else {
      filter.mode = { $in: [mode, 'both'] };
    }
  }

  // Audience filter
  if (audience) {
    filter.audience = { $in: [audience, 'unisex'] };
  }

  // Price filters
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  // Popular filter
  if (popular) {
    filter.isPopular = true;
  }

  return filter;
};

// =====================
// GEO QUERY BUILDERS
// =====================

/**
 * Build $geoNear aggregation stage
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Search radius in meters
 * @param {Object} matchFilter - Additional match conditions
 * @returns {Array} Aggregation pipeline stages
 */
export const buildGeoNearStage = (lat, lng, radius, matchFilter = {}) => {
  return {
    $geoNear: {
      near: {
        type: 'Point',
        coordinates: [lng, lat], // MongoDB uses [lng, lat] order
      },
      distanceField: 'distanceInMeters',
      maxDistance: radius,
      spherical: true,
      query: matchFilter,
    },
  };
};

/**
 * Build geo-based salon search aggregation pipeline
 * @param {Object} params - Search parameters
 * @returns {Array} Aggregation pipeline
 */
export const buildSalonGeoSearchPipeline = (params) => {
  const {
    lat,
    lng,
    radius = 5000,
    page = 1,
    limit = 20,
    sortBy = 'distance',
    sortOrder = 'asc',
    ...filterParams
  } = params;

  const filter = buildSalonFilter(filterParams);
  const pipeline = [];

  // Stage 1: Geo-near (must be first stage)
  pipeline.push(buildGeoNearStage(lat, lng, radius, filter));

  // Stage 2: Lookup area
  pipeline.push({
    $lookup: {
      from: 'areas',
      localField: 'area',
      foreignField: '_id',
      as: 'areaData',
    },
  });

  pipeline.push({
    $unwind: {
      path: '$areaData',
      preserveNullAndEmptyArrays: true,
    },
  });

  // Stage 3: Lookup city through area
  pipeline.push({
    $lookup: {
      from: 'cities',
      localField: 'areaData.city',
      foreignField: '_id',
      as: 'cityData',
    },
  });

  pipeline.push({
    $unwind: {
      path: '$cityData',
      preserveNullAndEmptyArrays: true,
    },
  });

  // Stage 4: Project final shape
  pipeline.push({
    $project: {
      _id: 1,
      id: '$_id',
      name: 1,
      slug: 1,
      mode: 1,
      audience: 1,
      averageRating: 1,
      rating: 1,
      priceLevel: 1,
      address: 1,
      thumbnailUrl: 1,
      coverImage: 1,
      logo: 1,
      location: 1,
      distanceInMeters: { $round: ['$distanceInMeters', 0] },
      city: {
        _id: '$cityData._id',
        name: '$cityData.name',
      },
      area: {
        _id: '$areaData._id',
        name: '$areaData.name',
      },
      features: 1,
      totalReviews: 1,
      popularityScore: 1,
    },
  });

  // Stage 5: Sort
  if (sortBy === 'distance') {
    pipeline.push({ $sort: { distanceInMeters: sortOrder === 'asc' ? 1 : -1 } });
  } else {
    const sortObject = buildSortObject(sortBy, sortOrder);
    pipeline.push({ $sort: sortObject });
  }

  // Stage 6: Facet for pagination
  pipeline.push({
    $facet: {
      data: [
        { $skip: calculateSkip(page, limit) },
        { $limit: limit },
      ],
      totalCount: [
        { $count: 'count' },
      ],
    },
  });

  return pipeline;
};

// =====================
// TEXT SEARCH BUILDERS
// =====================

/**
 * Build text search filter
 * @param {string} query - Search query text
 * @param {boolean} useTextIndex - Whether to use MongoDB text index
 * @returns {Object} Search filter conditions
 */
export const buildTextSearchFilter = (query, useTextIndex = false) => {
  if (!query) return {};

  if (useTextIndex) {
    return {
      $text: { $search: query },
    };
  }

  // Fallback to regex search for more flexible matching
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return {
    $or: [
      { name: regex },
      { description: regex },
      { address: regex },
      { tags: regex },
    ],
  };
};

/**
 * Build text search filter for services
 * @param {string} query - Search query text
 * @returns {Object} Search filter conditions
 */
export const buildServiceTextSearchFilter = (query) => {
  if (!query) return {};

  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return {
    $or: [
      { name: regex },
      { description: regex },
      { tags: regex },
    ],
  };
};

// =====================
// RESPONSE FORMATTERS
// =====================

/**
 * Format salon data for API response
 * @param {Object} salon - Salon document
 * @returns {Object} Formatted salon object
 */
export const formatSalonResponse = (salon) => {
  const salonObj = salon.toJSON ? salon.toJSON() : salon;
  return {
    id: salonObj._id || salonObj.id,
    name: salonObj.name,
    slug: salonObj.slug,
    mode: salonObj.mode || 'toSalon',
    audience: salonObj.audience || [],
    averageRating: salonObj.averageRating || salonObj.rating || 0,
    priceLevel: salonObj.priceLevel || 2,
    address: salonObj.address,
    thumbnailUrl: salonObj.thumbnailUrl || salonObj.coverImage,
    distanceInMeters: salonObj.distanceInMeters,
    city: salonObj.city || salonObj.cityData || null,
    area: salonObj.area || salonObj.areaData || null,
    areaName: salonObj.areaName || salonObj.area?.name || '',
    cityName: salonObj.cityName || salonObj.city?.name || '',
    features: salonObj.features,
    totalReviews: salonObj.totalReviews || 0,
    location: salonObj.location,
  };
};

/**
 * Format service data for API response
 * @param {Object} service - Service document
 * @returns {Object} Formatted service object
 */
export const formatServiceResponse = (service) => {
  const serviceObj = service.toJSON ? service.toJSON() : service;
  return {
    id: serviceObj._id || serviceObj.id,
    name: serviceObj.name,
    description: serviceObj.description,
    mode: serviceObj.mode || 'toSalon',
    audience: serviceObj.audience || [],
    price: serviceObj.price,
    basePrice: serviceObj.basePrice || serviceObj.price,
    discountedPrice: serviceObj.discountedPrice,
    homeServicePrice: serviceObj.homeServicePrice,
    finalPrice: serviceObj.discountedPrice || serviceObj.price,
    durationMinutes: serviceObj.durationMinutes,
    salon: serviceObj.salon,
    serviceType: serviceObj.serviceType,
    isPopular: serviceObj.isPopular,
  };
};

