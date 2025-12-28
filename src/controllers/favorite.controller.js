import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import Favorite from '../models/Favorite.js';

/**
 * @desc    Get user's favorites
 * @route   GET /api/favorites
 * @access  Private
 */
export const getFavorites = asyncHandler(async (req, res) => {
  const favorites = await Favorite.find({ user: req.user._id })
    .populate({
      path: 'salon',
      select: 'name address coverImage thumbnailUrl rating averageRating totalReviews openingTime closingTime mode audience priceLevel',
      populate: {
        path: 'area',
        select: 'name',
        populate: { path: 'city', select: 'name' },
      },
    })
    .sort('-createdAt');

  // V1: Format favorites response with salon details
  const formattedFavorites = favorites.map((fav) => ({
    id: fav._id,
    salon: fav.salon ? {
      id: fav.salon._id,
      name: fav.salon.name,
      thumbnailUrl: fav.salon.thumbnailUrl || fav.salon.coverImage,
      averageRating: fav.salon.averageRating || fav.salon.rating || 0,
      mode: fav.salon.mode || 'toSalon',
      priceLevel: fav.salon.priceLevel || 2,
      address: fav.salon.address,
      areaName: fav.salon.area?.name,
      cityName: fav.salon.area?.city?.name,
    } : null,
    createdAt: fav.createdAt,
  }));

  res.json({
    success: true,
    data: { favorites: formattedFavorites },
  });
});

/**
 * @desc    Add to favorites
 * @route   POST /api/favorites
 * @access  Private
 */
export const addFavorite = asyncHandler(async (req, res) => {
  const { salon } = req.body;

  if (!salon) {
    throw new ApiError(400, 'Salon ID is required');
  }

  // Check if already favorited
  const existing = await Favorite.findOne({ user: req.user._id, salon });
  if (existing) {
    throw new ApiError(400, 'Salon is already in favorites');
  }

  const favorite = await Favorite.create({
    user: req.user._id,
    salon,
  });

  res.status(201).json({
    success: true,
    message: 'Added to favorites',
    data: { favorite },
  });
});

/**
 * @desc    Remove from favorites by favorite ID
 * @route   DELETE /api/favorites/:id
 * @access  Private
 */
export const removeFavorite = asyncHandler(async (req, res) => {
  const favorite = await Favorite.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!favorite) {
    throw new ApiError(404, 'Favorite not found');
  }

  res.json({
    success: true,
    message: 'Removed from favorites',
  });
});

/**
 * @desc    Remove from favorites by salon ID
 * @route   DELETE /api/favorites/salon/:salonId
 * @access  Private
 */
export const removeFavoriteBySalonId = asyncHandler(async (req, res) => {
  const { salonId } = req.params;

  const favorite = await Favorite.findOneAndDelete({
    salon: salonId,
    user: req.user._id,
  });

  if (!favorite) {
    throw new ApiError(404, 'Favorite not found');
  }

  res.json({
    success: true,
    message: 'Removed from favorites',
    data: { isFavorite: false },
  });
});

/**
 * @desc    Toggle favorite
 * @route   POST /api/favorites/toggle
 * @access  Private
 */
export const toggleFavorite = asyncHandler(async (req, res) => {
  const { salon } = req.body;

  if (!salon) {
    throw new ApiError(400, 'Salon ID is required');
  }

  const existing = await Favorite.findOne({ user: req.user._id, salon });

  if (existing) {
    await existing.deleteOne();
    res.json({
      success: true,
      message: 'Removed from favorites',
      data: { isFavorite: false },
    });
  } else {
    await Favorite.create({ user: req.user._id, salon });
    res.json({
      success: true,
      message: 'Added to favorites',
      data: { isFavorite: true },
    });
  }
});

/**
 * @desc    Check if salon is in favorites
 * @route   GET /api/favorites/check/:salonId
 * @access  Private
 */
export const checkFavorite = asyncHandler(async (req, res) => {
  const { salonId } = req.params;

  if (!salonId) {
    throw new ApiError(400, 'Salon ID is required');
  }

  const favorite = await Favorite.findOne({ 
    user: req.user._id, 
    salon: salonId 
  });

  res.json({
    success: true,
    data: { isFavorite: !!favorite },
  });
});

