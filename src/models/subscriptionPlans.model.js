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
            featureName: String,
            featureDescription: String
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
subscriptionPlanSchema.index({ planName: 1, planType: 1 });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
export default SubscriptionPlan;

