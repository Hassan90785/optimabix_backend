import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        trim: true
    },
    linkedEntityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entities', // Optional for POS transactions with no customer data
        default: null
    },
    transactionType: {
        type: String,
        enum: ['Sale', 'Purchase', 'Return', 'Refund', 'Discount', 'Expense', 'Tax', 'Subscription'],
        required: true
    },
    debitAmount: {
        type: Number,
        default: 0
    },
    creditAmount: {
        type: Number,
        default: 0
    },
    balance: {
        type: Number,
        default: 0
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'referenceType'
    },
    referenceType: {
        type: String,
        enum: ['POS Transactions', 'Payments', 'Invoices']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Indexes for faster filtering and lookups
ledgerSchema.index({ companyId: 1, date: -1 });
ledgerSchema.index({ linkedEntityId: 1 });
ledgerSchema.index({ transactionType: 1 });

const Ledger = mongoose.model('Ledger', ledgerSchema);
export default Ledger;

