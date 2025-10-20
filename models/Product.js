const mongoose = require('mongoose');

// Product schema: items that can be ordered.
// Enriched with inventory, pricing, taxonomy data for more realistic analytics.
const ProductSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        sku: { type: String, required: true, unique: true, uppercase: true },
        category: { type: String, index: true },
        unitPrice: { type: Number, required: true }, // current selling price
        msrp: { type: Number }, // suggested retail
        costPrice: { type: Number }, // internal cost
        marginPct: { type: Number }, // convenience snapshot (computed on save)
        active: { type: Boolean, default: true },
        discontinued: { type: Boolean, default: false, index: true },
        discontinuedAt: { type: Date },
        brand: { type: String, trim: true, index: true },
        supplier: { type: String, trim: true },
        taxRate: { type: Number, default: 0.0 }, // e.g. 0.07 for 7%
        stockQty: { type: Number, default: 0, index: true },
        reorderLevel: { type: Number, default: 0 },
        weightKg: { type: Number },
        dimensions: {
            lengthCm: Number,
            widthCm: Number,
            heightCm: Number,
        },
        description: { type: String },
        tags: [{ type: String }],
        attributes: { type: Map, of: String }, // arbitrary key/value attributes
    },
    { timestamps: true }
);

ProductSchema.pre('save', function (next) {
    if (this.unitPrice && this.costPrice && this.costPrice > 0) {
        this.marginPct = Number((((this.unitPrice - this.costPrice) / this.unitPrice) * 100).toFixed(2));
    }
    if (this.discontinued && !this.discontinuedAt) {
        this.discontinuedAt = new Date();
    }
    next();
});

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
