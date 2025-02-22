const mongoose = require("mongoose");

const certificationsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  uuid: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("certifications", certificationsSchema);
