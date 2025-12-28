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
 * @desc    Update user profile
 * @route   PATCH /api/users/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    phone,
    dateOfBirth,
    gender,
    address,
  } = req.body;

  const user = await User.findById(req.user._id);

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;
  if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
  if (gender) user.gender = gender;
  if (address) user.address = { ...user.address, ...address };

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
  if (!req.file) {
    throw new ApiError(400, 'Please upload a file');
  }

  req.user.avatar = `/uploads/avatars/${req.file.filename}`;
  await req.user.save();

  res.json({
    success: true,
    message: 'Avatar uploaded successfully',
    data: { avatarUrl: req.user.avatar },
  });
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

