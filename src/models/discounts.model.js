import mongoose from "mongoose";

const discountSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true
    },
    discountName: {
        type: String,
        required: true,
        trim: true
    },
    discountType: {
        type: String,
        enum: ['Percentage', 'Fixed Amount'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    applicableProducts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Products'
        }
    ],
    validFrom: {
        type: Date,
        default: Date.now
    },
    validUntil: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
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
discountSchema.index({ companyId: 1, discountType: 1 });
discountSchema.index({ discountName: 1 });
discountSchema.index({ isDeleted: 1 });

// Pre-query middleware to exclude soft-deleted records
discountSchema.pre(/^find/, function(next) {
    this.where({ isDeleted: false });
    next();
});

// Soft deletion method
discountSchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

const Discounts = mongoose.model('Discount', discountSchema);
export default Discounts;
