import { AuditLog } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';

/**
 * @desc Create an audit log entry for user actions
 * @route POST /api/v1/auditLogs
 */
export const createAuditLog = async (req, res) => {
    try {
        const { companyId, userId, actionType, entityType, entityId, description } = req.body;

        const newLog = await AuditLog.create({
            companyId,
            userId,
            actionType,
            entityType,
            entityId,
            description,
            createdBy: req.user._id
        });

        logger.info(`Audit Log Created: ${actionType} by User ${userId}`);
        return successResponse(res, newLog, 'Audit log created successfully');
    } catch (error) {
        logger.error('Error creating audit log:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all audit logs with filtering and pagination
 * @route GET /api/v1/auditLogs
 * @queryParams ?companyId=123&page=1&limit=10
 */
export const getAllAuditLogs = async (req, res) => {
    try {
        const { companyId, actionType, page = 1, limit = 10 } = req.query;
        const filter = { companyId, isDeleted: false };

        if (actionType) filter.actionType = actionType;

        const logs = await AuditLog.find(filter)
            .populate('userId')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await AuditLog.countDocuments(filter);
        return successResponse(res, {
            logs,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Audit logs fetched successfully');
    } catch (error) {
        logger.error('Error fetching audit logs:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a single audit log by ID
 * @route GET /api/v1/auditLogs/:id
 */
export const getAuditLogById = async (req, res) => {
    try {
        const log = await AuditLog.findById(req.params.id).populate('userId');
        if (!log) {
            return errorResponse(res, 'Audit log not found.', 404);
        }
        return successResponse(res, log, 'Audit log details fetched successfully');
    } catch (error) {
        logger.error('Error fetching audit log:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete an audit log
 * @route DELETE /api/v1/auditLogs/:id
 */
export const softDeleteAuditLog = async (req, res) => {
    try {
        const log = await AuditLog.findById(req.params.id);
        if (!log) {
            return errorResponse(res, 'Audit log not found.', 404);
        }

        await log.softDelete(req.user._id);
        logger.info(`Audit Log Soft Deleted: ${log._id}`);
        return successResponse(res, {}, 'Audit log soft-deleted successfully');
    } catch (error) {
        logger.error('Error soft deleting audit log:', error);
        return errorResponse(res, error.message);
    }
};
