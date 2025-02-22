const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  state_id: {
    type: Number,
    required: true
  },
  state_code: {
    type: String,
    required: true
  },
  state_name: {
    type: String,
    required: true
  },
  country_id: {
    type: Number,
    required: true
  },
  country_code: {
    type: String,
    required: true
  },
  country_name: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  wikiDataId: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model("cities", citySchema);