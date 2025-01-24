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
    debitCaption: {
        type: String,
        trim: true
    },
    creditCaption: {
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
        enum: ['Sale', 'Purchase', 'Return', 'Refund', 'Discount','Payment', 'Expense', 'Tax', 'Subscription'],
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
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoices'
    },
    referenceType: {
        type: String,
        enum: ['POS Transactions', 'Payments', 'Inventory']
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


// Function to create or update ledger entries
ledgerSchema.statics.manageLedgerEntry = async function ({
                                                             companyId,
                                                             transactionType,
                                                             description,
                                                             debitCaption,
                                                             creditCaption,
                                                             debitAmount = 0,
                                                             creditAmount = 0,
                                                             linkedEntityId = null,
                                                             invoiceId = null,
                                                             referenceType,
                                                             createdBy
                                                         }) {
    try {
        // Step 1: Check if a ledger entry exists for the given companyId
        let ledger = await this.findOne({ companyId }).sort({ date: -1 });

        // Step 2: Calculate the new balance
        const previousBalance = ledger ? ledger.balance : 0;
        const newBalance = previousBalance + debitAmount - creditAmount;

        // Step 3: Create a new ledger entry
        const newLedgerEntry = await this.create({
            companyId,
            transactionType,
            description,
            debitAmount,
            creditAmount,
            creditCaption,
            debitCaption,
            balance: newBalance,
            linkedEntityId,
            invoiceId,
            referenceType,
            createdBy
        });

        // Return the newly created ledger entry
        return newLedgerEntry;
    } catch (error) {
        console.error('Error managing ledger entry:', error);
        throw new Error('Failed to manage ledger entry');
    }
};

const Ledger = mongoose.model('Ledger', ledgerSchema);
export default Ledger;
