import mongoose from "mongoose";

const accountSchema = new mongoose.Schema({
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Entities",
        required: true
    },
    entityType: {
        type: String,
        enum: ["Customer", "Vendor", "Both"],
        required: true
    },
    status: {
        type: String,
        enum: ["Active", "Inactive", "Suspended"],
        default: "Active",
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Companies",
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for optimized queries
accountSchema.index({ companyId: 1, entityType: 1 });
accountSchema.index({ entityId: 1 });
accountSchema.index({ status: 1 });
accountSchema.index({ isDeleted: 1 });

const Account = mongoose.model("Account", accountSchema);
export default Account; 
