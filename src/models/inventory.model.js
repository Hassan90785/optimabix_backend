import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { AuditLog } from "./index.js";

const inventorySchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Companies", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Products", required: true },
    batches: [
        {
            quantity: { type: Number, required: true },
            purchasePrice: { type: Number, required: true },
            sellingPrice: { type: Number, required: true },
            dateAdded: { type: Date, default: Date.now },
            mgf_dt: { type: Date, default: null },
            expiry_dt: { type: Date, default: null },
            barcode: { type: String, unique: true }
        }
    ],
    totalQuantity: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Entities", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" }
}, { timestamps: true });

// ✅ **Generate Barcode for New Batches in `save` Middleware**
inventorySchema.pre("save", function (next) {
    for (let batch of this.batches) {
        if (!batch.barcode) {
            batch.barcode = nanoid(12);
        }
    }
    next();
});

// ✅ **Generate Barcode for New Batches in `findOneAndUpdate` Middleware**
inventorySchema.pre("findOneAndUpdate", async function (next) {
    console.log("findOneAndUpdate Hook Triggered");
    this.options.new = true;
    this.options.runValidators = true;
    this.options.context = "query";

    const update = this.getUpdate();
    const updatedBatches = update.$set?.batches || [];

    if (Array.isArray(updatedBatches)) {
        updatedBatches.forEach(batch => {
            if (!batch.barcode || batch.barcode.trim() === "") {
                batch.barcode = nanoid(12);
            }
        });

        this.setUpdate({ $set: { ...update.$set, batches: updatedBatches } });
    }

    this._previous = await this.model.findOne(this.getQuery()).lean();
    next();
});

// ✅ **Track Changes and Log Updates**
inventorySchema.post("findOneAndUpdate", async function (updatedDoc) {
    if (!this._previous || !updatedDoc) return;

    const previous = this._previous;
    const updated = updatedDoc.toObject();

    let changes = {};

    // 🔹 **Compare Fields**
    ["totalQuantity", "vendorId", "productId"].forEach(key => {
        if (previous[key]?.toString() !== updated[key]?.toString()) {
            changes[key] = { previous: previous[key], new: updated[key] };
        }
    });

    // 🔹 **Compare Batches for Modifications & New Entries**
    const prevBatchesMap = new Map(previous.batches.map(batch => [batch.barcode, batch]));
    const newBatchesMap = new Map(updated.batches.map(batch => [batch.barcode, batch]));

    let modifiedBatches = [];
    let addedBatches = [];

    for (const [barcode, newBatch] of newBatchesMap.entries()) {
        const prevBatch = prevBatchesMap.get(barcode);

        if (!prevBatch) {
            addedBatches.push(newBatch);
            continue;
        }

        let isModified = (
            (prevBatch.mgf_dt?.toISOString() || null) !== (newBatch.mgf_dt ? new Date(newBatch.mgf_dt).toISOString() : null) ||
            (prevBatch.expiry_dt?.toISOString() || null) !== (newBatch.expiry_dt ? new Date(newBatch.expiry_dt).toISOString() : null) ||
            prevBatch.purchasePrice !== newBatch.purchasePrice ||
            prevBatch.sellingPrice !== newBatch.sellingPrice
        );

        if (isModified) {
            modifiedBatches.push({
                barcode,
                previous: prevBatch,
                new: { ...newBatch, _id: prevBatch._id } // Ensure `_id` remains the same
            });
        }
    }

    if (addedBatches.length > 0) {
        changes["batchesAdded"] = addedBatches;
    }

    if (modifiedBatches.length > 0) {
        changes["batchesModified"] = modifiedBatches;
    }

    if (Object.keys(changes).length === 0) return;

    // ✅ **Log the detected changes**
    await AuditLog.create({
        companyId: updatedDoc.companyId,
        userId: updatedDoc.updatedBy,
        actionType: "Update",
        entityType: "Inventory",
        entityId: updatedDoc._id,
        data: changes,
        description: `Updated fields: ${Object.keys(changes).join(", ")}`
    });
});

// ✅ **Log Inventory Creation**
inventorySchema.post("save", async function (doc) {
    try {
        await AuditLog.create({
            companyId: doc.companyId,
            userId: doc.createdBy,
            actionType: "Create",
            entityType: "Inventory",
            entityId: doc._id,
            data: {
                productId: doc.productId,
                totalQuantity: doc.totalQuantity,
                batches: doc.batches
            },
            description: `Created new inventory record for Product ID: ${doc.productId}`
        });
    } catch (error) {
        console.error("Error in save hook:", error);
    }
});

// ✅ **Export Model**
const Inventory = mongoose.model("Inventory", inventorySchema);
export default Inventory;
