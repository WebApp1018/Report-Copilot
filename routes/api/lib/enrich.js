// Result enrichment helpers.
const mongoose = require('mongoose');

async function enrichBestSellingProducts(question, spec, data, Product) {
    if (!/best selling product|best-selling product|top product|top products|most sold product|most sold products|best sellers?/i.test(question)) return data;
    const needsEnrichment = Array.isArray(data) && data.length > 0 && !data[0].name && (data[0].productId || data[0]._id);
    if (!needsEnrichment) return data;
    try {
        const ids = data.map(d => d.productId || d._id).filter(Boolean);
        const products = await Product.find({ _id: { $in: ids } }, { name: 1, sku: 1, category: 1, brand: 1 }).lean();
        const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));
        data = data.map(d => {
            const pid = (d.productId || d._id || '').toString();
            const p = productMap[pid];
            if (p) {
                return { productId: d.productId || d._id, name: p.name, sku: p.sku, category: p.category, brand: p.brand, totalQty: d.totalQty || d.quantity || null, revenue: d.revenue || d.totalSales || null, totalSales: d.totalSales || d.revenue || null, orders: d.orders || null, avgUnitPrice: d.avgUnitPrice || null };
            }
            return d;
        });
        let missing = data.filter(r => !r.name);
        if (missing.length) {
            const rawIds = missing.map(m => m.productId || m._id).filter(Boolean);
            const casted = rawIds.map(val => { try { return new mongoose.Types.ObjectId(val); } catch { return null; } }).filter(Boolean);
            const aggProducts = await Product.aggregate([
                { $match: { _id: { $in: casted } } },
                { $project: { name: 1, sku: 1, category: 1, brand: 1 } }
            ]);
            const aggMap = Object.fromEntries(aggProducts.map(p => [p._id.toString(), p]));
            data = data.map(d => {
                if (!d.name) {
                    const pid = (d.productId || d._id || '').toString();
                    const p = aggMap[pid];
                    if (p) return { ...d, name: p.name, sku: p.sku, category: p.category, brand: p.brand };
                    return { ...d, name: 'Unknown Product' };
                }
                return d;
            });
        }
        if (data.length && !data[0].name) {
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const pid = row.productId || row._id; if (!pid) continue;
                try {
                    const prod = await Product.findById(pid, { name: 1, sku: 1, category: 1, brand: 1 }).lean();
                    if (prod) {
                        data[i] = { productId: pid, name: prod.name, sku: prod.sku, category: prod.category, brand: prod.brand, totalQty: row.totalQty || null, revenue: row.revenue || row.totalSales || null, totalSales: row.totalSales || row.revenue || null, orders: row.orders || null, avgUnitPrice: row.avgUnitPrice || null };
                    }
                } catch { }
            }
            data = data.map(r => r.name ? r : { ...r, name: 'Unknown Product' });
        }
    } catch (e) {
        console.warn('Enrichment for product names failed', e);
    }
    return data;
}

async function genericNameEnrichment(spec, data, { Product, Customer }) {
    try {
        if (!(Array.isArray(data) && data.length > 0 && !data[0].name)) return data;
        const productIds = []; const customerIds = [];
        data.forEach(row => {
            if (row.productId && mongoose.Types.ObjectId.isValid(row.productId)) productIds.push(row.productId);
            if (row.customerId && mongoose.Types.ObjectId.isValid(row.customerId)) customerIds.push(row.customerId);
            if (spec.collection === 'Product' && row._id && mongoose.Types.ObjectId.isValid(row._id)) productIds.push(row._id);
            if (spec.collection === 'Customer' && row._id && mongoose.Types.ObjectId.isValid(row._id)) customerIds.push(row._id);
            if (spec.collection === 'Order' && row.customer && mongoose.Types.ObjectId.isValid(row.customer)) customerIds.push(row.customer);
        });
        const unique = arr => Array.from(new Set(arr.map(id => id.toString())));
        const prodUnique = unique(productIds); const custUnique = unique(customerIds);
        let prodMap = {}; let custMap = {};
        if (prodUnique.length) {
            const prods = await Product.find({ _id: { $in: prodUnique } }, { name: 1, sku: 1, category: 1, brand: 1 }).lean();
            prodMap = Object.fromEntries(prods.map(p => [p._id.toString(), p]));
        }
        if (custUnique.length) {
            const custs = await Customer.find({ _id: { $in: custUnique } }, { name: 1, firstName: 1, lastName: 1, email: 1 }).lean();
            custMap = Object.fromEntries(custs.map(c => [c._id.toString(), c]));
        }
        if (Object.keys(prodMap).length || Object.keys(custMap).length) {
            data = data.map(row => {
                if (!row.name) {
                    let pid = row.productId || (spec.collection === 'Product' ? row._id : null);
                    let cid = row.customerId || (spec.collection === 'Customer' ? row._id : null);
                    if (!cid && spec.collection === 'Order' && row.customer && mongoose.Types.ObjectId.isValid(row.customer)) cid = row.customer;
                    if (pid && prodMap[pid.toString()]) {
                        const p = prodMap[pid.toString()];
                        return { ...row, name: p.name, sku: p.sku, category: p.category, brand: p.brand };
                    }
                    if (cid && custMap[cid.toString()]) {
                        const c = custMap[cid.toString()];
                        const displayName = c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown Customer';
                        return { ...row, name: displayName, email: c.email };
                    }
                }
                return row;
            });
        }
        if (['Product', 'Customer'].includes(spec.collection)) {
            data = data.map(r => r.name ? r : { ...r, name: spec.collection === 'Product' ? 'Unknown Product' : 'Unknown Customer' });
        }
    } catch (e) {
        console.warn('generic name enrichment failed', e);
    }
    return data;
}

async function enrichOrdersWithCustomer(question, spec, data, Customer) {
    try {
        if (spec.collection !== 'Order' || !Array.isArray(data) || !data.length) return data;
        const triggerLastOrder = /who made the last order|last order who/i.test(question);
        const needsEnrichment = triggerLastOrder || data.some(r => r.customer && !r.customerName);
        if (!needsEnrichment) return data;
        const ids = Array.from(new Set(data.filter(r => r.customer).map(r => r.customer).filter(id => mongoose.Types.ObjectId.isValid(id))));
        if (!ids.length) return data;
        const customers = await Customer.find({ _id: { $in: ids } }, { name: 1, firstName: 1, lastName: 1, email: 1 }).lean();
        const cMap = Object.fromEntries(customers.map(c => [c._id.toString(), c]));
        data = data.map(r => {
            if (r.customer && cMap[r.customer.toString()]) {
                const c = cMap[r.customer.toString()];
                const displayName = c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown Customer';
                return { ...r, customerName: displayName, customerEmail: c.email };
            }
            return r;
        });
        if (Array.isArray(spec.fields)) {
            if (!spec.fields.includes('customerName')) spec.fields.push('customerName');
            if (!spec.fields.includes('customerEmail')) spec.fields.push('customerEmail');
        }
        if (triggerLastOrder && !spec.description) spec.description = 'Most recent order with customer name and email.';
    } catch (e) {
        console.warn('order customer enrichment failed', e);
    }
    return data;
}

module.exports = { enrichBestSellingProducts, genericNameEnrichment, enrichOrdersWithCustomer };
