import { Discounts, Products } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';

/**
 * @desc Create a discount entry with validation
 * @route POST /api/v1/discounts
 */
export const createDiscount = async (req, res) => {
    try {
        const { companyId, discountName, discountType, discountValue, applicableProducts, validFrom, validUntil } = req.body;

        // Check for duplicate discount name within the same company
        const existingDiscount = await Discounts.findOne({ discountName, companyId });
        if (existingDiscount) {
            return errorResponse(res, 'Discount with this name already exists.', 400);
        }

        const newDiscount = await Discounts.create({
            companyId,
            discountName,
            discountType,
            discountValue,
            applicableProducts,
            validFrom,
            validUntil,
            createdBy: req.user._id
        });

        logger.info(`Discount created: ${discountName}`);
        return successResponse(res, newDiscount, 'Discount created successfully');
    } catch (error) {
        logger.error('Error creating discount:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all discounts with filtering and pagination
 * @route GET /api/v1/discounts
 * @queryParams ?companyId=123&page=1&limit=10
 */
export const getAllDiscounts = async (req, res) => {
    try {
        const { companyId, discountType, page = 1, limit = 10 } = req.query;
        const filter = { companyId, isDeleted: false };

        if (discountType) filter.discountType = discountType;

        const discounts = await Discounts.find(filter)
            .populate('applicableProducts')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await Discounts.countDocuments(filter);
        return successResponse(res, {
            discounts,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Discounts fetched successfully');
    } catch (error) {
        logger.error('Error fetching discounts:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a discount by ID
 * @route GET /api/v1/discounts/:id
 */
export const getDiscountById = async (req, res) => {
    try {
        const discount = await Discounts.findById(req.params.id).populate('applicableProducts');
        if (!discount) {
            return errorResponse(res, 'Discount not found.', 404);
        }
        return successResponse(res, discount, 'Discount details fetched successfully');
    } catch (error) {
        logger.error('Error fetching discount:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Update a discount by ID
 * @route PUT /api/v1/discounts/:id
 */
export const updateDiscount = async (req, res) => {
    try {
        const { discountName, discountType, discountValue, applicableProducts, validFrom, validUntil } = req.body;

        const updatedDiscount = await Discounts.findByIdAndUpdate(
            req.params.id,
            {
                discountName,
                discountType,
                discountValue,
                applicableProducts,
                validFrom,
                validUntil,
                updatedBy: req.user._id
            },
            { new: true, runValidators: true }
        );

        if (!updatedDiscount) {
            return errorResponse(res, 'Discount not found.', 404);
        }

        logger.info(`Discount updated: ${updatedDiscount.discountName}`);
        return successResponse(res, updatedDiscount, 'Discount updated successfully');
    } catch (error) {
        logger.error('Error updating discount:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete a discount by ID
 * @route DELETE /api/v1/discounts/:id
 */
export const softDeleteDiscount = async (req, res) => {
    try {
        const discount = await Discounts.findById(req.params.id);
        if (!discount) {
            return errorResponse(res, 'Discount not found.', 404);
        }

        await discount.softDelete(req.user._id);
        logger.info(`Discount soft-deleted: ${discount.discountName}`);
        return successResponse(res, {}, 'Discount soft-deleted successfully');
    } catch (error) {
        logger.error('Error deleting discount:', error);
        return errorResponse(res, error.message);
    }
};
