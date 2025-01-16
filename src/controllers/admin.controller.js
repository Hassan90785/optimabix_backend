import {errorResponse, logger, successResponse} from '../utils/index.js';
import jwt from 'jsonwebtoken';
import {Admin} from "../models/index.js";
import bcrypt from 'bcrypt'

/**
 * @desc Create a Super Admin Account
 * @route POST /api/v1/admin/register
 */
export const registerAdmin = async (req, res) => {
    try {
        const {fullName, email, password} = req.body;

        const existingAdmin = await Admin.findOne({email});
        if (existingAdmin) {
            return errorResponse(res, 'Admin already exists.', 400);
        }

        const newAdmin = await Admin.create({
            fullName,
            email,
            password,
            createdBy: req.user?._id
        });

        logger.info(`Super Admin Created: ${newAdmin.email}`);
        return successResponse(res, newAdmin, 'Super Admin created successfully');
    } catch (error) {
        logger.error('Error registering Super Admin:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Admin Login
 * @route POST /api/v1/admin/login
 */
export const adminLogin = async (req, res) => {
    try {
        logger.info('Super Admin Login Attempt:', req.body);
        const {email, password} = req.body;

        const admin = await Admin.findOne({email}).select('+password');
        if (!admin) return errorResponse(res, 'Invalid Credentials', 401);

        const isPasswordMatch = await bcrypt.compare(password, admin.password);
        if (!isPasswordMatch) return errorResponse(res, 'Invalid Credentials', 401);

        const token = jwt.sign({id: admin._id, role: admin.role}, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });
        logger.info(`Super Admin Logged In: ${admin.email}`);
        console.log('token', token)
        return successResponse(res, {token, admin}, 'Admin logged in successfully');
    } catch (error) {
        logger.error('Error during Super Admin login:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get All Admins
 * @route GET /api/v1/admins
 */
export const getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find({isDeleted: false});
        return successResponse(res, admins, 'Admins fetched successfully');
    } catch (error) {
        logger.error('Error fetching admins:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft Delete an Admin
 * @route DELETE /api/v1/admin/:id
 */
export const softDeleteAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return errorResponse(res, 'Admin not found.', 404);
        }

        await admin.softDelete(req.user._id);
        logger.info(`Super Admin Soft Deleted: ${admin.email}`);
        return successResponse(res, {}, 'Admin soft-deleted successfully');
    } catch (error) {
        logger.error('Error soft deleting admin:', error);
        return errorResponse(res, error.message);
    }
};
