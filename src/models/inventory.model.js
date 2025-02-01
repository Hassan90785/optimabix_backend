import mongoose from "mongoose";
import {v4 as uuidv4} from "uuid";
import {nanoid} from "nanoid";

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
        batches: [
            {
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
                },
                mgf_dt: {
                    type: Date,
                    default: null
                },
                expiry_dt: {
                    type: Date,
                    default: null
                },
                barcode: {
                    type: String,
                },
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
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Entities',
            required: true
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
    {timestamps: true});

// Indexing for optimized lookups
inventorySchema.index({companyId: 1, productId: 1});
inventorySchema.index({'batches.barcode': 1});
inventorySchema.index({isDeleted: 1});

// Pre-query middleware to exclude soft-deleted records
inventorySchema.pre(/^find/, function (next) {
    this.where({isDeleted: false});
    next();
});
// Generate a shorter 8-character barcode
inventorySchema.pre('save', function (next) {
    this.batches.forEach((batch) => {
        if (!batch.barcode) {
            batch.barcode = nanoid(12); // Example: "A1B2C3D4"
        }
    });
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
