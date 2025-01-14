import { POSTransaction, Products } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';

/**
 * @desc Create a POS transaction with product validation and auditing
 * @route POST /api/v1/posTransactions
 */
export const createPOSTransaction = async (req, res) => {
    try {
        const {
            companyId,
            products,
            discountAmount,
            taxAmount,
            totalPayable,
            paymentMethod,
            paidAmount,
            paymentReference
        } = req.body;

        // Validate products and calculate subtotal
        let subTotal = 0;
        for (const item of products) {
            const product = await Products.findById(item.productId);
            if (!product) {
                return errorResponse(res, `Product not found: ${item.productId}`, 404);
            }
            subTotal += item.unitPrice * item.quantity;
        }

        // Generate a unique transaction number
        const transactionNumber = `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newTransaction = await POSTransaction.create({
            companyId,
            products,
            transactionNumber,
            subTotal,
            discountAmount,
            taxAmount,
            totalPayable,
            paymentMethod,
            paidAmount,
            paymentReference,
            createdBy: req.user._id
        });

        logger.info(`POS Transaction created: ${transactionNumber}`);
        return successResponse(res, newTransaction, 'Transaction created successfully');
    } catch (error) {
        logger.error('Error creating transaction:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all POS transactions with pagination and filtering
 * @route GET /api/v1/posTransactions
 * @queryParams ?companyId=123&page=1&limit=10
 */
export const getAllPOSTransactions = async (req, res) => {
    try {
        const { companyId, page = 1, limit = 10 } = req.query;
        const filter = { companyId, isDeleted: false };

        const transactions = await POSTransaction.find(filter)
            .populate('products.productId')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await POSTransaction.countDocuments(filter);
        return successResponse(res, {
            transactions,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Transactions fetched successfully');
    } catch (error) {
        logger.error('Error fetching transactions:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a single POS transaction by ID
 * @route GET /api/v1/posTransactions/:id
 */
export const getPOSTransactionById = async (req, res) => {
    try {
        const transaction = await POSTransaction.findById(req.params.id).populate('products.productId');
        if (!transaction) {
            return errorResponse(res, 'Transaction not found.', 404);
        }
        return successResponse(res, transaction, 'Transaction details fetched successfully');
    } catch (error) {
        logger.error('Error fetching transaction:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete a POS transaction
 * @route DELETE /api/v1/posTransactions/:id
 */
export const softDeletePOSTransaction = async (req, res) => {
    try {
        const transaction = await POSTransaction.findById(req.params.id);
        if (!transaction) {
            return errorResponse(res, 'Transaction not found.', 404);
        }

        await transaction.softDelete(req.user._id);
        logger.info(`POS Transaction soft-deleted: ${transaction.transactionNumber}`);
        return successResponse(res, {}, 'Transaction soft-deleted successfully');
    } catch (error) {
        logger.error('Error deleting transaction:', error);
        return errorResponse(res, error.message);
    }
};

