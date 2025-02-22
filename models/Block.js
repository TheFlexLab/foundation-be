const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema({
  blockNumber: { type: Number, required: true },
});

module.exports = mongoose.model("Block", blockSchema);
