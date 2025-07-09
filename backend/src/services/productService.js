const Product = require('../models/Product');
const User = require('../models/User');

class ProductService {
  // Advanced search with filters and pagination
  async searchProducts(filters, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      populate = false
    } = options;

    // Build search query using the model's advanced search method
    const searchQuery = Product.advancedSearch(filters);
    
    // Build aggregation pipeline
    const pipeline = [
      { $match: searchQuery },
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
    const sortField = sortBy === 'relevance' && filters.text ? 
      { score: { $meta: 'textScore' } } : 
      { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    pipeline.push({ $sort: sortField });

    // Add pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip }, { $limit: limit });

    // Add population if requested
    if (populate) {
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
      { $match: searchQuery },
      { $count: 'total' }
    ];
    const countResult = await Product.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    return {
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters
    };
  }

  // Get product by ID with population
  async getProductById(id, populate = false) {
    let query = Product.findById(id);
    
    if (populate) {
      query = query.populate('createdBy', 'name email profile.avatar stats.rating');
    }
    
    const product = await query.exec();
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    return product;
  }

  // Create new product with validation
  async createProduct(productData, userId) {
    // Validate required fields
    const requiredFields = ['name', 'price', 'category', 'location'];
    for (const field of requiredFields) {
      if (!productData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    // Generate SKU if not provided
    if (!productData.inventory?.sku) {
      productData.inventory = {
        ...productData.inventory,
        sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
    }

    // Set primary image if images are provided
    if (productData.images && productData.images.length > 0) {
      productData.images = productData.images.map((image, index) => ({
        ...image,
        isPrimary: index === 0
      }));
    }

    const product = new Product({
      ...productData,
      createdBy: userId
    });

    await product.save();

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $inc: { 'stats.productsListed': 1 }
    });

    return product;
  }

  // Update product with validation
  async updateProduct(id, updateData, userId) {
    const product = await Product.findById(id);
    
    if (!product) {
      throw new Error('Product not found');
    }

    // Check if user has permission to update
    if (product.createdBy.toString() !== userId) {
      throw new Error('You can only update your own products');
    }

    // Remove fields that shouldn't be updated
    const { createdBy, createdAt, ...allowedUpdates } = updateData;

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { ...allowedUpdates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    return updatedProduct;
  }

  // Delete product with validation
  async deleteProduct(id, userId) {
    const product = await Product.findById(id);
    
    if (!product) {
      throw new Error('Product not found');
    }

    // Check if user has permission to delete
    if (product.createdBy.toString() !== userId) {
      throw new Error('You can only delete your own products');
    }

    await Product.findByIdAndDelete(id);

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $inc: { 'stats.productsListed': -1 }
    });

    return { message: 'Product deleted successfully' };
  }

  // Get product analytics
  async getProductAnalytics() {
    const analytics = await Product.aggregate([
      {
        $facet: {
          totalProducts: [{ $count: 'count' }],
          activeProducts: [{ $match: { status: 'active' } }, { $count: 'count' }],
          lowStockProducts: [
            { $match: { 'inventory.quantity': { $lte: '$inventory.lowStockThreshold' } } },
            { $count: 'count' }
          ],
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
          ],
          recentProducts: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ]);

    return analytics[0];
  }

  // Get products by user
  async getProductsByUser(userId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    
    const query = { createdBy: userId };
    if (status) query.status = status;

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'name email');

    const total = await Product.countDocuments(query);

    return {
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Update product inventory
  async updateInventory(productId, quantity, userId) {
    const product = await Product.findById(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.createdBy.toString() !== userId) {
      throw new Error('You can only update your own products');
    }

    product.inventory.quantity = quantity;
    await product.save();

    return product;
  }

  // Get trending products
  async getTrendingProducts(limit = 10) {
    return await Product.aggregate([
      { $match: { status: 'active' } },
      {
        $addFields: {
          trendingScore: {
            $add: [
              { $multiply: ['$ratings.average', 10] },
              { $multiply: ['$ratings.count', 2] },
              { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 86400000] }
            ]
          }
        }
      },
      { $sort: { trendingScore: -1 } },
      { $limit: limit }
    ]);
  }

  // Get similar products
  async getSimilarProducts(productId, limit = 6) {
    const product = await Product.findById(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    return await Product.aggregate([
      {
        $match: {
          _id: { $ne: product._id },
          status: 'active',
          category: product.category,
          'inventory.quantity': { $gt: 0 }
        }
      },
      { $limit: limit },
      { $sort: { 'ratings.average': -1 } }
    ]);
  }
}

module.exports = new ProductService(); 