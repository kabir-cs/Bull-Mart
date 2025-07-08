const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all products (optionally filter by location)
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius, populate } = req.query;
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
    let productsQuery = Product.find(query);
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

// Create product (admin only)
router.post('/', auth(['admin']), async (req, res) => {
  try {
    const { name, description, price, location } = req.body;
    const product = new Product({
      name,
      description,
      price,
      location,
      createdBy: req.user.id
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error('Error in POST /api/products:', err);
    res.status(400).json({ error: err.message });
  }
});

// Update product (admin only)
router.put('/:id', auth(['admin']), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (err) {
    console.error('Error in PUT /api/products/:id:', err);
    res.status(400).json({ error: err.message });
  }
});

// Delete product (admin only)
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Error in DELETE /api/products/:id:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 