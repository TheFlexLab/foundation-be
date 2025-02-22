const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    domains: [{
        type: String,
        required: true
    }],
    web_pages: [{
        type: String,
        required: true
    }],
    country: {
        type: String,
        required: true
    },
    alpha_two_code: {
        type: String,
        required: true
    },
    state_province: {
        type: String
    }
});

module.exports=mongoose.model('educations',educationSchema);