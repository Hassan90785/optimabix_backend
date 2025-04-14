import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
    // 'name' identifies which counter this doc is for, e.g. "POSTransactionCounter"
    name: { type: String, required: true, unique: true },

    // 'seq' holds the current sequence value
    seq: { type: Number, default: 0 },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true
    }
});

counterSchema.index({ name: 1, companyId: 1 }, { unique: true });

export default mongoose.model('Counter', counterSchema);
