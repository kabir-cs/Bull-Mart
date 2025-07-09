const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Rate limiting for security
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registration attempts per hour
  message: { error: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// User registration
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { 
      name, email, password, profile, location, preferences 
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Name, email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      profile,
      location,
      preferences
    });

    await user.save();

    // Generate verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Generate auth token
    const token = user.generateAuthToken();

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.verification.emailVerificationToken;
    delete userResponse.verification.emailVerificationExpires;

    res.status(201).json({
      message: 'User registered successfully. Please verify your email.',
      user: userResponse,
      token
    });

  } catch (err) {
    console.error('Error in POST /api/auth/register:', err);
    res.status(400).json({ error: err.message });
  }
});

// User login with security features
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({ 
        error: 'Account is temporarily locked due to multiple failed login attempts' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate auth token
    const token = user.generateAuthToken();

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.verification.emailVerificationToken;
    delete userResponse.verification.emailVerificationExpires;
    delete userResponse.verification.passwordResetToken;
    delete userResponse.verification.passwordResetExpires;

    res.json({
      message: 'Login successful',
      user: userResponse,
      token
    });

  } catch (err) {
    console.error('Error in POST /api/auth/login:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'email-verification') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.verification.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    if (user.verification.emailVerificationExpires < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // Mark email as verified
    user.verification.emailVerified = true;
    user.verification.emailVerificationToken = undefined;
    user.verification.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });

  } catch (err) {
    console.error('Error in POST /api/auth/verify-email:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid verification token' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent' });
    }

    // Generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // In a real application, send email here
    // For now, we'll just return the token (in production, this should be sent via email)
    res.json({ 
      message: 'Password reset link sent to your email',
      resetToken // Remove this in production
    });

  } catch (err) {
    console.error('Error in POST /api/auth/forgot-password:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'password-reset') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.verification.passwordResetExpires < new Date()) {
      return res.status(400).json({ error: 'Password reset token has expired' });
    }

    // Update password
    user.password = newPassword;
    user.verification.passwordResetToken = undefined;
    user.verification.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });

  } catch (err) {
    console.error('Error in POST /api/auth/reset-password:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get current user profile
router.get('/me', auth(['user', 'admin', 'moderator']), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error in GET /api/auth/me:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
router.put('/profile', auth(['user', 'admin', 'moderator']), async (req, res) => {
  try {
    const { profile, location, preferences } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update allowed fields
    if (profile) user.profile = { ...user.profile, ...profile };
    if (location) user.location = { ...user.location, ...location };
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: 'Profile updated successfully',
      user: userResponse
    });

  } catch (err) {
    console.error('Error in PUT /api/auth/profile:', err);
    res.status(400).json({ error: err.message });
  }
});

// Change password
router.put('/change-password', auth(['user', 'admin', 'moderator']), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (err) {
    console.error('Error in PUT /api/auth/change-password:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get user statistics
router.get('/stats', auth(['user', 'admin', 'moderator']), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('stats');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.stats);
  } catch (err) {
    console.error('Error in GET /api/auth/stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Logout (client-side token removal)
router.post('/logout', auth(['user', 'admin', 'moderator']), async (req, res) => {
  try {
    // Update last active timestamp
    await User.findByIdAndUpdate(req.user.id, {
      'stats.lastActive': new Date()
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Error in POST /api/auth/logout:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 