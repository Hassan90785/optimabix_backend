import mongoose from "mongoose";
import {AuditLog} from "./index.js";

const productSchema = new mongoose.Schema({
    productName: { type: String, required: true, trim: true },
    sku: { type: String,  trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    brandName: { type: String, trim: true },
    modelNumber: { type: String, trim: true },
    price: {
        unitPurchasePrice: { type: Number, required: true },
        retailPrice: { type: Number, required: true },
        taxInclusive: { type: Boolean, default: false },
        taxPercentage: { type: Number, default: 0 },
        discountPercentage: { type: Number, default: 0 }
    },
    soldPrice: { type: Number, default: null },
    soldDate: { type: Date, default: null },
    isSerialized: { type: Boolean, default: false },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Companies" },
    batches: [
        {
            batchId: { type: String, required: true },
            quantity: { type: Number, required: true },
            purchasePrice: { type: Number, required: true },
            sellingPrice: { type: Number, required: true },
            dateAdded: { type: Date, default: Date.now }
        }
    ],
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" }
}, { timestamps: true });

// ✅ **Indexing for optimized lookups**
productSchema.index({ sku: 1, companyId: 1 });
productSchema.index({ productName: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isDeleted: 1 });

// ✅ **Pre-query middleware to exclude soft-deleted records**
productSchema.pre(/^find/, function (next) {
    this.where({ isDeleted: false });
    next();
});

// ✅ **Soft Delete Method (Logs Deletion)**
productSchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();

    // Log Soft Delete
    await AuditLog.create({
        companyId: this.companyId,
        userId: deletedBy,
        actionType: "Soft Delete",
        entityType: "Products",
        entityId: this._id,
        data: { isDeleted: true },
        description: `Product marked as deleted: ${this.productName}`
    });
};

// ✅ **Generate SKU if not provided**
productSchema.methods.generateSKU = function () {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.sku = `${this.productName.replace(/\s+/g, '').substring(0, 5).toUpperCase()}-${randomNum}`;
};

// ✅ **Track Changes Before Updating**
productSchema.pre("findOneAndUpdate", async function (next) {
    this.options.new = true;
    this.options.runValidators = true;
    this.options.context = "query";

    const docToUpdate = await this.model.findOne(this.getQuery());
    this._previous = docToUpdate;
    next();
});

// ✅ **Log Only Changed Fields After Update**
productSchema.post("findOneAndUpdate", async function (updatedDoc) {
    if (!this._previous || !updatedDoc) return;

    const previousValues = this._previous.toObject();
    const newValues = updatedDoc.toObject();

    const changedFields = {};
    for (const key in newValues) {
        if (JSON.stringify(previousValues[key]) !== JSON.stringify(newValues[key])) {
            changedFields[key] = {
                previous: previousValues[key],
                new: newValues[key]
            };
        }
    }

    if (Object.keys(changedFields).length === 0) return;

    await AuditLog.create({
        companyId: updatedDoc.companyId,
        userId: updatedDoc.updatedBy,
        actionType: "Update",
        entityType: "Products",
        entityId: updatedDoc._id,
        data: changedFields,
        description: `Updated fields: ${Object.keys(changedFields).join(", ")}`
    });
});

// ✅ **Log Creation Event After Saving a New Product**
productSchema.post("save", async function (doc) {
    await AuditLog.create({
        companyId: doc.companyId,
        userId: doc.createdBy,
        actionType: "Create",
        entityType: "Products",
        entityId: doc._id,
        data: doc.toObject(),
        description: `Created new product: ${doc.productName}`
    });
});

const Products = mongoose.model("Products", productSchema);
export default Products;
