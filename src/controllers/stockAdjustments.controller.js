import { StockAdjustment, Products, Ledger } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';

/**
 * @desc Create a stock adjustment entry with auditing and batch validation
 * @route POST /api/v1/stockAdjustments
 */
export const createStockAdjustment = async (req, res) => {
    try {
        const { companyId, productId, batchId, adjustmentType, adjustedQuantity, reason, ledgerEntryId } = req.body;

        // Validate product and batch existence
        const product = await Products.findById(productId);
        if (!product) {
            return errorResponse(res, 'Product not found.', 404);
        }

        // Check if the batch exists in the product
        const batchExists = product.batches.find(batch => batch.batchId === batchId);
        if (!batchExists) {
            return errorResponse(res, 'Batch not found for this product.', 404);
        }

        const newAdjustment = await StockAdjustment.create({
            companyId,
            productId,
            batchId,
            adjustmentType,
            adjustedQuantity,
            reason,
            ledgerEntryId,
            createdBy: req.user._id
        });

        logger.info(`Stock adjustment created for Product ID: ${productId}`);
        return successResponse(res, newAdjustment, 'Stock adjustment created successfully');
    } catch (error) {
        logger.error('Error creating stock adjustment:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all stock adjustments with filtering and pagination
 * @route GET /api/v1/stockAdjustments
 * @queryParams ?companyId=123&page=1&limit=10
 */
export const getAllStockAdjustments = async (req, res) => {
    try {
        const { companyId, page = 1, limit = 10 } = req.query;
        const filter = { companyId, isDeleted: false };

        const adjustments = await StockAdjustment.find(filter)
            .populate('productId')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await StockAdjustment.countDocuments(filter);
        return successResponse(res, {
            adjustments,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Stock adjustments fetched successfully');
    } catch (error) {
        logger.error('Error fetching stock adjustments:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a stock adjustment by ID
 * @route GET /api/v1/stockAdjustments/:id
 */
export const getStockAdjustmentById = async (req, res) => {
    try {
        const adjustment = await StockAdjustment.findById(req.params.id).populate('productId');
        if (!adjustment) {
            return errorResponse(res, 'Stock adjustment not found.', 404);
        }
        return successResponse(res, adjustment, 'Stock adjustment fetched successfully');
    } catch (error) {
        logger.error('Error fetching stock adjustment:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete a stock adjustment
 * @route DELETE /api/v1/stockAdjustments/:id
 */
export const softDeleteStockAdjustment = async (req, res) => {
    try {
        const adjustment = await StockAdjustment.findById(req.params.id);
        if (!adjustment) {
            return errorResponse(res, 'Stock adjustment not found.', 404);
        }

        await adjustment.softDelete(req.user._id);
        logger.info(`Stock adjustment soft-deleted: ${adjustment._id}`);
        return successResponse(res, {}, 'Stock adjustment soft-deleted successfully');
    } catch (error) {
        logger.error('Error deleting stock adjustment:', error);
        return errorResponse(res, error.message);
    }
};

