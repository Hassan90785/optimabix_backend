import mongoose from "mongoose";

const rolesSchema = new mongoose.Schema({
    roleName: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    // Company-Wide Access Control
    companyAccessControl: {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Companies',
            required: true
        },
        permissions: [
            {
                moduleId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Modules',
                    required: true
                },
                operationsAllowed: {
                    type: [String],
                    enum: ['list', 'add', 'view', 'update', 'delete'],
                    required: true
                }
            }
        ],
        accessStatus: {
            type: String,
            enum: ['Active', 'Suspended', 'Revoked', 'Trial', 'Expired'],
            default: 'Active'
        },
        validUntil: Date
    },
    // User-Specific Access Control
    userAccessControl: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Users',
                required: true
            },
            permissions: [
                {
                    moduleId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Modules',
                        required: true
                    },
                    operationsAllowed: {
                        type: [String],
                        enum: ['list', 'add', 'view', 'update', 'delete'],
                        required: true
                    }
                }
            ],
            accessStatus: {
                type: String,
                enum: ['Active', 'Suspended', 'Revoked', 'Trial', 'Expired'],
                default: 'Active'
            },
            validUntil: Date
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for optimized lookups
rolesSchema.index({ roleName: 1, companyAccessControl: 1 });

const Roles = mongoose.model('Roles', rolesSchema);
export default Roles;

