const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
require('../../models/Product');
const Product = mongoose.model('Product');

// GET /api/products
// Query params: page, pageSize, sort, order, category, active(true|false)
router.get('/', async (req, res) => {
    try {
        const { page = 1, pageSize = 25, sort = 'createdAt', order = 'desc', category, active, q } = req.query;
        const limit = Math.min(parseInt(pageSize, 10) || 25, 100);
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const skip = (pageNum - 1) * limit;
        const allowedSort = ['createdAt', 'name', 'category', 'unitPrice', 'sku'];
        const sortField = allowedSort.includes(sort) ? sort : 'createdAt';
        const sortSpec = { [sortField]: order === 'asc' ? 1 : -1 };
        const filter = {};
        if (category) filter.category = category;
        if (active !== undefined) filter.active = active === 'true';
        if (q) {
            const regex = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ name: regex }, { sku: regex }, { category: regex }];
        }
        const [rows, total] = await Promise.all([
            Product.find(filter).sort(sortSpec).skip(skip).limit(limit).lean().exec(),
            Product.countDocuments(filter)
        ]);
        res.json({ page: pageNum, pageSize: limit, total, rows });
    } catch (err) {
        console.error('Products list error', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

module.exports = router;
