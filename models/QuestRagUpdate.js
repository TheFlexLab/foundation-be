const mongoose = require("mongoose");

// Define QuestRagUpdate Schema
const QuestRagUpdate = mongoose.Schema(
  {
    dailyQuestsToEmbed: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Create QuestRagUpdate Model
module.exports = {
  QuestRagUpdate: mongoose.model("QuestRagUpdate", QuestRagUpdate),
};