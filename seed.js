require('dotenv').config();
const mongoose = require('mongoose');

// Register models
require('./models/Customer');
require('./models/Product');
require('./models/Order');
require('./models/Booking');

const Customer = mongoose.model('Customer');
const Product = mongoose.model('Product');
const Order = mongoose.model('Order');
const Booking = mongoose.model('Booking');

async function connect() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/reportcopilot';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function sampleUnique(arr, n) {
    const copy = [...arr];
    const out = [];
    while (copy.length && out.length < n) {
        out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
    }
    return out;
}

// Realistic-ish name pools
const FIRST_NAMES = ['Liam', 'Olivia', 'Noah', 'Emma', 'Elijah', 'Ava', 'Mateo', 'Sophia', 'Lucas', 'Isabella', 'Ethan', 'Mia', 'Logan', 'Amelia', 'James', 'Harper', 'Benjamin', 'Evelyn', 'Henry', 'Luna', 'Sebastian', 'Gianna', 'Jack', 'Aria', 'Owen', 'Scarlett', 'Daniel', 'Penelope', 'Michael', 'Layla'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis'];
const EMAIL_DOMAINS = ['example.com', 'corp.test', 'sample.io', 'demo.dev'];

function buildFullName() { return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; }
function buildEmail(name) {
    const domain = pick(EMAIL_DOMAINS);
    const base = name.toLowerCase().replace(/[^a-z]+/g, '_');
    return `${base}${randInt(1, 999)}@${domain}`;
}

async function clearExisting() {
    await Promise.all([
        Customer.deleteMany({}),
        Product.deleteMany({}),
        Order.deleteMany({}),
        Booking.deleteMany({}),
    ]);
    console.log('Cleared existing collections');
}

async function seedCustomers(count = 40, rangeStart, rangeEnd) {
    const cities = [
        { city: 'New York', state: 'NY' },
        { city: 'San Francisco', state: 'CA' },
        { city: 'Austin', state: 'TX' },
        { city: 'Seattle', state: 'WA' },
        { city: 'Chicago', state: 'IL' },
        { city: 'Miami', state: 'FL' },
        { city: 'Denver', state: 'CO' },
        { city: 'Boston', state: 'MA' },
        { city: 'Portland', state: 'OR' },
        { city: 'Atlanta', state: 'GA' },
    ];
    const customers = [];
    const chunkSize = parseInt(process.env.SEED_CHUNK_SIZE_CUSTOMERS || process.env.SEED_CHUNK_SIZE || '1000', 10);
    for (let i = 0; i < count; i++) {
        const loc = pick(cities);
        const fullName = buildFullName();
        const [firstName, lastName] = fullName.split(' ');
        const marketingOptIn = Math.random() < 0.55;
        const loyaltyPoints = randInt(0, 500) + (marketingOptIn ? randInt(0, 300) : 0);
        customers.push({
            name: fullName,
            firstName,
            lastName,
            email: buildEmail(fullName),
            phone: `+1${randInt(2000000000, 9999999999)}`,
            city: loc.city,
            state: loc.state,
            country: 'USA',
            postalCode: `${randInt(10000, 99999)}`,
            address1: `${randInt(100, 9999)} ${pick(['Main', 'Oak', 'Maple', 'Pine', 'Cedar', 'Elm', 'Lake'])} St`,
            address2: Math.random() < 0.2 ? `Apt ${randInt(1, 40)}` : undefined,
            segment: Math.random() < 0.05 ? 'VIP' : pick(['CONSUMER', 'BUSINESS', 'CONSUMER', 'CONSUMER', 'BUSINESS']),
            marketingOptIn,
            loyaltyPoints,
            lifetimeValue: 0, // will be updated after orders seeded
            timezone: pick(['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']),
            preferredLanguage: 'en',
            tags: Math.random() < 0.12 ? ['vip'] : [],
            createdAt: rangeStart && rangeEnd ? randomDateBetween(rangeStart, rangeEnd) : new Date(),
            updatedAt: rangeStart && rangeEnd ? randomDateBetween(rangeStart, rangeEnd) : new Date(),
        });
        if (customers.length === chunkSize || i === count - 1) {
            const batch = [...customers];
            customers.length = 0;
            await Customer.insertMany(batch, { ordered: false });
        }
    }
    const total = await Customer.countDocuments();
    console.log(`Inserted ${total} customers`);
    return await Customer.find();
}

async function seedProducts(count = 50, rangeStart, rangeEnd) {
    const categories = ['Electronics', 'Books', 'Apparel', 'Home', 'Sports', 'Garden', 'Toys', 'Beauty'];
    const adjectives = ['Smart', 'Premium', 'Eco', 'Compact', 'Wireless', 'Portable', 'Advanced', 'Classic', 'Ultra', 'Lite', 'Dynamic', 'Ergonomic'];
    const nouns = ['Speaker', 'Headset', 'Lamp', 'Backpack', 'Jacket', 'Mixer', 'Monitor', 'Keyboard', 'Bottle', 'Router', 'Drone', 'Camera'];
    const products = [];
    const chunkSize = parseInt(process.env.SEED_CHUNK_SIZE_PRODUCTS || process.env.SEED_CHUNK_SIZE || '1000', 10);
    for (let i = 0; i < count; i++) {
        const name = `${pick(adjectives)} ${pick(nouns)}`;
        const unitPrice = Number((Math.random() * 500 + 5).toFixed(2));
        const costPrice = Number((unitPrice * (Math.random() * 0.4 + 0.4)).toFixed(2)); // 40%-80% of unit
        const stockQty = randInt(0, 500);
        const category = pick(categories);
        products.push({
            name,
            sku: `SKU${(i + 1).toString().padStart(5, '0')}`,
            category,
            unitPrice,
            msrp: Number((unitPrice * (Math.random() * 0.15 + 1)).toFixed(2)),
            costPrice,
            active: Math.random() < 0.9,
            discontinued: Math.random() < 0.02,
            brand: pick(['Acme', 'Globex', 'Umbrella', 'Initech', 'Soylent', 'Vehement', 'Stark']),
            supplier: pick(['Acme Supply', 'Global Parts', 'Prime Wholesale', 'North Importers']),
            taxRate: pick([0.0, 0.05, 0.07, 0.09]),
            stockQty,
            reorderLevel: randInt(10, 60),
            weightKg: Number((Math.random() * 4 + 0.1).toFixed(2)),
            dimensions: { lengthCm: randInt(5, 60), widthCm: randInt(5, 60), heightCm: randInt(5, 60) },
            description: `${pick(['High quality', 'Innovative', 'Eco-friendly', 'Durable', 'Limited edition'])} ${name} designed for ${pick(['professionals', 'everyday use', 'travelers', 'families'])}.`,
            tags: Math.random() < 0.15 ? ['featured'] : [],
            attributes: { color: pick(['red', 'blue', 'black', 'white', 'green']), warranty: pick(['6m', '12m', '24m']) },
            createdAt: rangeStart && rangeEnd ? randomDateBetween(rangeStart, rangeEnd) : new Date(),
            updatedAt: rangeStart && rangeEnd ? randomDateBetween(rangeStart, rangeEnd) : new Date(),
        });
        if (products.length === chunkSize || i === count - 1) {
            const batch = [...products];
            products.length = 0;
            await Product.insertMany(batch, { ordered: false });
        }
    }
    const total = await Product.countDocuments();
    console.log(`Inserted ${total} products`);
    return await Product.find();
}

function randomRecentDate(daysBack = 45) {
    const now = Date.now();
    const past = now - randInt(0, daysBack) * 86400000;
    return new Date(past);
}

function randomDateInYear(year) {
    const start = new Date(year, 0, 1).getTime();
    const end = new Date(year + 1, 0, 1).getTime();
    return new Date(randInt(start, end - 1));
}

function randomSpanInYear(year, maxSpanDays = 30) {
    const start = randomDateInYear(year);
    const add = randInt(0, maxSpanDays) * 86400000;
    let end = new Date(start.getTime() + add);
    if (end.getFullYear() !== year) end = new Date(year, 11, 31);
    return { start, end };
}

// New date range helpers
function parseDate(val) { if (!val) return null; const d = new Date(val); return isNaN(d.getTime()) ? null : d; }
function randomDateBetween(start, end) { return new Date(randInt(start.getTime(), end.getTime())); }
function randomSpanBetween(start, end, maxSpanDays = 30) {
    const s = randomDateBetween(start, end);
    const add = randInt(0, maxSpanDays) * 86400000;
    let e = new Date(s.getTime() + add);
    if (e > end) e = end;
    return { start: s, end: e };
}

async function seedOrders(customers, products, count = 250, rangeStart, rangeEnd) {
    const chunkSize = parseInt(process.env.SEED_CHUNK_SIZE_ORDERS || process.env.SEED_CHUNK_SIZE || '1000', 10);
    let inserted = 0;
    for (let start = 0; start < count; start += chunkSize) {
        const batch = [];
        const end = Math.min(start + chunkSize, count);
        for (let i = start; i < end; i++) {
            const cust = pick(customers);
            const itemCount = randInt(1, 5);
            const chosen = sampleUnique(products, itemCount);
            const items = chosen.map(p => ({
                product: p._id,
                quantity: randInt(1, 8),
                unitPrice: p.unitPrice,
                discountPct: Math.random() < 0.15 ? randInt(5, 30) : 0,
            }));
            const status = pick(['PAID', 'SHIPPED', 'PENDING', 'CANCELLED']);
            const paymentMethod = pick(['CARD', 'PAYPAL', 'WIRE', 'COD']);
            let orderDate = rangeStart && rangeEnd ? randomDateBetween(rangeStart, rangeEnd) : new Date();
            if (rangeStart && rangeEnd && Math.random() < 0.25) {
                const quarterStart = new Date(rangeEnd.getTime() - (rangeEnd.getTime() - rangeStart.getTime()) * 0.25);
                orderDate = randomDateBetween(quarterStart, rangeEnd);
            }
            orderDate.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59), 0);
            const shippingCost = Number((Math.random() * 25).toFixed(2));
            const discountAmount = Math.random() < 0.2 ? Number((Math.random() * 40).toFixed(2)) : 0;
            const taxAmount = Number((Math.random() * 30).toFixed(2));
            const subtotalAmount = items.reduce((s, it) => {
                const line = it.quantity * it.unitPrice;
                const discount = it.discountPct ? line * (it.discountPct / 100) : 0;
                return s + (line - discount);
            }, 0);
            const totalAmount = subtotalAmount; // compatibility
            const grandTotal = Number((subtotalAmount - discountAmount + shippingCost + taxAmount).toFixed(2));
            batch.push({
                customer: cust._id,
                orderDate,
                status,
                paymentMethod,
                sourceChannel: pick(['WEB', 'MOBILE', 'PHONE', 'STORE']),
                items,
                subtotalAmount: Number(subtotalAmount.toFixed(2)),
                discountAmount,
                shippingCost,
                taxAmount,
                totalAmount: Number(totalAmount.toFixed(2)),
                grandTotal,
                notes: Math.random() < 0.07 ? pick(['Expedite', 'Gift wrap', 'Call before delivery']) : undefined,
                shippingAddress: {
                    name: cust.name,
                    address1: cust.address1,
                    address2: cust.address2,
                    city: cust.city,
                    state: cust.state,
                    postalCode: cust.postalCode,
                    country: cust.country,
                },
            });
        }
        const docs = await Order.insertMany(batch, { ordered: false });
        inserted += docs.length;
        console.log(`Orders progress: ${inserted}/${count}`);
    }
    console.log(`Inserted total ${inserted} orders`);
}

async function seedBookings(customers, count = 120, rangeStart, rangeEnd) {
    const chunkSize = parseInt(process.env.SEED_CHUNK_SIZE_BOOKINGS || process.env.SEED_CHUNK_SIZE || '1000', 10);
    let inserted = 0;
    for (let start = 0; start < count; start += chunkSize) {
        const batch = [];
        const end = Math.min(start + chunkSize, count);
        for (let i = start; i < end; i++) {
            const cust = pick(customers);
            let span = rangeStart && rangeEnd ? randomSpanBetween(rangeStart, rangeEnd, randInt(1, 21)) : null;
            let startDate = span ? span.start : new Date();
            let endDate = span ? span.end : new Date(startDate.getTime() + randInt(1, 14) * 86400000);
            const status = pick(['CONFIRMED', 'COMPLETED', 'PENDING', 'CANCELLED']);
            const bookingType = pick(['HOTEL', 'TOUR', 'EVENT', 'SERVICE']);
            const roomType = bookingType === 'HOTEL' ? pick(['Standard', 'Deluxe', 'Suite']) : undefined;
            const addons = [];
            if (Math.random() < 0.25) addons.push(pick(['Breakfast', 'Parking', 'Spa', 'Late checkout']));
            if (Math.random() < 0.15) addons.push(pick(['Airport transfer', 'VIP lounge']));
            const totalPrice = Number((randInt(1, 14) * (randInt(70, 400) + Math.random())).toFixed(2));
            const taxAmount = Number((totalPrice * pick([0.05, 0.07, 0.09])).toFixed(2));
            const rating = status === 'COMPLETED' && Math.random() < 0.6 ? randInt(3, 5) : undefined;
            batch.push({
                customer: cust._id,
                bookingDate: rangeStart && rangeEnd ? randomDateBetween(rangeStart, rangeEnd) : new Date(),
                startDate,
                endDate,
                status,
                bookingType,
                roomType,
                guests: { adults: randInt(1, 4), children: Math.random() < 0.35 ? randInt(0, 3) : 0 },
                addons,
                paymentStatus: status === 'PENDING' ? 'UNPAID' : pick(['PAID', 'PAID', 'PARTIAL']),
                currency: 'USD',
                city: cust.city,
                totalPrice,
                taxAmount,
                cancellationPolicy: pick(['24h prior', '48h prior', 'Non-refundable']),
                channel: pick(['WEB', 'MOBILE', 'AGENT', 'PHONE']),
                rating,
                notes: Math.random() < 0.04 ? pick(['Late arrival', 'Allergy note', 'Extra towels', 'VIP stay']) : undefined,
            });
        }
        const docs = await Booking.insertMany(batch, { ordered: false });
        inserted += docs.length;
        console.log(`Bookings progress: ${inserted}/${count}`);
    }
    console.log(`Inserted total ${inserted} bookings`);
}

async function main() {
    try {
        const rawArgs = process.argv.slice(2);
        const flags = {};
        rawArgs.forEach(arg => { const m = arg.match(/^--([^=]+)=(.+)$/); if (m) flags[m[1]] = m[2]; });
        const [custPos, prodPos, orderPos, bookingPos] = rawArgs.filter(a => !a.startsWith('--')).map(n => parseInt(n, 10));
        const custCount = parseInt(flags.customers || flags.c || custPos, 10);
        const prodCount = parseInt(flags.products || flags.p || prodPos, 10);
        const orderCount = parseInt(flags.orders || flags.o || orderPos, 10);
        const bookingCount = parseInt(flags.bookings || flags.b || bookingPos, 10);
        const rangeStart = parseDate(flags.from || process.env.SEED_FROM) || new Date(2021, 0, 1);
        const rangeEnd = parseDate(flags.to || process.env.SEED_TO) || new Date();
        if (rangeEnd < rangeStart) throw new Error('Invalid date range: --to precedes --from');
        console.log('Seeding with counts & range:', {
            customers: Number.isFinite(custCount) ? custCount : 500,
            products: Number.isFinite(prodCount) ? prodCount : 300,
            orders: Number.isFinite(orderCount) ? orderCount : 5000,
            bookings: Number.isFinite(bookingCount) ? bookingCount : 2000,
            chunkSize: process.env.SEED_CHUNK_SIZE || '1000',
            from: rangeStart.toISOString().slice(0, 10),
            to: rangeEnd.toISOString().slice(0, 10)
        });
        await connect();
        await clearExisting();
        const customers = await seedCustomers(Number.isFinite(custCount) ? custCount : 500, rangeStart, rangeEnd);
        const products = await seedProducts(Number.isFinite(prodCount) ? prodCount : 300, rangeStart, rangeEnd);
        await seedOrders(customers, products, Number.isFinite(orderCount) ? orderCount : 5000, rangeStart, rangeEnd);
        await seedBookings(customers, Number.isFinite(bookingCount) ? bookingCount : 2000, rangeStart, rangeEnd);
        console.log('Aggregating customer lifetime value...');
        const agg = await Order.aggregate([
            { $group: { _id: '$customer', lifetimeValue: { $sum: '$grandTotal' }, lastOrderDate: { $max: '$orderDate' } } },
        ]);
        if (agg.length) {
            const bulk = agg.map(row => ({
                updateOne: {
                    filter: { _id: row._id },
                    update: { $set: { lifetimeValue: Number((row.lifetimeValue || 0).toFixed(2)), lastOrderDate: row.lastOrderDate } },
                },
            }));
            await Customer.bulkWrite(bulk);
            console.log(`Updated lifetime value for ${bulk.length} customers`);
        }
        console.log('Seeding complete');
        if (process.env.LOG_SAMPLE) {
            const sampleCustomer = await Customer.findOne().lean();
            const sampleProduct = await Product.findOne().lean();
            const sampleOrder = await Order.findOne().lean();
            const sampleBooking = await Booking.findOne().lean();
            console.log('Sample Customer:', sampleCustomer);
            console.log('Sample Product:', sampleProduct);
            console.log('Sample Order:', sampleOrder);
            console.log('Sample Booking:', sampleBooking);
        }
    } catch (err) {
        console.error('Seed error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };
