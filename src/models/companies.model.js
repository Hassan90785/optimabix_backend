import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
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
        suspendedReason: {
            type: String,
            trim: true
        },
        revokedReason: {
            type: String,
            trim: true
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
            type: Number, // Days allowed after the due date before suspension
            default: 0
        },
        // Soft Deletion Flag
        isDeleted: {
            type: Boolean,
            default: false
        },
        // Auditing Fields
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
    {
        timestamps: true
    }
);

// Indexing for optimized lookups and reporting
companySchema.index({ businessType: 1 });
companySchema.index({ name: 1 }, { unique: true });
companySchema.index({ isDeleted: 1 });

// Adding a pre-query middleware to exclude deleted documents
companySchema.pre(/^find/, function (next) {
    this.where({ isDeleted: false });
    next();
});

// Adding a method for soft deletion
companySchema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedBy = deletedBy;
    await this.save();
};

const Companies = mongoose.model('Companies', companySchema);
export default Companies;
