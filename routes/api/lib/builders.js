// Classification builders: map regex patterns to deterministic spec builders.
// Each builder returns a spec object with meta { category, subcategory, builderUsed: true }.

const { resolveTemporalRange } = require('./temporal');
const { ALLOWED_FIELDS } = require('./constants');

const CATEGORY_BUILDERS = [
    {
        id: 'vipCustomers',
        category: 'customers',
        patterns: [/\bvip customers?\b|\bvip\b/i],
        builder: (question) => {
            const thresholdMatch = question.match(/vip[^0-9]{0,10}(\d{2,5})/i) || question.match(/(\d{2,5})\s*\+?\s*vip/i);
            const vipThreshold = thresholdMatch ? Math.min(parseInt(thresholdMatch[1], 10) || 300, 100000) : 300;
            return {
                type: 'mongo-find',
                collection: 'Customer',
                filter: { loyaltyPoints: { $gte: vipThreshold } },
                projection: { name: 1, loyaltyPoints: 1, email: 1, city: 1, segment: 1, lifetimeValue: 1 },
                fields: ['name', 'loyaltyPoints', 'email', 'city', 'segment', 'lifetimeValue'],
                limit: 50,
                description: `VIP customers (loyaltyPoints >= ${vipThreshold}).`,
                chart: { type: 'bar', x: 'name', y: 'loyaltyPoints' },
                meta: { category: 'customers', subcategory: 'vipCustomers', builderUsed: true }
            };
        }
    },
    {
        id: 'customersOrderedNPlus',
        category: 'customers',
        patterns: [/customers? who ordered/i, /customers? with \d+\+? orders/i, /ordered \d+\+/i],
        builder: (question) => {
            let orderThreshold = 1;
            const numMatch = question.match(/ordered\s+(\d{1,3})\+?/i) || question.match(/with\s+(\d{1,3})\+?\s+orders/i) || question.match(/(\d{1,3})\+?\s+orders/i);
            if (numMatch) orderThreshold = parseInt(numMatch[1], 10) || orderThreshold;
            const pipeline = [
                { $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } },
                { $project: ALLOWED_FIELDS.Customer.reduce((acc, f) => { acc[f] = 1; return acc; }, { _id: 1, ordersCount: { $size: { $ifNull: ['$orders', []] } } }) },
                { $match: { ordersCount: { $gte: orderThreshold } } },
                { $sort: { ordersCount: -1 } },
                { $limit: 50 }
            ];
            return {
                type: 'mongo-aggregate',
                collection: 'Customer',
                pipeline,
                fields: [...ALLOWED_FIELDS.Customer, 'ordersCount'],
                description: `Customers with ${orderThreshold}+ orders.`,
                chart: { type: 'bar', x: 'name', y: 'ordersCount' },
                meta: { category: 'customers', subcategory: 'customersOrderedNPlus', builderUsed: true, params: { orderThreshold } }
            };
        }
    },
    {
        id: 'topCustomer',
        category: 'customers',
        patterns: [/top customer|top customers|best customer/i],
        builder: (question) => {
            const range = resolveTemporalRange(question);
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
            return {
                type: 'mongo-aggregate',
                collection: 'Order',
                pipeline,
                fields: ['name', 'email', 'totalSpent', 'orders'],
                description: 'Top customer by total spending in the specified period.',
                chart: { type: 'bar', x: 'name', y: 'totalSpent' },
                meta: { category: 'customers', subcategory: 'topCustomer', builderUsed: true }
            };
        }
    },
    {
        id: 'bestSellingProducts',
        category: 'products',
        patterns: [/best selling product|best-selling product|top product|top products|most sold product|most sold products|best sellers?/i],
        builder: (question) => {
            const plural = /products/i.test(question);
            const limitN = plural ? 5 : 1;
            const range = resolveTemporalRange(question);
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
            return {
                type: 'mongo-aggregate',
                collection: 'Order',
                pipeline,
                fields: ['name', 'sku', 'category', 'brand', 'totalQty', 'revenue', 'totalSales', 'avgUnitPrice', 'orders'],
                description: plural ? 'Top selling products by quantity.' : 'Best selling product by quantity.',
                chart: { type: 'bar', x: 'name', y: 'totalQty' },
                meta: { category: 'products', subcategory: 'bestSellingProducts', builderUsed: true, params: { limit: limitN } }
            };
        }
    },
    {
        id: 'revenueByCity',
        category: 'orders',
        patterns: [/revenue by city|sales by city|revenue per city|sales per city/i],
        builder: (question) => {
            const range = resolveTemporalRange(question);
            const pipeline = [];
            if (range) pipeline.push({ $match: { orderDate: { $gte: range.start, $lt: range.end } } });
            pipeline.push(
                { $lookup: { from: 'customers', localField: 'customer', foreignField: '_id', as: 'customer' } },
                { $unwind: '$customer' },
                { $group: { _id: '$customer.city', totalRevenue: { $sum: '$grandTotal' } } },
                { $project: { _id: 0, city: '$_id', totalRevenue: 1 } },
                { $match: { city: { $ne: null } } },
                { $sort: { totalRevenue: -1 } },
                { $limit: 50 }
            );
            return {
                type: 'mongo-aggregate',
                collection: 'Order',
                pipeline,
                fields: ['city', 'totalRevenue'],
                description: 'Total revenue grouped by city in the specified period.',
                chart: { type: 'bar', x: 'city', y: 'totalRevenue' },
                meta: { category: 'orders', subcategory: 'revenueByCity', builderUsed: true }
            };
        }
    },
    {
        id: 'lastOrder',
        category: 'orders',
        patterns: [/who made the last order|last order who|most recent order|latest order/i],
        builder: () => ({
            type: 'mongo-find',
            collection: 'Order',
            filter: {},
            sort: { orderDate: -1 },
            limit: 1,
            projection: { orderNumber: 1, orderDate: 1, customer: 1, status: 1, grandTotal: 1 },
            fields: ['orderNumber', 'orderDate', 'customer', 'status', 'grandTotal'],
            description: 'Most recent order with customer details.',
            chart: { type: 'table' },
            meta: { category: 'orders', subcategory: 'lastOrder', builderUsed: true }
        })
    }
];

function classifyQuestion(question) {
    for (const def of CATEGORY_BUILDERS) {
        if (def.patterns.some(rx => rx.test(question))) {
            return { category: def.category, subcategory: def.id, builder: def.builder };
        }
    }
    return null;
}

module.exports = { CATEGORY_BUILDERS, classifyQuestion };
