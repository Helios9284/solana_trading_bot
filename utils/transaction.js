// Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    tokenAddress: { type: String, required: true },
    txId: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    type: {type: String, required:true}
});

const TransactionDB = mongoose.model('Transaction', transactionSchema);

module.exports = {
    TransactionDB
};