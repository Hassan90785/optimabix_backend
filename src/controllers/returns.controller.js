import {errorResponse, generatePDF, successResponse} from "../utils/index.js";
import mongoose from "mongoose";
import {Companies, Inventory, Payments, POSTransaction, Returns} from "../models/index.js";
import {createDoubleLedgerEntry} from "../utils/ledgerService.js";
import {getNextSequence} from "../utils/counterService.js";
import InventoryUnits from "../models/inventoryUnits.model.js";

export const createPOSReturn = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            originalTransactionId,
            companyId,
            products,
            totalRefund,
            refundMethod,
            reason,
            createdBy,
            accountId,
            linkedEntityId
        } = req.body;

        // Validate original transaction
        const originalTxn = await POSTransaction.findById(originalTransactionId).session(session);
        if (!originalTxn) throw new Error('Original transaction not found.');

        // Step 1: Inventory Reversal
        for (const product of products) {
            const {productId, quantity, batchId, serialDetails = []} = product;

            // Serialized units
            if (serialDetails.length > 0) {
                for (const serial of serialDetails) {
                    const updated = await InventoryUnits.findOneAndUpdate({
                        companyId,
                        productId,
                        batchBarcode: batchId,
                        serialNumber: serial.trim(),
                        status: 'Sold'
                    }, {
                        $set: {
                            status: 'In Stock',
                            updatedBy: createdBy,
                            returnedOn: new Date()
                        }
                    }, {session});

                    if (!updated) throw new Error(`Serial number ${serial} not found or already returned.`);
                }
            }

            // Restore inventory quantities
            await Inventory.updateOne({
                companyId,
                productId,
                "batches._id": batchId
            }, {
                $inc: {"batches.$.quantity": quantity}
            }, {session});

            await Inventory.updateOne({
                companyId,
                productId
            }, {
                $inc: {totalQuantity: quantity}
            }, {session});
        }



// Step 3: Create Return Record (triggers pre-save)
        const returnTxn = new Returns({
            originalTransactionId,
            companyId,
            products,
            totalRefund,
            refundMethod,
            createdBy,
            reason,
            accountId,
            linkedEntityId
        });

        await returnTxn.save({ session }); // ✅ ensures returnNumber & counterNumber are set


        // Step 4: Ledger Entry
        const debitAccount = 'Sales Return';
        const creditAccount = refundMethod === 'Cash' ? 'Cash/Bank' : 'Accounts Payable';

        await createDoubleLedgerEntry({
            transactionId: returnTxn._id.toString(),
            companyId,
            transactionType: 'Return',
            referenceType: 'Returns',
            description: `Return processed for original txn ${originalTxn.transactionNumber}`,
            debitAccount,
            creditAccount,
            debitAmount: totalRefund,
            creditAmount: totalRefund,
            createdBy,
            accountId,
            linkedEntityId
        });

        // Step 5: Refund Record (if Cash)
        if (refundMethod === 'Cash') {
            await Payments.create([{
                companyId,
                transactionId: originalTxn._id,
                ledgerEntryId: null,
                paymentMethod: 'Cash',
                amountPaid: -Math.abs(totalRefund),
                paymentStatus: 'Refunded',
                createdBy,
                paidBy: null
            }], {session});
        }

        // Step 6: Generate Return Receipt PDF
        const company = await Companies.findById(companyId).select('name contactDetails logo').lean();

        const receiptData = {
            date: new Date().toLocaleString(),
            billId: returnTxn.returnNumber,
            refundMethod,
            totalRefund,
            reason,
            company,
            products: products.map(p => ({
                productName: p.productName || '',
                quantity: p.quantity,
                unitPrice: p.unitPrice,
                totalPrice: p.totalPrice
            }))
        };

        const receiptPath = `${process.env.UPLOAD_PATH}/${returnTxn._id}_return.pdf`;
        const pdfPath = await generatePDF('returnReceipt', receiptData, receiptPath);

        // Step 7: Commit
        await session.commitTransaction();
        await session.endSession();

        return successResponse(res, {
            returnTransaction: returnTxn,
            receiptPath: pdfPath
        }, 'Return processed successfully');
    } catch (err) {
        console.error('Error processing return:', err);
        if (session.inTransaction()) await session.abortTransaction();
        await session.endSession();
        return errorResponse(res, err.message);
    }
};


export const getAllReturns = async (req, res) => {
    try {
        const {
            companyId,
            page = 1,
            limit = 20,
            returnNumber,
            originalTransactionId,
            counterNumber,
            sortField = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const query = {};
        if (companyId) query.companyId = companyId;
        if (returnNumber) query.returnNumber = { $regex: returnNumber, $options: 'i' };
        if (originalTransactionId) query.originalTransactionId = originalTransactionId;
        if (counterNumber) query.counterNumber = Number(counterNumber);

        const returns = await Returns.find(query)
            .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('companyId', 'name')
            .populate('createdBy', 'fullName email')
            .populate('products.productId', 'productName sku');

        const total = await Returns.countDocuments(query);

        return res.status(200).json({
            success: true,
            data: {
                entries: returns,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching returns:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch returns',
            error: error.message
        });
    }
};
