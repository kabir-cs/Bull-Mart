const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware with role-based access control
const auth = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // Get token from header
      const authHeader = req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Access denied. No token provided or invalid format.' 
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if token has required fields
      if (!decoded.id || !decoded.email || !decoded.role) {
        return res.status(401).json({ 
          error: 'Invalid token structure.' 
        });
      }

      // Find user in database
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found. Token may be invalid.' 
        });
      }

      // Check if user account is active
      if (user.verification && !user.verification.emailVerified) {
        return res.status(403).json({ 
          error: 'Email verification required. Please verify your email address.' 
        });
      }

      // Check if account is locked
      if (user.isLocked && user.isLocked()) {
        return res.status(423).json({ 
          error: 'Account is temporarily locked due to security concerns.' 
        });
      }

      // Role-based access control
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          error: 'Access denied. Insufficient permissions for this operation.' 
        });
      }

      // Add user to request object
      req.user = {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      };

      // Add full user object if needed for specific operations
      req.userFull = user;

      next();
    } catch (error) {
      console.error('Authentication middleware error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'Invalid token. Please log in again.' 
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired. Please log in again.' 
        });
      }
      
      res.status(500).json({ 
        error: 'Authentication error. Please try again.' 
      });
    }
  };
};

// Optional authentication middleware (doesn't require token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && !user.isLocked()) {
        req.user = {
          id: user._id,
          email: user.email,
          role: user.role,
          name: user.name
        };
        req.userFull = user;
      } else {
        req.user = null;
      }
    } catch (tokenError) {
      // Invalid token, continue without authentication
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional authentication middleware error:', error);
    req.user = null;
    next();
  }
};

// Rate limiting middleware for API endpoints
const createRateLimiter = (windowMs, maxRequests, message) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// API rate limiters
const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per 15 minutes
  'Too many API requests, please try again later'
);

const strictApiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  20, // 20 requests per 15 minutes
  'Too many requests for this endpoint, please try again later'
);

// Request validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details.map(detail => detail.message)
        });
      }
      next();
    } catch (error) {
      console.error('Request validation error:', error);
      res.status(500).json({ error: 'Validation error occurred' });
    }
  };
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // MongoDB validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      error: 'Validation error',
      details: errors
    });
  }

  // MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error'
  });
};

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (for HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

module.exports = {
  auth,
  optionalAuth,
  apiLimiter,
  strictApiLimiter,
  validateRequest,
  errorHandler,
  corsOptions,
  requestLogger,
  securityHeaders
}; 