import express from 'express';
import {
    createSubscriptionPlan,
    getAllSubscriptionPlans,
    getSubscriptionPlanById,
    updateSubscriptionPlan,
    softDeleteSubscriptionPlan
} from '../controllers/subscriptionPlans.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/subscriptionPlans
 * @desc Create a new subscription plan
 * @access Private
 */
router.post('/', authMiddleware, validationMiddleware, createSubscriptionPlan);

/**
 * @route GET /api/v1/subscriptionPlans
 * @desc Get all subscription plans
 * @access Private
 */
router.get('/', authMiddleware, getAllSubscriptionPlans);

/**
 * @route GET /api/v1/subscriptionPlans/:id
 * @desc Get a subscription plan by ID
 * @access Private
 */
router.get('/:id', authMiddleware, getSubscriptionPlanById);

/**
 * @route PUT /api/v1/subscriptionPlans/:id
 * @desc Update a subscription plan
 * @access Private
 */
router.put('/:id', authMiddleware, validationMiddleware, updateSubscriptionPlan);

/**
 * @route DELETE /api/v1/subscriptionPlans/:id
 * @desc Soft delete a subscription plan
 * @access Private
 */
router.delete('/:id', authMiddleware, softDeleteSubscriptionPlan);

export default router;
