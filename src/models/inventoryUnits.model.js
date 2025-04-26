import mongoose from "mongoose";

const inventoryUnitSchema = new mongoose.Schema({
    companyId: {type: mongoose.Schema.Types.ObjectId, ref: "Companies", required: true},
    productId: {type: mongoose.Schema.Types.ObjectId, ref: "Products", required: true},
    inventoryId: {type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true},
    batchBarcode: {type: String, required: true}, // barcode from the inventory batch
    serialNumber: {type: String,
        unique: true,
        sparse: true, // ✅ Only enforces uniqueness if the field exists and is non-null
        trim: true},
    modelNumber: {type: String},
    sku: {type: String},
    warrantyMonths: {type: Number},
    status: {type: String, enum: ["In Stock", "Sold", "Returned", "Faulty"], default: "In Stock"},
    addedOn: {type: Date, default: Date.now},
    soldOn: {type: Date},
    createdBy: {type: mongoose.Schema.Types.ObjectId, ref: "Users"},
    updatedBy: {type: mongoose.Schema.Types.ObjectId, ref: "Users"}
}, {timestamps: true});

inventoryUnitSchema.index({serialNumber: 1}, {unique: true});

const InventoryUnits = mongoose.model("InventoryUnits", inventoryUnitSchema);
export default InventoryUnits;
