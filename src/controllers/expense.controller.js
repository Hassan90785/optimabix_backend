import {createDoubleLedgerEntry} from "../utils/ledgerService.js";
import { successResponse, errorResponse, logger } from "../utils/index.js";
import mongoose from "mongoose";
import {Ledger} from "../models/index.js";

export const createExpense = async (req, res) => {
    try {
        const {
            companyId,
            description,
            debitAccount,       // e.g., "Office Supplies"
            creditAccount,      // usually "Cash/Bank"
            amount,
            referenceType = 'Payments',
            linkedEntityId = null,
            accountId = null,
            createdBy
        } = req.body;

        const transactionId = new mongoose.Types.ObjectId().toString();

        const result = await createDoubleLedgerEntry({
            transactionId,
            companyId,
            transactionType: 'Expense',
            referenceType,
            description,
            debitAccount,
            debitAmount: amount,
            creditAccount,
            creditAmount: amount,
            linkedEntityId,
            accountId,
            createdBy
        });

        logger.info(`Expense entry created [${description}]`);
        return successResponse(res, result, 'Expense recorded successfully');
    } catch (error) {
        logger.error('Error creating expense entry:', error);
        return errorResponse(res, error.message);
    }
};


export const getAllExpenses = async (req, res) => {
    try {
        const { companyId, startDate, endDate, page = 1, limit = 100 } = req.query;

        if (!companyId) {
            return errorResponse(res, 'Missing companyId in query', 400);
        }

        const filter = {
            companyId: new mongoose.Types.ObjectId(companyId),
            transactionType: 'Expense',
            isDeleted: false
        };

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
            if (endDate) filter.date.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }

        const entries = await Ledger.find(filter)
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('linkedEntityId', 'entityName entityType')
            .populate('createdBy', 'name');

        const totalRecords = await Ledger.countDocuments(filter);

        // Sum only debit entries (actual expense values)
        const totalAmount = entries.reduce((sum, entry) => {
            return entry.entryType === 'debit' ? sum + entry.amount : sum;
        }, 0);

        return successResponse(res, {
            entries,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit),
            totals: {
                totalExpenses: totalAmount
            }
        }, 'Expense entries fetched successfully');
    } catch (error) {
        logger.error('Error fetching expense entries:', error);
        return errorResponse(res, error.message);
    }
};
