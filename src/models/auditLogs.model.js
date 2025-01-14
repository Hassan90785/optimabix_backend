import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    actionType: {
        type: String,
        enum: ['Create', 'Update', 'Delete', 'Soft Delete', 'Login', 'Logout'],
        required: true
    },
    entityType: {
        type: String,
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId
    },
    description: {
        type: String,
        trim: true
    },
    actionDate: {
        type: Date,
        default: Date.now
    },
    // Soft Deletion and Auditing Fields
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
auditLogSchema.index({ companyId: 1, userId: 1 });
auditLogSchema.index({ actionType: 1 });
auditLogSchema.index({ isDeleted: 1 });

// Pre-query middleware to exclude soft-deleted records
auditLogSchema.pre(/^find/, function(next) {
    this.where({ isDeleted: false });
    next();
});

// Method for soft deletion
auditLogSchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
