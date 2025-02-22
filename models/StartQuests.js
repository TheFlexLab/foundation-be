const mongoose = require("mongoose");

const StartQuestsSchema = mongoose.Schema(
  {
    uuid: {
      type: String,
    },
    farcasterHash: {
      type: String,
    },
    fid: {
      type: Number,
      default: null,
    },
    questForeignKey: {
      type: String,
    },
    addedAnswer: {
      type: String,
    },
    // correctAnswer: {
    //   type: String,
    // },
    data: {
      type: Array,
    },
    btnStatus: {
      type: String,
    },
    isFeedback: {
      type: Boolean,
      default: false,
    },
    feedbackReverted: {
      type: Boolean,
      default: false,
    },
    isAddOptionFeedback: {
      type: Boolean,
      default: false,
    },
    web3S3Image: {
      type: [Object],
      default: [],
    },
    web3S3HTML: {
      type: [Object],
      default: [],
    },
    articleRef: {
      type: String,
      default: "",
    },
    userQuestSettingRef: {
      type: String,
      default: ""
    },
    revealMyAnswers: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StartQuests", StartQuestsSchema);
