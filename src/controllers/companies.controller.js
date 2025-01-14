import { Companies } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';

/**
 * @desc Create a new company with comprehensive validation
 * @route POST /api/v1/companies
 */
export const createCompany = async (req, res) => {
    try {
        const { name, registrationNumber, businessType, contactDetails, logo, accessStatus } = req.body;

        if (!name || !registrationNumber || !businessType) {
            return errorResponse(res, 'Name, Registration Number, and Business Type are required.', 400);
        }

        const existingCompany = await Companies.findOne({ name });
        if (existingCompany) {
            return errorResponse(res, 'Company already exists.', 400);
        }

        const newCompany = await Companies.create({
            name,
            registrationNumber,
            businessType,
            contactDetails,
            logo,
            accessStatus
        });

        logger.info(`Company created: ${newCompany.name}`);
        return successResponse(res, newCompany, 'Company created successfully');
    } catch (error) {
        logger.error('Error creating company:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all companies with filtering, pagination, and sorting
 * @route GET /api/v1/companies
 * @queryParams ?businessType=POS&page=1&limit=10&sort=name
 */
export const getAllCompanies = async (req, res) => {
    try {
        const { businessType, page = 1, limit = 10, sort = 'name' } = req.query;

        const filter = businessType ? { businessType } : {};
        const companies = await Companies.find(filter)
            .sort({ [sort]: 1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalCount = await Companies.countDocuments(filter);

        return successResponse(res, {
            companies,
            totalRecords: totalCount,
            currentPage: Number(page),
            totalPages: Math.ceil(totalCount / limit)
        }, 'Companies fetched successfully');
    } catch (error) {
        logger.error('Error fetching companies:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a single company by ID
 * @route GET /api/v1/companies/:id
 */
export const getCompanyById = async (req, res) => {
    try {
        const company = await Companies.findById(req.params.id);
        if (!company) {
            return errorResponse(res, 'Company not found.', 404);
        }
        return successResponse(res, company, 'Company details fetched successfully');
    } catch (error) {
        logger.error('Error fetching company by ID:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Update company details (non-sensitive data only)
 * @route PUT /api/v1/companies/:id
 */
export const updateCompany = async (req, res) => {
    try {
        const { name, registrationNumber, businessType, contactDetails, logo } = req.body;

        const updatedCompany = await Companies.findByIdAndUpdate(
            req.params.id,
            { name, registrationNumber, businessType, contactDetails, logo },
            { new: true, runValidators: true }
        );

        if (!updatedCompany) {
            return errorResponse(res, 'Company not found.', 404);
        }

        logger.info(`Company updated: ${updatedCompany.name}`);
        return successResponse(res, updatedCompany, 'Company updated successfully');
    } catch (error) {
        logger.error('Error updating company:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Update company access control (status management)
 * @route PATCH /api/v1/companies/:id/access-status
 */
export const updateCompanyAccessStatus = async (req, res) => {
    try {
        const { accessStatus, suspendedReason, revokedReason } = req.body;

        if (['Suspended', 'Revoked'].includes(accessStatus) && !suspendedReason && !revokedReason) {
            return errorResponse(res, 'Suspension or Revocation requires a reason.', 400);
        }

        const updatedCompany = await Companies.findByIdAndUpdate(
            req.params.id,
            { accessStatus, suspendedReason, revokedReason },
            { new: true, runValidators: true }
        );

        if (!updatedCompany) {
            return errorResponse(res, 'Company not found.', 404);
        }

        logger.info(`Access status updated: ${updatedCompany.name}`);
        return successResponse(res, updatedCompany, 'Company access status updated successfully');
    } catch (error) {
        logger.error('Error updating access status:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Add a payment record for a company
 * @route POST /api/v1/companies/:id/payment
 */
export const addPaymentRecord = async (req, res) => {
    try {
        const { date, amount, paymentMethod, nextPaymentDue, gracePeriod } = req.body;

        const company = await Companies.findById(req.params.id);
        if (!company) {
            return errorResponse(res, 'Company not found.', 404);
        }

        company.paymentHistory.push({ date, amount, paymentMethod });
        company.nextPaymentDue = nextPaymentDue || company.nextPaymentDue;
        company.gracePeriod = gracePeriod || company.gracePeriod;

        await company.save();
        logger.info(`Payment added for company: ${company.name}`);
        return successResponse(res, company, 'Payment record added successfully');
    } catch (error) {
        logger.error('Error adding payment record:', error);
        return errorResponse(res, error.message);
    }
};


/**
 * @desc Soft delete a company (sets isDeleted to true)
 * @route DELETE /api/v1/companies/:id
 */
export const softDeleteCompany = async (req, res) => {
    try {
        const company = await Companies.findById(req.params.id);
        if (!company) {
            return errorResponse(res, 'Company not found.', 404);
        }

        await company.softDelete(req.user._id);
        logger.info(`Company soft-deleted: ${company.name}`);
        return successResponse(res, {}, 'Company soft-deleted successfully');
    } catch (error) {
        logger.error('Error during soft deletion:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Restore a soft-deleted company
 * @route PATCH /api/v1/companies/:id/restore
 */
export const restoreCompany = async (req, res) => {
    try {
        const company = await Companies.findByIdAndUpdate(
            req.params.id,
            { isDeleted: false, updatedBy: req.user._id },
            { new: true }
        );
        if (!company) {
            return errorResponse(res, 'Company not found.', 404);
        }
        logger.info(`Company restored: ${company.name}`);
        return successResponse(res, company, 'Company restored successfully');
    } catch (error) {
        logger.error('Error restoring company:', error);
        return errorResponse(res, error.message);
    }
};
