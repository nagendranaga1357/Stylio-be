import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { generateTokens, verifyRefreshToken } from '../middleware/auth.js';
import User from '../models/User.js';
import OTP from '../models/OTP.js';

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, phone } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ApiError(400, 'User with this email or username already exists');
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
    phone,
  });

  // Generate tokens
  const tokens = generateTokens(user._id);

  // Save refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      tokens,
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new ApiError(400, 'Please provide username and password');
  }

  // Find user
  const user = await User.findOne({
    $or: [{ username }, { email: username }],
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.isActive) {
    throw new ApiError(401, 'Account is deactivated');
  }

  // Generate OTP for email verification
  const otpRecord = await OTP.generateOTP(user, user.email);
  console.log('============================================');
  console.log(`OTP for ${user.email}: ${otpRecord.otp}`);
  console.log('============================================');

  // Generate tokens
  const tokens = generateTokens(user._id);

  // Save refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      tokens,
    },
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  // Clear refresh token
  req.user.refreshToken = undefined;
  await req.user.save();

  res.json({
    success: true,
    message: 'Logout successful',
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required');
  }

  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Find user
  const user = await User.findById(decoded.id).select('+refreshToken');

  if (!user || user.refreshToken !== refreshToken) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  // Generate new tokens
  const tokens = generateTokens(user._id);

  // Save new refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  res.json({
    success: true,
    data: { tokens },
  });
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

/**
 * @desc    Verify OTP
 * @route   POST /api/auth/verify-otp
 * @access  Private
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    throw new ApiError(400, 'OTP is required');
  }

  const { isValid, user } = await OTP.verifyOTP(req.user.email, otp);

  if (!isValid || !user || user._id.toString() !== req.user._id.toString()) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  // Mark email as verified
  req.user.isEmailVerified = true;
  await req.user.save();

  res.json({
    success: true,
    message: 'OTP verified successfully',
  });
});

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Private
 */
export const resendOtp = asyncHandler(async (req, res) => {
  const otpRecord = await OTP.generateOTP(req.user, req.user.email);

  // In production, send email here
  console.log('============================================');
  console.log(`OTP for ${req.user.email}: ${otpRecord.otp}`);
  console.log('============================================');

  res.json({
    success: true,
    message: 'OTP sent successfully',
  });
});

