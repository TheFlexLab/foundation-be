const mongoose = require("mongoose");

const QuestTopics = mongoose.Schema(
  {
    name: { type: String },
    isAllow: { type: Boolean, default: false },
    count: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuestTopics", QuestTopics);
