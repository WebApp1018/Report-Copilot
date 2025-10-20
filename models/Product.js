const mongoose = require('mongoose');

// Product schema: items that can be ordered.
const ProductSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        sku: { type: String, required: true, unique: true, uppercase: true },
        category: { type: String, index: true },
        unitPrice: { type: Number, required: true }, // sample currency representation
        active: { type: Boolean, default: true },
        tags: [{ type: String }],
    },
    { timestamps: true }
);

/**
 * Static: Find best selling products (by quantity) within a date range.
 * @param {Date} start inclusive
 * @param {Date} end exclusive
 * @param {number} limit
 */
ProductSchema.statics.bestSelling = async function (start, end, limit = 10) {
    return this.model('Order').aggregate([
        { $match: { orderDate: { $gte: start, $lt: end } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', quantity: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } } } },
        { $sort: { quantity: -1 } },
        { $limit: limit },
        {
            $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' },
        },
        { $unwind: '$product' },
        {
            $project: { _id: 0, productId: '$product._id', name: '$product.name', sku: '$product.sku', category: '$product.category', quantity: 1, revenue: 1 },
        },
    ]);
};

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
