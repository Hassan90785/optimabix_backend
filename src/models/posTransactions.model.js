import mongoose from "mongoose";

const posTransactionSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    transactionNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Products',
                required: true
            },
            batchId: {
                type: String,
                trim: true
            },
            quantity: {
                type: Number,
                required: true
            },
            unitPrice: {
                type: Number,
                required: true
            },
            totalPrice: {
                type: Number,
                required: true
            }
        }
    ],
    subTotal: {
        type: Number,
        required: true
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    totalPayable: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Credit Card', 'Bank Transfer'],
        required: true
    },
    paymentReference: {
        type: String,
        trim: true
    },
    paidAmount: {
        type: Number,
        required: true
    },
    changeGiven: {
        type: Number,
        default: 0
    },
    linkedEntityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entities',
        default: null
    },
    ledgerEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ledger'
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
posTransactionSchema.index({ companyId: 1, date: -1 });
posTransactionSchema.index({ transactionNumber: 1 });
posTransactionSchema.index({ isDeleted: 1 });

// Pre-query middleware to exclude soft-deleted records
posTransactionSchema.pre(/^find/, function(next) {
    this.where({ isDeleted: false });
    next();
});

// Method for soft deletion
posTransactionSchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

const POSTransaction = mongoose.model('POSTransaction', posTransactionSchema);
export default POSTransaction;
