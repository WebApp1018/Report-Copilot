// Normalization utilities: unwrap date wrapper objects and convert ISO strings under comparators.

function unwrapDates(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(unwrapDates);
    if (obj.$date && typeof obj.$date === 'string') {
        const d = new Date(obj.$date);
        if (!isNaN(d.getTime())) return d;
    }
    for (const k of Object.keys(obj)) obj[k] = unwrapDates(obj[k]);
    return obj;
}

function convertISOComparators(obj) {
    if (!obj || typeof obj !== 'object') return;
    const ops = ['$gte', '$gt', '$lt', '$lte'];
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) convertISOComparators(v);
        if (ops.includes(k) && typeof v === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
            const d = new Date(v);
            if (!isNaN(d.getTime())) obj[k] = d;
        }
    }
}

module.exports = { unwrapDates, convertISOComparators };
