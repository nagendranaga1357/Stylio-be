import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { City, Area } from '../models/Location.js';
import Salon from '../models/Salon.js';

/**
 * @desc    Get all cities
 * @route   GET /api/cities
 * @access  Public
 */
export const getCities = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const query = { isActive: true };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { state: { $regex: search, $options: 'i' } },
    ];
  }

  const cities = await City.find(query).sort('name');

  // Add salon count for each city
  const citiesWithCount = await Promise.all(
    cities.map(async (city) => {
      const areas = await Area.find({ city: city._id }).select('_id');
      const salonCount = await Salon.countDocuments({
        area: { $in: areas.map((a) => a._id) },
        isActive: true,
      });
      return {
        ...city.toJSON(),
        salonCount,
      };
    })
  );

  res.json({
    success: true,
    data: { cities: citiesWithCount },
  });
});

/**
 * @desc    Get single city
 * @route   GET /api/cities/:id
 * @access  Public
 */
export const getCity = asyncHandler(async (req, res) => {
  const city = await City.findById(req.params.id);

  if (!city || !city.isActive) {
    throw new ApiError(404, 'City not found');
  }

  res.json({
    success: true,
    data: { city },
  });
});

/**
 * @desc    Get all areas
 * @route   GET /api/areas
 * @access  Public
 */
export const getAreas = asyncHandler(async (req, res) => {
  const { city, search } = req.query;

  const query = { isActive: true };

  if (city) {
    query.city = city;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { pincode: { $regex: search, $options: 'i' } },
    ];
  }

  const areas = await Area.find(query)
    .populate('city', 'name')
    .sort('name');

  // Add salon count
  const areasWithCount = await Promise.all(
    areas.map(async (area) => {
      const salonCount = await Salon.countDocuments({
        area: area._id,
        isActive: true,
      });
      return {
        ...area.toJSON(),
        salonCount,
      };
    })
  );

  res.json({
    success: true,
    data: { areas: areasWithCount },
  });
});

/**
 * @desc    Get single area
 * @route   GET /api/areas/:id
 * @access  Public
 */
export const getArea = asyncHandler(async (req, res) => {
  const area = await Area.findById(req.params.id).populate('city', 'name state');

  if (!area || !area.isActive) {
    throw new ApiError(404, 'Area not found');
  }

  res.json({
    success: true,
    data: { area },
  });
});

