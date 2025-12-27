import { z } from 'zod';

/**
 * V1 Search Validation Schemas
 * 
 * These schemas validate query parameters for the search & discovery endpoints.
 */

// =====================
// COMMON ENUMS & TYPES
// =====================

const modeEnum = z.enum(['toSalon', 'toHome', 'both']).optional();
const audienceEnum = z.enum(['men', 'women', 'kids', 'unisex']).optional();

// Reusable pagination schema
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// =====================
// SALON SEARCH SCHEMA
// =====================

/**
 * Salon Search Query Parameters
 * 
 * @example
 * GET /api/salons?lat=12.9716&lng=77.5946&radius=5000&mode=toHome&audience=women
 * GET /api/salons?q=Looks%20Salon&cityId=507f1f77bcf86cd799439011
 * GET /api/salons?cityId=...&minRating=4&sortBy=rating&sortOrder=desc
 */
export const salonSearchSchema = z.object({
  // Location-based search
  lat: z.coerce.number().min(-90).max(90).optional()
    .describe('Latitude for geo search (-90 to 90)'),
  lng: z.coerce.number().min(-180).max(180).optional()
    .describe('Longitude for geo search (-180 to 180)'),
  radius: z.coerce.number().min(100).max(20000).default(5000)
    .describe('Search radius in meters (100-20000, default 5000)'),
  
  // City/Area based search
  cityId: z.string().optional()
    .describe('Filter by city ID'),
  areaId: z.string().optional()
    .describe('Filter by area ID'),
  
  // Text search
  q: z.string().max(200).optional()
    .describe('Free text search query (salon name, tags, address)'),
  
  // Category filters
  mode: modeEnum
    .describe('Service mode: toSalon, toHome, or both'),
  audience: audienceEnum
    .describe('Target audience: men, women, kids, or unisex'),
  
  // Rating filters
  minRating: z.coerce.number().min(0).max(5).optional()
    .describe('Minimum average rating (0-5)'),
  maxRating: z.coerce.number().min(0).max(5).optional()
    .describe('Maximum average rating (0-5)'),
  
  // Price level filters
  minPriceLevel: z.coerce.number().int().min(1).max(4).optional()
    .describe('Minimum price level (1-4)'),
  maxPriceLevel: z.coerce.number().int().min(1).max(4).optional()
    .describe('Maximum price level (1-4)'),
  
  // Feature filters (existing, kept for backward compatibility)
  hasParking: z.coerce.boolean().optional(),
  hasWifi: z.coerce.boolean().optional(),
  hasAc: z.coerce.boolean().optional(),
  serviceType: z.string().optional()
    .describe('Filter by service type slug'),
  
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  
  // Sorting
  sortBy: z.enum(['distance', 'rating', 'price', 'popular', 'name']).default('popular')
    .describe('Sort field'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
    .describe('Sort order'),
}).refine(
  // If lat is provided, lng must also be provided
  (data) => {
    if (data.lat !== undefined && data.lng === undefined) return false;
    if (data.lng !== undefined && data.lat === undefined) return false;
    return true;
  },
  { message: 'Both lat and lng must be provided for geo search' }
).refine(
  // minRating must be <= maxRating if both are provided
  (data) => {
    if (data.minRating !== undefined && data.maxRating !== undefined) {
      return data.minRating <= data.maxRating;
    }
    return true;
  },
  { message: 'minRating must be less than or equal to maxRating' }
).refine(
  // minPriceLevel must be <= maxPriceLevel if both are provided
  (data) => {
    if (data.minPriceLevel !== undefined && data.maxPriceLevel !== undefined) {
      return data.minPriceLevel <= data.maxPriceLevel;
    }
    return true;
  },
  { message: 'minPriceLevel must be less than or equal to maxPriceLevel' }
);

// =====================
// SERVICE SEARCH SCHEMA
// =====================

/**
 * Service Search Query Parameters
 * 
 * @example
 * GET /api/services?q=haircut&mode=toSalon&audience=men&minPrice=200&maxPrice=800
 * GET /api/services?salonId=...&categoryId=...
 */
export const serviceSearchSchema = z.object({
  // Text search
  q: z.string().max(200).optional()
    .describe('Free text search query (service name, description)'),
  
  // Category filters
  mode: modeEnum
    .describe('Service mode: toSalon, toHome, or both'),
  audience: audienceEnum
    .describe('Target audience: men, women, kids, or unisex'),
  
  // Relation filters
  salonId: z.string().optional()
    .describe('Filter by salon ID'),
  categoryId: z.string().optional()
    .describe('Filter by service category ID'),
  typeId: z.string().optional()
    .describe('Filter by service type ID'),
  
  // Legacy filters (for backward compatibility)
  salon: z.string().optional(),
  category: z.string().optional()
    .describe('Filter by category slug'),
  type: z.string().optional()
    .describe('Filter by type slug'),
  
  // Price filters
  minPrice: z.coerce.number().min(0).optional()
    .describe('Minimum price'),
  maxPrice: z.coerce.number().min(0).optional()
    .describe('Maximum price'),
  
  // Other filters
  popular: z.coerce.boolean().optional()
    .describe('Filter popular services only'),
  
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  
  // Sorting
  sortBy: z.enum(['price', 'popular', 'name', 'newest']).default('price')
    .describe('Sort field'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
    .describe('Sort order'),
}).refine(
  // minPrice must be <= maxPrice if both are provided
  (data) => {
    if (data.minPrice !== undefined && data.maxPrice !== undefined) {
      return data.minPrice <= data.maxPrice;
    }
    return true;
  },
  { message: 'minPrice must be less than or equal to maxPrice' }
);

// =====================
// UNIFIED SEARCH SCHEMA
// =====================

/**
 * Unified Search Query Parameters
 * Searches across salons, services, and optionally providers
 * 
 * @example
 * GET /api/search?q=haircut&lat=12.9716&lng=77.5946&mode=toHome&type=salons
 */
export const unifiedSearchSchema = z.object({
  // Required: search query
  q: z.string().min(1).max(200)
    .describe('Search query text'),
  
  // Location-based search (optional)
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(100).max(20000).default(5000),
  
  // Filters
  mode: modeEnum,
  audience: audienceEnum,
  
  // Resource type filter
  type: z.enum(['salons', 'services', 'providers', 'all']).default('all')
    .describe('Resource type to search'),
  
  // Pagination (per resource type)
  limit: z.coerce.number().int().min(1).max(20).default(10),
}).refine(
  (data) => {
    if (data.lat !== undefined && data.lng === undefined) return false;
    if (data.lng !== undefined && data.lat === undefined) return false;
    return true;
  },
  { message: 'Both lat and lng must be provided for geo search' }
);

// =====================
// VALIDATION MIDDLEWARE HELPERS
// =====================

/**
 * Creates validation schema object for use with validate middleware
 */
export const validateSalonSearch = {
  query: salonSearchSchema,
};

export const validateServiceSearch = {
  query: serviceSearchSchema,
};

export const validateUnifiedSearch = {
  query: unifiedSearchSchema,
};

