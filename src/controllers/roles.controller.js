import { Roles } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';

/**
 * @desc Create a new role
 * @route POST /api/v1/roles
 */
export const createRole = async (req, res) => {
    try {
        const { roleName, description, companyAccessControl, userAccessControl } = req.body;

        // Prevent duplicate roles
        const existingRole = await Roles.findOne({ roleName });
        if (existingRole) {
            return errorResponse(res, 'Role already exists.', 400);
        }

        const newRole = await Roles.create({
            roleName,
            description,
            companyAccessControl,
            userAccessControl
        });

        logger.info(`Role created: ${newRole.roleName}`);
        return successResponse(res, newRole, 'Role created successfully');
    } catch (error) {
        logger.error('Error creating role:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all roles
 * @route GET /api/v1/roles
 */
export const getAllRoles = async (req, res) => {
    try {
        const roles = await Roles.find().populate('companyAccessControl.companyId userAccessControl.userId');
        return successResponse(res, roles, 'Roles fetched successfully');
    } catch (error) {
        logger.error('Error fetching roles:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a role by ID
 * @route GET /api/v1/roles/:id
 */
export const getRoleById = async (req, res) => {
    try {
        const role = await Roles.findById(req.params.id).populate('companyAccessControl.companyId userAccessControl.userId');
        if (!role) {
            return errorResponse(res, 'Role not found.', 404);
        }
        return successResponse(res, role, 'Role fetched successfully');
    } catch (error) {
        logger.error('Error fetching role by ID:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Update a role by ID
 * @route PUT /api/v1/roles/:id
 */
export const updateRole = async (req, res) => {
    try {
        const { roleName, description, companyAccessControl, userAccessControl } = req.body;

        const updatedRole = await Roles.findByIdAndUpdate(
            req.params.id,
            { roleName, description, companyAccessControl, userAccessControl },
            { new: true, runValidators: true }
        );

        if (!updatedRole) {
            return errorResponse(res, 'Role not found.', 404);
        }

        logger.info(`Role updated: ${updatedRole.roleName}`);
        return successResponse(res, updatedRole, 'Role updated successfully');
    } catch (error) {
        logger.error('Error updating role:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Delete a role by ID
 * @route DELETE /api/v1/roles/:id
 */
export const deleteRole = async (req, res) => {
    try {
        const deletedRole = await Roles.findByIdAndDelete(req.params.id);
        if (!deletedRole) {
            return errorResponse(res, 'Role not found.', 404);
        }

        logger.info(`Role deleted: ${deletedRole.roleName}`);
        return successResponse(res, {}, 'Role deleted successfully');
    } catch (error) {
        logger.error('Error deleting role:', error);
        return errorResponse(res, error.message);
    }
};
