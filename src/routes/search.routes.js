import { Router } from 'express';
import {
  unifiedSearch,
  getSearchSuggestions,
  getTrendingSearches,
} from '../controllers/search.controller.js';
import { validate } from '../middleware/validate.js';
import { validateUnifiedSearch } from '../validations/search.validation.js';

const router = Router();

/**
 * @route   GET /api/search
 * @desc    Unified search across salons, services, and providers
 * @access  Public
 * 
 * @query   {string} q - Search query (required)
 * @query   {number} lat - Latitude for geo search
 * @query   {number} lng - Longitude for geo search
 * @query   {number} radius - Search radius in meters (default: 5000)
 * @query   {string} mode - Filter by mode: toSalon | toHome | both
 * @query   {string} audience - Filter by audience: men | women | kids | unisex
 * @query   {string} type - Resource type: salons | services | providers | all (default: all)
 * @query   {number} limit - Results per resource type (default: 10, max: 20)
 * 
 * @example GET /api/search?q=haircut&lat=12.9716&lng=77.5946&mode=toHome
 * @example GET /api/search?q=style%20studio&type=salons
 * @example GET /api/search?q=manicure&lat=12.9716&lng=77.5946&radius=5000&type=services
 * 
 * @returns {Object} Search results with salons, services, and/or providers
 * {
 *   success: true,
 *   query: "haircut",
 *   filters: { mode: "toHome", audience: null, location: { lat, lng, radius } },
 *   data: {
 *     salons: { data: [...], count: 5 },
 *     services: { data: [...], count: 10 },
 *     providers: { data: [...], count: 3 }
 *   }
 * }
 */
router.get('/', validate(validateUnifiedSearch), unifiedSearch);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions (autocomplete)
 * @access  Public
 * 
 * @query   {string} q - Partial search query (min 2 characters)
 * @query   {number} limit - Number of suggestions (default: 5)
 * 
 * @example GET /api/search/suggestions?q=hair&limit=5
 * 
 * @returns {Object} Search suggestions
 * {
 *   success: true,
 *   data: {
 *     suggestions: [
 *       { type: "salon", name: "Hair Studio", slug: "hair-studio" },
 *       { type: "service", name: "Haircut" },
 *       { type: "category", name: "Hair Care", slug: "hair-care" }
 *     ],
 *     query: "hair"
 *   }
 * }
 */
router.get('/suggestions', getSearchSuggestions);

/**
 * @route   GET /api/search/trending
 * @desc    Get trending searches and popular items
 * @access  Public
 * 
 * @query   {number} limit - Number of items per category (default: 10)
 * 
 * @example GET /api/search/trending?limit=5
 * 
 * @returns {Object} Trending items
 * {
 *   success: true,
 *   data: {
 *     categories: [...],
 *     popularServices: ["Haircut", "Manicure", ...],
 *     topSalons: [{ name: "...", slug: "..." }, ...]
 *   }
 * }
 */
router.get('/trending', getTrendingSearches);

export default router;

