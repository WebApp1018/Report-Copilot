const mongoose = require('mongoose');

// Booking schema: e.g. reservations (hotel, service, etc.).
const BookingSchema = new mongoose.Schema(
    {
        customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
        bookingDate: { type: Date, required: true, default: Date.now, index: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        status: { type: String, enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'], default: 'PENDING', index: true },
        city: { type: String, index: true },
        totalPrice: { type: Number, required: true },
        notes: { type: String },
    },
    { timestamps: true }
);

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
