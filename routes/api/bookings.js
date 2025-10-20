const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
require('../../models/Booking');
const Booking = mongoose.model('Booking');

// GET /api/bookings
// Query params: page, pageSize, sort, order, status, city
router.get('/', async (req, res) => {
    try {
        const { page = 1, pageSize = 25, sort = 'bookingDate', order = 'desc', status, city, q } = req.query;
        const limit = Math.min(parseInt(pageSize, 10) || 25, 100);
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const skip = (pageNum - 1) * limit;
        const allowedSort = ['bookingDate', 'startDate', 'endDate', 'status', 'totalPrice'];
        const sortField = allowedSort.includes(sort) ? sort : 'bookingDate';
        const sortSpec = { [sortField]: order === 'asc' ? 1 : -1 };
        const filter = {};
        if (status) filter.status = status;
        if (city) filter.city = city;
        if (q) {
            const regex = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ notes: regex }, { city: regex }, { status: regex }];
        }
        const [rows, total] = await Promise.all([
            Booking.find(filter).sort(sortSpec).skip(skip).limit(limit).lean().exec(),
            Booking.countDocuments(filter)
        ]);
        res.json({ page: pageNum, pageSize: limit, total, rows });
    } catch (err) {
        console.error('Bookings list error', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

module.exports = router;
