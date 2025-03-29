import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { validateAccount } from '../middlewares/validation.middleware.js';
import {
    createAccount,
    updateAccount,
    deleteAccount,
    getAccounts
} from '../controllers/account.controller.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * @route POST /api/v1/account
 * @desc Create a new account
 * @access Private
 */
router.post('/', validateAccount, createAccount);

/**
 * @route PUT /api/v1/account/:id
 * @desc Update an existing account
 * @access Private
 */
router.put('/:id', validateAccount, updateAccount);

/**
 * @route DELETE /api/v1/account/:id
 * @desc Soft delete an account
 * @access Private
 */
router.delete('/:id', deleteAccount);

/**
 * @route GET /api/v1/account
 * @desc Get all accounts with filtering and pagination
 * @access Private
 */
router.get('/', getAccounts);

export default router;
