// Central constants for AI query system
// Schema documentation provided to LLM. Keep concise but informative.

const SCHEMA_DOC = `You convert natural language business questions into STRICT JSON specs.
Return one of:
 { "type": "mongo-aggregate", "collection": <Customer|Product|Order|Booking>, "pipeline": [...], "fields": [..], "description": <sentence>, "chart": { "type": bar|line|pie|table, "x"?: field, "y"?: field } }
 OR
 { "type": "mongo-find", "collection": <..>, "filter": {...}, "projection": {...}, "sort"?: {...}, "limit"?: number, "fields": [..], "description": <sentence>, "chart"?: {...} }.
Enriched collections (subset of useful analytical fields):
Customer: name, firstName, lastName, email, phone, city, state, country, postalCode, segment, marketingOptIn, loyaltyPoints, lifetimeValue, lastOrderDate, createdAt
Product: name, sku, category, brand, unitPrice, costPrice, msrp, marginPct, stockQty, reorderLevel, active, discontinued, taxRate, createdAt
Order: orderNumber, orderDate, status, paymentMethod, sourceChannel, subtotalAmount, discountAmount, shippingCost, taxAmount, grandTotal, customer, items(product, quantity, unitPrice, discountPct)
Booking: referenceCode, bookingDate, startDate, endDate, status, bookingType, paymentStatus, roomType, city, totalPrice, taxAmount, guests(adults, children), addons, rating
Constraints:
- READ ONLY. Never use write/update/delete stages (no $out/$merge/$function/etc).
- For temporal phrases (this month, today, last month, last year, past 7 days, past 30 days, YTD, QTD) include date range match on the proper date field.
- Ranking / totals => prefer mongo-aggregate with $group / $sort / $limit.
- Limit result sets to <= 50 unless explicitly requesting more.
- Provide a chart suggestion when appropriate (ranking->bar, time series->line, distribution->pie, single summary->table).
Output ONLY raw JSON for one spec; no commentary or markdown.
`;

// Whitelisted fields per collection for sanitization.
const ALLOWED_FIELDS = {
    Customer: ['name', 'firstName', 'lastName', 'email', 'phone', 'city', 'state', 'country', 'postalCode', 'segment', 'marketingOptIn', 'loyaltyPoints', 'lifetimeValue', 'lastOrderDate', 'createdAt'],
    Product: ['name', 'sku', 'category', 'brand', 'unitPrice', 'costPrice', 'msrp', 'marginPct', 'stockQty', 'reorderLevel', 'active', 'discontinued', 'taxRate', 'createdAt'],
    Order: ['orderNumber', 'orderDate', 'status', 'paymentMethod', 'sourceChannel', 'subtotalAmount', 'discountAmount', 'shippingCost', 'taxAmount', 'grandTotal', 'customer', 'items'],
    Booking: ['referenceCode', 'bookingDate', 'startDate', 'endDate', 'status', 'bookingType', 'paymentStatus', 'roomType', 'city', 'totalPrice', 'taxAmount', 'guests', 'addons', 'rating'],
};

module.exports = { SCHEMA_DOC, ALLOWED_FIELDS };
