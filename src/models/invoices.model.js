import mongoose from "mongoose";
import Counter from "./counter.model.js";
const invoiceSchema = new mongoose.Schema({
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
        ref: 'Ledger'
    },
    invoiceNumber: {
        type: String,
        trim: true,
    },
    issuedDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        default: null
    },
    linkedEntityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entities',
        default: null
    },
    lineItems: [
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
    totalAmount: {
        type: Number,
        required: true
    },counterNumber: {
        type: Number,
        unique: true
    },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Partial', 'Pending', 'Overdue'],
        default: 'Pending'
    },
    notes: {
        type: String,
        trim: true
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
invoiceSchema.index({ companyId: 1, issuedDate: -1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ isDeleted: 1 });

// Pre-query middleware to exclude soft-deleted records
invoiceSchema.pre(/^find/, function (next) {
    this.where({ isDeleted: false });
    next();
});

// Pre-save middleware to auto-generate invoice number
invoiceSchema.pre('save', async function (next) {
    if (!this.invoiceNumber) {
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1000);
        this.invoiceNumber = `INV-${timestamp}-${randomSuffix}`;
    }
    if (this.isNew) {
        try {
            const result = await Counter.findOneAndUpdate(
                { name: 'InvoiceCounter', companyId: this.companyId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );

            this.counterNumber = result.seq;
        } catch (err) {
            return next(err);
        }
    }
    next();
});

// Soft deletion method
invoiceSchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

const Invoices = mongoose.model('Invoices', invoiceSchema);
export default Invoices;
