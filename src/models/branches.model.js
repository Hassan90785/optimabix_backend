import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
    name: String,
    address: String,
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
    // other branch-specific fields
});

branchSchema.index({ name: 1, companyId: 1 }, { unique: true });

const Branch = mongoose.model("Branch", branchSchema);
export default Branch;
