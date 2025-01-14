import express from 'express';
import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    softDeleteProduct,
    restoreProduct
} from '../controllers/products.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/products
 * @desc Create a new product
 * @access Private
 */
router.post('/', authMiddleware, validationMiddleware, createProduct);

/**
 * @route GET /api/v1/products
 * @desc Get all products with filtering and pagination
 * @access Private
 */
router.get('/', authMiddleware, getAllProducts);

/**
 * @route GET /api/v1/products/:id
 * @desc Get a single product by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getProductById);

/**
 * @route PUT /api/v1/products/:id
 * @desc Update product details
 * @access Private
 */
router.put('/:id', authMiddleware, validationMiddleware, updateProduct);

/**
 * @route DELETE /api/v1/products/:id
 * @desc Soft delete a product
 * @access Private
 */
router.delete('/:id', authMiddleware, softDeleteProduct);

/**
 * @route PATCH /api/v1/products/:id/restore
 * @desc Restore a soft-deleted product
 * @access Private
 */
router.patch('/:id/restore', authMiddleware, restoreProduct);

export default router;

