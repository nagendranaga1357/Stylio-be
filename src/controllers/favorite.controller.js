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
      select: 'name address coverImage rating totalReviews openingTime closingTime',
      populate: {
        path: 'area',
        select: 'name',
        populate: { path: 'city', select: 'name' },
      },
    })
    .sort('-createdAt');

  res.json({
    success: true,
    data: { favorites },
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
 * @desc    Remove from favorites
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

