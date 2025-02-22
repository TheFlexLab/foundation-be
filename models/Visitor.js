const mongoose = require('mongoose');

// Define Visitor Schema
const Visitor = mongoose.Schema(
    {
        visitor: {
            type: [String],
            required: true,
        }
    },
);

// Create Visitor Model
module.exports = {
    Visitor: mongoose.model('Visitor', Visitor),
};
