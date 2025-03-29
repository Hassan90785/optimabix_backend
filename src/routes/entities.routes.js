import express from 'express';
import {
    createEntity,
    getAllEntities,
    getEntityById,
    updateEntity,
    softDeleteEntity,
    restoreEntity, getNonAccountEntities
} from '../controllers/entities.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/entities
 * @desc Create a new entity (Customer, Vendor, Both)
 * @access Private
 */
router.post('/', authMiddleware, validationMiddleware, createEntity);

/**
 * @route GET /api/v1/entities
 * @desc Get all entities with filtering and pagination
 * @access Private
 */
router.get('/', authMiddleware, getAllEntities);

router.get('/getNonAccounts', authMiddleware, getNonAccountEntities);

/**
 * @route GET /api/v1/entities/:id
 * @desc Get a single entity by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getEntityById);

/**
 * @route PUT /api/v1/entities/:id
 * @desc Update entity details
 * @access Private
 */
router.put('/:id', authMiddleware, validationMiddleware, updateEntity);

/**
 * @route DELETE /api/v1/entities/:id
 * @desc Soft delete an entity
 * @access Private
 */
router.delete('/:id', authMiddleware, softDeleteEntity);

/**
 * @route PATCH /api/v1/entities/:id/restore
 * @desc Restore a soft-deleted entity
 * @access Private
 */
router.patch('/:id/restore', authMiddleware, restoreEntity);

export default router;

