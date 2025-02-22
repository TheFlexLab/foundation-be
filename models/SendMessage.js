const mongoose = require("mongoose");

const SendMessage = mongoose.Schema(
  {
    from: String,
    to: String,
    subject: String,
    message: String,
    send: { type: Boolean, default: true },
    fail: { type: Boolean, default: false },
    view: { type: Number, default: 0 },
    unView: { type: Number, default: 0 },
    deleteCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    type: String,
    receiversIds: {
      type: [String],
      default: [],
    },
    readReward: { type: Number, default: null },
    platform: { type: String, default: null },
    uuid: { type: String, default: null },
    questForeignKey: { type: String, default: null },
    options: { type: [String], default: null },
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
    requestRef: { type: mongoose.Types.ObjectId, ref: "receiveMessage" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("sendMessage", SendMessage);

