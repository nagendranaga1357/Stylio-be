import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Favorite from '../models/Favorite.js';
import mongoose from 'mongoose';

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  res.json({
    success: true,
    data: { user },
  });
});

/**
 * Validate and check base64 image size
 * @param {string} base64String - Base64 data URL
 * @returns {Object} - { valid: boolean, error?: string }
 */
function validateBase64Avatar(base64String) {
  // Check prefix
  const validPrefixes = ['data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/jpg;base64,'];
  const hasValidPrefix = validPrefixes.some(prefix => base64String.startsWith(prefix));
  
  if (!hasValidPrefix) {
    return { valid: false, error: 'Avatar must be a JPEG or PNG image' };
  }
  
  // Check size (base64 increases size by ~33%, so 200KB becomes ~267KB in base64)
  // We'll limit to ~300KB base64 which is ~225KB actual image
  const base64Data = base64String.split(',')[1] || '';
  const sizeInBytes = (base64Data.length * 3) / 4; // Approximate size
  const maxSize = 300 * 1024; // 300KB
  
  if (sizeInBytes > maxSize) {
    return { valid: false, error: 'Avatar image is too large (max 200KB)' };
  }
  
  return { valid: true };
}

/**
 * @desc    Update user profile
 * @route   PATCH /api/users/profile
 * @access  Private
 * 
 * @example Update profile with base64 avatar:
 *   PATCH /api/users/profile
 *   { "avatar": "data:image/jpeg;base64,/9j/4AAQSkZ..." }
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    phone,
    dateOfBirth,
    gender,
    address,
    avatar, // V1: Base64 data URL for avatar
  } = req.body;

  const user = await User.findById(req.user._id);

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone;
  if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
  if (gender !== undefined) user.gender = gender;
  if (address) user.address = { ...user.address, ...address };
  
  // V1: Handle base64 avatar
  if (avatar !== undefined) {
    if (avatar === null || avatar === '') {
      // Clear avatar
      user.avatar = null;
    } else if (avatar.startsWith('data:image/')) {
      // Validate base64 avatar
      const validation = validateBase64Avatar(avatar);
      if (!validation.valid) {
        throw new ApiError(400, validation.error);
      }
      // Store base64 data URL directly
      user.avatar = avatar;
    } else if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      // Allow external URLs (backwards compatibility)
      user.avatar = avatar;
    }
    // If it's already a path like /uploads/... keep it as is
    else if (avatar.startsWith('/uploads/')) {
      user.avatar = avatar;
    }
  }

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  });
});

/**
 * @desc    Update password
 * @route   PATCH /api/users/password
 * @access  Private
 */
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required');
  }

  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password updated successfully',
  });
});

/**
 * @desc    Upload avatar
 * @route   POST /api/users/avatar
 * @access  Private
 */
export const uploadAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Handle file upload (legacy method)
  if (req.file) {
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();
    
    return res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { avatarUrl: user.avatar },
    });
  }
  
  // Handle base64 upload (new method for serverless)
  const { avatar } = req.body;
  
  if (avatar && avatar.startsWith('data:image/')) {
    const validation = validateBase64Avatar(avatar);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }
    
    user.avatar = avatar;
    await user.save();
    
    return res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { avatarUrl: user.avatar },
    });
  }
  
  throw new ApiError(400, 'Please upload a file or provide base64 image data');
});

// =====================
// ADDRESS MANAGEMENT
// =====================

/**
 * @desc    Get all user addresses
 * @route   GET /api/users/addresses
 * @access  Private
 */
export const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  res.json({
    success: true,
    data: { addresses: user.addresses || [] },
  });
});

/**
 * @desc    Add new address
 * @route   POST /api/users/addresses
 * @access  Private
 */
export const addAddress = asyncHandler(async (req, res) => {
  const { street, city, state, pincode, isDefault, label } = req.body;

  if (!street || !city) {
    throw new ApiError(400, 'Street and city are required');
  }

  const user = await User.findById(req.user._id);

  // If this is set as default, unset other defaults
  if (isDefault) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
  }

  // If this is the first address, make it default
  const makeDefault = user.addresses.length === 0 || isDefault;

  user.addresses.push({
    street,
    city,
    state,
    pincode,
    isDefault: makeDefault,
    label: label || 'Home',
  });

  await user.save();

  const newAddress = user.addresses[user.addresses.length - 1];

  res.status(201).json({
    success: true,
    message: 'Address added successfully',
    data: { address: newAddress },
  });
});

/**
 * @desc    Update address
 * @route   PATCH /api/users/addresses/:addressId
 * @access  Private
 */
export const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const { street, city, state, pincode, isDefault, label } = req.body;

  const user = await User.findById(req.user._id);
  
  const address = user.addresses.id(addressId);
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  // If setting as default, unset others
  if (isDefault) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
  }

  if (street) address.street = street;
  if (city) address.city = city;
  if (state !== undefined) address.state = state;
  if (pincode !== undefined) address.pincode = pincode;
  if (isDefault !== undefined) address.isDefault = isDefault;
  if (label) address.label = label;

  await user.save();

  res.json({
    success: true,
    message: 'Address updated successfully',
    data: { address },
  });
});

/**
 * @desc    Delete address
 * @route   DELETE /api/users/addresses/:addressId
 * @access  Private
 */
export const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user._id);
  
  const address = user.addresses.id(addressId);
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  const wasDefault = address.isDefault;
  
  user.addresses.pull(addressId);

  // If deleted address was default and there are other addresses, make first one default
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();

  res.json({
    success: true,
    message: 'Address deleted successfully',
  });
});

// =====================
// ACCOUNT MANAGEMENT
// =====================

/**
 * @desc    Delete user account
 * @route   DELETE /api/users/account
 * @access  Private
 */
export const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Cancel any pending bookings
  await Booking.updateMany(
    { user: userId, status: { $in: ['pending', 'confirmed'] } },
    { status: 'cancelled', cancelReason: 'Account deleted by user' }
  );

  // Remove favorites
  await Favorite.deleteMany({ user: userId });

  // Delete the user account
  await User.findByIdAndDelete(userId);

  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
});

