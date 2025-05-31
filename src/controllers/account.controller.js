import Account from '../models/account.model.js';
import { AuditLog } from '../models/index.js';
import { errorResponse, logger, successResponse } from '../utils/index.js';

/**
 * @desc Create a new account
 * @route POST /api/v1/accounts
 */
export const createAccount = async (req, res) => {
    try {
        const { entityId, entityType, status, companyId, createdBy } = req.body;

        // Check if account already exists for this entity
        const existingAccount = await Account.findOne({ entityId, companyId, isDeleted: false });
        if (existingAccount) {
            return errorResponse(res, 'Account already exists for this entity.', 400);
        }

        const newAccount = await Account.create({
            entityId,
            entityType,
            status,
            companyId,
            createdBy
        });



        logger.info(`Account created for entity: ${entityId}`);
        return successResponse(res, newAccount, 'Account created successfully');
    } catch (error) {
        logger.error('Error creating account:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Update an account
 * @route PUT /api/v1/accounts/:id
 */
export const updateAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updatedBy = req.user._id;

        const account = await Account.findOne({ _id: id, isDeleted: false });
        if (!account) {
            return errorResponse(res, 'Account not found.', 404);
        }

        account.status = status;
        account.updatedBy = updatedBy;
        await account.save();

        await AuditLog.logAuditEvent({
            companyId: account.companyId,
            createdBy: updatedBy,
            actionType: "Update",
            entityType: "Account",
            entityId: account._id,
            description: `Account status updated to: ${status}`
        });

        logger.info(`Account updated: ${id}`);
        return successResponse(res, account, 'Account updated successfully');
    } catch (error) {
        logger.error('Error updating account:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete an account
 * @route DELETE /api/v1/accounts/:id
 */
export const deleteAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { createdBy } = req.query; // change here

        const account = await Account.findOne({ _id: id, isDeleted: false });
        if (!account) {
            return errorResponse(res, 'Account not found.', 404);
        }

        account.isDeleted = true;
        account.deletedBy = createdBy;
        await account.save();

        await AuditLog.logAuditEvent({
            companyId: account.companyId,
            createdBy: createdBy,
            actionType: "Delete",
            entityType: "Account",
            entityId: account._id,
            description: 'Account soft deleted'
        });

        logger.info(`Account deleted: ${id}`);
        return successResponse(res, null, 'Account deleted successfully');
    } catch (error) {
        logger.error('Error deleting account:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all accounts with filtering and pagination
 * @route GET /api/v1/accounts
 */
export const getAccounts = async (req, res) => {
    try {
        const { companyId, entityType, page = 1, limit = 10 } = req.query;
        const filter = { isDeleted: false };

        if (companyId) filter.companyId = companyId;
        if (entityType) filter.entityType = entityType;

        const accounts = await Account.find(filter)
            .populate('entityId', 'entityName entityType')
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .populate('deletedBy', 'name')
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const totalRecords = await Account.countDocuments(filter);

        return successResponse(res, {
            accounts,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Accounts fetched successfully');
    } catch (error) {
        logger.error('Error fetching accounts:', error);
        return errorResponse(res, error.message);
    }
}; 
