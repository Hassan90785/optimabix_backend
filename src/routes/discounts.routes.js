import express from 'express';
import {
    createDiscount,
    getAllDiscounts,
    getDiscountById,
    updateDiscount,
    softDeleteDiscount
} from '../controllers/discounts.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/discounts
 * @desc Create a new discount
 * @access Private
 */
router.post('/', authMiddleware, validationMiddleware, createDiscount);

/**
 * @route GET /api/v1/discounts
 * @desc Get all discounts
 * @access Private
 */
router.get('/', authMiddleware, getAllDiscounts);

/**
 * @route GET /api/v1/discounts/:id
 * @desc Get a discount by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getDiscountById);

/**
 * @route PUT /api/v1/discounts/:id
 * @desc Update a discount
 * @access Private
 */
router.put('/:id', authMiddleware, validationMiddleware, updateDiscount);

/**
 * @route DELETE /api/v1/discounts/:id
 * @desc Soft delete a discount
 * @access Private
 */
router.delete('/:id', authMiddleware, softDeleteDiscount);

export default router;
