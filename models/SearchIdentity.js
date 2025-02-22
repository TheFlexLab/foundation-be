const mongoose = require('mongoose');

const SearchIdentityModel = mongoose.Schema({
    identity: {
        type: String,
        required: true,
    },
});

const SearchIdentity = mongoose.model('SearchIdentity', SearchIdentityModel);

module.exports = SearchIdentity;
