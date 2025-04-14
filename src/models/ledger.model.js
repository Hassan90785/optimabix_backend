import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        index: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true,
        index: true
    },
    date: {
        type: Date,
        default: Date.now,
        index: true
    },
    description: {
        type: String,
        trim: true
    },
    account: {
        type: String,
        required: true,
        trim: true
    },
    entryType: {
        type: String,
        enum: ['debit', 'credit'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    entryGroupId: {
        type: String
    },
    linkedEntityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entities',
        default: null,
        index: true
    },
    transactionType: {
        type: String,
        enum: ['Sale', 'Purchase', 'Return', 'Refund', 'Discount', 'Payment', 'Expense', 'Tax', 'Subscription'],
        required: true,
        index: true
    },
    referenceType: {
        type: String,
        enum: ['POS Transactions', 'Payments', 'Inventory'],
        required: true
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoices'
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    // Soft Deletion and Auditing Fields
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {timestamps: true});

// Soft delete filter
ledgerSchema.pre(/^find/, function (next) {
    this.where({isDeleted: false});
    next();
});

// Soft delete method
ledgerSchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

const Ledger = mongoose.model('Ledger', ledgerSchema);
export default Ledger;
