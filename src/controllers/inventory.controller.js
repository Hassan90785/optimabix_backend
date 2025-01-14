import { Inventory, Products } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';

/**
 * @desc Add a new inventory entry (with batch management)
 * @route POST /api/v1/inventory
 */
export const createInventory = async (req, res) => {
    try {
        const { productId, companyId, barcode, batches } = req.body;

        // Validate product and company existence
        const productExists = await Products.findById(productId);
        if (!productExists) {
            return errorResponse(res, 'Product not found.', 404);
        }

        const existingInventory = await Inventory.findOne({ productId, companyId });
        if (existingInventory) {
            return errorResponse(res, 'Inventory for this product already exists.', 400);
        }

        // Calculate total quantity from batches
        const totalQuantity = batches.reduce((sum, batch) => sum + batch.quantity, 0);

        const newInventory = await Inventory.create({
            productId,
            companyId,
            barcode,
            batches,
            totalQuantity,
            createdBy: req.user._id
        });

        logger.info(`Inventory added for Product: ${productId}`);
        return successResponse(res, newInventory, 'Inventory created successfully');
    } catch (error) {
        logger.error('Error creating inventory:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all inventory items with pagination and filtering
 * @route GET /api/v1/inventory
 * @queryParams ?companyId=123&page=1&limit=10
 */
export const getAllInventory = async (req, res) => {
    try {
        const { companyId, page = 1, limit = 10 } = req.query;
        const filter = { companyId, isDeleted: false };

        const inventoryItems = await Inventory.find(filter)
            .populate('productId')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await Inventory.countDocuments(filter);
        return successResponse(res, {
            inventoryItems,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Inventory fetched successfully');
    } catch (error) {
        logger.error('Error fetching inventory:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a single inventory item by ID
 * @route GET /api/v1/inventory/:id
 */
export const getInventoryById = async (req, res) => {
    try {
        const inventory = await Inventory.findById(req.params.id).populate('productId');
        if (!inventory || inventory.isDeleted) {
            return errorResponse(res, 'Inventory not found.', 404);
        }
        return successResponse(res, inventory, 'Inventory details fetched successfully');
    } catch (error) {
        logger.error('Error fetching inventory:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Update an inventory entry with batch adjustments
 * @route PUT /api/v1/inventory/:id
 */
export const updateInventory = async (req, res) => {
    try {
        const { batches } = req.body;

        const inventory = await Inventory.findById(req.params.id);
        if (!inventory) {
            return errorResponse(res, 'Inventory not found.', 404);
        }

        // Update batch data and total quantity
        inventory.batches = batches;
        inventory.totalQuantity = batches.reduce((sum, batch) => sum + batch.quantity, 0);
        inventory.updatedBy = req.user._id;

        await inventory.save();
        logger.info(`Inventory updated for Product ID: ${inventory.productId}`);
        return successResponse(res, inventory, 'Inventory updated successfully');
    } catch (error) {
        logger.error('Error updating inventory:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete an inventory record
 * @route DELETE /api/v1/inventory/:id
 */
export const softDeleteInventory = async (req, res) => {
    try {
        const inventory = await Inventory.findById(req.params.id);
        if (!inventory) {
            return errorResponse(res, 'Inventory not found.', 404);
        }

        await inventory.softDelete(req.user._id);
        logger.info(`Inventory soft-deleted for Product ID: ${inventory.productId}`);
        return successResponse(res, {}, 'Inventory soft-deleted successfully');
    } catch (error) {
        logger.error('Error soft-deleting inventory:', error);
        return errorResponse(res, error.message);
    }
};

