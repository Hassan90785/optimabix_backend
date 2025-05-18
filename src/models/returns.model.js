import mongoose from "mongoose";
import Counter from "./counter.model.js";

const returnsSchema = new mongoose.Schema({
    originalTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'POSTransaction', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
    returnNumber: { type: String,  unique: true },       // 🆕
    counterNumber: { type: Number, },                    // 🆕
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Products', required: true },
        batchId: String,
        quantity: Number,
        unitPrice: Number,
        totalPrice: Number,
        serialDetails: [String]
    }],
    totalRefund: Number,
    refundMethod: { type: String, enum: ['Cash', 'Credit Note'], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    linkedEntityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entities' },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Accounts' },
    reason: String,
    createdAt: { type: Date, default: Date.now }
});
// Auto-increment returnNumber + counterNumber
returnsSchema.pre('save', async function (next) {
    if (this.isNew) {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const companyIdPart = this.companyId.toString().slice(-4);
        const prefix = `RTN-${datePart}-${companyIdPart}`;

        const lastReturn = await mongoose.model('Returns')
            .findOne({ returnNumber: new RegExp(`^${prefix}`) })
            .sort({ returnNumber: -1 })
            .exec();

        let counter = 1;
        if (lastReturn) {
            const lastCounter = parseInt(lastReturn.returnNumber.split('-').pop());
            counter = lastCounter + 1;
        }

        this.returnNumber = `${prefix}-${counter.toString().padStart(6, '0')}`;

        try {
            const result = await Counter.findOneAndUpdate(
                { name: 'POSReturnCounter', companyId: this.companyId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.counterNumber = result.seq;
        } catch (err) {
            return next(err);
        }
    }

    next();
});
const Returns = mongoose.model('Returns', returnsSchema);
export default Returns;
