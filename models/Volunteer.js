const mongoose = require("mongoose");

const volunteerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  uuid: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("volunteers", volunteerSchema);
