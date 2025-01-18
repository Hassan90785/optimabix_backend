import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Users } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';

/**
 * @desc Create a new user (Registration)
 * @route POST /api/v1/users
 */
export const createUser = async (req, res) => {
    try {
        const { fullName, username, email, password, phone, role, companyId } = req.body;

        // Prevent duplicate user registration
        const existingUser = await Users.findOne({ email });
        if (existingUser) {
            return errorResponse(res, 'User with this email already exists.', 400);
        }

        // Password hashing
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await Users.create({
            fullName,
            username,
            email,
            password: hashedPassword,
            phone,
            role,
            companyId
        });

        logger.info(`User created: ${newUser.username}`);
        return successResponse(res, newUser, 'User registered successfully');
    } catch (error) {
        logger.error('Error creating user:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc User Login
 * @route POST /api/v1/users/login
 */
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Users.findOne({ email }).populate('role');

        if (!user) {
            return errorResponse(res, 'Invalid credentials.', 401);
        }

        // Compare the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return errorResponse(res, 'Invalid credentials.', 401);
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id, role: user.role.roleName }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });

        logger.info(`User logged in: ${user.username}`);
        return successResponse(res, { token, user }, 'Login successful');
    } catch (error) {
        logger.error('Error during login:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all users
 * @route GET /api/v1/users
 */
export const getAllUsers = async (req, res) => {
    try {
        const { role, companyId, page = 1, limit = 10, sort = 'name' } = req.query;

        // Build filter object based on query parameters
        const filter = {};
        if (role) filter.role = role;
        if (companyId) filter.companyId = companyId;

        // Fetch users with pagination and sorting
        const users = await Users.find(filter)
            .populate('role companyId')
            .sort({ [sort]: 1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        // Count total users matching the filter
        const totalCount = await Users.countDocuments(filter);

        // Return consistent response
        return successResponse(res, {
            users,
            totalRecords: totalCount,
            currentPage: Number(page),
            totalPages: Math.ceil(totalCount / limit),
        }, 'Users fetched successfully');
    } catch (error) {
        logger.error('Error fetching users:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a user by ID
 * @route GET /api/v1/users/:id
 */
export const getUserById = async (req, res) => {
    try {
        const user = await Users.findById(req.params.id).populate('role companyId');
        if (!user) {
            return errorResponse(res, 'User not found.', 404);
        }
        return successResponse(res, user, 'User fetched successfully');
    } catch (error) {
        logger.error('Error fetching user by ID:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Update a user by ID
 * @route PUT /api/v1/users/:id
 */
export const updateUser = async (req, res) => {
    try {
        const { fullName, phone, role, companyId } = req.body;

        const updatedUser = await Users.findByIdAndUpdate(
            req.params.id,
            { fullName, phone, role, companyId },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return errorResponse(res, 'User not found.', 404);
        }

        logger.info(`User updated: ${updatedUser.username}`);
        return successResponse(res, updatedUser, 'User updated successfully');
    } catch (error) {
        logger.error('Error updating user:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Delete a user by ID
 * @route DELETE /api/v1/users/:id
 */
export const deleteUser = async (req, res) => {
    try {
        const deletedUser = await Users.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            return errorResponse(res, 'User not found.', 404);
        }
        logger.info(`User deleted: ${deletedUser.username}`);
        return successResponse(res, {}, 'User deleted successfully');
    } catch (error) {
        logger.error('Error deleting user:', error);
        return errorResponse(res, error.message);
    }
};
