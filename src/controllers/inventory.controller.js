import {Inventory, Ledger, Products} from '../models/index.js';
import {errorResponse, generatePDF, logger, successResponse} from '../utils/index.js';
import {validationResult} from "express-validator";
import moment from 'moment';
import {softErrorResponse} from "../utils/responseHandler.js";
import mongoose from "mongoose";
import {createDoubleLedgerEntry} from "../utils/ledgerService.js";
import Account from "../models/account.model.js";

export const createInventory = async (req, res) => {
    try {
        logger.info('Creating or updating inventory...');
        const { productId, companyId, vendorId, barcode, batches, createdBy } = req.body;

        // Validate product existence
        const productExists = await Products.findById(productId);
        if (!productExists) {
            return errorResponse(res, 'Product not found.', 404);
        }

        // Ensure batches is always an array
        const newBatches = Array.isArray(batches) ? batches : [batches];
        let totalQuantity = newBatches.reduce((sum, batch) => sum + batch.quantity, 0);
        let ledgerDescription = '';
        let ledgerDebitAmount = newBatches.reduce((sum, batch) => {
            const qty = Number(batch.quantity || 0);
            const price = batch.purchasePrice != null
                ? Number(batch.purchasePrice)
                : Number(productExists.price.unitPurchasePrice || 0);
            return sum + (qty * price);
        }, 0);

        const debitCaption = 'Inventory';
        const creditCaption = 'Vendor Payable';

        let inventoryRecord;
        const existingInventory = await Inventory.findOne({ productId, companyId, vendorId });

        if (existingInventory) {
            logger.info('Updating existing inventory...');
            existingInventory.batches.push(...newBatches);
            existingInventory.totalQuantity += totalQuantity;
            inventoryRecord = await existingInventory.save();
            ledgerDescription = `Updated inventory for Product: ${productId}`;
            logger.info(`Inventory updated for Product: ${productId}`);
        } else {
            logger.info('Creating new inventory...');
            inventoryRecord = await Inventory.create({
                productId,
                companyId,
                vendorId,
                batches: newBatches,
                totalQuantity,
                createdBy,
            });
            ledgerDescription = `Added inventory for Product: ${productId}`;
            logger.info(`Inventory added for Product: ${productId}`);
        }

        // 📌 Check for existing vendor account
        let accountId;
        const existingAccount = await Account.findOne({ entityId: vendorId, companyId, isDeleted: false });
        if (existingAccount) {
            accountId = existingAccount._id;
        } else {
            const account = new Account({
                entityId: vendorId,
                entityType: 'Vendor',
                status: 'Active',
                companyId,
                createdBy
            });

            await account.save();
            accountId = account._id;
            logger.info(`Account created for Vendor ${vendorId}`);

        }

        // 💰 Create ledger entry
        if (ledgerDebitAmount > 0) {
            await createDoubleLedgerEntry({
                companyId,
                transactionId: new mongoose.Types.ObjectId().toString(),
                transactionType: 'Purchase',
                referenceType: 'Inventory',
                description: ledgerDescription,
                debitAccount: debitCaption,
                debitAmount: ledgerDebitAmount,
                creditAccount: creditCaption,
                creditAmount: ledgerDebitAmount,
                linkedEntityId: vendorId,
                accountId, // ✅ Include accountId
                createdBy
            });
            logger.info('Ledger entry created for inventory addition.');
        } else {
            logger.error(`Skipped Ledger Entry: Invalid ledgerDebitAmount: ${ledgerDebitAmount}`);
        }

        return successResponse(res, inventoryRecord, existingInventory ? 'Inventory updated successfully' : 'Inventory created successfully');
    } catch (error) {
        logger.error('Error creating or updating inventory:', error);
        return errorResponse(res, error.message);
    }
};


export const printBarCodes = async (req, res) => {
    try {
        logger.info('Printing barcodes...');
        const { quantity, sellingPrice, mgf_dt, expiry_dt, barcode, productName } = req.body;
        const barcodePath = `${process.env.UPLOAD_PATH}/${productName.replace(/\s+/g, '_')}.pdf`;

        console.log('req.body:', req.body);

        // ✅ Format the dates properly
        const formattedMgfDate = moment(mgf_dt).format("YYYY-MM-DD"); // "2025-02-03"
        const formattedExpiryDate = moment(expiry_dt).format("YYYY-MM-DD"); // "2025-02-11"

        // ✅ Expand `quantity` into an array
        const barcodeData = {
            productName,
            barcode,
            sellingPrice,
            barcodes: Array.from({ length: 1 }, () => ({
                mgf_dt: formattedMgfDate,
                expiry_dt: formattedExpiryDate
            }))
        };

        console.log('Processed barcodeData:', JSON.stringify(barcodeData, null, 2));

        // ✅ Generate the PDF
        const pdfPath = await generatePDF('barcodes', barcodeData, barcodePath);
        return successResponse(res, { pdfPath }, 'Barcode PDF generated successfully');

    } catch (error) {
        logger.error('Error Barcode PDF generation:', error);
        return errorResponse(res, error.message);
    }
};


/**
 * @desc Get all inventory items with pagination and filtering
 * @route GET /api/v1/inventory
 * @queryParams ?companyId=123&page=1&limit=10
 */
export const getAllInventory = async (req, res) => {
    try {
        const {companyId, page = 1, limit = 10} = req.query;
        const filter = {companyId, isDeleted: false};

        const inventoryItems = await Inventory.find(filter)
            .populate('productId vendorId')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await Inventory.countDocuments(filter);
        return successResponse(res, {
            inventoryItems,
            totalRecords,
            currentPage: Number(page),
            totalPages: Math.ceil(totalRecords / limit)
        }, 'Inventory fetched successfully');
    } catch (error) {
        logger.error('Error fetching inventory:', error);
        return errorResponse(res, error.message);
    }
};

/**
 * @desc Get a single inventory item by ID
 * @route GET /api/v1/inventory/:id
 */
export const getInventoryById = async (req, res) => {
    try {
        logger.info('Fetching getInventoryById...');
        const inventory = await Inventory.findById(req.params.id).populate('productId');
        if (!inventory || inventory.isDeleted) {
            return errorResponse(res, 'Inventory not found.', 404);
        }
        return successResponse(res, inventory, 'Inventory details fetched successfully');
    } catch (error) {
        logger.error('Error fetching inventory:', error);
        return errorResponse(res, error.message);
    }
};
/**
 * @desc Update an inventory entry with batch adjustments
 * @route PUT /api/v1/inventory/:id
 */
export const updateInventory = async (req, res) => {
    try {
        const { batches, createdBy, productId, vendorId } = req.body;

        // Fetch existing inventory record
        const inventory = await Inventory.findById(req.params.id).lean(); // Fetch without hydration for better performance

        if (!inventory) {
            return errorResponse(res, 'Inventory not found.', 404);
        }

        let updateFields = { updatedBy:createdBy };

        // 🔥 **Batch Change Detection**
        if (Array.isArray(batches) && batches.length > 0) {
            const prevBatchesMap = new Map(inventory.batches.map(batch => [batch.barcode, batch]));

            let modifiedBatches = [];
            let newBatches = [];

            batches.forEach(batch => {
                const prevBatch = prevBatchesMap.get(batch.barcode);

                if (prevBatch) {
                    // **Check if batch fields changed**
                    let isModified = (
                        prevBatch.purchasePrice !== batch.purchasePrice ||
                        prevBatch.expiry_dt?.toISOString() !== new Date(batch.expiry_dt)?.toISOString() ||
                        prevBatch.mgf_dt?.toISOString() !== new Date(batch.mgf_dt)?.toISOString()
                    );

                    if (isModified) {
                        modifiedBatches.push(batch);
                    }
                } else {
                    // **New batch detected**
                    newBatches.push(batch);
                }
            });

            // **If new batches exist, add them**
            if (newBatches.length > 0) {
                updateFields.batches = [...inventory.batches, ...newBatches]; // Append new batches
            }

            if (modifiedBatches.length > 0) {
                updateFields.batches = updateFields.batches || batches; // Ensure modified batches are included
            }
        }

        // ✅ **Update Product & Vendor If Provided**
        if (productId) updateFields.productId = productId;
        if (vendorId) updateFields.vendorId = vendorId;
        // ✅ **Update totalQuantity based on batch changes**
        updateFields.totalQuantity = updateFields.batches?.reduce((sum, batch) => sum + batch.quantity, 0) || inventory.totalQuantity;

        // ✅ **Perform Update Using `findOneAndUpdate` to Trigger Hooks**
        const updatedInventory = await Inventory.findOneAndUpdate(
            { _id: req.params.id },
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        logger.info(`Inventory updated for Product ID: ${updatedInventory.productId}`);
        return successResponse(res, updatedInventory, 'Inventory updated successfully');
    } catch (error) {
        logger.error('Error updating inventory:', error);
        return errorResponse(res, error.message);
    }
};


/**
 * @desc Soft delete an inventory record
 * @route DELETE /api/v1/inventory/:id
 */
export const softDeleteInventory = async (req, res) => {
    try {
        const inventory = await Inventory.findById(req.params.id);
        if (!inventory) {
            return errorResponse(res, 'Inventory not found.', 404);
        }

        await inventory.softDelete(req.user._id);
        logger.info(`Inventory soft-deleted for Product ID: ${inventory.productId}`);
        return successResponse(res, {}, 'Inventory soft-deleted successfully');
    } catch (error) {
        logger.error('Error soft-deleting inventory:', error);
        return errorResponse(res, error.message);
    }
};


/**
 * Controller to get available inventory.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getAvailableInventory = async (req, res) => {
    try {
        logger.info('Fetching available inventory...');

        // Validate request parameters
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.error('Validation failed for getAvailableInventory:', errors.array());
            return errorResponse(res, errors.array());
        }

        // Extract query parameters
        const { companyId, includeBatches } = req.query;

        if (!companyId) {
            logger.error('Missing required query parameters: companyId.');
            return errorResponse(res, 'companyId is a required query parameter.');
        }

        // Build the query object
        const query = {
            companyId,
            isDeleted: false,
        };

        // Fetch inventory from the database
        const inventories = await Inventory.find(query, {
            totalQuantity: 1,
            productId: 1,
            companyId: 1,
            barcode: 1,
            ...(includeBatches === 'true' && { batches: 1 }),
        }).lean();

        if (!inventories || inventories.length === 0) {
            logger.warn(`No inventory found for Company: ${companyId}`);
            return softErrorResponse(res, [], 'No inventory found');
        }

        // Fetch product titles
        const productIds = inventories.map(inv => inv.productId);
        const products = await Products.find({ _id: { $in: productIds } }, { _id: 1, productName: 1 }).lean();
        const productMap = products.reduce((map, product) => {
            map[product._id] = product.productName;
            return map;
        }, {});

        // Process inventories with alphabetically sorted batches
        const processedInventories = inventories.map(inventory => {
            let sortedBatches = inventory.batches?.filter(batch => batch.quantity > 0) || [];

            // Sort batches alphabetically by batchId
            sortedBatches.sort((a, b) => (productMap[inventory.productId] || 'Unknown Product').
            localeCompare(productMap[inventory.productId] || 'Unknown Product'));


            return {
                productId: inventory.productId,
                name: productMap[inventory.productId] || 'Unknown Product',
                companyId: inventory.companyId,
                totalQuantity: inventory.totalQuantity,
                batches: sortedBatches.map(batch => ({
                    batchId: batch._id,
                    quantity: batch.quantity,
                    barcode: batch.barcode,
                    purchasePrice: batch.purchasePrice,
                    sellingPrice: batch.sellingPrice,
                    dateAdded: batch.dateAdded,
                }))
            };
        });

        // Respond with inventory data
        logger.info(`Inventory fetched successfully for Company: ${companyId}`);
        return successResponse(res, processedInventories, 'Available inventory retrieved successfully');
    } catch (error) {
        logger.error('Error fetching available inventory:', error);
        return errorResponse(res, error.message);
    }
};

