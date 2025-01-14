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
        ref: 'Entities',
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
    // Soft Deletion and Auditing Fields
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    }
}, { timestamps: true });

// Indexes for optimized lookups
ledgerSchema.index({ companyId: 1, date: -1 });
ledgerSchema.index({ linkedEntityId: 1 });
ledgerSchema.index({ transactionType: 1 });
ledgerSchema.index({ isDeleted: 1 });

// Pre-query middleware to exclude soft-deleted records
ledgerSchema.pre(/^find/, function(next) {
    this.where({ isDeleted: false });
    next();
});

// Method for soft deletion
ledgerSchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

const Ledger = mongoose.model('Ledger', ledgerSchema);
export default Ledger;
