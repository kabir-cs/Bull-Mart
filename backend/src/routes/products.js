const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Advanced search and filtering with pagination
router.get('/search', async (req, res) => {
  try {
    const {
      text, category, subcategory, brand, minPrice, maxPrice,
      condition, status, minRating, inStock, lat, lng, radius,
      sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20,
      populate = '1'
    } = req.query;

    // Build search filters
    const filters = {};
    
    if (text) {
      filters.$text = { $search: text };
    }
    
    if (category) filters.category = category;
    if (subcategory) filters.subcategory = subcategory;
    if (brand) filters.brand = { $regex: brand, $options: 'i' };
    if (condition) filters.condition = condition;
    if (status) filters.status = status;
    if (minRating) filters['ratings.average'] = { $gte: Number(minRating) };
    if (inStock === 'true') filters['inventory.quantity'] = { $gt: 0 };
    
    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = Number(minPrice);
      if (maxPrice) filters.price.$lte = Number(maxPrice);
    }
    
    if (lat && lng && radius) {
      const center = [Number(lng), Number(lat)];
      const radiusInMeters = Number(radius) * 1000;
      filters.location = {
        $geoWithin: {
          $centerSphere: [center, radiusInMeters / 6378137]
        }
      };
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: filters },
      {
        $addFields: {
          discountPercentage: {
            $cond: {
              if: { $and: [{ $ne: ['$originalPrice', null] }, { $lt: ['$price', '$originalPrice'] }] },
              then: { $multiply: [{ $divide: [{ $subtract: ['$originalPrice', '$price'] }, '$originalPrice'] }, 100] },
              else: 0
            }
          },
          stockStatus: {
            $cond: {
              if: { $eq: ['$inventory.quantity', 0] },
              then: 'out-of-stock',
              else: {
                $cond: {
                  if: { $lte: ['$inventory.quantity', '$inventory.lowStockThreshold'] },
                  then: 'low-stock',
                  else: 'in-stock'
                }
              }
            }
          }
        }
      }
    ];

    // Add sorting
    const sortField = sortBy === 'relevance' && text ? { score: { $meta: 'textScore' } } : { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    pipeline.push({ $sort: sortField });

    // Add pagination
    const skip = (Number(page) - 1) * Number(limit);
    pipeline.push({ $skip: skip }, { $limit: Number(limit) });

    // Add population
    if (populate === '1') {
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'seller'
        }
      });
      pipeline.push({
        $addFields: {
          seller: { $arrayElemAt: ['$seller', 0] }
        }
      });
    }

    // Execute search
    const products = await Product.aggregate(pipeline);

    // Get total count for pagination
    const countPipeline = [
      { $match: filters },
      { $count: 'total' }
    ];
    const countResult = await Product.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      filters: req.query
    });

  } catch (err) {
    console.error('Error in GET /api/products/search:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get product categories and subcategories for filtering
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const subcategories = await Product.aggregate([
      { $match: { subcategory: { $exists: true, $ne: null } } },
      { $group: { _id: '$subcategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const brands = await Product.aggregate([
      { $match: { brand: { $exists: true, $ne: null } } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);

    res.json({
      categories,
      subcategories,
      brands
    });
  } catch (err) {
    console.error('Error in GET /api/products/categories:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get product analytics and insights
router.get('/analytics', auth(['admin']), async (req, res) => {
  try {
    const analytics = await Product.aggregate([
      {
        $facet: {
          totalProducts: [{ $count: 'count' }],
          activeProducts: [{ $match: { status: 'active' } }, { $count: 'count' }],
          lowStockProducts: [{ $match: { 'inventory.quantity': { $lte: '$inventory.lowStockThreshold' } } }, { $count: 'count' }],
          outOfStockProducts: [{ $match: { 'inventory.quantity': 0 } }, { $count: 'count' }],
          avgPrice: [{ $group: { _id: null, avg: { $avg: '$price' } } }],
          priceRange: [
            { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }
          ],
          categoryDistribution: [
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          topRatedProducts: [
            { $match: { 'ratings.average': { $gte: 4 } } },
            { $sort: { 'ratings.average': -1 } },
            { $limit: 10 }
          ]
        }
      }
    ]);

    res.json(analytics[0]);
  } catch (err) {
    console.error('Error in GET /api/products/analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all products (optionally filter by location) - Enhanced version
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius, populate, limit = 50 } = req.query;
    let query = {};
    
    if (lat && lng && radius) {
      const center = [Number(lng), Number(lat)];
      const radiusInMeters = Number(radius) * 1000;
      query.location = {
        $geoWithin: {
          $centerSphere: [center, radiusInMeters / 6378137]
        }
      };
    }
    
    let productsQuery = Product.find(query).limit(Number(limit));
    if (populate === '1') {
      productsQuery = productsQuery.populate('createdBy', 'name email');
    }
    const products = await productsQuery.lean();
    res.json(products);
  } catch (err) {
    console.error('Error in GET /api/products:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create product (admin only) - Enhanced with validation
router.post('/', auth(['admin']), async (req, res) => {
  try {
    const { 
      name, description, price, originalPrice, category, subcategory,
      brand, condition, location, images, tags, specifications,
      inventory, shipping
    } = req.body;

    // Validate required fields
    if (!name || !price || !category || !location) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, price, category, and location are required' 
      });
    }

    // Generate SKU if not provided
    const sku = inventory?.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const product = new Product({
      name,
      description,
      price,
      originalPrice,
      category,
      subcategory,
      brand,
      condition,
      location,
      images,
      tags,
      specifications,
      inventory: { ...inventory, sku },
      shipping,
      createdBy: req.user.id
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error('Error in POST /api/products:', err);
    res.status(400).json({ error: err.message });
  }
});

// Update product (admin only) - Enhanced with validation
router.put('/:id', auth(['admin']), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, updatedAt: new Date() }, 
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (err) {
    console.error('Error in PUT /api/products/:id:', err);
    res.status(400).json({ error: err.message });
  }
});

// Delete product (admin only)
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error in DELETE /api/products/:id:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 