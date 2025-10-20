const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
require('../../models/Order');
require('../../models/Customer');
const Order = mongoose.model('Order');

// GET /api/orders
// Query params: page, pageSize, sort, order, status, customerId
router.get('/', async (req, res) => {
    try {
        const { page = 1, pageSize = 25, sort = 'orderDate', order = 'desc', status, customerId, q } = req.query;
        const limit = Math.min(parseInt(pageSize, 10) || 25, 100);
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const skip = (pageNum - 1) * limit;
        const allowedSort = ['orderDate', 'status', 'totalAmount', 'createdAt'];
        const sortField = allowedSort.includes(sort) ? sort : 'orderDate';
        const sortSpec = { [sortField]: order === 'asc' ? 1 : -1 };
        const filter = {};
        if (status) filter.status = status;
        if (customerId) filter.customer = customerId;
        if (q) {
            const regex = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            // Search note or status; status by exact match or regex fallback
            filter.$or = [{ notes: regex }, { status: regex }];
        }
        const [rows, total] = await Promise.all([
            Order.find(filter).sort(sortSpec).skip(skip).limit(limit).lean().exec(),
            Order.countDocuments(filter)
        ]);
        res.json({ page: pageNum, pageSize: limit, total, rows });
    } catch (err) {
        console.error('Orders list error', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

module.exports = router;
