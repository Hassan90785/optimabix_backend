import { Invoices, Ledger, POSTransaction } from '../models/index.js';
import { successResponse, errorResponse, logger } from '../utils/index.js';

/**
 * @desc Create a new invoice with linked ledger and transaction validation
 * @route POST /api/v1/invoices
 */
export const createInvoice = async (req, res) => {
    try {
        const {
            companyId,
            transactionId,
            ledgerEntryId,
            lineItems,
            discountAmount,
            taxAmount,
            totalAmount,
            paymentStatus,
            notes
        } = req.body;

        // Validate linked references
        const transactionExists = await POSTransaction.findById(transactionId);
        const ledgerExists = await Ledger.findById(ledgerEntryId);
        if (!transactionExists) {
            return errorResponse(res, 'Transaction not found.', 404);
        }
        if (!ledgerExists) {
            return errorResponse(res, 'Ledger entry not found.', 404);
        }

        // Calculate subTotal
        const subTotal = lineItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

        const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newInvoice = await Invoices.create({
            companyId,
            transactionId,
            ledgerEntryId,
            invoiceNumber,
            issuedDate: new Date(),
            dueDate: new Date(),
            lineItems,
            subTotal,
            discountAmount,
            taxAmount,
            totalAmount,
            paymentStatus,
            notes,
            createdBy: req.user._id
        });

        logger.info(`Invoice created: ${invoiceNumber}`);
        return successResponse(res, newInvoice, 'Invoice created successfully');
    } catch (error) {
        logger.error('Error creating invoice:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get all invoices with pagination and filtering
 * @route GET /api/v1/invoices
 */
export const getAllInvoices = async (req, res) => {
    try {
        const { companyId, paymentStatus, page = 1, limit = 10 } = req.query;
        const filter = { companyId, isDeleted: false };

        if (paymentStatus) filter.paymentStatus = paymentStatus;

        const invoices = await Invoices.find(filter)
            .populate('transactionId ledgerEntryId')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await Invoices.countDocuments(filter);
        return successResponse(res, {
            invoices,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Invoices fetched successfully');
    } catch (error) {
        logger.error('Error fetching invoices:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a single invoice by ID
 * @route GET /api/v1/invoices/:id
 */
export const getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoices.findById(req.params.id).populate('transactionId ledgerEntryId');
        if (!invoice) {
            return errorResponse(res, 'Invoice not found.', 404);
        }
        return successResponse(res, invoice, 'Invoice fetched successfully');
    } catch (error) {
        logger.error('Error fetching invoice:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Soft delete an invoice
 * @route DELETE /api/v1/invoices/:id
 */
export const softDeleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoices.findById(req.params.id);
        if (!invoice) {
            return errorResponse(res, 'Invoice not found.', 404);
        }

        await invoice.softDelete(req.user._id);
        logger.info(`Invoice soft-deleted: ${invoice.invoiceNumber}`);
        return successResponse(res, {}, 'Invoice soft-deleted successfully');
    } catch (error) {
        logger.error('Error soft deleting invoice:', error);
        return errorResponse(res, error.message);
    }
};
