import mongoose from "mongoose";

const stockAdjustmentSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products',
        required: true
    },
    batchId: {
        type: String,
        required: true
    },
    adjustmentType: {
        type: String,
        enum: ['Damage', 'Loss', 'Manual Correction', 'Stock Transfer'],
        required: true
    },
    adjustedQuantity: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        trim: true
    },
    adjustmentDate: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    relatedTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'POSTransactions',
        default: null
    },
    ledgerEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ledger',
        required: true
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

// Indexes for optimized lookups
stockAdjustmentSchema.index({ companyId: 1, productId: 1 });
stockAdjustmentSchema.index({ adjustmentType: 1 });


const StockAdjustment = mongoose.model('StockAdjustment', stockAdjustmentSchema);
export default StockAdjustment;

