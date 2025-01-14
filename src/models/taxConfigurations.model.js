import mongoose from "mongoose";

const taxConfigurationSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true
    },
    taxName: {
        type: String,
        required: true,
        trim: true
    },
    taxPercentage: {
        type: Number,
        required: true
    },
    taxInclusive: {
        type: Boolean,
        default: false
    },
    effectiveDate: {
        type: Date,
        default: Date.now
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
}, { timestamps: true });

// Indexes for tax reporting
taxConfigurationSchema.index({ companyId: 1, taxName: 1 });


const TaxConfiguration = mongoose.model('TaxConfiguration', taxConfigurationSchema);
export default TaxConfiguration;

