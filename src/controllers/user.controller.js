import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import User from '../models/User.js';

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
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
    data: { avatar: req.user.avatar },
  });
});

