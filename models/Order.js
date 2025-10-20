const mongoose = require('mongoose');

// Subdocument schema for items within an Order.
const OrderItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true }, // captured at time of order
    },
    { _id: false }
);

const OrderSchema = new mongoose.Schema(
    {
        customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
        orderDate: { type: Date, required: true, default: Date.now, index: true },
        status: { type: String, enum: ['PENDING', 'PAID', 'SHIPPED', 'CANCELLED'], default: 'PENDING', index: true },
        items: { type: [OrderItemSchema], default: [] },
        notes: { type: String },
        totalAmount: { type: Number, required: true }, // replicated for faster aggregation
    },
    { timestamps: true }
);

// Pre-save hook to auto-calc totalAmount if not provided.
OrderSchema.pre('validate', function (next) {
    if (!this.totalAmount || this.totalAmount === 0) {
        this.totalAmount = this.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    }
    next();
});

/**
 * Static: Aggregate revenue by city (customer city) in a date range.
 */
OrderSchema.statics.revenueByCity = async function (start, end) {
    return this.aggregate([
        { $match: { orderDate: { $gte: start, $lt: end } } },
        {
            $lookup: {
                from: 'customers',
                localField: 'customer',
                foreignField: '_id',
                as: 'cust',
            },
        },
        { $unwind: '$cust' },
        { $group: { _id: '$cust.city', revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
        { $project: { _id: 0, city: '$_id', revenue: 1, orders: 1 } },
        { $sort: { revenue: -1 } },
    ]);
};

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);
