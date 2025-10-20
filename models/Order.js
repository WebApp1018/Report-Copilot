const mongoose = require('mongoose');

// Subdocument schema for items within an Order.
const OrderItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true }, // captured at time of order
        discountPct: { type: Number, default: 0 }, // per-line discount percentage
    },
    { _id: false }
);

const OrderSchema = new mongoose.Schema(
    {
        customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
        orderDate: { type: Date, required: true, default: Date.now, index: true },
        orderNumber: { type: String, unique: true, index: true },
        status: { type: String, enum: ['PENDING', 'PAID', 'SHIPPED', 'CANCELLED'], default: 'PENDING', index: true },
        paymentMethod: { type: String, enum: ['CARD', 'PAYPAL', 'WIRE', 'COD'], default: 'CARD', index: true },
        currency: { type: String, default: 'USD' },
        sourceChannel: { type: String, enum: ['WEB', 'MOBILE', 'PHONE', 'STORE'], default: 'WEB', index: true },
        items: { type: [OrderItemSchema], default: [] },
        notes: { type: String },
        // Monetary breakdown
        subtotalAmount: { type: Number }, // sum of line items before discounts/tax
        discountAmount: { type: Number, default: 0 },
        shippingCost: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true }, // previous meaning retained (pre-tax maybe) but we'll derive
        grandTotal: { type: Number }, // final payable amount
        fulfillmentDate: { type: Date },
        cancellationDate: { type: Date },
        // Snapshot shipping address (could duplicate customer address)
        shippingAddress: {
            name: String,
            address1: String,
            address2: String,
            city: String,
            state: String,
            postalCode: String,
            country: String,
        },
    },
    { timestamps: true }
);

// Pre-validate hook to auto-calc monetary fields & orderNumber.
OrderSchema.pre('validate', function (next) {
    // Generate orderNumber if missing (simple timestamp + random)
    if (!this.orderNumber) {
        this.orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    }
    // Compute subtotal from items (consider per-line discount)
    this.subtotalAmount = this.items.reduce((sum, i) => {
        const line = i.quantity * i.unitPrice;
        const discount = i.discountPct ? line * (i.discountPct / 100) : 0;
        return sum + (line - discount);
    }, 0);
    if (!this.totalAmount || this.totalAmount === 0) {
        // Maintain backwards compatibility: totalAmount mirrors subtotal here
        this.totalAmount = Number(this.subtotalAmount.toFixed(2));
    }
    // Ensure numeric fields present
    this.discountAmount = Number((this.discountAmount || 0).toFixed(2));
    this.shippingCost = Number((this.shippingCost || 0).toFixed(2));
    this.taxAmount = Number((this.taxAmount || 0).toFixed(2));
    // Grand total calculation
    const grand = this.subtotalAmount - this.discountAmount + this.shippingCost + this.taxAmount;
    this.grandTotal = Number(grand.toFixed(2));
    // Fulfillment / cancellation dates consistency
    if (this.status === 'SHIPPED' && !this.fulfillmentDate) this.fulfillmentDate = new Date();
    if (this.status === 'CANCELLED' && !this.cancellationDate) this.cancellationDate = new Date();
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
