const mongoose = require('mongoose');

// Booking schema: e.g. reservations (hotel, service, etc.). Enriched for realism.
const BookingSchema = new mongoose.Schema(
    {
        customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
        bookingDate: { type: Date, required: true, default: Date.now, index: true },
        referenceCode: { type: String, unique: true, index: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        status: { type: String, enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'], default: 'PENDING', index: true },
        bookingType: { type: String, enum: ['HOTEL', 'TOUR', 'EVENT', 'SERVICE'], default: 'HOTEL', index: true },
        roomType: { type: String },
        guests: {
            adults: { type: Number, default: 1 },
            children: { type: Number, default: 0 },
        },
        addons: [{ type: String }], // e.g. breakfast, spa, parking
        paymentStatus: { type: String, enum: ['UNPAID', 'PAID', 'REFUNDED', 'PARTIAL'], default: 'UNPAID', index: true },
        currency: { type: String, default: 'USD' },
        city: { type: String, index: true },
        totalPrice: { type: Number, required: true },
        taxAmount: { type: Number, default: 0 },
        cancellationPolicy: { type: String },
        channel: { type: String, enum: ['WEB', 'MOBILE', 'AGENT', 'PHONE'], default: 'WEB', index: true },
        rating: { type: Number, min: 1, max: 5 }, // user rating after completion
        notes: { type: String },
    },
    { timestamps: true }
);

BookingSchema.pre('validate', function (next) {
    if (!this.referenceCode) {
        this.referenceCode = 'BKG-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    }
    next();
});

/**
 * Static: Total booking price for customers in a specific city.
 */
BookingSchema.statics.totalPriceForCity = async function (city, start, end) {
    const match = { city };
    if (start || end) {
        match.bookingDate = {};
        if (start) match.bookingDate.$gte = start;
        if (end) match.bookingDate.$lt = end;
    }
    const res = await this.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$totalPrice' }, bookings: { $sum: 1 } } },
    ]);
    return res[0] || { total: 0, bookings: 0 };
};

module.exports = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
