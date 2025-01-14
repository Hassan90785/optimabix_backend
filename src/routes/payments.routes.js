import express from 'express';
import {
    createPayment,
    getAllPayments,
    getPaymentById,
    softDeletePayment
} from '../controllers/payments.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/payments
 * @desc Create a new payment record
 * @access Private
 */
router.post('/', authMiddleware, validationMiddleware, createPayment);

/**
 * @route GET /api/v1/payments
 * @desc Get all payments with filtering and pagination
 * @access Private
 */
router.get('/', authMiddleware, getAllPayments);

/**
 * @route GET /api/v1/payments/:id
 * @desc Get a payment by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getPaymentById);

/**
 * @route DELETE /api/v1/payments/:id
 * @desc Soft delete a payment record
 * @access Private
 */
router.delete('/:id', authMiddleware, softDeletePayment);

export default router;

