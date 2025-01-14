import express from 'express';
import {
    createInvoice,
    getAllInvoices,
    getInvoiceById,
    softDeleteInvoice
} from '../controllers/invoices.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/invoices
 * @desc Create a new invoice
 * @access Private
 */
router.post('/', authMiddleware, validationMiddleware, createInvoice);

/**
 * @route GET /api/v1/invoices
 * @desc Get all invoices
 * @access Private
 */
router.get('/', authMiddleware, getAllInvoices);

/**
 * @route GET /api/v1/invoices/:id
 * @desc Get an invoice by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getInvoiceById);

/**
 * @route DELETE /api/v1/invoices/:id
 * @desc Soft delete an invoice
 * @access Private
 */
router.delete('/:id', authMiddleware, softDeleteInvoice);

export default router;
