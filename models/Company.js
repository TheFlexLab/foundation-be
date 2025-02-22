const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  country: {
    type: String,
  },
  state_province: {
    type: String,
  },
  uuid: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("companies", companySchema);
