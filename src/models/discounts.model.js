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
    applicableProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products'
    }],
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
}, {timestamps: true});

// Indexes for optimized lookups
discountSchema.index({companyId: 1, discountType: 1});

const Discounts = mongoose.model('Discount', discountSchema);
export default Discounts;

