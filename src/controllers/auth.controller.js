import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { generateTokens, verifyRefreshToken } from '../middleware/auth.js';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import notificationService from '../services/notification.service.js';
import config from '../config/index.js';

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

  // Create user (email not verified yet)
  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
    phone,
    isEmailVerified: false,
  });

  // Generate OTP for email verification
  const otpRecord = await OTP.generateOTP(user, email);
  
  // Send OTP via email
  try {
    await notificationService.sendOtp(user, otpRecord.otp, 'email');
  } catch (error) {
    console.error('Failed to send registration OTP:', error.message);
  }

  // Generate tokens
  const tokens = generateTokens(user._id);

  // Save refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please verify your email with the OTP sent.',
    data: {
      user,
      tokens,
      requiresVerification: true,
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

  // Send OTP via email/SMS using notification service
  try {
    const results = await notificationService.sendOtp(
      req.user, 
      otpRecord.otp, 
      config.otp.channel
    );
    
    const successChannels = results
      .filter(r => r.success)
      .map(r => r.channel)
      .join(', ');

    res.json({
      success: true,
      message: `OTP sent successfully via ${successChannels || 'notification service'}`,
    });
  } catch (error) {
    console.error('Failed to send OTP:', error.message);
    res.json({
      success: true,
      message: 'OTP generated. Check your email/phone.',
    });
  }
});

/**
 * @desc    Forgot password - send OTP
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Please provide your email address');
  }

  // Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal if user exists or not for security
    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset OTP.',
    });
    return;
  }

  // Generate OTP for password reset
  const otpRecord = await OTP.generateOTP(user, email, 'password_reset');
  
  // Send OTP via email
  try {
    await notificationService.sendOtp(user, otpRecord.otp, 'email');
  } catch (error) {
    console.error('Failed to send password reset OTP:', error.message);
  }

  res.json({
    success: true,
    message: 'If an account exists with this email, you will receive a password reset OTP.',
  });
});

/**
 * @desc    Verify forgot password OTP
 * @route   POST /api/auth/verify-reset-otp
 * @access  Public
 */
export const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required');
  }

  const { isValid, user } = await OTP.verifyOTP(email, otp);

  if (!isValid || !user) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  // Generate a temporary reset token (valid for 10 minutes)
  const resetToken = generateTokens(user._id, '10m').accessToken;

  res.json({
    success: true,
    message: 'OTP verified successfully',
    data: {
      resetToken,
    },
  });
});

/**
 * @desc    Reset password with token
 * @route   POST /api/auth/reset-password
 * @access  Public (with reset token)
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    throw new ApiError(400, 'Reset token and new password are required');
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }

  // Verify reset token
  let decoded;
  try {
    decoded = verifyRefreshToken(resetToken); // Using same JWT verification
  } catch (error) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  // Find user
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new ApiError(400, 'Invalid reset token');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successfully. You can now login with your new password.',
  });
});

