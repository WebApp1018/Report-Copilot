const mongoose = require('mongoose');

// Customer schema: represents a person (or contact) that places orders or bookings.
// We retain the original simple fields for backwards compatibility and add richer attributes.
const CustomerSchema = new mongoose.Schema(
    {
        // Original basics
        name: { type: String, required: true, trim: true }, // kept; also store first/last
        email: { type: String, required: true, unique: true, lowercase: true, index: true },
        city: { type: String, index: true },
        state: { type: String },
        tags: [{ type: String }],

        // New richer fields
        firstName: { type: String, trim: true, index: true },
        lastName: { type: String, trim: true, index: true },
        phone: { type: String, trim: true, index: true }, // E.164 preferred
        companyName: { type: String, trim: true },
        address1: { type: String, trim: true },
        address2: { type: String, trim: true },
        postalCode: { type: String, trim: true, index: true },
        country: { type: String, trim: true, index: true },
        marketingOptIn: { type: Boolean, default: false, index: true },
        loyaltyPoints: { type: Number, default: 0 },
        lifetimeValue: { type: Number, default: 0 }, // aggregated purchase value snapshot
        lastOrderDate: { type: Date },
        segment: { type: String, enum: ['CONSUMER', 'BUSINESS', 'ENTERPRISE', 'VIP'], default: 'CONSUMER', index: true },
        preferredLanguage: { type: String, default: 'en' },
        timezone: { type: String },
        notes: { type: String },
    },
    { timestamps: true }
);

// Virtual fullName if first/last exist (falls back to stored name)
CustomerSchema.virtual('fullName').get(function () {
    if (this.firstName || this.lastName) {
        return [this.firstName, this.lastName].filter(Boolean).join(' ');
    }
    return this.name;
});

// Post-save hook to keep lifetimeValue & lastOrderDate loosely updated could be added later.

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
