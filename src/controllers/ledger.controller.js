import {Ledger} from '../models/index.js';
import {errorResponse, logger, successResponse} from '../utils/index.js';
import Account from "../models/account.model.js";

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

        // Fetch paginated ledger entries
        const ledgerEntries = await Ledger.find(filter)
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('linkedEntityId', 'entityName entityType')
            .populate('createdBy', 'name');

        const totalRecords = await Ledger.countDocuments(filter);

        // Default response wrapper
        const responseWrapper = {
            _id: accountId || null,
            entityName: null,
            entityType: null,
            totalAmountDue: null,
            totalAmountReceived: null,
            totalDiscountGiven: null,
            totalTaxCharged: null,
            balance: null,
            entries: ledgerEntries,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        };

        if (accountId) {
            const account = await Account.findOne({ _id: accountId, companyId, isDeleted: false })
                .populate('entityId', 'entityName entityType');

            if (account) {
                // Use the utility to calculate totals
                const summary = calculateLedgerSummary(ledgerEntries);

                responseWrapper.entityName = account.entityId?.entityName || null;
                responseWrapper.entityType = account.entityId?.entityType || null;
                responseWrapper.totalAmountDue = summary.totalAmountDue;
                responseWrapper.totalAmountReceived = summary.totalAmountReceived;
                responseWrapper.totalDiscountGiven = summary.totalDiscountGiven;
                responseWrapper.totalTaxCharged = summary.totalTaxCharged;
                responseWrapper.balance = summary.balance;
            }
        }

        return successResponse(res, responseWrapper, 'Ledger entries fetched successfully');
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


export const calculateLedgerSummary = (ledgerEntries = []) => {
    let totalAmountDue = 0;
    let totalAmountReceived = 0;
    let totalDiscountGiven = 0;
    let totalTaxCharged = 0;

    for (const entry of ledgerEntries) {
        const { account, entryType, amount } = entry;

        if (!account || !entryType || typeof amount !== 'number') continue;

        switch (account) {
            case 'Accounts Receivable':
                if (entryType === 'debit') {
                    totalAmountDue += amount;
                } else if (entryType === 'credit') {
                    // Don't include in totalAmountReceived directly
                    // We'll handle this when account is Cash/Bank or classify source
                }
                break;

            case 'Discount Expense':
                if (entryType === 'debit') {
                    totalDiscountGiven += amount;
                }
                break;

            case 'Tax Payable':
                if (entryType === 'credit') {
                    totalTaxCharged += amount;
                }
                break;

            case 'Vendor Payable':
                if (entryType === 'credit') {
                    totalAmountDue += amount;
                } else if (entryType === 'debit') {
                    totalAmountReceived += amount;
                }
                break;

            case 'Cash/Bank':
                if (entryType === 'debit') {
                    totalAmountReceived += amount;
                }
                break;

            // Add any other cases you want to track
            default:
                break;
        }
    }

    const balance = totalAmountDue - totalAmountReceived;

    return {
        totalAmountDue,
        totalAmountReceived,
        totalDiscountGiven,
        totalTaxCharged,
        balance
    };
};
