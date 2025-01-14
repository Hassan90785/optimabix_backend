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
stockAdjustmentSchema.index({ companyId: 1, productId: 1 });
stockAdjustmentSchema.index({ adjustmentType: 1 });
stockAdjustmentSchema.index({ isDeleted: 1 });

// Pre-query middleware to exclude soft-deleted records
stockAdjustmentSchema.pre(/^find/, function (next) {
    this.where({ isDeleted: false });
    next();
});

// Method for soft deletion
stockAdjustmentSchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

const StockAdjustment = mongoose.model('StockAdjustment', stockAdjustmentSchema);
export default StockAdjustment;
