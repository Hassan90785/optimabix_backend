import { Payments, Ledger, POSTransaction } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';

/**
 * @desc Create a new payment record with validation
 * @route POST /api/v1/payments
 */
export const createPayment = async (req, res) => {
    try {
        const { companyId, transactionId, ledgerEntryId, paymentMethod, amountPaid, paidBy, paymentReference } = req.body;

        // Validate if transaction and ledger exist
        const transactionExists = await POSTransaction.findById(transactionId);
        const ledgerExists = await Ledger.findById(ledgerEntryId);
        if (!transactionExists) {
            return errorResponse(res, 'Transaction not found.', 404);
        }
        if (!ledgerExists) {
            return errorResponse(res, 'Ledger entry not found.', 404);
        }

        const newPayment = await Payments.create({
            companyId,
            transactionId,
            ledgerEntryId,
            paymentMethod,
            amountPaid,
            paymentReference,
            paidBy,
            createdBy: req.user._id
        });

        logger.info(`Payment created for transaction: ${transactionId}`);
        return successResponse(res, newPayment, 'Payment created successfully');
    } catch (error) {
        logger.error('Error creating payment:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all payments with filtering, pagination, and financial insights
 * @route GET /api/v1/payments
 * @queryParams ?companyId=123&page=1&limit=10
 */
export const getAllPayments = async (req, res) => {
    try {
        const { companyId, paymentStatus, page = 1, limit = 10 } = req.query;
        const filter = { companyId, isDeleted: false };

        if (paymentStatus) filter.paymentStatus = paymentStatus;

        const payments = await Payments.find(filter)
            .populate('transactionId ledgerEntryId paidBy')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await Payments.countDocuments(filter);
        return successResponse(res, {
            payments,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Payments fetched successfully');
    } catch (error) {
        logger.error('Error fetching payments:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a single payment by ID
 * @route GET /api/v1/payments/:id
 */
export const getPaymentById = async (req, res) => {
    try {
        const payment = await Payments.findById(req.params.id).populate('transactionId ledgerEntryId paidBy');
        if (!payment) {
            return errorResponse(res, 'Payment not found.', 404);
        }
        return successResponse(res, payment, 'Payment details fetched successfully');
    } catch (error) {
        logger.error('Error fetching payment:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete a payment record
 * @route DELETE /api/v1/payments/:id
 */
export const softDeletePayment = async (req, res) => {
    try {
        const payment = await Payments.findById(req.params.id);
        if (!payment) {
            return errorResponse(res, 'Payment not found.', 404);
        }

        await payment.softDelete(req.user._id);
        logger.info(`Payment soft-deleted: ${payment._id}`);
        return successResponse(res, {}, 'Payment soft-deleted successfully');
    } catch (error) {
        logger.error('Error soft deleting payment:', error);
        return errorResponse(res, error.message);
    }
};

