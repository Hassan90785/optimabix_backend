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
            transactionType,
            debitAmount,
            creditAmount,
            referenceId,
            referenceType
        } = req.body;

        // Calculate balance (credit - debit)
        const balance = creditAmount - debitAmount;

        const newLedgerEntry = await Ledger.create({
            companyId,
            description,
            linkedEntityId,
            transactionType,
            debitAmount,
            creditAmount,
            balance,
            referenceId,
            referenceType,
            createdBy: req.user._id
        });

        logger.info(`Ledger entry created for company: ${companyId}`);
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
        const {companyId, page = 1, limit = 10} = req.query;
        const filter = {companyId, isDeleted: false};

        const ledgerEntries = await Ledger.find(filter)
            .sort({date: -1})
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('linkedEntityId');

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
