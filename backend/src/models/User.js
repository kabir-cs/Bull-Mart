const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 8 },
  role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
  profile: {
    avatar: { type: String },
    bio: { type: String, maxlength: 500 },
    phone: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer-not-to-say'] }
  },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String, default: 'US' }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    privacy: {
      profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
      locationSharing: { type: Boolean, default: true },
      showEmail: { type: Boolean, default: false }
    },
    searchRadius: { type: Number, default: 50, min: 1, max: 500 },
    preferredCategories: [{ type: String }],
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'USD' }
  },
  stats: {
    productsListed: { type: Number, default: 0 },
    productsSold: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    memberSince: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
  },
  verification: {
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    identityVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date }
  },
  security: {
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastPasswordChange: { type: Date, default: Date.now },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String }
  },
  social: {
    googleId: { type: String },
    facebookId: { type: String },
    twitterId: { type: String }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient querying
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ location: '2dsphere' });
userSchema.index({ 'stats.rating': -1 });
userSchema.index({ 'stats.productsSold': -1 });
userSchema.index({ createdAt: -1 });

// Text search index
userSchema.index({ name: 'text', 'profile.bio': 'text' });

// Update timestamp on save
userSchema.pre('save', async function(next) {
  this.updatedAt = new Date();
  
  // Hash password if modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.security.lastPasswordChange = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    { 
      id: this._id, 
      email: this.email, 
      role: this.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  return token;
};

userSchema.methods.generateEmailVerificationToken = function() {
  const token = jwt.sign(
    { id: this._id, type: 'email-verification' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  this.verification.emailVerificationToken = token;
  this.verification.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return token;
};

userSchema.methods.generatePasswordResetToken = function() {
  const token = jwt.sign(
    { id: this._id, type: 'password-reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  this.verification.passwordResetToken = token;
  this.verification.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  return token;
};

userSchema.methods.isLocked = function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
};

userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'security.lockUntil': 1 },
      $set: { 'security.loginAttempts': 1 }
    });
  }
  
  const updates = { $inc: { 'security.loginAttempts': 1 } };
  
  // Lock account after 5 failed attempts
  if (this.security.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { 'security.lockUntil': Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { 'security.loginAttempts': 1, 'security.lockUntil': 1 },
    $set: { 'stats.lastActive': new Date() }
  });
};

// Virtual for account age
userSchema.virtual('accountAge').get(function() {
  return Math.floor((Date.now() - this.stats.memberSince) / (1000 * 60 * 60 * 24));
});

// Virtual for verification status
userSchema.virtual('verificationStatus').get(function() {
  const status = [];
  if (this.verification.emailVerified) status.push('email');
  if (this.verification.phoneVerified) status.push('phone');
  if (this.verification.identityVerified) status.push('identity');
  return status;
});

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findBySocialId = function(provider, id) {
  const field = `social.${provider}Id`;
  return this.findOne({ [field]: id });
};

userSchema.statics.searchUsers = function(query) {
  const filters = {};
  
  if (query.text) {
    filters.$text = { $search: query.text };
  }
  
  if (query.role) {
    filters.role = query.role;
  }
  
  if (query.location && query.radius) {
    const center = [Number(query.location.lng), Number(query.location.lat)];
    const radiusInMeters = Number(query.radius) * 1000;
    filters.location = {
      $geoWithin: {
        $centerSphere: [center, radiusInMeters / 6378137]
      }
    };
  }
  
  if (query.minRating) {
    filters['stats.rating'] = { $gte: Number(query.minRating) };
  }
  
  return this.find(filters);
};

module.exports = mongoose.model('User', userSchema); 