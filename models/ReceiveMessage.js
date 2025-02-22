const mongoose = require("mongoose");

const ReceiveMessage = mongoose.Schema(
  {
    sender: String,
    receiver: String,
    subject: String,
    shortMessage: String,
    viewed: { type: Boolean, default: false },
    senderMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sendMessage",
    },
    isDeleted: { type: Boolean, default: false },
    readReward: { type: Number, default: null },
    postQuestion: { type: String, default: null },
    postId: { type: String, default: null },
    whichTypeQuestion: { type: String, default: null },
    opinion: { type: Object, default: null },
    platform: { type: String, default: null },
    messageContext: { type: String, default: "DM" },
    sendFdxAmount: { type: Number },
    domain: { type: String, },
    requestStatus: {
      type: String,
      enum: ["Pending", "Rejected", "Accepted"],
    },
    requestedBadgeType: {
      type: String,
    },
    requestData: {
      type: Object,
    },
    requestRef: { type: mongoose.Types.ObjectId, ref: "sendMessage" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("receiveMessage", ReceiveMessage);
