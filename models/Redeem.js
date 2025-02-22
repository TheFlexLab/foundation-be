const mongoose = require("mongoose");

const Redeem = mongoose.Schema(
  {
    // creator: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'user'
    // },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    },
    amount: { type: String, required: true },
    description: { type: String, required: true },
    to: { type: String },
    expiry: { type: String },
    code: { type: String },
    status: { type: String, default: 'unredeemed'},
  },
  { timestamps: true }
);

module.exports = mongoose.model("redeem", Redeem);
