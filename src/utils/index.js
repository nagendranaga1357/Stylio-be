/**
 * V1 Utility Functions
 * 
 * Central export for all utility functions.
 */

export {
  // Pagination
  buildPaginationResponse,
  calculateSkip,
  
  // Sorting
  buildSortObject,
  
  // Filter builders
  buildSalonFilter,
  buildServiceFilter,
  
  // Geo query builders
  buildGeoNearStage,
  buildSalonGeoSearchPipeline,
  
  // Text search builders
  buildTextSearchFilter,
  buildServiceTextSearchFilter,
  
  // Response formatters
  formatSalonResponse,
  formatServiceResponse,
} from './searchHelpers.js';

