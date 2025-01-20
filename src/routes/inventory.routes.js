import express from 'express';
import {
    createInventory,
    getAllInventory,
    getAvailableInventory,
    getInventoryById,
    softDeleteInventory,
    updateInventory
} from '../controllers/inventory.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/inventory
 * @desc Create new inventory record
 * @access Private
 */
router.post('/', authMiddleware, validationMiddleware, createInventory);

/**
 * @route GET /api/v1/inventory
 * @desc Get all inventory with filtering
 * @access Private
 */
router.get('/', authMiddleware, getAllInventory);

/**
 * @route GET /api/v1/inventory/getAvailable
 * @desc Get available inventory
 * @access Private
 */
router.get('/getAvailable', authMiddleware, getAvailableInventory);

/**
 * @route GET /api/v1/inventory/:id
 * @desc Get inventory by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getInventoryById);

/**
 * @route PUT /api/v1/inventory/:id
 * @desc Update inventory details
 * @access Private
 */
router.put('/:id', authMiddleware, validationMiddleware, updateInventory);

/**
 * @route DELETE /api/v1/inventory/:id
 * @desc Soft delete inventory record
 * @access Private
 */
router.delete('/:id', authMiddleware, softDeleteInventory);

export default router;

