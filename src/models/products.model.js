import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        trim: true
    },
    sku: {
        type: String,
        required: true,
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
    image: {
        type: String,  // URL or file path for product image storage
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
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entities'  // References the vendor the product was purchased from
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isDeleted: {
        type: Boolean,
        default: false
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
productSchema.index({ sku: 1, companyId: 1 });
productSchema.index({ productName: 1 });
productSchema.index({ brandName: 1, modelNumber: 1 });


const Product = mongoose.model('Product', productSchema);
export default Product;

