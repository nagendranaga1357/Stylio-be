import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import PromoCode from '../models/PromoCode.js';

/**
 * @desc    Get active promo codes
 * @route   GET /api/promo-codes
 * @access  Public
 */
export const getPromoCodes = asyncHandler(async (req, res) => {
  const now = new Date();

  const promoCodes = await PromoCode.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  }).sort('-createdAt');

  res.json({
    success: true,
    data: { promoCodes },
  });
});

/**
 * @desc    Get promo code by code string
 * @route   GET /api/promo-codes/:code
 * @access  Public
 */
export const getPromoCode = asyncHandler(async (req, res) => {
  const promoCode = await PromoCode.findOne({
    code: req.params.code.toUpperCase(),
  });

  if (!promoCode) {
    throw new ApiError(404, 'Promo code not found');
  }

  res.json({
    success: true,
    data: { promoCode },
  });
});

/**
 * @desc    Validate promo code
 * @route   POST /api/promo-codes/validate
 * @access  Public
 */
export const validatePromoCode = asyncHandler(async (req, res) => {
  const { code, bookingAmount } = req.body;

  if (!code) {
    throw new ApiError(400, 'Promo code is required');
  }

  const promoCode = await PromoCode.findOne({
    code: code.toUpperCase(),
    isActive: true,
  });

  if (!promoCode) {
    throw new ApiError(404, 'Invalid promo code');
  }

  if (!promoCode.isValid()) {
    throw new ApiError(400, 'Promo code is expired or not valid');
  }

  const amount = parseFloat(bookingAmount) || 0;

  if (amount < promoCode.minBookingAmount) {
    throw new ApiError(400, `Minimum booking amount is ₹${promoCode.minBookingAmount}`);
  }

  const discount = promoCode.calculateDiscount(amount);

  res.json({
    success: true,
    data: {
      valid: true,
      code: promoCode.code,
      discountAmount: discount,
      finalAmount: amount - discount,
    },
  });
});

