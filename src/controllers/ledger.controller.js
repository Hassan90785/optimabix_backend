import {Ledger} from '../models/index.js';
import {errorResponse, logger, successResponse} from '../utils/index.js';

/**
 * @desc Create a ledger entry with auditing and financial handling
 * @route POST /api/v1/ledger
 */
export const createLedgerEntry = async (req, res) => {
    try {
        const {
            companyId,
            description,
            linkedEntityId,
            accountId,
            transactionType,
            entryType,
            amount,
            referenceId,
            referenceType,
            items = [],
            tax = 0,
            discount = 0,
            isSystemGenerated = false,
            notes = '',
            createdBy // <-- received from frontend
        } = req.body;

        const newLedgerEntry = await Ledger.create({
            companyId,
            description,
            linkedEntityId,
            accountId,
            transactionType,
            entryType,
            amount,
            referenceId,
            referenceType,
            items,
            tax,
            discount,
            isSystemGenerated,
            notes,
            createdBy,
            date: new Date()
        });

        logger.info(`Ledger entry created [${transactionType}] for company: ${companyId}`);
        return successResponse(res, newLedgerEntry, 'Ledger entry created successfully');
    } catch (error) {
        logger.error('Error creating ledger entry:', error);
        return errorResponse(res, error.message);
    }
};


/**
 * @desc Get all ledger entries with pagination and filtering
 * @route GET /api/v1/ledger
 * @queryParams ?companyId=123&page=1&limit=10
 */
export const getAllLedgerEntries = async (req, res) => {
    try {
        const { companyId, accountId, page = 1, limit = 1000 } = req.query;

        const filter = {
            companyId,
            isDeleted: false
        };

        if (accountId) {
            filter.accountId = accountId;
        }

        const ledgerEntries = await Ledger.find(filter)
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('linkedEntityId', 'entityName entityType')
            .populate('createdBy', 'name');

        const totalRecords = await Ledger.countDocuments(filter);

        return successResponse(res, {
            ledgerEntries,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Ledger entries fetched successfully');
    } catch (error) {
        logger.error('Error fetching ledger entries:', error);
        return errorResponse(res, error.message);
    }
};


/**
 * @desc Get a single ledger entry by ID
 * @route GET /api/v1/ledger/:id
 */
export const getLedgerById = async (req, res) => {
    try {
        const ledgerEntry = await Ledger.findById(req.params.id);
        if (!ledgerEntry) {
            return errorResponse(res, 'Ledger entry not found.', 404);
        }
        return successResponse(res, ledgerEntry, 'Ledger entry fetched successfully');
    } catch (error) {
        logger.error('Error fetching ledger entry:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete a ledger entry
 * @route DELETE /api/v1/ledger/:id
 */
export const softDeleteLedger = async (req, res) => {
    try {
        const ledgerEntry = await Ledger.findById(req.params.id);
        if (!ledgerEntry) {
            return errorResponse(res, 'Ledger entry not found.', 404);
        }

        await ledgerEntry.softDelete(req.user._id);
        logger.info(`Ledger entry soft-deleted: ${ledgerEntry._id}`);
        return successResponse(res, {}, 'Ledger entry soft-deleted successfully');
    } catch (error) {
        logger.error('Error soft deleting ledger entry:', error);
        return errorResponse(res, error.message);
    }
};
