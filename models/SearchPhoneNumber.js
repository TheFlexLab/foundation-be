const mongoose = require('mongoose');

const SearchPhoneNumberModel = mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
    },
});

const SearchPhoneNumber = mongoose.model('SearchPhoneNumber', SearchPhoneNumberModel);

module.exports = SearchPhoneNumber;
