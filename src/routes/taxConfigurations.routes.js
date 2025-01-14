import express from 'express';
import {
    createTaxConfiguration,
    getAllTaxConfigurations,
    getTaxConfigurationById,
    updateTaxConfiguration,
    softDeleteTaxConfiguration
} from '../controllers/taxConfigurations.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/taxConfigurations
 * @desc Create a new tax configuration
 * @access Private
 */
router.post('/', authMiddleware, validationMiddleware, createTaxConfiguration);

/**
 * @route GET /api/v1/taxConfigurations
 * @desc Get all tax configurations
 * @access Private
 */
router.get('/', authMiddleware, getAllTaxConfigurations);

/**
 * @route GET /api/v1/taxConfigurations/:id
 * @desc Get a tax configuration by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getTaxConfigurationById);

/**
 * @route PUT /api/v1/taxConfigurations/:id
 * @desc Update a tax configuration
 * @access Private
 */
router.put('/:id', authMiddleware, validationMiddleware, updateTaxConfiguration);

/**
 * @route DELETE /api/v1/taxConfigurations/:id
 * @desc Soft delete a tax configuration
 * @access Private
 */
router.delete('/:id', authMiddleware, softDeleteTaxConfiguration);

export default router;
