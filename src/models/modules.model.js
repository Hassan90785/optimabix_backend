import mongoose from "mongoose";

const modulesSchema = new mongoose.Schema({
    moduleName: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    icon: {
        type: String,  // Icon class or URL for UI representation
        trim: true
    },
    operations: [
        {
            name: {
                type: String,
                enum: ['list', 'add', 'view', 'update', 'delete'],
                required: true
            },
            isEnabled: {
                type: Boolean,
                default: true
            },
            routePath: {
                type: String,
                trim: true
            }
        }
    ],
    accessStatus: {
        type: String,
        enum: ['Active', 'InActive'],
        default: 'Active'
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

// Indexing for faster lookup
modulesSchema.index({ moduleName: 1 });

const Modules = mongoose.model('Modules', modulesSchema);
export default Modules;


