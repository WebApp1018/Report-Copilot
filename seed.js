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

async function seedCustomers(count = 40) {
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
    for (let i = 0; i < count; i++) {
        const loc = pick(cities);
        const fullName = buildFullName();
        customers.push({
            name: fullName,
            email: buildEmail(fullName),
            city: loc.city,
            state: loc.state,
            tags: Math.random() < 0.12 ? ['vip'] : [],
            createdAt: randomRecentDate(120),
            updatedAt: new Date(),
        });
    }
    const docs = await Customer.insertMany(customers);
    console.log(`Inserted ${docs.length} customers`);
    return docs;
}

async function seedProducts(count = 50) {
    const categories = ['Electronics', 'Books', 'Apparel', 'Home', 'Sports', 'Garden', 'Toys', 'Beauty'];
    const adjectives = ['Smart', 'Premium', 'Eco', 'Compact', 'Wireless', 'Portable', 'Advanced', 'Classic', 'Ultra', 'Lite', 'Dynamic', 'Ergonomic'];
    const nouns = ['Speaker', 'Headset', 'Lamp', 'Backpack', 'Jacket', 'Mixer', 'Monitor', 'Keyboard', 'Bottle', 'Router', 'Drone', 'Camera'];
    const products = [];
    for (let i = 0; i < count; i++) {
        const name = `${pick(adjectives)} ${pick(nouns)}`;
        products.push({
            name,
            sku: `SKU${(i + 1).toString().padStart(5, '0')}`,
            category: pick(categories),
            unitPrice: Number((Math.random() * 500 + 5).toFixed(2)),
            active: Math.random() < 0.9,
            tags: Math.random() < 0.15 ? ['featured'] : [],
            createdAt: randomRecentDate(200),
            updatedAt: new Date(),
        });
    }
    const docs = await Product.insertMany(products);
    console.log(`Inserted ${docs.length} products`);
    return docs;
}

function randomRecentDate(daysBack = 45) {
    const now = Date.now();
    const past = now - randInt(0, daysBack) * 24 * 60 * 60 * 1000;
    return new Date(past);
}

async function seedOrders(customers, products, count = 250) {
    const orders = [];
    for (let i = 0; i < count; i++) {
        const cust = pick(customers);
        const itemCount = randInt(1, 5);
        const chosen = sampleUnique(products, itemCount);
        const items = chosen.map(p => ({
            product: p._id,
            quantity: randInt(1, 8),
            unitPrice: p.unitPrice,
        }));
        const totalAmount = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
        orders.push({
            customer: cust._id,
            orderDate: randomRecentDate(180),
            status: pick(['PAID', 'SHIPPED', 'PENDING', 'CANCELLED']),
            items,
            totalAmount: Number(totalAmount.toFixed(2)),
            notes: Math.random() < 0.07 ? pick(['Expedite', 'Gift wrap', 'Call before delivery']) : undefined,
        });
    }
    const docs = await Order.insertMany(orders);
    console.log(`Inserted ${docs.length} orders`);
    return docs;
}

async function seedBookings(customers, count = 120) {
    const bookings = [];
    for (let i = 0; i < count; i++) {
        const cust = pick(customers);
        const startDate = randomRecentDate(150);
        const lengthDays = randInt(1, 14);
        const endDate = new Date(startDate.getTime() + lengthDays * 24 * 60 * 60 * 1000);
        bookings.push({
            customer: cust._id,
            bookingDate: randomRecentDate(160),
            startDate,
            endDate,
            status: pick(['CONFIRMED', 'COMPLETED', 'PENDING', 'CANCELLED']),
            city: cust.city,
            totalPrice: Number((lengthDays * (randInt(70, 400) + Math.random())).toFixed(2)),
            notes: Math.random() < 0.04 ? pick(['Late arrival', 'Allergy note', 'Extra towels', 'VIP stay']) : undefined,
        });
    }
    const docs = await Booking.insertMany(bookings);
    console.log(`Inserted ${docs.length} bookings`);
    return docs;
}

async function main() {
    try {
        const [custCount, prodCount, orderCount, bookingCount] = process.argv.slice(2).map(n => parseInt(n, 10));
        await connect();
        await clearExisting();
        const customers = await seedCustomers(Number.isFinite(custCount) ? custCount : 40);
        const products = await seedProducts(Number.isFinite(prodCount) ? prodCount : 50);
        await seedOrders(customers, products, Number.isFinite(orderCount) ? orderCount : 250);
        await seedBookings(customers, Number.isFinite(bookingCount) ? bookingCount : 120);
        console.log('Seeding complete');
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
