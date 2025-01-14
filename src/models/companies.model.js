import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },
        registrationNumber: {
            type: String,
            trim: true,
            unique: true
        },
        businessType: {
            type: String,
            enum: ['POS', 'B2C', 'B2B', 'Both', 'All'],
            required: true
        },
        contactDetails: {
            email: {
                type: String,
                trim: true,
                lowercase: true
            },
            phone: {
                type: String,
                trim: true
            },
            address: {
                street: String,
                city: String,
                state: String,
                country: String,
                postalCode: String
            }
        },
        logo: {
            type: String, // File path for the stored logo
            trim: true
        },
        accessStatus: {
            type: String,
            enum: ['Active', 'Suspended', 'Revoked', 'Trial', 'Expired'],
            default: 'Active'
        },
        paymentHistory: [
            {
                date: { type: Date },
                amount: { type: Number },
                paymentMethod: { type: String }
            }
        ],
        nextPaymentDue: {
            type: Date
        },
        gracePeriod: {
            type: Number, // Days allowed after due date before suspension
            default: 0
        },
        suspendedReason: {
            type: String
        },
        revokedReason: {
            type: String
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Adding an index on businessType for optimized queries
companySchema.index({ businessType: 1 });
companySchema.index({ name: 1 }, { unique: true });

// Export the Company model
const Company = mongoose.model('Company', companySchema);
export default Company;
