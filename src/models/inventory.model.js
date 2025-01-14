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
            required: true
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
    },
    { timestamps: true });

// Indexing for optimized lookups
inventorySchema.index({ companyId: 1, productId: 1 });
inventorySchema.index({ barcode: 1 });
inventorySchema.index({ isDeleted: 1 });

// Pre-query middleware to exclude soft-deleted records
inventorySchema.pre(/^find/, function(next) {
    this.where({ isDeleted: false });
    next();
});

// Method for soft deletion
inventorySchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;
