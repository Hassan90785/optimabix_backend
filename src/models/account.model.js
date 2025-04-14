import mongoose from "mongoose";
import Counter from "./counter.model.js"; // ✅ or correct relative path

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
    }, counterNumber: {
        type: Number,
        unique: true
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
accountSchema.index({companyId: 1, entityType: 1});
accountSchema.index({entityId: 1});
accountSchema.index({status: 1});
accountSchema.index({isDeleted: 1});

accountSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            const result = await Counter.findOneAndUpdate(
                {name: 'AccountCounter', companyId: this.companyId},
                {$inc: {seq: 1}},
                {new: true, upsert: true}
            );

            this.counterNumber = result.seq;
        } catch (err) {
            return next(err);
        }
    }

    next();
});
const Account = mongoose.model("Account", accountSchema);
export default Account;
