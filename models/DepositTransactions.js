const mongoose = require("mongoose");

const DepositTransactionsSchema = new mongoose.Schema({
  blockNumber: { type: Number, required: true },
  transactionHash: { type: String, required: true },
});

module.exports = mongoose.model(
  "DepositTransactions",
  DepositTransactionsSchema
);
