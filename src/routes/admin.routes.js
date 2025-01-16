import express from 'express';
import {
    registerAdmin,
    adminLogin,
    getAllAdmins,
    softDeleteAdmin
} from '../controllers/admin.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/admin/register
 * @desc Create a Super Admin
 * @access Private
 */
router.post('/register',  validationMiddleware, registerAdmin);

/**
 * @route POST /api/v1/admin/login
 * @desc Super Admin Login
 * @access Public
 */
router.post('/login',  adminLogin);

/**
 * @route GET /api/v1/admins
 * @desc Get All Super Admins
 * @access Private
 */
router.get('/', authMiddleware, getAllAdmins);

/**
 * @route DELETE /api/v1/admin/:id
 * @desc Soft Delete a Super Admin
 * @access Private
 */
router.delete('/:id', authMiddleware, softDeleteAdmin);

export default router;
