import {Companies, Inventory, Invoices, Payments, POSTransaction} from '../models/index.js';
import {errorResponse, generatePDF, logger, successResponse} from '../utils/index.js';
import mongoose from "mongoose";
import {createDoubleLedgerEntry} from "../utils/ledgerService.js";

export const createPOSTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    /**
     *  Transaction Handling
     */
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
            accountId,
            linkedEntityId,
            changeGiven
        } = req.body;
        console.log('BODY::', JSON.stringify(req.body, null, 2));

        console.log('accountId::', accountId); // This will show the actual value reliably

        // Generate a unique transaction number if necessary (you can use an auto-increment or UUID logic here)

        // Create a new POS transaction
        const [newTransaction] = await POSTransaction.create([{
            companyId,
            products,
            subTotal,
            discountAmount,
            taxAmount,
            totalPayable,
            paymentMethod,
            paidAmount,
            changeGiven,
            accountId,
            linkedEntityId,
            createdBy
        }], {session});
        logger.info(`POS Transaction created: ${newTransaction.transactionNumber}`);
        /**
         * Payment Handling
         */

            // Create a new payment record
        const [payment] = await Payments.create([{
                companyId,
                transactionId: newTransaction._id,
                ledgerEntryId: null, // Placeholder; update with actual ledger entry logic if needed
                paymentMethod,
                amountPaid: paidAmount,
                paymentStatus: paidAmount >= totalPayable ? 'Completed' : 'Pending',
                createdBy,
                paidBy: null // Placeholder; update with actual payer logic if needed
            }], {session});
        // Updating inventory
        for (const product of products) {
            const {productId, quantity, batchId} = product;

            // Step 1: Fetch the batch to validate stock availability
            const inventory = await Inventory.findOne({companyId, productId, "batches._id": batchId}, {
                "batches.$": 1,
                totalQuantity: 1
            }).session(session);

            if (!inventory) {
                throw new Error(`Inventory not found for productId: ${productId}`);
            }

            const batchToUpdate = inventory.batches[0]; // Since we used `$`, we get only the matched batch

            if (!batchToUpdate) {
                throw new Error(`Batch not found for batchId: ${batchId} in productId: ${productId}`);
            }

            // Step 2: Validate available stock
            if (batchToUpdate.quantity < quantity) {
                throw new Error(`Insufficient stock in batchId: ${batchId} for productId: ${productId}`);
            }

            // Step 3: Deduct stock from batch
            await Inventory.updateOne({
                    companyId,
                    productId,
                    "batches._id": batchId
                }, {$inc: {"batches.$.quantity": -quantity}}, // Decrement batch quantity
                {session});

            // Step 4: Update totalQuantity separately
            await Inventory.updateOne({companyId, productId}, {$inc: {totalQuantity: -quantity}}, // Decrement total quantity
                {session});
        }


        logger.info(`Inventory updated for transaction ${newTransaction.transactionNumber}`);

        /**
         * Invoice Handling
         */
            // Create a new invoice record
        const [invoice] = await Invoices.create([{
                companyId,
                transactionId: newTransaction._id,
                ledgerEntryId: null, // Placeholder; update with actual ledger entry logic if needed
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
                linkedEntityId,
                createdBy,
                notes: 'Invoice for the transaction'
            }], {session});
        /**
         * Ledger Handling
         * @type {*[]}
         */
            // Add ledger entries for the transaction
        const ledgerEntries = [];
        // 🧠 Determine correct debit account based on sale type
        const isCreditSale = paidAmount < totalPayable;
        const saleDebitAccount = isCreditSale ? 'Accounts Receivable' : 'Cash/Bank';


// 🧾 1. Sale Revenue (net of discount)
        await createDoubleLedgerEntry({
            transactionId: newTransaction._id.toString(),
            companyId,
            transactionType: 'Sale',
            referenceType: 'POS Transactions',
            description: `Sales revenue recorded for transaction ${newTransaction.transactionNumber}`,
            debitAccount: saleDebitAccount,
            debitAmount: subTotal,
            creditAccount: 'Sales Revenue',
            creditAmount: subTotal,
            linkedEntityId,
            accountId,
            createdBy
        });

// 🏛️ 2. Tax (if applicable)
        if (parseFloat(taxAmount) > 0) {
            await createDoubleLedgerEntry({
                transactionId: newTransaction._id.toString(),
                companyId,
                transactionType: 'Tax',
                referenceType: 'POS Transactions',
                description: `Tax collected for transaction ${newTransaction.transactionNumber}`,
                debitAccount: saleDebitAccount,
                debitAmount: parseFloat(taxAmount),
                creditAccount: 'Tax Payable',
                accountId,
                linkedEntityId,
                creditAmount: parseFloat(taxAmount),
                createdBy
            });
        }

// 🎁 3. Discount (if applicable) — FIXED CREDIT SIDE
        if (parseFloat(discountAmount) > 0) {
            await createDoubleLedgerEntry({
                transactionId: newTransaction._id.toString(),
                companyId,
                transactionType: 'Discount',
                referenceType: 'POS Transactions',
                description: `Discount given for transaction ${newTransaction.transactionNumber}`,
                debitAccount: 'Discount Expense',
                creditAccount: isCreditSale ? 'Accounts Receivable' : 'Sales Revenue',
                debitAmount: parseFloat(discountAmount),
                creditAmount: parseFloat(discountAmount),
                linkedEntityId,
                accountId,
                createdBy
            });
        }

// 💵 4. Payment Received (Only for Credit/Partial Sales)
        if (paidAmount > 0 && isCreditSale) {
            await createDoubleLedgerEntry({
                transactionId: newTransaction._id.toString(),
                companyId,
                transactionType: 'Payment',
                referenceType: 'Payments',
                description: `Payment received for transaction ${newTransaction.transactionNumber}`,
                debitAccount: 'Cash/Bank',
                creditAccount: 'Accounts Receivable',
                debitAmount: paidAmount,
                creditAmount: paidAmount,
                linkedEntityId,
                accountId,
                createdBy
            });
        }

        // Execute all ledger entry promises
        await Promise.all(ledgerEntries);

        // Commit the transaction
        await session.commitTransaction();


        const tempTransaction = await newTransaction.populate({
            path: 'products.productId', select: 'productName sku' // whatever fields you want from Product
        });

        const transactionObj = tempTransaction.toObject();

        transactionObj.products = transactionObj.products.map((item) => {
            // item.productId now has { _id, productName, sku, ... }
            return {
                productId: item.productId._id,  // keep the original ID if you want
                productName: item.productId.productName,
                sku: item.productId.sku,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                batchId: item.batchId,

                _id: item._id,
            };
        });


        const company = await Companies.findById(companyId)
            .select('name registrationNumber contactDetails logo').lean();
        console.log(JSON.stringify(company, null, 2))

        const isCredit = paymentMethod === 'Credit';
        const isCash = paymentMethod === 'Cash';
        const showPaidAmount = paidAmount > 0;
        const showChange = isCash && changeGiven > 0;

        const receiptData = {
            date: new Date().toLocaleString(),
            company,
            products: transactionObj.products,
            size: transactionObj.products.length,
            discountAmount,
            taxAmount,
            subTotal,
            totalPayable,
            billId: transactionObj.counterNumber,
            paidAmount,
            changeGiven,
            paymentMethod,
            isCredit,
            accountId: isCredit ? accountId : null,
            isCash,
            showPaidAmount,
            showChange
        };


        /**
         * PDF handling
         * @type {string}
         */

        const receiptPath = `${process.env.UPLOAD_PATH}/${newTransaction.transactionNumber}.pdf`;

        const pdfPath = await generatePDF('posReceipt', receiptData, receiptPath);

        await session.endSession();

        logger.info(`Transaction, payment, and invoice created successfully: ${newTransaction.transactionNumber} & ${invoice.invoiceNumber}`);
        return successResponse(res, {
            transaction: newTransaction, payment, receiptPath: pdfPath,
        }, 'Transaction and payment created successfully');
    } catch (error) {

        console.log('Error:: ', error)
        logger.error('Error creating transaction:', error);
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        logger.error('Error creating transaction:', error);
        return errorResponse(res, error.message);
    } finally {
        // Ensure the session is ended
        await session.endSession();
    }
};
/**
 * @desc Record a payment transaction
 * @param req
 * @param res
 * @returns {Promise<*>}
 */

export const createPaymentTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            companyId,
            accountId,
            linkedEntityId,
            amount,
            paymentMethod,
            paymentReference,
            createdBy
        } = req.body;

        // Generate transaction ID manually (optional, or auto via MongoDB _id)
        const [newTransaction] = await POSTransaction.create([{
            companyId,
            entityId: linkedEntityId,
            accountId,
            transactionType: 'Payment',
            description: 'Payment received from customer',
            paidAmount: amount,
            transactionMethod: paymentMethod,
            createdBy,
            date: new Date()
        }], {session});

        // 1. Create Payment Record
        const [payment] = await Payments.create([{
            companyId,
            transactionId: newTransaction._id,  // ✅ FIXED: field name added
            paymentMethod,
            amountPaid: amount,
            paymentStatus: 'Completed',
            createdBy,
            paidBy: linkedEntityId
        }], {session});

        // 2. Ledger Entry
        await createDoubleLedgerEntry({
            transactionId: newTransaction._id.toString(),  // ✅ FIXED: pass the ID
            companyId,
            transactionType: 'Payment',
            referenceType: 'Payments',
            description: `Payment received from account customer`,
            debitAccount: 'Cash/Bank',
            creditAccount: 'Accounts Receivable',
            debitAmount: amount,
            creditAmount: amount,
            accountId,
            linkedEntityId,
            createdBy
        });

        await session.commitTransaction();
        await session.endSession();

        return successResponse(res, {payment}, 'Payment recorded successfully');

    } catch (error) {
        logger.error('Error recording payment:', error);
        await session.abortTransaction();
        await session.endSession();
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
        const {companyId, startDate, endDate, page = 1, limit = 10000} = req.query;


        const filter = {
            isDeleted: false
        };

        if (companyId) {
            filter.companyId = new mongoose.Types.ObjectId(companyId);
        }

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
            if (endDate) filter.date.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }
        console.log('filter:: ', filter)
        const transactions = await POSTransaction.find(filter)
            .populate('products.productId')
            .sort({date: -1})
            .skip((page - 1) * limit)
            .limit(Number(limit));
        console.log('transactions:: ', transactions)
        const totalRecords = await POSTransaction.countDocuments(filter);

        // Totals Calculation
        let totalCashReceived = 0;
        let totalCreditSales = 0;
        let grandSalesTotal = 0;

        for (const txn of transactions) {
            const paid = txn.paidAmount || 0;
            const change = txn.changeGiven || 0;
            const payable = txn.totalPayable || 0;

            const netReceived = paid - change;
            const isCreditSale = paid < payable;

            totalCashReceived += netReceived;
            grandSalesTotal += payable;

            if (isCreditSale) {
                totalCreditSales += payable - paid;
            }
        }

        return successResponse(res, {
            transactions,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit),
            totals: {
                totalTransactions: transactions.length,
                totalCashReceived,
                totalCreditSales,
                grandSalesTotal
            }
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

