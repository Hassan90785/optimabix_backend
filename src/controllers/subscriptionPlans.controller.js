import { SubscriptionPlan } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';

/**
 * @desc Create a subscription plan with feature handling
 * @route POST /api/v1/subscriptionPlans
 */
export const createSubscriptionPlan = async (req, res) => {
    try {
        const { planName, planType, features, price, maxUsers, maxProducts } = req.body;

        // Prevent duplicate plan names
        const existingPlan = await SubscriptionPlan.findOne({ planName });
        if (existingPlan) {
            return errorResponse(res, 'Subscription plan already exists.', 400);
        }

        const newPlan = await SubscriptionPlan.create({
            planName,
            planType,
            features,
            price,
            maxUsers,
            maxProducts,
            createdBy: req.user._id
        });

        logger.info(`Subscription Plan created: ${planName}`);
        return successResponse(res, newPlan, 'Subscription plan created successfully');
    } catch (error) {
        logger.error('Error creating subscription plan:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all subscription plans with filtering and pagination
 * @route GET /api/v1/subscriptionPlans
 * @queryParams ?planType=Monthly&page=1&limit=10
 */
export const getAllSubscriptionPlans = async (req, res) => {
    try {
        const { planType, page = 1, limit = 10 } = req.query;
        const filter = { isDeleted: false };

        if (planType) filter.planType = planType;

        const plans = await SubscriptionPlan.find(filter)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await SubscriptionPlan.countDocuments(filter);
        return successResponse(res, {
            plans,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Subscription plans fetched successfully');
    } catch (error) {
        logger.error('Error fetching subscription plans:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a subscription plan by ID
 * @route GET /api/v1/subscriptionPlans/:id
 */
export const getSubscriptionPlanById = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id);
        if (!plan) {
            return errorResponse(res, 'Subscription plan not found.', 404);
        }
        return successResponse(res, plan, 'Subscription plan details fetched successfully');
    } catch (error) {
        logger.error('Error fetching subscription plan:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Update a subscription plan by ID
 * @route PUT /api/v1/subscriptionPlans/:id
 */
export const updateSubscriptionPlan = async (req, res) => {
    try {
        const { planName, planType, features, price, maxUsers, maxProducts } = req.body;

        const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
            req.params.id,
            {
                planName,
                planType,
                features,
                price,
                maxUsers,
                maxProducts,
                updatedBy: req.user._id
            },
            { new: true, runValidators: true }
        );

        if (!updatedPlan) {
            return errorResponse(res, 'Subscription plan not found.', 404);
        }

        logger.info(`Subscription Plan updated: ${updatedPlan.planName}`);
        return successResponse(res, updatedPlan, 'Subscription plan updated successfully');
    } catch (error) {
        logger.error('Error updating subscription plan:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete a subscription plan by ID
 * @route DELETE /api/v1/subscriptionPlans/:id
 */
export const softDeleteSubscriptionPlan = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id);
        if (!plan) {
            return errorResponse(res, 'Subscription plan not found.', 404);
        }

        await plan.softDelete(req.user._id);
        logger.info(`Subscription Plan soft-deleted: ${plan.planName}`);
        return successResponse(res, {}, 'Subscription plan soft-deleted successfully');
    } catch (error) {
        logger.error('Error deleting subscription plan:', error);
        return errorResponse(res, error.message);
    }
};
