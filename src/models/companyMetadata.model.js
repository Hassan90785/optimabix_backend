import mongoose from "mongoose";

const companyMetadataSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Companies",
        required: true,
        unique: true
    },
    categories: [
        {
            type: String,
            trim: true
        }
    ],
    brands: [
        {
            type: String,
            trim: true
        }
    ]
}, {timestamps: true});

// Index for optimized lookup
companyMetadataSchema.index({companyId: 1});

const CompanyMetadata = mongoose.model("CompanyMetadata", companyMetadataSchema);
export default CompanyMetadata;
