require("dotenv").config();
const express = require('express');
const passport = require("passport");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const compression = require("compression");
var cors = require("cors");

// Initialize Express app
const app = express();
const port = process.env.API_PORT || 5000;
app.use(express.json());

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(passport.initialize());
require("./config/passport")(passport);

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected!"))
    .catch((err) => console.error("MongoDB connection error:", err));

// API routes
app.use('/api/ai', require('./routes/api/ai'));
app.use('/api/customers', require('./routes/api/customers'));
app.use('/api/products', require('./routes/api/products'));
app.use('/api/orders', require('./routes/api/orders'));
app.use('/api/bookings', require('./routes/api/bookings'));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});