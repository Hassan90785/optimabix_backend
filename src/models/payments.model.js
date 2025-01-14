import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true
    },
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'POSTransactions',
        required: true
    },
    ledgerEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ledger',
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Credit Card', 'Bank Transfer', 'Split Payment'],
        required: true
    },
    amountPaid: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Completed', 'Pending', 'Failed'],
        default: 'Pending'
    },
    paymentReference: {
        type: String,
        trim: true
    },
    paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entities',
        default: null
    },
    paymentDate: {
        type: Date,
        default: Date.now
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
paymentSchema.index({ companyId: 1, paymentDate: -1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ paymentStatus: 1 });
paymentSchema.index({ isDeleted: 1 });

// Pre-query middleware to exclude soft-deleted records
paymentSchema.pre(/^find/, function (next) {
    this.where({ isDeleted: false });
    next();
});

// Method for soft deletion
paymentSchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

const Payments = mongoose.model('Payments', paymentSchema);
export default Payments;
