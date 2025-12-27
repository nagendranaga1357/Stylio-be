import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/User.js';
import { ApiError, asyncHandler } from './errorHandler.js';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Get user from database
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'User account is deactivated');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'Not authorized, token invalid');
  }
});

/**
 * Optional Authentication
 * Attaches user if token exists, but doesn't require it
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.id).select('-password');
      if (user?.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token invalid, continue without user
    }
  }

  next();
});

/**
 * Role-based authorization
 * @param  {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Not authorized');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Not authorized to access this resource');
    }

    next();
  };
};

/**
 * Generate JWT Tokens
 */
export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  const refreshToken = jwt.sign({ id: userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    throw new ApiError(401, 'Invalid refresh token');
  }
};

