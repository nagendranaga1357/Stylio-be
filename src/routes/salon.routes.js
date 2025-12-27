import { Router } from 'express';
import {
  getSalons,
  getSalon,
  getSalonServices,
  getSalonProviders,
  getSalonReviews,
  getSalonGallery,
  getNearbySalons,
} from '../controllers/salon.controller.js';
import { validate } from '../middleware/validate.js';
import { validateSalonSearch } from '../validations/search.validation.js';

const router = Router();

/**
 * @route   GET /api/salons
 * @desc    Get all salons with advanced search & filters (V1)
 * @access  Public
 * 
 * @query   {number} lat - Latitude for geo search (-90 to 90)
 * @query   {number} lng - Longitude for geo search (-180 to 180)
 * @query   {number} radius - Search radius in meters (default: 5000, max: 20000)
 * @query   {string} cityId - Filter by city ID
 * @query   {string} areaId - Filter by area ID
 * @query   {string} q - Free text search (salon name, tags, address)
 * @query   {string} mode - Service mode: toSalon | toHome | both
 * @query   {string} audience - Target audience: men | women | kids | unisex
 * @query   {number} minRating - Minimum average rating (0-5)
 * @query   {number} maxRating - Maximum average rating (0-5)
 * @query   {number} minPriceLevel - Minimum price level (1-4)
 * @query   {number} maxPriceLevel - Maximum price level (1-4)
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 20, max: 50)
 * @query   {string} sortBy - Sort field: distance | rating | price | popular | name
 * @query   {string} sortOrder - Sort order: asc | desc
 * 
 * @example GET /api/salons?lat=12.9716&lng=77.5946&radius=5000&mode=toHome&audience=women
 * @example GET /api/salons?q=Looks%20Salon&cityId=507f1f77bcf86cd799439011
 * @example GET /api/salons?cityId=...&minRating=4&sortBy=rating&sortOrder=desc
 */
router.get('/', validate(validateSalonSearch), getSalons);

/**
 * @route   GET /api/salons/nearby
 * @desc    Get nearby salons (quick geo search)
 * @access  Public
 * 
 * @example GET /api/salons/nearby?lat=12.9716&lng=77.5946&radius=3000&limit=10
 */
router.get('/nearby', getNearbySalons);

/**
 * @route   GET /api/salons/:id
 * @desc    Get single salon details
 * @access  Public
 */
router.get('/:id', getSalon);

/**
 * @route   GET /api/salons/:id/services
 * @desc    Get salon's services
 * @access  Public
 * 
 * @query   {string} category - Filter by category slug
 * @query   {string} mode - Filter by mode: toSalon | toHome
 * @query   {string} audience - Filter by audience: men | women | kids | unisex
 * @query   {number} minPrice - Minimum price
 * @query   {number} maxPrice - Maximum price
 */
router.get('/:id/services', getSalonServices);

/**
 * @route   GET /api/salons/:id/providers
 * @desc    Get salon's service providers
 * @access  Public
 */
router.get('/:id/providers', getSalonProviders);

/**
 * @route   GET /api/salons/:id/reviews
 * @desc    Get salon's reviews
 * @access  Public
 * 
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 */
router.get('/:id/reviews', getSalonReviews);

/**
 * @route   GET /api/salons/:id/gallery
 * @desc    Get salon's gallery images
 * @access  Public
 */
router.get('/:id/gallery', getSalonGallery);

export default router;
