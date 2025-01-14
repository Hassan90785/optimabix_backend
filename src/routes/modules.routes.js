import express from 'express';
import {
    createModule,
    getAllModules,
    getModuleById,
    updateModule,
    deleteModule
} from '../controllers/modules.controller.js';
import authMiddleware from "../middlewares/auth.middleware.js";
import validationMiddleware from "../middlewares/validation.middleware.js";

const router = express.Router();

/**
 * @route POST /api/v1/modules
 * @desc Create a new module
 * @access Private (Auth Middleware Applied)
 */
router.post('/', authMiddleware, validationMiddleware, createModule);

/**
 * @route GET /api/v1/modules
 * @desc Get all modules (Supports Pagination & Filtering)
 * @access Private
 * @queryParams ?page=1&limit=10&status=Active
 */
router.get('/', authMiddleware, getAllModules);

/**
 * @route GET /api/v1/modules/:id
 * @desc Get a single module by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getModuleById);

/**
 * @route PUT /api/v1/modules/:id
 * @desc Update a module by ID
 * @access Private
 */
router.put('/:id', authMiddleware, validationMiddleware, updateModule);

/**
 * @route DELETE /api/v1/modules/:id
 * @desc Delete a module by ID
 * @access Private
 */
router.delete('/:id', authMiddleware, deleteModule);

export default router;

