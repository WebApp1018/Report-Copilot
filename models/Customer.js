const mongoose = require('mongoose');

// Customer schema: represents a person that places orders or bookings.
const CustomerSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, index: true },
        city: { type: String, index: true },
        state: { type: String },
        tags: [{ type: String }],
    },
    { timestamps: true }
);

/**
 * Static: Top customers for a given month (by total order amount).
 * @param {number} month 1-12
 * @param {number} year Full year (e.g. 2025)
 * @param {number} limit Max customers to return
 */
CustomerSchema.statics.topCustomersForMonth = async function (month, year, limit = 10) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1); // first day of next month
    return this.model('Order').aggregate([
        { $match: { orderDate: { $gte: start, $lt: end } } },
        { $group: { _id: '$customer', totalSpent: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
        { $sort: { totalSpent: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'customers',
                localField: '_id',
                foreignField: '_id',
                as: 'customer',
            },
        },
        { $unwind: '$customer' },
        {
            $project: {
                _id: 0,
                customerId: '$customer._id',
                name: '$customer.name',
                email: '$customer.email',
                city: '$customer.city',
                totalSpent: 1,
                orders: 1,
            },
        },
    ]);
};

module.exports = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
