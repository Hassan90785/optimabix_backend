import {Invoices, Ledger, Payments, POSTransaction} from '../models/index.js';
import {errorResponse, logger, successResponse} from '../utils/index.js';
import mongoose from "mongoose";

export const createPOSTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            companyId,
            products,
            discountAmount,
            taxAmount,
            subTotal,
            totalPayable,
            paymentMethod,
            paidAmount,
            createdBy,
            changeGiven
        } = req.body;

        // Generate a unique transaction number if necessary (you can use an auto-increment or UUID logic here)

        // Create a new POS transaction
        const [newTransaction] = await POSTransaction.create(
            [
                {
                    companyId,
                    products,
                    subTotal,
                    discountAmount,
                    taxAmount,
                    totalPayable,
                    paymentMethod,
                    paidAmount,
                    changeGiven,
                    createdBy
                }
            ],
            {session}
        );
        logger.info(`POS Transaction created: ${newTransaction.transactionNumber}`);

        // Create a new payment record
        const [payment] = await Payments.create(
            [
                {
                    companyId,
                    transactionId: newTransaction._id,
                    ledgerEntryId: null, // Placeholder; update with actual ledger entry logic if needed
                    paymentMethod,
                    amountPaid: paidAmount,
                    paymentStatus: paidAmount >= totalPayable ? 'Completed' : 'Pending',
                    createdBy,
                    paidBy: null // Placeholder; update with actual payer logic if needed
                }
            ],
            {session}
        );

        // Create a new invoice record
        const [invoice] = await Invoices.create(
            [
                {
                    companyId,
                    transactionId: newTransaction._id,
                    ledgerEntryId: null, // Placeholder; update with actual ledger entry logic if needed
                    linkedEntityId: null, // Optional, depending on the customer or vendor
                    lineItems: products.map(product => ({
                        productId: product.productId,
                        batchId: product.batchId || null,
                        quantity: product.quantity,
                        unitPrice: product.unitPrice,
                        totalPrice: product.totalPrice
                    })),
                    subTotal,
                    discountAmount,
                    taxAmount,
                    totalAmount: totalPayable,
                    paymentStatus: paidAmount >= totalPayable ? 'Paid' : 'Partial',
                    createdBy,
                    notes: 'Invoice for the transaction'
                }
            ],
            {session}
        );

        // Add ledger entries for the transaction
        const ledgerEntries = [];

        // Ledger Entry: Sales Revenue
        ledgerEntries.push(
            Ledger.manageLedgerEntry({
                companyId,
                transactionType: 'Sale',
                description: `Sales revenue recorded for transaction ${newTransaction.transactionNumber}`,
                debitCaption: 'Accounts Receivable',
                creditCaption: 'Sales Revenue',
                debitAmount: subTotal,
                creditAmount: subTotal,
                referenceType: 'POS Transactions',
                createdBy,
            })
        );

        // Ledger Entry: Tax Collected
        if (taxAmount > 0) {
            ledgerEntries.push(
                Ledger.manageLedgerEntry({
                    companyId,
                    transactionType: 'Tax',
                    description: `Tax collected for transaction ${newTransaction.transactionNumber}`,
                    debitCaption: 'Accounts Receivable',
                    creditCaption: 'Tax Payable',
                    debitAmount: taxAmount,
                    creditAmount: taxAmount,
                    referenceType: 'POS Transactions',
                    createdBy,
                })
            );
        }

        // Ledger Entry: Discount Given
        if (discountAmount > 0) {
            ledgerEntries.push(
                Ledger.manageLedgerEntry({
                    companyId,
                    transactionType: 'Discount',
                    description: `Discount given for transaction ${newTransaction.transactionNumber}`,
                    debitCaption: 'Discount Expense',
                    creditCaption: 'Accounts Receivable',
                    debitAmount: discountAmount,
                    creditAmount: discountAmount,
                    referenceType: 'POS Transactions',
                    createdBy,
                })
            );
        }

        // Ledger Entry: Payment Received
        ledgerEntries.push(
            Ledger.manageLedgerEntry({
                companyId,
                transactionType: 'Payment',
                description: `Payment received for transaction ${newTransaction.transactionNumber}`,
                debitCaption: 'Cash/Bank',
                creditCaption: 'Accounts Receivable',
                debitAmount: paidAmount,
                creditAmount: paidAmount,
                referenceType: 'Payments',
                createdBy,
            })
        );

        // Execute all ledger entry promises
        await Promise.all(ledgerEntries);

        // Commit the transaction
        await session.commitTransaction();
        await session.endSession();

        logger.info(`Transaction, payment, and invoice created successfully: ${newTransaction.transactionNumber} & ${invoice.invoiceNumber}`);
        return successResponse(res, {
            transaction: newTransaction,
            payment
        }, 'Transaction and payment created successfully');
    } catch (error) {
        // Rollback the transaction in case of an error
        await session.abortTransaction();
        await session.endSession();

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
        const {companyId, page = 1, limit = 10} = req.query;
        const filter = {companyId, isDeleted: false};

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

