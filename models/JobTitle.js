const mongoose = require("mongoose");

const jobtitleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  uuid: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("jobtitles", jobtitleSchema);
