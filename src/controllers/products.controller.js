import {Products} from '../models/index.js';
import {errorResponse, logger, successResponse} from '../utils/index.js';
import CompanyMetadata from "../models/companyMetadata.model.js";
import {formatName} from "../utils/formatName.js";

/**
 * @desc Create a new product with batch management and auditing
 * @route POST /api/v1/products
 */
export const createProduct = async (req, res) => {
    try {
        const {
            productName,
            sku,
            description,
            category,
            brandName,
            modelNumber,
            price,
            vendorId,
            createdBy,
            companyId,
            batches
        } = req.body;

        // Prevent duplicate SKU within the same company
        let existingProduct = await Products.findOne({sku, companyId});
        if (existingProduct) {
            return errorResponse(res, "Product with this SKU already exists.", 400);
        }

        // Ensure metadata persistence (categories, brands)
        let companyData = await CompanyMetadata.findOne({companyId});

        if (!companyData) {
            companyData = new CompanyMetadata({
                companyId,
                categories: category ? [category] : [],
                brands: brandName ? [brandName] : []
            });
        } else {
            if (category && !companyData.categories.includes(category)) {
                const name = formatName(category)
                companyData.categories.push(name);
            }
            if (brandName && !companyData.brands.includes(brandName)) {
                const name = formatName(brandName)
                companyData.brands.push(name);
            }
        }
        await companyData.save();

        // Create the product
        const product = new Products({
            productName,
            sku: sku || undefined,
            description,
            category,
            brandName,
            modelNumber,
            price,
            vendorId,
            companyId,
            createdBy,
            batches
        });

        if (!sku) product.generateSKU();

        await product.save();
        logger.info(`Product created: ${product.productName}`);
        return successResponse(res, product, "Product created successfully");
    } catch (error) {
        logger.error("Error creating product:", error);
        return errorResponse(res, error.message);
    }
};
/**
 *  Get Company Meta data
 * @param req
 * @param res
 * @returns {Promise<*>}
 */

export const getCompanyMetadata = async (req, res) => {
    try {

        const {companyId} = req.query; // Use req.query instead of req.params

        if (!companyId) {
            return errorResponse(res, "Company ID is required", 400);
        }

        const metadata = await CompanyMetadata.findOne({companyId});

        if (!metadata) {
            return successResponse(res, {
                categories: [],
                brands: []
            }, "No metadata found");
        }

        return successResponse(res, metadata, "Metadata fetched successfully");
    } catch (error) {
        logger.error("Error fetching metadata:", error);
        return errorResponse(res, error.message);
    }
};


/**
 * @desc Get all products with filtering, pagination, and batch details
 * @route GET /api/v1/products
 * @queryParams ?category=Electronics&page=1&limit=10
 */
export const getAllProducts = async (req, res) => {
    try {
        const {category, companyId, page = 1, limit = 10} = req.query;
        const filter = {isDeleted: false, companyId};

        if (category) filter.category = category;

        const products = await Products.find(filter)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await Products.countDocuments(filter);
        return successResponse(res, {
            products,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Products fetched successfully');
    } catch (error) {
        logger.error('Error fetching products:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a single product by ID
 * @route GET /api/v1/products/:id
 */
export const getProductById = async (req, res) => {
    try {
        const product = await Products.findById(req.params.id);
        if (!product || product.isDeleted) {
            return errorResponse(res, 'Product not found.', 404);
        }
        return successResponse(res, product, 'Product details fetched successfully');
    } catch (error) {
        logger.error('Error fetching product by ID:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Update product details (non-sensitive fields only)
 * @route PUT /api/v1/products/:id
 */
export const updateProduct = async (req, res) => {
    try {
        const {
            productName,
            description,
            category,
            brandName,
            modelNumber,
            price,
            createdBy,
            batches
        } = req.body;

        const updatedProduct = await Products.findByIdAndUpdate(
            req.params.id,
            {
                productName,
                description,
                category,
                brandName,
                modelNumber,
                price,
                batches,
                updatedBy: createdBy
            },
            {new: true, runValidators: true}
        );

        if (!updatedProduct) {
            return errorResponse(res, 'Product not found.', 404);
        }

        logger.info(`Product updated: ${updatedProduct.productName}`);
        return successResponse(res, updatedProduct, 'Product updated successfully');
    } catch (error) {
        logger.error('Error updating product:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete a product
 * @route DELETE /api/v1/products/:id
 */
export const softDeleteProduct = async (req, res) => {
    try {
        const product = await Products.findById(req.params.id);
        if (!product) {
            return errorResponse(res, 'Product not found.', 404);
        }

        await product.softDelete(req.user._id);
        logger.info(`Product soft-deleted: ${product.productName}`);
        return successResponse(res, {}, 'Product soft-deleted successfully');
    } catch (error) {
        logger.error('Error during soft deletion:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Restore a soft-deleted product
 * @route PATCH /api/v1/products/:id/restore
 */
export const restoreProduct = async (req, res) => {
    try {
        const restoredProduct = await Products.findByIdAndUpdate(
            req.params.id,
            {isDeleted: false, updatedBy: req.user._id},
            {new: true}
        );

        if (!restoredProduct) {
            return errorResponse(res, 'Product not found.', 404);
        }

        logger.info(`Product restored: ${restoredProduct.productName}`);
        return successResponse(res, restoredProduct, 'Product restored successfully');
    } catch (error) {
        logger.error('Error restoring product:', error);
        return errorResponse(res, error.message);
    }
};

