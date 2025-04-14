import mongoose from "mongoose";
import Counter from "./counter.model.js";

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
        trim: true
    },
    // New auto-increment field
    counterNumber: {
        type: Number, // We'll store a numeric sequence
        unique: true  // Optional, but recommended if you want strict uniqueness
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
        required: function () {
            return this.transactionType === 'Sale';
        }
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
        required: function () {
            return this.transactionType === 'Sale';
        }
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Credit Card', 'Bank Transfer', 'Credit'],
        required: function () {
            return this.transactionType === 'Sale';
        }
    },
    paymentReference: {
        type: String,
        trim: true
    },
    paidAmount: {
        type: Number,
        required: function () {
            return this.transactionType === 'Sale';
        }
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
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
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

// Middleware to auto-generate a unique human-readable transaction number
posTransactionSchema.pre('save', async function(next) {
    if (this.isNew) {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        const companyIdPart = this.companyId.toString().slice(-4); // Last 4 digits of companyId
        const prefix = `TXN-${datePart}-${companyIdPart}`;

        // Find the highest counter for the current date and company
        const lastTransaction = await mongoose.model('POSTransaction')
            .findOne({ transactionNumber: new RegExp(`^${prefix}`) })
            .sort({ transactionNumber: -1 })
            .exec();

        let counter = 1;
        if (lastTransaction) {
            const lastCounter = parseInt(lastTransaction.transactionNumber.split('-').pop());
            counter = lastCounter + 1;
        }

        this.transactionNumber = `${prefix}-${counter.toString().padStart(6, '0')}`; // Ensure a 6-digit counter
        try {
            const result = await Counter.findOneAndUpdate(
                { name: 'POSTransactionCounter', companyId: this.companyId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );

            this.counterNumber = result.seq;
        } catch (error) {
            return next(error);
        }

    }
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
