import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products',
        required: true
    },
    barcode: {
        type: String,
        required: true,
        unique: true
    },
    batches: [
        {
            batchId: {
                type: String,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            purchasePrice: {
                type: Number,
                required: true
            },
            sellingPrice: {
                type: Number,
                required: true
            },
            dateAdded: {
                type: Date,
                default: Date.now
            }
        }
    ],
    totalQuantity: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});


// Indexes for faster stock lookups
inventorySchema.index({ companyId: 1, productId: 1 });
inventorySchema.index({ 'stockMovements.date': -1 });

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;

