import express from 'express';
import {
    createStockAdjustment,
    getAllStockAdjustments,
    getStockAdjustmentById,
    softDeleteStockAdjustment
} from '../controllers/stockAdjustments.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/stockAdjustments
 * @desc Create a new stock adjustment
 * @access Private
 */
router.post('/', authMiddleware, validationMiddleware, createStockAdjustment);

/**
 * @route GET /api/v1/stockAdjustments
 * @desc Get all stock adjustments
 * @access Private
 */
router.get('/', authMiddleware, getAllStockAdjustments);

/**
 * @route GET /api/v1/stockAdjustments/:id
 * @desc Get a stock adjustment by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getStockAdjustmentById);

/**
 * @route DELETE /api/v1/stockAdjustments/:id
 * @desc Soft delete a stock adjustment
 * @access Private
 */
router.delete('/:id', authMiddleware, softDeleteStockAdjustment);

export default router;
