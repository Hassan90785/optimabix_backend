import { Branches, Companies } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';
import * as _ from 'lodash-es';

/**
 * @desc Create a new branch
 * @route POST /api/v1/branches
 */
export const createBranch = async (req, res) => {
    try {
        const { name, address, companyId } = req.body;

        const existingBranch = await Branches.findOne({ name, companyId, isDeleted: false });
        if (existingBranch) {
            return errorResponse(res, 'Branch with this name already exists for this company.', 400);
        }

        const newBranch = await Branches.create({ name, address, companyId });

        logger.info(`Branch created: ${newBranch.name}`);
        return successResponse(res, newBranch, 'Branch created successfully');
    } catch (error) {
        logger.error('Error creating branch:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all branches for a company
 * @route GET /api/v1/branches/company/:companyId
 */
export const getBranchesByCompany = async (req, res) => {
    try {
        const { companyId } = req.params;

        const branches = await Branches.find({ companyId, isDeleted: false }).sort({ name: 1 });

        return successResponse(res, branches, 'Branches fetched successfully');
    } catch (error) {
        logger.error('Error fetching branches:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get branch by ID
 * @route GET /api/v1/branches/:id
 */
export const getBranchById = async (req, res) => {
    try {
        const branch = await Branches.findOne({ _id: req.params.id, isDeleted: false }).populate('companyId');

        if (!branch) {
            return errorResponse(res, 'Branch not found.', 404);
        }

        return successResponse(res, branch, 'Branch fetched successfully');
    } catch (error) {
        logger.error('Error fetching branch:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Update branch
 * @route PUT /api/v1/branches/:id
 */
export const updateBranch = async (req, res) => {
    try {
        const { name, address } = req.body;

        const branch = await Branches.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { name, address },
            { new: true, runValidators: true }
        );

        if (!branch) {
            return errorResponse(res, 'Branch not found.', 404);
        }

        logger.info(`Branch updated: ${branch.name}`);
        return successResponse(res, branch, 'Branch updated successfully');
    } catch (error) {
        logger.error('Error updating branch:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete branch
 * @route DELETE /api/v1/branches/:id
 */
export const deleteBranch = async (req, res) => {
    try {
        const branch = await Branches.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { isDeleted: true },
            { new: true }
        );

        if (!branch) {
            return errorResponse(res, 'Branch not found.', 404);
        }

        logger.info(`Branch deleted: ${branch.name}`);
        return successResponse(res, {}, 'Branch deleted successfully');
    } catch (error) {
        logger.error('Error deleting branch:', error);
        return errorResponse(res, error.message);
    }
};
