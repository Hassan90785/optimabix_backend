import {Modules} from '../models/index.js';
import {errorResponse, logger, successResponse} from '../utils/index.js';

/**
 * @desc Create a new module
 * @route POST /api/v1/modules
 */
export const createModule = async (req, res) => {
    try {
        const {moduleName, description, icon, operations, accessStatus} = req.body;

        const existingModule = await Modules.findOne({moduleName});
        if (existingModule) {
            return errorResponse(res, 'Module already exists', 400);
        }

        const newModule = await Modules.create({
            moduleName,
            description,
            icon,
            operations,
            accessStatus
        });

        logger.info(`Module created: ${moduleName}`);
        return successResponse(res, newModule, 'Module created successfully', 201);
    } catch (error) {
        logger.error('Error creating module:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all modules
 * @route GET /api/v1/modules
 */
export const getAllModules = async (req, res) => {
    try {
        const {page = 1, limit = 10, sort = 'moduleName'} = req.query;
        const filter = {};
        const modules = await Modules.find(filter)
            .sort({[sort]: 1})
            .skip((page - 1) * limit)
            .limit(Number(limit));
        const totalCount = await Modules.countDocuments(filter);
        return successResponse(res, {
            modules, totalRecords: totalCount,
            currentPage: Number(page),
            totalPages: Math.ceil(totalCount / limit),
        }, 'Modules fetched successfully');
    } catch (error) {
        logger.error('Error fetching modules:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a module by ID
 * @route GET /api/v1/modules/:id
 */
export const getModuleById = async (req, res) => {
    try {
        const module = await Modules.findById(req.params.id);
        if (!module) {
            return errorResponse(res, 'Module not found', 404);
        }
        return successResponse(res, module, 'Module fetched successfully');
    } catch (error) {
        logger.error('Error fetching module by ID:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Update a module by ID
 * @route PUT /api/v1/modules/:id
 */
export const updateModule = async (req, res) => {
    try {
        const {moduleName, description, icon, operations, accessStatus} = req.body;

        const updatedModule = await Modules.findByIdAndUpdate(
            req.params.id,
            {moduleName, description, icon, operations, accessStatus},
            {new: true, runValidators: true}
        );

        if (!updatedModule) {
            return errorResponse(res, 'Module not found', 404);
        }

        logger.info(`Module updated: ${updatedModule.moduleName}`);
        return successResponse(res, updatedModule, 'Module updated successfully');
    } catch (error) {
        logger.error('Error updating module:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Delete a module by ID
 * @route DELETE /api/v1/modules/:id
 */
export const deleteModule = async (req, res) => {
    try {
        const deletedModule = await Modules.findByIdAndDelete(req.params.id);
        if (!deletedModule) {
            return errorResponse(res, 'Module not found', 404);
        }
        logger.info(`Module deleted: ${deletedModule.moduleName}`);
        return successResponse(res, {}, 'Module deleted successfully');
    } catch (error) {
        logger.error('Error deleting module:', error);
        return errorResponse(res, error.message);
    }
};

