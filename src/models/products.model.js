import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        trim: true
    },
    sku: {
        type: String,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    brandName: {
        type: String,
        trim: true
    },
    modelNumber: {
        type: String,
        trim: true
    },
    price: {
        unitPurchasePrice: {
            type: Number,
            required: true
        },
        retailPrice: {
            type: Number,
            required: true
        },
        taxInclusive: {
            type: Boolean,
            default: false
        },
        taxPercentage: {
            type: Number,
            default: 0
        },
        discountPercentage: {
            type: Number,
            default: 0
        }
    },
    soldPrice: {
        type: Number,
        default: null
    },
    soldDate: {
        type: Date,
        default: null
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies'
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
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
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
productSchema.index({ sku: 1, companyId: 1 });
productSchema.index({ productName: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isDeleted: 1 });

// Pre-query middleware to exclude soft-deleted records
productSchema.pre(/^find/, function (next) {
    this.where({ isDeleted: false });
    next();
});

// Method to handle soft deletion
productSchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

// Method to auto-generate SKU if not provided
productSchema.methods.generateSKU = function () {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.sku = `${this.productName.replace(/\s+/g, '').substring(0, 5).toUpperCase()}-${randomNum}`;
    console.log('Generated SKU:', this.sku);
};

const Products = mongoose.model('Products', productSchema);
export default Products;
