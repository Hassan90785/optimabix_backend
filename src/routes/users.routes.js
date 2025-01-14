import express from 'express';
import {
    createUser,
    loginUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
} from '../controllers/users.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/users
 * @desc Register a new user
 * @access Private (JWT Protected)
 */
router.post('/', authMiddleware, validationMiddleware, createUser);

/**
 * @route POST /api/v1/users/login
 * @desc Authenticate user and return JWT token
 * @access Public
 */
router.post('/login', loginUser);

/**
 * @route GET /api/v1/users
 * @desc Fetch all users (Requires JWT)
 * @access Private
 */
router.get('/', authMiddleware, getAllUsers);

/**
 * @route GET /api/v1/users/:id
 * @desc Fetch a specific user by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getUserById);

/**
 * @route PUT /api/v1/users/:id
 * @desc Update a user by ID
 * @access Private
 */
router.put('/:id', authMiddleware, validationMiddleware, updateUser);

/**
 * @route DELETE /api/v1/users/:id
 * @desc Delete a user by ID
 * @access Private
 */
router.delete('/:id', authMiddleware, deleteUser);

export default router;
