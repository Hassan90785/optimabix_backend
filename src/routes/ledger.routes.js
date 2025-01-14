import express from 'express';
import {
    createLedgerEntry,
    getAllLedgerEntries,
    getLedgerById,
    softDeleteLedger
} from '../controllers/ledger.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/ledger
 * @desc Create a new ledger entry
 * @access Private
 */
router.post('/', authMiddleware, validationMiddleware, createLedgerEntry);

/**
 * @route GET /api/v1/ledger
 * @desc Get all ledger entries with filtering
 * @access Private
 */
router.get('/', authMiddleware, getAllLedgerEntries);

/**
 * @route GET /api/v1/ledger/:id
 * @desc Get a ledger entry by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getLedgerById);

/**
 * @route DELETE /api/v1/ledger/:id
 * @desc Soft delete a ledger entry
 * @access Private
 */
router.delete('/:id', authMiddleware, softDeleteLedger);

export default router;
