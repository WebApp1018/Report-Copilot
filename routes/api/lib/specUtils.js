// Spec utility functions: sanitization, safety checks, post-processing rewrites.
const { ALLOWED_FIELDS } = require('./constants');
const { resolveTemporalRange } = require('./temporal');

function isPipelineSafe(pipeline) {
    return Array.isArray(pipeline) && pipeline.every(stage => {
        const keys = Object.keys(stage);
        return keys.every(k => !['$merge', '$out', '$function'].includes(k));
    });
}

function sanitizeSpec(spec) {
    const allowed = ALLOWED_FIELDS[spec.collection] || [];
    if (Array.isArray(spec.fields)) {
        spec.fields = spec.fields.filter(f => allowed.includes(f));
    } else {
        spec.fields = allowed.slice(0, 8);
    }
    if (spec.type === 'mongo-find') {
        if (!spec.projection) {
            spec.projection = spec.fields.reduce((acc, f) => { acc[f] = 1; return acc; }, { _id: 1 });
        } else {
            Object.keys(spec.projection).forEach(k => { if (k !== '_id' && !allowed.includes(k)) delete spec.projection[k]; });
        }
    }
    return spec;
}

function ensureDisplayField(spec) {
    if ((spec.type === 'mongo-find') && ['Customer', 'Product'].includes(spec.collection)) {
        if (!spec.fields.includes('name')) spec.fields.unshift('name');
        if (spec.projection && spec.projection.name !== 1) spec.projection.name = 1;
    }
    return spec;
}

function postProcessSpec(question, spec) {
    try {
        if (spec.type === 'mongo-aggregate' && Array.isArray(spec.pipeline)) {
            spec.pipeline.forEach(stage => {
                if (stage.$lookup && stage.$lookup.from && ['Customer', 'Product', 'Order', 'Booking'].includes(stage.$lookup.from)) {
                    stage.$lookup.from = stage.$lookup.from.toLowerCase() + 's';
                }
            });
        }
        // top customer queries -> aggregate over Orders
        if (/top customer|top customers|best customer/i.test(question)) {
            if (spec.type === 'mongo-aggregate' && spec.collection === 'Customer') {
                const range = resolveTemporalRange(question);
                spec.collection = 'Order';
                const pipeline = [];
                if (range) pipeline.push({ $match: { orderDate: { $gte: range.start, $lt: range.end } } });
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
        // VIP threshold enforcement
        if (/\bvip customers?\b|\bvip\b/i.test(question)) {
            let vipThreshold = 300;
            const vipNumberMatch = question.match(/vip[^0-9]{0,10}(\d{2,5})/i) || question.match(/(\d{2,5})\s*\+?\s*vip/i);
            if (vipNumberMatch) {
                const candidate = parseInt(vipNumberMatch[1], 10);
                if (candidate > 0 && candidate < 100000) vipThreshold = candidate;
            }
            if (spec.collection === 'Customer') {
                if (spec.type === 'mongo-find') {
                    spec.filter = spec.filter || {};
                    const lp = spec.filter.loyaltyPoints;
                    if (lp) {
                        if (typeof lp === 'number') {
                            if (lp < vipThreshold) spec.filter.loyaltyPoints = { $gte: vipThreshold }; else spec.filter.loyaltyPoints = { $gte: lp };
                        } else if (typeof lp === 'object') {
                            const existingGte = lp.$gte ?? lp.$gt;
                            if (!existingGte || existingGte < vipThreshold) lp.$gte = vipThreshold;
                            delete lp.$gt;
                        } else {
                            spec.filter.loyaltyPoints = { $gte: vipThreshold };
                        }
                    } else {
                        spec.filter.loyaltyPoints = { $gte: vipThreshold };
                    }
                    if (!spec.fields.includes('loyaltyPoints')) spec.fields.push('loyaltyPoints');
                    if (!spec.fields.includes('name')) spec.fields.unshift('name');
                    spec.description = spec.description || `VIP customers (loyaltyPoints >= ${vipThreshold}).`;
                } else if (spec.type === 'mongo-aggregate' && Array.isArray(spec.pipeline)) {
                    const hasLpMatch = spec.pipeline.some(st => st.$match && st.$match.loyaltyPoints);
                    if (!hasLpMatch) spec.pipeline.unshift({ $match: { loyaltyPoints: { $gte: vipThreshold } } });
                    else {
                        spec.pipeline = spec.pipeline.map(st => {
                            if (st.$match && st.$match.loyaltyPoints) {
                                const val = st.$match.loyaltyPoints;
                                if (typeof val === 'number' && val < vipThreshold) st.$match.loyaltyPoints = { $gte: vipThreshold };
                                if (typeof val === 'object') {
                                    const eg = val.$gte ?? val.$gt;
                                    if (!eg || eg < vipThreshold) val.$gte = vipThreshold;
                                    delete val.$gt;
                                }
                            }
                            return st;
                        });
                    }
                    if (!spec.fields.includes('loyaltyPoints')) spec.fields.push('loyaltyPoints');
                    if (!spec.fields.includes('name')) spec.fields.unshift('name');
                    spec.description = spec.description || `VIP customers (loyaltyPoints >= ${vipThreshold}).`;
                }
            }
        }
        // Customers who ordered N+
        if (/customers? who ordered|customers? with \d+\+? orders|ordered \d+\+/i.test(question)) {
            let orderThreshold = 1;
            const numMatch = question.match(/ordered\s+(\d{1,3})\+?/i) || question.match(/with\s+(\d{1,3})\+?\s+orders/i);
            if (numMatch) { const val = parseInt(numMatch[1], 10); if (val > 0) orderThreshold = val; }
            if (spec.type === 'mongo-aggregate' && spec.collection === 'Customer' && Array.isArray(spec.pipeline)) {
                const hasOrdersLookup = spec.pipeline.some(st => st.$lookup && st.$lookup.from === 'orders');
                if (!hasOrdersLookup) spec.pipeline.unshift({ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } });
                const projectIdx = spec.pipeline.findIndex(st => st.$project && st.$project.ordersCount);
                const matchIdx = spec.pipeline.findIndex(st => st.$match && st.$match.ordersCount);
                const allowed = ALLOWED_FIELDS.Customer;
                const baseProjection = allowed.reduce((acc, f) => { acc[f] = 1; return acc; }, { _id: 1 });
                baseProjection.ordersCount = { $size: { $ifNull: ['$orders', []] } };
                if (projectIdx > -1) spec.pipeline[projectIdx].$project = baseProjection;
                else {
                    const lookupIdx = spec.pipeline.findIndex(st => st.$lookup && st.$lookup.from === 'orders');
                    const insertPos = lookupIdx > -1 ? lookupIdx + 1 : 0;
                    spec.pipeline.splice(insertPos, 0, { $project: baseProjection });
                }
                if (matchIdx > -1) {
                    const mc = spec.pipeline[matchIdx].$match.ordersCount;
                    if (typeof mc === 'object') mc.$gte = Math.max(mc.$gte || mc.$gt || orderThreshold, orderThreshold);
                    else if (typeof mc === 'number') spec.pipeline[matchIdx].$match.ordersCount = { $gte: Math.max(mc, orderThreshold) };
                    else spec.pipeline[matchIdx].$match.ordersCount = { $gte: orderThreshold };
                } else {
                    spec.pipeline.push({ $match: { ordersCount: { $gte: orderThreshold } } });
                }
                if (!spec.pipeline.some(st => st.$limit)) spec.pipeline.push({ $limit: 50 });
                spec.fields = [...allowed, 'ordersCount'];
                spec.description = spec.description || `Customers with ${orderThreshold}+ orders.`;
                if (!spec.chart) spec.chart = { type: 'bar', x: 'name', y: 'ordersCount' };
            }
        }
    } catch (e) {
        console.warn('postProcessSpec warning', e);
    }
    return spec;
}

module.exports = { isPipelineSafe, sanitizeSpec, ensureDisplayField, postProcessSpec };
