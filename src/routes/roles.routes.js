import express from 'express';
import {
    createRole,
    getAllRoles,
    getRoleById,
    updateRole,
    deleteRole
} from '../controllers/roles.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/roles
 * @desc Create a new role
 * @access Private (JWT Protected)
 */
router.post('/', authMiddleware, validationMiddleware, createRole);

/**
 * @route GET /api/v1/roles
 * @desc Get all roles (Supports pagination & filtering)
 * @access Private
 */
router.get('/', authMiddleware, getAllRoles);

/**
 * @route GET /api/v1/roles/:id
 * @desc Get a specific role by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getRoleById);

/**
 * @route PUT /api/v1/roles/:id
 * @desc Update a role by ID
 * @access Private
 */
router.put('/:id', authMiddleware, validationMiddleware, updateRole);

/**
 * @route DELETE /api/v1/roles/:id
 * @desc Delete a role by ID
 * @access Private
 */
router.delete('/:id', authMiddleware, deleteRole);

export default router;

