import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true
    },
    entityType: {
        type: String,
        enum: ['Product', 'Customer', 'Vendor', 'Stock', 'Transaction', 'Ledger'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    actionDetails: {
        type: String,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Indexes for faster activity tracking
auditLogSchema.index({ companyId: 1, userId: 1 });
auditLogSchema.index({ entityType: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;

