const mongoose = require('mongoose');

const SearchAgeModel = mongoose.Schema({
    age: {
        type: String,
        required: true,
    },
});

const SearchAge = mongoose.model('SearchAge', SearchAgeModel);

module.exports = SearchAge;
