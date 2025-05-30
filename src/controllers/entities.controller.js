import {AuditLog, Entities, Inventory, Ledger} from '../models/index.js';
import {errorResponse, logger, successResponse} from '../utils/index.js';
import Account from "../models/account.model.js";

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
            email,
            phone,
            billingAddress,
            shippingAddress,
            createdBy,
            companyId,
            taxInformation
        } = req.body;

        // Prevent duplicate entity creation
        const existingEntity = await Entities.findOne({entityName});
        if (existingEntity) {
            return errorResponse(res, 'Entity with this name already exists.', 400);
        }

        const newEntity = await Entities.create({
            entityType,
            entityName,
            contactPerson,
            billingAddress,
            shippingAddress,
            email,
            phone,
            taxInformation,
            companyId,
            createdBy
        });
        await AuditLog.logAuditEvent({
            companyId,
            createdBy,
            actionType: "Create",
            entityType: "Entity",
            entityId: newEntity._id,
            description: `New Entity : ${entityName} - ${entityType}, by ${createdBy}.`
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
        const {entityType, page = 1, limit = 10, companyId} = req.query;
        const filter = entityType ? {entityType, companyId} : {companyId};

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
 * @desc Get all entities that are not account holders
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const getNonAccountEntities = async (req, res) => {
    try {
        logger.info('Fetching non-account holder entities...');
        const { entityType, page = 1, limit = 10, companyId } = req.query;

        // Get all entityIds that already have accounts
        const accountEntityIds = await Account.find({ companyId }).distinct('entityId');

        // Filter for entities that are NOT in accountEntityIds
        const filter = {
            companyId,
            ...(entityType && { entityType }),
            _id: { $nin: accountEntityIds }
        };

        const entities = await Entities.find(filter)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await Entities.countDocuments(filter);

        return successResponse(res, {
            entities,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Non-account holder entities fetched successfully');
    } catch (error) {
        logger.error('Error fetching non-account holder entities:', error);
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
        const {
            entityType,
            entityName,
            contactPerson,
            billingAddress,
            shippingAddress,
            taxInformation,
            email,
            phone,
            createdBy
        } = req.body;

        const updatedEntity = await Entities.findByIdAndUpdate(
            req.params.id,
            {
                entityType,
                entityName,
                contactPerson,
                billingAddress,   email,
                phone,
                shippingAddress,
                taxInformation,
                updatedBy: createdBy
            },
            {new: true, runValidators: true}
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
        const { id } = req.params;
        const { createdBy } = req.query; // change here

        const entity = await Entities.findById(id);
        if (!entity) {
            return errorResponse(res, 'Entity not found.', 404);
        }

        // Check active link in Account
        const accountLinked = await Account.exists({ entityId: id, isDeleted: false });
        if (accountLinked) {
            return errorResponse(res, 'Entity is linked to active Account(s). Cannot delete.', 400);
        }

        // Check active link in Inventory (Vendor)
        const inventoryLinked = await Inventory.exists({ vendorId: id, isDeleted: false });
        if (inventoryLinked) {
            return errorResponse(res, 'Entity is linked to Inventory records. Cannot delete.', 400);
        }

        // Check active link in Ledger
        const ledgerLinked = await Ledger.exists({ linkedEntityId: id, isDeleted: false });
        if (ledgerLinked) {
            return errorResponse(res, 'Entity is linked in Ledger. Cannot delete.', 400);
        }

    /*    // Check active link in POS Transactions
        const posLinked = await POSTransaction.exists({ linkedEntityId: id, isDeleted: false });
        if (posLinked) {
            return errorResponse(res, 'Entity is used in POS Transactions. Cannot delete.', 400);
        }*/

        // Soft-delete entity
        entity.isDeleted = true;
        entity.deletedBy = createdBy;
        await entity.save();

        logger.info(`Entity soft-deleted: ${entity.entityName}`);
        return successResponse(res, {}, 'Entity soft-deleted successfully');
    } catch (error) {
        logger.error('Error soft-deleting entity:', error);
        return errorResponse(res, error.message || 'Internal server error');
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
            {isDeleted: false, updatedBy: req.user._id},
            {new: true}
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

