const mongoose = require('mongoose');

// Define Treasury Schema
const Treasury = new mongoose.Schema({
  amount: {
    type: mongoose.Decimal128,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create Treasury Model
module.exports = mongoose.model('Treasury', Treasury);