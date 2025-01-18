import express from 'express';
import {
    addPaymentRecord,
    createCompany,
    getAllCompanies,
    getCompanyById,
    restoreCompany,
    softDeleteCompany,
    updateCompany,
    updateCompanyAccessStatus
} from '../controllers/companies.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/companies
 * @desc Create a new company
 * @access Private
 */
router.post('/',  validationMiddleware, createCompany);

/**
 * @route GET /api/v1/companies
 * @desc Get all companies with filtering, pagination, and sorting
 * @queryParams ?businessType=POS&page=1&limit=10&sort=name
 * @access Private
 */
router.get('/',  getAllCompanies);

/**
 * @route GET /api/v1/companies/:id
 * @desc Get a company by ID
 * @access Private
 */
router.get('/:id',  getCompanyById);

/**
 * @route PUT /api/v1/companies/:id
 * @desc Update company details (non-sensitive data only)
 * @access Private
 */
router.put('/:id',  validationMiddleware, updateCompany);

/**
 * @route PATCH /api/v1/companies/:id/access-status
 * @desc Update company access status (Active, Suspended, Revoked)
 * @access Private
 */
router.patch('/:id/access-status',  validationMiddleware, updateCompanyAccessStatus);

/**
 * @route POST /api/v1/companies/:id/payment
 * @desc Add a payment record for a company
 * @access Private
 */
router.post('/:id/payment',  validationMiddleware, addPaymentRecord);


/**
 * @route DELETE /api/v1/companies/:id
 * @desc Soft delete a company
 * @access Private
 */
router.delete('/:id',  softDeleteCompany);

/**
 * @route PATCH /api/v1/companies/:id/restore
 * @desc Restore a soft-deleted company
 * @access Private
 */
router.patch('/:id/restore',  restoreCompany);
export default router;
