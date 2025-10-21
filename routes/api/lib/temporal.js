// Temporal helper functions
// Provides: resolveTemporalRange(question), inferDateField(collection), applyTemporalGuard(question, spec)

function resolveTemporalRange(question) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    if (/this month/i.test(question)) return { start: startOfMonth, end: startOfNextMonth };
    if (/today/i.test(question)) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start); end.setDate(end.getDate() + 1); return { start, end };
    }
    const lastNDaysMatch = question.match(/(?:last|past)\s+(\d{1,3})\s+days?/i);
    if (lastNDaysMatch) {
        const n = parseInt(lastNDaysMatch[1], 10);
        if (n > 0 && n <= 365) { const end = new Date(); const start = new Date(end.getTime() - n * 86400000); return { start, end }; }
    }
    if (/(last|past)\s+week/i.test(question)) { const end = new Date(); const start = new Date(end.getTime() - 7 * 86400000); return { start, end }; }
    const lastNWeeksMatch = question.match(/(?:last|past)\s+(\d{1,2})\s+weeks?/i);
    if (lastNWeeksMatch) { const w = parseInt(lastNWeeksMatch[1], 10); if (w > 0 && w <= 52) { const end = new Date(); const start = new Date(end.getTime() - w * 7 * 86400000); return { start, end }; } }
    if (/last month/i.test(question) || /previous month/i.test(question)) { const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); const end = new Date(now.getFullYear(), now.getMonth(), 1); return { start, end }; }
    const lastNMonthsMatch = question.match(/(?:last|past)\s+(\d{1,2})\s+months?/i);
    if (lastNMonthsMatch) { const m = parseInt(lastNMonthsMatch[1], 10); if (m > 0 && m <= 24) { const end = new Date(); const start = new Date(end.getFullYear(), end.getMonth() - m, end.getDate()); return { start, end }; } }
    if (/last year/i.test(question)) { const start = new Date(now.getFullYear() - 1, 0, 1); const end = new Date(now.getFullYear(), 0, 1); return { start, end }; }
    if (/(last|past)\s+quarter/i.test(question)) {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarter = (currentQuarter + 3 - 1) % 4;
        const yearAdjustment = currentQuarter === 0 ? -1 : 0;
        const year = now.getFullYear() + yearAdjustment;
        const start = new Date(year, lastQuarter * 3, 1);
        const end = new Date(year, lastQuarter * 3 + 3, 1);
        return { start, end };
    }
    const lastNQuartersMatch = question.match(/(?:last|past)\s+(\d{1,2})\s+quarters?/i);
    if (lastNQuartersMatch) {
        const q = parseInt(lastNQuartersMatch[1], 10);
        if (q > 0 && q <= 8) {
            const end = new Date();
            const endQuarterIndex = Math.floor(end.getMonth() / 3);
            let startQuarterAbsolute = endQuarterIndex - q;
            let startYear = end.getFullYear();
            while (startQuarterAbsolute < 0) { startQuarterAbsolute += 4; startYear -= 1; }
            const start = new Date(startYear, startQuarterAbsolute * 3, 1);
            return { start, end };
        }
    }
    if (/past 7 days|last 7 days/i.test(question)) { const end = new Date(); const start = new Date(end.getTime() - 7 * 86400000); return { start, end }; }
    if (/past 30 days|last 30 days/i.test(question)) { const end = new Date(); const start = new Date(end.getTime() - 30 * 86400000); return { start, end }; }
    if (/ytd|year to date/i.test(question)) { const start = new Date(now.getFullYear(), 0, 1); return { start, end: now }; }
    if (/qtd|quarter to date|this quarter/i.test(question)) { const quarter = Math.floor(now.getMonth() / 3); const start = new Date(now.getFullYear(), quarter * 3, 1); return { start, end: now }; }
    return null;
}

function inferDateField(collection) {
    switch (collection) {
        case 'Order': return 'orderDate';
        case 'Booking': return 'bookingDate';
        default: return 'createdAt';
    }
}

function applyTemporalGuard(question, spec) {
    const range = resolveTemporalRange(question);
    if (!range) return spec;
    const { start, end } = range;
    const dateMatch = { $gte: start, $lt: end };
    if (spec.type === 'mongo-aggregate') {
        const dateField = inferDateField(spec.collection);
        let injected = false;
        for (const st of spec.pipeline) {
            if (st.$match && st.$match[dateField]) {
                const existing = st.$match[dateField];
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
        spec.filter = spec.filter || {};
        if (!spec.filter[dateField]) {
            spec.filter[dateField] = dateMatch;
        } else {
            const current = spec.filter[dateField];
            if (typeof current === 'string') {
                spec.filter[dateField] = { $gte: start, $lt: end };
            } else if (typeof current === 'object' && !(current instanceof Date)) {
                const gteVal = current.$gte || current.$gt;
                const ltVal = current.$lt || current.$lte;
                const isOutOfRange = (gteVal instanceof Date && gteVal < start) || (typeof gteVal === 'string' && !gteVal.startsWith(start.toISOString().slice(0, 10)));
                if (!gteVal || isOutOfRange) current.$gte = start;
                if (!ltVal) current.$lt = end;
                if (current.$gt && !current.$gte) { current.$gte = current.$gt; delete current.$gt; }
                if (current.$lte && !current.$lt) { current.$lt = current.$lte; delete current.$lte; }
            }
        }
    }
    return spec;
}

module.exports = { resolveTemporalRange, inferDateField, applyTemporalGuard };
