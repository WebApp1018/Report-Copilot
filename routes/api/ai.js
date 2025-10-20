const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const mongoose = require('mongoose');

// Ensure models are registered (require the model files)
require('../../models/Customer');
require('../../models/Product');
require('../../models/Order');
require('../../models/Booking');

const Customer = mongoose.model('Customer');
const Product = mongoose.model('Product');
const Order = mongoose.model('Order');
const Booking = mongoose.model('Booking');

// Lazy init OpenAI client
let openaiClient = null;
function getOpenAI() {
    if (!openaiClient) {
        openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openaiClient;
}

// Schema description sent to LLM (kept concise; enriched fields added).
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

// Basic guardrails to ensure only read operations.
function isPipelineSafe(pipeline) {
    return Array.isArray(pipeline) && pipeline.every(stage => {
        const keys = Object.keys(stage);
        return keys.every(k => !['$merge', '$out', '$function'].includes(k));
    });
}

// Derive date range for common temporal phrases.
function resolveTemporalRange(question) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    if (/this month/i.test(question)) {
        return { start: startOfMonth, end: startOfNextMonth };
    }
    if (/today/i.test(question)) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start); end.setDate(end.getDate() + 1);
        return { start, end };
    }
    if (/last month/i.test(question)) {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end };
    }
    if (/last year/i.test(question)) {
        const start = new Date(now.getFullYear() - 1, 0, 1);
        const end = new Date(now.getFullYear(), 0, 1);
        return { start, end };
    }
    if (/past 7 days|last 7 days/i.test(question)) {
        const end = new Date();
        const start = new Date(end.getTime() - 7 * 86400000);
        return { start, end };
    }
    if (/past 30 days|last 30 days/i.test(question)) {
        const end = new Date();
        const start = new Date(end.getTime() - 30 * 86400000);
        return { start, end };
    }
    if (/ytd|year to date/i.test(question)) {
        const start = new Date(now.getFullYear(), 0, 1);
        return { start, end: now };
    }
    if (/qtd|quarter to date|this quarter/i.test(question)) {
        const quarter = Math.floor(now.getMonth() / 3);
        const start = new Date(now.getFullYear(), quarter * 3, 1);
        return { start, end: now };
    }
    return null;
}

// Inject additional date filtering into pipeline or filter if missing when phrase present.
function applyTemporalGuard(question, spec) {
    const range = resolveTemporalRange(question);
    if (!range) return spec;
    const { start, end } = range;
    const dateMatch = { $gte: start, $lt: end };
    if (spec.type === 'mongo-aggregate') {
        const dateField = inferDateField(spec.collection);
        // If no $match with dateField, add one at beginning.
        let injected = false;
        for (const st of spec.pipeline) {
            if (st.$match && st.$match[dateField]) {
                const existing = st.$match[dateField];
                // If existing range is a string dates or clearly not equal to expected month, overwrite.
                const existingStart = existing.$gte || existing.$gt;
                if (!existingStart || (existingStart instanceof Date && (existingStart.getMonth() !== start.getMonth() || existingStart.getFullYear() !== start.getFullYear())) || (typeof existingStart === 'string' && !existingStart.startsWith(start.toISOString().slice(0, 7)))) {
                    st.$match[dateField] = dateMatch;
                }
                injected = true;
                break;
            }
        }
        if (!injected) spec.pipeline.unshift({ $match: { [dateField]: dateMatch } });
    } else if (spec.type === 'mongo-find') {
        const dateField = inferDateField(spec.collection);
        if (!spec.filter[dateField]) spec.filter[dateField] = dateMatch;
    }
    return spec;
}

function inferDateField(collection) {
    switch (collection) {
        case 'Order': return 'orderDate';
        case 'Booking': return 'bookingDate';
        default: return 'createdAt';
    }
}

// Sanitize fields list & optionally build projection for find queries.
function sanitizeSpec(spec) {
    const allowed = ALLOWED_FIELDS[spec.collection] || [];
    if (Array.isArray(spec.fields)) {
        spec.fields = spec.fields.filter(f => allowed.includes(f));
        // Always include _id implicitly
    } else {
        spec.fields = allowed.slice(0, 8); // provide a trimmed default if none
    }
    if (spec.type === 'mongo-find') {
        if (!spec.projection) {
            spec.projection = spec.fields.reduce((acc, f) => { acc[f] = 1; return acc; }, { _id: 1 });
        } else {
            // Remove any projection fields not allowed
            Object.keys(spec.projection).forEach(k => { if (k !== '_id' && !allowed.includes(k)) delete spec.projection[k]; });
        }
    }
    return spec;
}

// Post-process spec to correct common reasoning mistakes from the LLM.
function postProcessSpec(question, spec) {
    try {
        // 1. Normalize $lookup "from" names (Mongoose pluralization) if model names used.
        if (spec.type === 'mongo-aggregate' && Array.isArray(spec.pipeline)) {
            spec.pipeline.forEach(stage => {
                if (stage.$lookup && stage.$lookup.from && ['Customer', 'Product', 'Order', 'Booking'].includes(stage.$lookup.from)) {
                    // naive pluralization: lower-case + 's'
                    stage.$lookup.from = stage.$lookup.from.toLowerCase() + 's';
                }
            });
        }
        // 2. Top customer style queries should aggregate over Orders, not Customers.
        if (/top customer|top customers|best customer/i.test(question)) {
            if (spec.type === 'mongo-aggregate' && spec.collection === 'Customer') {
                const range = resolveTemporalRange(question);
                spec.collection = 'Order';
                const pipeline = [];
                if (range) {
                    pipeline.push({ $match: { orderDate: { $gte: range.start, $lt: range.end } } });
                }
                pipeline.push(
                    { $group: { _id: '$customer', totalSpent: { $sum: '$grandTotal' }, orders: { $sum: 1 } } },
                    { $sort: { totalSpent: -1 } },
                    { $limit: 1 },
                    { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
                    { $unwind: '$customer' },
                    { $project: { _id: 0, customerId: '$_id', name: '$customer.name', email: '$customer.email', totalSpent: 1, orders: 1 } }
                );
                spec.pipeline = pipeline;
                spec.fields = ['name', 'email', 'totalSpent', 'orders'];
                spec.description = spec.description || 'Top customer by total spending in the specified period.';
                spec.chart = spec.chart || { type: 'bar', x: 'name', y: 'totalSpent' };
            }
        }
    } catch (e) {
        // Swallow post-process errors to avoid failing request; log for diagnostics.
        console.warn('postProcessSpec warning', e);
    }
    return spec;
}

// Endpoint: fetch schema doc (helps frontend show available fields or for debug)
router.get('/schema', (req, res) => {
    res.json({ schema: SCHEMA_DOC });
});

// Core endpoint: natural language question to data
router.post('/query', async (req, res) => {
    const { question } = req.body || {};
    if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'question (string) is required' });
    }
    try {
        const openai = getOpenAI();
        const prompt = `${SCHEMA_DOC}\nQuestion: ${question}\nReturn JSON:`;
        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You convert user questions to safe Mongo JSON specs.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.1,
            max_tokens: 500,
        });
        const raw = response.choices?.[0]?.message?.content?.trim();
        if (!raw) return res.status(502).json({ error: 'Empty model response' });

        function sanitizeModelJSON(txt) {
            if (!txt) return txt;
            let cleaned = txt.trim();
            // Strip markdown code fences if present
            cleaned = cleaned.replace(/```(?:json)?/gi, '');
            // Replace ISODate("...") wrappers with the inner ISO string
            cleaned = cleaned.replace(/ISODate\((['"])(.*?)\1\)/g, '"$2"');
            // Remove trailing commas before object / array end
            cleaned = cleaned.replace(/,\s*(?=[}\]])/g, '');
            // If keys are unquoted (rare), attempt a light fix (conservative): key: " -> "key": "
            // Only do this if there are no existing double-quoted keys (heuristic) -- skip if looks already valid
            // cleaned = cleaned.replace(/([,{\n\r\t ])([a-zA-Z0-9_]+)\s*:/g, '$1"$2":'); // (commented out to avoid over-rewriting)
            return cleaned.trim();
        }

        let spec; let cleaned = raw;
        try { spec = JSON.parse(cleaned); } catch (e1) {
            cleaned = sanitizeModelJSON(raw);
            try { spec = JSON.parse(cleaned); } catch (e2) {
                // Last resort: replace single quotes with double if it still fails (but not inside already valid JSON strings pattern)
                const singleQuoteFixed = cleaned.replace(/'([^']*)'/g, (m, g1) => {
                    // If it appears to be inside quotes already or contains double quotes, skip
                    if (g1.includes('"')) return m; return '"' + g1.replace(/"/g, '\\"') + '"';
                });
                try { spec = JSON.parse(singleQuoteFixed); } catch (e3) {
                    return res.status(422).json({ error: 'Model did not return valid JSON', raw, cleaned });
                }
            }
        }

        // Basic shape validation
        if (!['mongo-aggregate', 'mongo-find'].includes(spec.type)) {
            return res.status(400).json({ error: 'Unsupported spec type', spec });
        }
        if (!spec.collection) return res.status(400).json({ error: 'Missing collection', spec });
        if (spec.type === 'mongo-aggregate') {
            if (!isPipelineSafe(spec.pipeline)) return res.status(400).json({ error: 'Unsafe pipeline stage detected' });
        } else if (spec.type === 'mongo-find') {
            spec.limit = Math.min(spec.limit || 50, 100);
        }

        applyTemporalGuard(question, spec);
        sanitizeSpec(spec);
        // Inject additional heuristic rewrites (extend postProcessSpec here to keep order predictable)
        postProcessSpec(question, spec);

        // Additional pattern: best selling product(s)
        if (/best selling product|best-selling product|top product|top products|most sold product|most sold products|best sellers?/i.test(question)) {
            try {
                const plural = /products/i.test(question);
                const limitN = plural ? 5 : 1;
                const range = resolveTemporalRange(question);
                spec.type = 'mongo-aggregate';
                spec.collection = 'Order';
                const pipeline = [];
                if (range) pipeline.push({ $match: { orderDate: { $gte: range.start, $lt: range.end } } });
                pipeline.push(
                    { $unwind: '$items' },
                    { $group: { _id: '$items.product', totalQty: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } }, avgUnitPrice: { $avg: '$items.unitPrice' }, orders: { $addToSet: '$_id' } } },
                    { $addFields: { orders: { $size: '$orders' } } },
                    { $sort: { totalQty: -1, revenue: -1 } },
                    { $limit: limitN },
                    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
                    { $unwind: '$product' },
                    { $project: { _id: 0, productId: '$_id', name: '$product.name', sku: '$product.sku', category: '$product.category', brand: '$product.brand', totalQty: 1, revenue: 1, totalSales: '$revenue', avgUnitPrice: 1, orders: 1 } }
                );
                spec.pipeline = pipeline;
                spec.fields = ['name', 'sku', 'category', 'brand', 'totalQty', 'revenue', 'totalSales', 'avgUnitPrice', 'orders'];
                spec.description = spec.description || (plural ? 'Top selling products by quantity.' : 'Best selling product by quantity.');
                spec.chart = spec.chart || { type: 'bar', x: 'name', y: 'totalQty' };
            } catch (e) {
                console.warn('best selling product rewrite failed', e);
            }
        }

        // Augmentation: If a best-selling product style question produced a simplistic pipeline without product lookup, enrich it in-place.
        if (/best selling product|best-selling product|top product|top products|most sold product|most sold products|best sellers?/i.test(question)) {
            try {
                if (spec.type === 'mongo-aggregate' && spec.collection === 'Order' && Array.isArray(spec.pipeline)) {
                    const hasLookup = spec.pipeline.some(st => st.$lookup && st.$lookup.from === 'products');
                    const groupStage = spec.pipeline.find(st => st.$group && st.$group._id === '$items.product');
                    const hasUnwindItems = spec.pipeline.some(st => st.$unwind && (st.$unwind === '$items' || st.$unwind.path === '$items'));
                    if (groupStage && !hasLookup) {
                        // Ensure we unwound items first
                        if (!hasUnwindItems) {
                            // Insert unwind before group stage
                            const idx = spec.pipeline.indexOf(groupStage);
                            if (idx > -1) spec.pipeline.splice(idx, 0, { $unwind: '$items' });
                        }
                        // Insert lookup + project at end
                        spec.pipeline.push(
                            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
                            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
                            { $project: { _id: 0, productId: '$_id', name: '$product.name', sku: '$product.sku', category: '$product.category', brand: '$product.brand', totalSales: groupStage.$group.totalSales ? 1 : '$totalSales', revenue: '$revenue', totalQty: '$totalQty' } }
                        );
                        // Normalize fields list
                        spec.fields = ['name', 'totalSales', 'totalQty', 'revenue', 'sku', 'category', 'brand'];
                        if (!spec.chart) spec.chart = { type: 'bar', x: 'name', y: 'totalSales' };
                    }
                }
            } catch (e) {
                console.warn('best selling product augmentation failed', e);
            }
        }

        // Additional pattern: revenue by city (sales by city)
        if (/revenue by city|sales by city|revenue per city|sales per city/i.test(question)) {
            try {
                const range = resolveTemporalRange(question);
                spec.type = 'mongo-aggregate';
                spec.collection = 'Order';
                const pipeline = [];
                if (range) pipeline.push({ $match: { orderDate: { $gte: range.start, $lt: range.end } } });
                // Join customer to get city then group
                pipeline.push(
                    { $lookup: { from: 'customers', localField: 'customer', foreignField: '_id', as: 'customer' } },
                    { $unwind: '$customer' },
                    { $group: { _id: '$customer.city', totalRevenue: { $sum: '$grandTotal' } } },
                    { $project: { _id: 0, city: '$_id', totalRevenue: 1 } },
                    { $match: { city: { $ne: null } } },
                    { $sort: { totalRevenue: -1 } },
                    { $limit: 50 }
                );
                spec.pipeline = pipeline;
                spec.fields = ['city', 'totalRevenue'];
                spec.description = spec.description || 'Total revenue grouped by city in the specified period.';
                spec.chart = spec.chart || { type: 'bar', x: 'city', y: 'totalRevenue' };
            } catch (e) {
                console.warn('revenue by city rewrite failed', e);
            }
        }

        // Execute query
        let data = [];
        const modelMap = { Customer, Product, Order, Booking };
        const Model = modelMap[spec.collection];
        if (!Model) return res.status(400).json({ error: 'Unknown collection', spec });

        if (spec.type === 'mongo-aggregate') {
            // Force final $limit if user omitted
            const hasLimit = spec.pipeline.some(s => s.$limit);
            if (!hasLimit) spec.pipeline.push({ $limit: 50 });
            data = await Model.aggregate(spec.pipeline).exec();
        } else {
            data = await Model.find(spec.filter || {}, spec.projection || {}, { limit: spec.limit, sort: spec.sort || undefined }).lean().exec();
        }

        // Post-result enrichment: if best-selling product query returned only _id / totalSales style without name, lookup product names.
        if (/best selling product|best-selling product|top product|top products|most sold product|most sold products|best sellers?/i.test(question)) {
            const needsEnrichment = Array.isArray(data) && data.length > 0 && !data[0].name && (data[0].productId || data[0]._id);
            if (needsEnrichment) {
                try {
                    const ids = data.map(d => d.productId || d._id).filter(Boolean);
                    const products = await Product.find({ _id: { $in: ids } }, { name: 1, sku: 1, category: 1, brand: 1 }).lean();
                    const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));
                    data = data.map(d => {
                        const pid = (d.productId || d._id || '').toString();
                        const p = productMap[pid];
                        if (p) {
                            return {
                                productId: d.productId || d._id,
                                name: p.name,
                                sku: p.sku,
                                category: p.category,
                                brand: p.brand,
                                totalQty: d.totalQty || d.quantity || null,
                                revenue: d.revenue || d.totalSales || null,
                                totalSales: d.totalSales || d.revenue || null,
                                orders: d.orders || null,
                                avgUnitPrice: d.avgUnitPrice || null
                            };
                        }
                        return d;
                    });
                    // Fallback: ensure every row has a name (placeholder) even if lookup failed (e.g., stale reference)
                    let missing = data.filter(r => !r.name);
                    if (missing.length) {
                        // Attempt a second-chance aggregation (handles if ids are strings or need casting)
                        try {
                            const rawIds = missing.map(m => m.productId || m._id).filter(Boolean);
                            const casted = rawIds
                                .map(val => {
                                    try { return new mongoose.Types.ObjectId(val); } catch { return null; }
                                })
                                .filter(Boolean);
                            const aggProducts = await Product.aggregate([
                                { $match: { _id: { $in: casted } } },
                                { $project: { name: 1, sku: 1, category: 1, brand: 1 } }
                            ]);
                            const aggMap = Object.fromEntries(aggProducts.map(p => [p._id.toString(), p]));
                            data = data.map(d => {
                                if (!d.name) {
                                    const pid = (d.productId || d._id || '').toString();
                                    const p = aggMap[pid];
                                    if (p) {
                                        return { ...d, name: p.name, sku: p.sku, category: p.category, brand: p.brand };
                                    }
                                    return { ...d, name: 'Unknown Product' };
                                }
                                return d;
                            });
                        } catch (e) {
                            data = data.map(d => d.name ? d : { ...d, name: 'Unknown Product' });
                        }
                    }
                    // Final safeguard: if still only _id + totalSales, fetch each product individually
                    if (data.length && !data[0].name) {
                        for (let i = 0; i < data.length; i++) {
                            const row = data[i];
                            const pid = row.productId || row._id;
                            if (!pid) continue;
                            try {
                                const prod = await Product.findById(pid, { name: 1, sku: 1, category: 1, brand: 1 }).lean();
                                if (prod) {
                                    data[i] = {
                                        productId: pid,
                                        name: prod.name,
                                        sku: prod.sku,
                                        category: prod.category,
                                        brand: prod.brand,
                                        totalQty: row.totalQty || null,
                                        revenue: row.revenue || row.totalSales || null,
                                        totalSales: row.totalSales || row.revenue || null,
                                        orders: row.orders || null,
                                        avgUnitPrice: row.avgUnitPrice || null
                                    };
                                }
                            } catch { /* ignore single fetch errors */ }
                        }
                        // If still missing name after all attempts, assign placeholder
                        data = data.map(r => r.name ? r : { ...r, name: 'Unknown Product' });
                    }
                } catch (e) {
                    console.warn('Enrichment for product names failed', e);
                }
            }
        }

        return res.json({ question, spec, count: data.length, data, description: spec.description || null, chart: spec.chart || null });
    } catch (err) {
        console.error('AI query error', err);
        return res.status(500).json({ error: 'Internal error', details: err.message });
    }
});

module.exports = router;
