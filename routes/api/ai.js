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

// Schema description sent to LLM (keep concise to stay under context limits)
const SCHEMA_DOC = `You are an assistant that converts natural language business questions into a JSON instruction to query a MongoDB database using either: { type: "mongo-aggregate", collection: <name>, pipeline: [...], fields: [<field names to display>], description: <summary sentence>, chart: { type: bar|line|pie|table, x?: field, y?: field } } OR { type: "mongo-find", collection: <name>, filter: {...}, projection: {...}, sort?: {...}, limit?: number, fields: [...], description: <summary>, chart?: {...} }.
Collections and fields:
Customer: { name, email, city, state, createdAt }
Product: { name, sku, category, unitPrice, createdAt }
Order: { customer (ref Customer), orderDate, status, items[{ product (ref Product), quantity, unitPrice }], totalAmount }
Booking: { customer (ref Customer), bookingDate, startDate, endDate, status, city, totalPrice }
Constraints:
- Only read-only queries. Never write/update/delete.
- If a time period like 'this month' is mentioned, include a $match with orderDate/bookingDate range.
- Prefer aggregations for rankings (top, best selling, total, sum, count) using mongo-aggregate.
- Limit results to at most 50 documents unless user explicitly requests more.
- Provide chart suggestion when appropriate (e.g., ranking => bar chart, time series => line chart, single aggregate => table).
Output ONLY strict JSON (no markdown fences) matching one of the shapes.
`;

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
        const hasDate = spec.pipeline.some(st => st.$match && st.$match[dateField]);
        if (!hasDate) {
            spec.pipeline.unshift({ $match: { [dateField]: dateMatch } });
        }
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
        let spec;
        try { spec = JSON.parse(raw); } catch (e) {
            return res.status(422).json({ error: 'Model did not return valid JSON', raw });
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

        return res.json({ question, spec, count: data.length, data, description: spec.description || null, chart: spec.chart || null });
    } catch (err) {
        console.error('AI query error', err);
        return res.status(500).json({ error: 'Internal error', details: err.message });
    }
});

module.exports = router;
