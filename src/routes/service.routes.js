import { Router } from 'express';
import {
  getCategories,
  getServiceTypes,
  getServices,
  getService,
  getPopularServices,
  searchServices,
} from '../controllers/service.controller.js';
import { validate } from '../middleware/validate.js';
import { validateServiceSearch } from '../validations/search.validation.js';

const router = Router();

/**
 * @route   GET /api/services/categories
 * @desc    Get all service categories
 * @access  Public
 * 
 * @query   {string} mode - Filter by mode for service counts
 * @query   {string} audience - Filter by audience for service counts
 */
router.get('/categories', getCategories);

/**
 * @route   GET /api/services/types
 * @desc    Get service types
 * @access  Public
 * 
 * @query   {string} category - Filter by category slug
 * @query   {string} mode - Filter by mode for service counts
 * @query   {string} audience - Filter by audience for service counts
 */
router.get('/types', getServiceTypes);

/**
 * @route   GET /api/services/popular
 * @desc    Get popular services
 * @access  Public
 * 
 * @query   {string} mode - Filter by mode
 * @query   {string} audience - Filter by audience
 * @query   {string} cityId - Filter by city
 * @query   {string} areaId - Filter by area
 * @query   {number} limit - Number of results (default: 10)
 */
router.get('/popular', getPopularServices);

/**
 * @route   GET /api/services/search
 * @desc    Search services with geo-filtering
 * @access  Public
 * 
 * @query   {string} q - Search query (required)
 * @query   {number} lat - Latitude for geo search
 * @query   {number} lng - Longitude for geo search
 * @query   {number} radius - Search radius in meters
 * @query   {string} mode - Filter by mode
 * @query   {string} audience - Filter by audience
 * @query   {number} minPrice - Minimum price
 * @query   {number} maxPrice - Maximum price
 * 
 * @example GET /api/services/search?q=haircut&lat=12.9716&lng=77.5946&radius=5000&mode=toHome
 */
router.get('/search', searchServices);

/**
 * @route   GET /api/services
 * @desc    Get all services with advanced search & filters (V1)
 * @access  Public
 * 
 * @query   {string} q - Free text search (service name, description)
 * @query   {string} mode - Service mode: toSalon | toHome | both
 * @query   {string} audience - Target audience: men | women | kids | unisex
 * @query   {string} salonId - Filter by salon ID
 * @query   {string} categoryId - Filter by category ID
 * @query   {string} typeId - Filter by service type ID
 * @query   {string} category - Filter by category slug (legacy)
 * @query   {string} type - Filter by type slug (legacy)
 * @query   {number} minPrice - Minimum price
 * @query   {number} maxPrice - Maximum price
 * @query   {boolean} popular - Filter popular services only
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 50, max: 100)
 * @query   {string} sortBy - Sort field: price | popular | name | newest
 * @query   {string} sortOrder - Sort order: asc | desc
 * 
 * @example GET /api/services?q=haircut&mode=toSalon&audience=men&minPrice=200&maxPrice=800
 * @example GET /api/services?salonId=...&categoryId=...
 */
router.get('/', validate(validateServiceSearch), getServices);

/**
 * @route   GET /api/services/:id
 * @desc    Get single service details
 * @access  Public
 */
router.get('/:id', getService);

export default router;
