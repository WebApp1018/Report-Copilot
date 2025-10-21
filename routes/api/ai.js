/**
 * AI Query Router
 * Translates natural language analytics questions into safe MongoDB specs.
 * Flow: classify -> builder (deterministic) OR LLM -> normalize -> temporal guard
 * -> sanitize -> post-process corrections -> execute -> enrich -> respond.
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { getOpenAI } = require('./lib/openaiClient');
const { SCHEMA_DOC } = require('./lib/constants');
const { applyTemporalGuard } = require('./lib/temporal');
const { classifyQuestion } = require('./lib/builders');
const { isPipelineSafe, sanitizeSpec, ensureDisplayField, postProcessSpec } = require('./lib/specUtils');
const { unwrapDates, convertISOComparators } = require('./lib/normalize');
const { enrichBestSellingProducts, genericNameEnrichment, enrichOrdersWithCustomer } = require('./lib/enrich');

// Register models
require('../../models/Customer');
require('../../models/Product');
require('../../models/Order');
require('../../models/Booking');

const Customer = mongoose.model('Customer');
const Product = mongoose.model('Product');
const Order = mongoose.model('Order');
const Booking = mongoose.model('Booking');

router.get('/schema', (req, res) => res.json({ schema: SCHEMA_DOC }));

/**
 * POST /api/ai/query
 * Body: { question: string }
 * Returns: { question, spec, data, count, description, chart, classification, usedBuilder }
 */
router.post('/query', async (req, res) => {
    const { question } = req.body || {};
    if (!question || typeof question !== 'string') return res.status(400).json({ error: 'question (string) is required' });
    try {
        // Classification + builder
        const classification = classifyQuestion(question);
        let spec = null; let raw = null; let cleaned = null; let usedBuilder = false;
        const allowBuilders = (process.env.AI_CATEGORY_MODE === '1' || process.env.AI_CATEGORY_MODE === 'true' || process.env.AI_CATEGORY_MODE === undefined);
        if (classification && allowBuilders) {
            try { spec = classification.builder(question); usedBuilder = true; } catch (e) { console.warn('Builder failed, falling back to LLM', e); }
        }
        // Fallback to LLM
        if (!spec) { // Fallback to LLM if no builder matched or builder failed
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
            raw = response.choices?.[0]?.message?.content?.trim();
            if (!raw) return res.status(502).json({ error: 'Empty model response' });
            function sanitizeModelJSON(txt) {
                if (!txt) return txt;
                let out = txt.trim();
                out = out.replace(/```(?:json)?/gi, '');
                out = out.replace(/ISODate\((['"])(.*?)\1\)/g, '"$2"');
                out = out.replace(/,\s*(?=[}\]])/g, '');
                return out.trim();
            }
            cleaned = raw;
            try { spec = JSON.parse(cleaned); } catch (e1) {
                cleaned = sanitizeModelJSON(raw);
                try { spec = JSON.parse(cleaned); } catch (e2) {
                    const singleQuoteFixed = cleaned.replace(/'([^']*)'/g, (m, g1) => { if (g1.includes('"')) return m; return '"' + g1.replace(/"/g, '\\"') + '"'; });
                    try { spec = JSON.parse(singleQuoteFixed); } catch (e3) { return res.status(422).json({ error: 'Model did not return valid JSON', raw, cleaned }); }
                }
            }
        }
        // Normalize: unwrap { $date: ... } and convert ISO comparator strings to Date objects
        try {
            unwrapDates(spec);
            convertISOComparators(spec.filter);
            if (Array.isArray(spec.pipeline)) spec.pipeline.forEach(s => { if (s.$match) convertISOComparators(s.$match); });
        } catch (e) { console.warn('normalization failed', e); }
        // Basic validation & safety checks
        if (!['mongo-aggregate', 'mongo-find'].includes(spec.type)) return res.status(400).json({ error: 'Unsupported spec type', spec });
        if (!spec.collection) return res.status(400).json({ error: 'Missing collection', spec });
        if (spec.type === 'mongo-aggregate' && !isPipelineSafe(spec.pipeline)) return res.status(400).json({ error: 'Unsafe pipeline stage detected' });
        if (spec.type === 'mongo-find') spec.limit = Math.min(spec.limit || 50, 100);
        // Temporal guard + field sanitization + display field guarantee
        applyTemporalGuard(question, spec);
        sanitizeSpec(spec);
        ensureDisplayField(spec);
        if (!spec.meta?.builderUsed) postProcessSpec(question, spec);
        // Execute query against Mongoose model
        const modelMap = { Customer, Product, Order, Booking };
        const Model = modelMap[spec.collection];
        if (!Model) return res.status(400).json({ error: 'Unknown collection', spec });
        let data = [];
        if (spec.type === 'mongo-aggregate') {
            if (!spec.pipeline.some(s => s.$limit)) spec.pipeline.push({ $limit: 50 });
            data = await Model.aggregate(spec.pipeline).exec();
        } else {
            data = await Model.find(spec.filter || {}, spec.projection || {}, { limit: spec.limit, sort: spec.sort || undefined }).lean().exec();
        }
        // Enrichment chain: ensure product/customer names & order customer details present
        data = await enrichBestSellingProducts(question, spec, data, Product);
        data = await genericNameEnrichment(spec, data, { Product, Customer });
        data = await enrichOrdersWithCustomer(question, spec, data, Customer);
        return res.json({ question, spec, count: data.length, data, description: spec.description || null, chart: spec.chart || null, classification: spec.meta || (classification ? { category: classification.category, subcategory: classification.subcategory } : null), usedBuilder });
    } catch (err) {
        console.error('AI query error', err);
        return res.status(500).json({ error: 'Internal error', details: err.message });
    }
});

module.exports = router;
