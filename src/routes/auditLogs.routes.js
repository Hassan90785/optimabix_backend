import express from 'express';
import {
    createAuditLog,
    getAllAuditLogs,
    getAuditLogById,
    softDeleteAuditLog
} from '../controllers/auditLogs.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/auditLogs
 * @desc Create a new audit log entry
 * @access Private
 */
router.post('/', authMiddleware, validationMiddleware, createAuditLog);

/**
 * @route GET /api/v1/auditLogs
 * @desc Get all audit logs
 * @access Private
 */
router.get('/', authMiddleware, getAllAuditLogs);

/**
 * @route GET /api/v1/auditLogs/:id
 * @desc Get an audit log by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getAuditLogById);

/**
 * @route DELETE /api/v1/auditLogs/:id
 * @desc Soft delete an audit log
 * @access Private
 */
router.delete('/:id', authMiddleware, softDeleteAuditLog);

export default router;
