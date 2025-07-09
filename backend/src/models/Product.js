const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, index: 'text' },
  description: { type: String, index: 'text' },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  category: { 
    type: String, 
    required: true, 
    enum: ['electronics', 'clothing', 'books', 'sports', 'home', 'automotive', 'health', 'beauty', 'food', 'other'],
    index: true
  },
  subcategory: { type: String, index: true },
  brand: { type: String, index: true },
  condition: { 
    type: String, 
    enum: ['new', 'like-new', 'good', 'fair', 'poor'], 
    default: 'good',
    index: true
  },
  inventory: {
    quantity: { type: Number, default: 0, min: 0 },
    sku: { type: String, unique: true, sparse: true },
    lowStockThreshold: { type: Number, default: 5 }
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String },
    city: { type: String, index: true },
    state: { type: String, index: true },
    zipCode: { type: String }
  },
  images: [{ 
    url: { type: String, required: true },
    alt: { type: String },
    isPrimary: { type: Boolean, default: false }
  }],
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  tags: [{ type: String, index: true }],
  specifications: { type: Map, of: String },
  shipping: {
    weight: { type: Number },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number }
    },
    freeShipping: { type: Boolean, default: false },
    shippingCost: { type: Number, default: 0 }
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'sold', 'reserved'], 
    default: 'active',
    index: true
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient querying
productSchema.index({ location: '2dsphere' });
productSchema.index({ createdBy: 1 });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ price: 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ 'inventory.quantity': 1 });

// Text search index
productSchema.index({ name: 'text', description: 'text', brand: 'text' });

// Update timestamp on save
productSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.price < this.originalPrice) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.inventory.quantity === 0) return 'out-of-stock';
  if (this.inventory.quantity <= this.inventory.lowStockThreshold) return 'low-stock';
  return 'in-stock';
});

// Static method for advanced search
productSchema.statics.advancedSearch = function(filters) {
  const query = {};
  
  if (filters.text) {
    query.$text = { $search: filters.text };
  }
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.subcategory) {
    query.subcategory = filters.subcategory;
  }
  
  if (filters.brand) {
    query.brand = { $regex: filters.brand, $options: 'i' };
  }
  
  if (filters.minPrice || filters.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = filters.minPrice;
    if (filters.maxPrice) query.price.$lte = filters.maxPrice;
  }
  
  if (filters.condition) {
    query.condition = filters.condition;
  }
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.minRating) {
    query['ratings.average'] = { $gte: filters.minRating };
  }
  
  if (filters.inStock) {
    query['inventory.quantity'] = { $gt: 0 };
  }
  
  if (filters.location && filters.radius) {
    const center = [Number(filters.location.lng), Number(filters.location.lat)];
    const radiusInMeters = Number(filters.radius) * 1000;
    query.location = {
      $geoWithin: {
        $centerSphere: [center, radiusInMeters / 6378137]
      }
    };
  }
  
  return query;
};

module.exports = mongoose.model('Product', productSchema); 