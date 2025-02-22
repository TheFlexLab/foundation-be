const mongoose = require('mongoose');

const SearchAccountIdModel = mongoose.Schema({
    accountId: {
        type: String,
        required: true,
    },
});

const SearchAccountId = mongoose.model('SearchAccountId', SearchAccountIdModel);

module.exports = SearchAccountId;
