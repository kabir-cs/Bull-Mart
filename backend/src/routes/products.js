const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all products (optionally filter by location)
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    let products;
    if (lat && lng && radius) {
      // Use MongoDB geospatial query for efficient location search
      const center = [Number(lng), Number(lat)];
      const radiusInMeters = Number(radius) * 1000; // radius in km to meters
      products = await Product.find({
        location: {
          $geoWithin: {
            $centerSphere: [center, radiusInMeters / 6378137] // Earth's radius in meters
          }
        }
      }).populate('createdBy', 'name email').lean();
    } else {
      products = await Product.find().populate('createdBy', 'name email').lean();
    }
    res.json(products);
  } catch (err) {
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
    res.status(400).json({ error: err.message });
  }
});

// Update product (admin only)
router.put('/:id', auth(['admin']), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete product (admin only)
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 