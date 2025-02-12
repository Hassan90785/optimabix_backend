import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Companies"
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    },
    actionType: {
        type: String,
        enum: ["Create", "Update", "Delete", "Soft Delete", "Login", "Logout"]
    },
    entityType: {
        type: String
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    data: {
        type: mongoose.Schema.Types.Mixed
    },
    description: {
        type: String,
        trim: true
    },
    actionDate: {
        type: Date,
        default: Date.now
    },
}, {timestamps: true});

// ✅ **Reusable Function to Log Audit Events**
auditLogSchema.statics.logAuditEvent = async function ({
                                                           companyId,
                                                           userId,
                                                           actionType,
                                                           entityType,
                                                           data = null,
                                                           entityId = null,
                                                           description = ""
                                                       }) {
    try {
        // Ensure description is formatted properly
        description = description.trim();

        // Create and save the audit log entry
        const auditEntry = new this({
            companyId,
            userId,
            actionType,
            entityType,
            data,
            entityId,
            description
        });

        await auditEntry.save();
        return auditEntry;
    } catch (error) {
        console.error("Error logging audit event:", error);
    }
};

// ✅ Indexes for optimized lookups
auditLogSchema.index({companyId: 1, userId: 1});
auditLogSchema.index({actionType: 1});
auditLogSchema.index({entityType: 1});
auditLogSchema.index({actionDate: -1});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
