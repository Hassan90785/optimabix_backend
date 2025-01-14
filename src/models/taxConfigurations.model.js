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
taxConfigurationSchema.index({ companyId: 1, taxName: 1 });
taxConfigurationSchema.index({ isDeleted: 1 });

// Pre-query middleware to exclude soft-deleted records
taxConfigurationSchema.pre(/^find/, function(next) {
    this.where({ isDeleted: false });
    next();
});

// Method for soft deletion
taxConfigurationSchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

const TaxConfiguration = mongoose.model('TaxConfiguration', taxConfigurationSchema);
export default TaxConfiguration;
