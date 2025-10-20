const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
require('../../models/Customer');
const Customer = mongoose.model('Customer');

// GET /api/customers
// Query params: page (1-based), pageSize, sort (field), order (asc|desc), city, state
router.get('/', async (req, res) => {
    try {
        const { page = 1, pageSize = 25, sort = 'createdAt', order = 'desc', city, state, q } = req.query;
        const limit = Math.min(parseInt(page, 10) && parseInt(pageSize, 10) > 0 ? parseInt(pageSize, 10) : 25, 100);
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const skip = (pageNum - 1) * limit;
        const allowedSort = ['createdAt', 'name', 'email', 'city', 'state'];
        const sortField = allowedSort.includes(sort) ? sort : 'createdAt';
        const sortSpec = { [sortField]: order === 'asc' ? 1 : -1 };
        const filter = {};
        if (city) filter.city = city;
        if (state) filter.state = state;
        if (q) {
            const regex = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ name: regex }, { email: regex }, { city: regex }];
        }
        const [rows, total] = await Promise.all([
            Customer.find(filter).sort(sortSpec).skip(skip).limit(limit).lean().exec(),
            Customer.countDocuments(filter)
        ]);
        res.json({ page: pageNum, pageSize: limit, total, rows });
    } catch (err) {
        console.error('Customers list error', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

module.exports = router;
