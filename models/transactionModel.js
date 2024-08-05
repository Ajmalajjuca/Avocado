const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the transaction schema
const transactionSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  balance: {
    type: Number,
    default: 0.0
  }
}, { timestamps: true });

// Create the transaction model
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
