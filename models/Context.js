const mongoose = require("mongoose");

const contextSchema = new mongoose.Schema(
  {
    text: String,
    embedding: [Number],
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    collection: "context",
  }
);

const Context = mongoose.model("Context", contextSchema);

module.exports = Context;
