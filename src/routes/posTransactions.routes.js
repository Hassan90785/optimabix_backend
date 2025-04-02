import express from 'express';
import {
    createPaymentTransaction,
    createPOSTransaction,
    getAllPOSTransactions,
    getPOSTransactionById,
    softDeletePOSTransaction
} from '../controllers/posTransactions.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/posTransactions
 * @desc Create a new POS transaction
 * @access Private
 */
router.post('/', authMiddleware, validationMiddleware, createPOSTransaction);
/**
 * @route POST /api/v1/posTransactions/paymentTransaction
 */
router.post('/paymentTransaction', authMiddleware, validationMiddleware, createPaymentTransaction);

/**
 * @route GET /api/v1/posTransactions
 * @desc Get all POS transactions
 * @access Private
 */
router.get('/', authMiddleware, getAllPOSTransactions);

/**
 * @route GET /api/v1/posTransactions/:id
 * @desc Get a POS transaction by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getPOSTransactionById);

/**
 * @route DELETE /api/v1/posTransactions/:id
 * @desc Soft delete a POS transaction
 * @access Private
 */
router.delete('/:id', authMiddleware, softDeletePOSTransaction);

export default router;

