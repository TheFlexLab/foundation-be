const mongoose = require('mongoose');

const SearchEmailModel = mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
});

const SearchEmail = mongoose.model('SearchEmail', SearchEmailModel);

module.exports = SearchEmail;
