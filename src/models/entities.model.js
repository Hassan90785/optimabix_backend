import mongoose from "mongoose";
import {AuditLog} from "./index.js";

const entitiesSchema = new mongoose.Schema({
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Companies',
            required: true
        },
        entityType: {
            type: String,
            enum: ['Customer', 'Vendor', 'Both'],
            required: true
        },
        entityName: {
            type: String,
            required: true,
            trim: true
        },
        contactPerson: {
            fullName: {
                type: String,
                trim: true
            },
            email: {
                type: String,
                trim: true
            },
            phone: {
                type: String,
                trim: true
            }
        },
        billingAddress: {
            street: String,
            city: String,
            state: String,
            postalCode: String,
            country: String
        },
        shippingAddress: {
            street: String,
            city: String,
            state: String,
            postalCode: String,
            country: String
        },
        taxInformation: {
            taxId: {
                type: String,
                trim: true
            },
            taxExempt: {
                type: Boolean,
                default: false
            }
        },
        accessStatus: {
            type: String,
            enum: ['Active', 'Suspended', 'Revoked', 'Trial', 'Expired'],
            default: 'Active'
        },
        paymentHistory: [
            {
                invoiceId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Invoices'
                },
                amountPaid: Number,
                paymentDate: Date
            }
        ],
        nextPaymentDue: {
            type: Date
        },
        gracePeriod: {
            type: Number,
            default: 0
        },
        suspendedReason: {
            type: String,
            trim: true
        },
        revokedReason: {
            type: String,
            trim: true
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

// **Indexing for optimized lookups**
entitiesSchema.index({ companyId: 1, entityType: 1 });
entitiesSchema.index({ entityName: 1 });
entitiesSchema.index({ accessStatus: 1 });
entitiesSchema.index({ isDeleted: 1 });

// ✅ Middleware to capture previous values before update
entitiesSchema.pre("findOneAndUpdate", async function (next) {
    this.options.new = true;
    this.options.runValidators = true;
    this.options.context = "query";

    const docToUpdate = await this.model.findOne(this.getQuery()); // Fetch the old document
    this._previous = docToUpdate; // Store the old document for comparison
    next();
});

// ✅ Middleware to log changes after update
entitiesSchema.post("findOneAndUpdate", async function (updatedDoc) {
    if (!this._previous || !updatedDoc) return;

    const previousValues = this._previous.toObject(); // Convert to plain object
    const newValues = updatedDoc.toObject(); // Convert to plain object

    const changedFields = {};
    for (const key in newValues) {
        if (JSON.stringify(previousValues[key]) !== JSON.stringify(newValues[key])) {
            changedFields[key] = {
                previous: previousValues[key],
                new: newValues[key]
            };
        }
    }

    // If no fields changed, don't log
    if (Object.keys(changedFields).length === 0) return;

    // Log the changes to `AuditLog`
    await AuditLog.create({
        companyId: updatedDoc.companyId,
        userId: updatedDoc.updatedBy, // Ensure `updatedBy` is passed in update operation
        actionType: "Update",
        entityType: "Entities",
        entityId: updatedDoc._id,
        data: changedFields, // Only changed fields
        description: `Updated fields: ${Object.keys(changedFields).join(", ")}`
    });
});
// **Pre-query middleware to exclude soft-deleted records**
entitiesSchema.pre(/^find/, function(next) {
    this.where({ isDeleted: false });
    next();
});

// **Soft delete method for controllers**
entitiesSchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

const Entities = mongoose.model('Entities', entitiesSchema);
export default Entities;
