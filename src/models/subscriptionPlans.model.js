import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema({
    planName: {
        type: String,
        required: true,
        trim: true
    },
    planType: {
        type: String,
        enum: ['Monthly', 'Yearly', 'Lifetime'],
        required: true
    },
    features: [
        {
            featureName: {
                type: String,
                required: true
            },
            featureDescription: {
                type: String,
                trim: true
            }
        }
    ],
    price: {
        type: Number,
        required: true
    },
    maxUsers: {
        type: Number
    },
    maxProducts: {
        type: Number
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
subscriptionPlanSchema.index({ planType: 1 });
subscriptionPlanSchema.index({ planName: 1 });
subscriptionPlanSchema.index({ isDeleted: 1 });

// Pre-query middleware to exclude soft-deleted records
subscriptionPlanSchema.pre(/^find/, function(next) {
    this.where({ isDeleted: false });
    next();
});

// Method for soft deletion
subscriptionPlanSchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
export default SubscriptionPlan;
