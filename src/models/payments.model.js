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
        default: null // Optional for anonymous POS payments
    },
    paymentDate: {
        type: Date,
        default: Date.now
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

// Indexes for optimized financial reporting and lookups
paymentSchema.index({ companyId: 1, paymentDate: -1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ paymentStatus: 1 });

const Payments = mongoose.model('Payments', paymentSchema);
export default Payments;

