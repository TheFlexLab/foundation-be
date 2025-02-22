const mongoose = require("mongoose");

const degreeAndFieldOfStudySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  uuid: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model(
  "degreesAndFields",
  degreeAndFieldOfStudySchema
);
