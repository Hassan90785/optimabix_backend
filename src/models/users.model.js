import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        trim: true
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Roles',
        default: null
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true
    },
    branches: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch'
        }
    ],
    accessStatus: {
        type: String,
        enum: ['Active', 'Suspended', 'Revoked', 'Trial', 'Expired'],
        default: 'Active'
    },
    accessStatusReason: {
        type: String,
        trim: true
    },
    lastLogin: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Indexes for optimized searching
userSchema.index({ email: 1, companyId: 1 });
userSchema.index({ username: 1, companyId: 1 });

const User = mongoose.model('User', userSchema);
export default User;
