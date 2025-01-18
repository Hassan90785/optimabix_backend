import { Entities } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';

/**
 * @desc Create a new entity (Customer, Vendor, or Both)
 * @route POST /api/v1/entities
 */
export const createEntity = async (req, res) => {
    try {
        const {
            entityType,
            entityName,
            contactPerson,
            billingAddress,
            shippingAddress,
            createdBy,
            companyId,
            taxInformation
        } = req.body;

        // Prevent duplicate entity creation
        const existingEntity = await Entities.findOne({ entityName });
        if (existingEntity) {
            return errorResponse(res, 'Entity with this name already exists.', 400);
        }

        const newEntity = await Entities.create({
            entityType,
            entityName,
            contactPerson,
            billingAddress,
            shippingAddress,
            taxInformation,
            companyId,
            createdBy
        });

        logger.info(`Entity created: ${newEntity.entityName}`);
        return successResponse(res, newEntity, 'Entity created successfully');
    } catch (error) {
        logger.error('Error creating entity:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all entities with filtering and pagination
 * @route GET /api/v1/entities
 * @queryParams ?entityType=Customer&page=1&limit=10
 */
export const getAllEntities = async (req, res) => {
    try {
        logger.info('Fetching entities...');
        const { entityType, page = 1, limit = 10, companyId } = req.query;
        const filter = entityType ? { entityType, companyId } : {companyId};

        const entities = await Entities.find(filter)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await Entities.countDocuments(filter);
        console.log('entities', entities);
        return successResponse(res, {
            entities,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Entities fetched successfully');
    } catch (error) {
        logger.error('Error fetching entities:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get an entity by ID
 * @route GET /api/v1/entities/:id
 */
export const getEntityById = async (req, res) => {
    try {
        const entity = await Entities.findById(req.params.id);
        if (!entity) {
            return errorResponse(res, 'Entity not found.', 404);
        }
        return successResponse(res, entity, 'Entity details fetched successfully');
    } catch (error) {
        logger.error('Error fetching entity by ID:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Update an entity with auditing
 * @route PUT /api/v1/entities/:id
 */
export const updateEntity = async (req, res) => {
    try {
        const { entityType, entityName, contactPerson, billingAddress, shippingAddress, taxInformation } = req.body;

        const updatedEntity = await Entities.findByIdAndUpdate(
            req.params.id,
            {
                entityType,
                entityName,
                contactPerson,
                billingAddress,
                shippingAddress,
                taxInformation,
                updatedBy: req.user._id
            },
            { new: true, runValidators: true }
        );

        if (!updatedEntity) {
            return errorResponse(res, 'Entity not found.', 404);
        }

        logger.info(`Entity updated: ${updatedEntity.entityName}`);
        return successResponse(res, updatedEntity, 'Entity updated successfully');
    } catch (error) {
        logger.error('Error updating entity:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete an entity
 * @route DELETE /api/v1/entities/:id
 */
export const softDeleteEntity = async (req, res) => {
    try {
        const entity = await Entities.findById(req.params.id);
        if (!entity) {
            return errorResponse(res, 'Entity not found.', 404);
        }

        await entity.softDelete(req.user._id);
        logger.info(`Entity soft-deleted: ${entity.entityName}`);
        return successResponse(res, {}, 'Entity soft-deleted successfully');
    } catch (error) {
        logger.error('Error soft-deleting entity:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Restore a soft-deleted entity
 * @route PATCH /api/v1/entities/:id/restore
 */
export const restoreEntity = async (req, res) => {
    try {
        const restoredEntity = await Entities.findByIdAndUpdate(
            req.params.id,
            { isDeleted: false, updatedBy: req.user._id },
            { new: true }
        );

        if (!restoredEntity) {
            return errorResponse(res, 'Entity not found.', 404);
        }

        logger.info(`Entity restored: ${restoredEntity.entityName}`);
        return successResponse(res, restoredEntity, 'Entity restored successfully');
    } catch (error) {
        logger.error('Error restoring entity:', error);
        return errorResponse(res, error.message);
    }
};

