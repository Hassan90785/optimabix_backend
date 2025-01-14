import { TaxConfiguration } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';

/**
 * @desc Create a new tax configuration
 * @route POST /api/v1/taxConfigurations
 */
export const createTaxConfiguration = async (req, res) => {
    try {
        const { companyId, taxName, taxPercentage, taxInclusive, effectiveDate } = req.body;

        // Check for existing tax configuration with the same name
        const existingTax = await TaxConfiguration.findOne({ taxName, companyId });
        if (existingTax) {
            return errorResponse(res, 'Tax configuration with this name already exists.', 400);
        }

        const newTaxConfig = await TaxConfiguration.create({
            companyId,
            taxName,
            taxPercentage,
            taxInclusive,
            effectiveDate,
            createdBy: req.user._id
        });

        logger.info(`Tax configuration created for: ${taxName}`);
        return successResponse(res, newTaxConfig, 'Tax configuration created successfully');
    } catch (error) {
        logger.error('Error creating tax configuration:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all tax configurations with pagination and filtering
 * @route GET /api/v1/taxConfigurations
 * @queryParams ?companyId=123&page=1&limit=10
 */
export const getAllTaxConfigurations = async (req, res) => {
    try {
        const { companyId, page = 1, limit = 10 } = req.query;
        const filter = { companyId, isDeleted: false };

        const taxConfigurations = await TaxConfiguration.find(filter)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await TaxConfiguration.countDocuments(filter);
        return successResponse(res, {
            taxConfigurations,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Tax configurations fetched successfully');
    } catch (error) {
        logger.error('Error fetching tax configurations:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a single tax configuration by ID
 * @route GET /api/v1/taxConfigurations/:id
 */
export const getTaxConfigurationById = async (req, res) => {
    try {
        const taxConfiguration = await TaxConfiguration.findById(req.params.id);
        if (!taxConfiguration) {
            return errorResponse(res, 'Tax configuration not found.', 404);
        }
        return successResponse(res, taxConfiguration, 'Tax configuration details fetched successfully');
    } catch (error) {
        logger.error('Error fetching tax configuration:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Update a tax configuration by ID
 * @route PUT /api/v1/taxConfigurations/:id
 */
export const updateTaxConfiguration = async (req, res) => {
    try {
        const { taxName, taxPercentage, taxInclusive, effectiveDate } = req.body;

        const updatedTaxConfig = await TaxConfiguration.findByIdAndUpdate(
            req.params.id,
            {
                taxName,
                taxPercentage,
                taxInclusive,
                effectiveDate,
                updatedBy: req.user._id
            },
            { new: true, runValidators: true }
        );

        if (!updatedTaxConfig) {
            return errorResponse(res, 'Tax configuration not found.', 404);
        }

        logger.info(`Tax configuration updated: ${updatedTaxConfig.taxName}`);
        return successResponse(res, updatedTaxConfig, 'Tax configuration updated successfully');
    } catch (error) {
        logger.error('Error updating tax configuration:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete a tax configuration
 * @route DELETE /api/v1/taxConfigurations/:id
 */
export const softDeleteTaxConfiguration = async (req, res) => {
    try {
        const taxConfiguration = await TaxConfiguration.findById(req.params.id);
        if (!taxConfiguration) {
            return errorResponse(res, 'Tax configuration not found.', 404);
        }

        await taxConfiguration.softDelete(req.user._id);
        logger.info(`Tax configuration soft-deleted: ${taxConfiguration.taxName}`);
        return successResponse(res, {}, 'Tax configuration soft-deleted successfully');
    } catch (error) {
        logger.error('Error deleting tax configuration:', error);
        return errorResponse(res, error.message);
    }
};
