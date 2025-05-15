import {Inventory, Products} from '../models/index.js';
import {errorResponse, generatePDF, logger, successResponse} from '../utils/index.js';
import {validationResult} from "express-validator";
import moment from 'moment';
import {softErrorResponse} from "../utils/responseHandler.js";
import mongoose from "mongoose";
import {createDoubleLedgerEntry} from "../utils/ledgerService.js";
import Account from "../models/account.model.js";
import InventoryUnits from "../models/inventoryUnits.model.js";

export const createInventory = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        logger.info('🔄 Starting inventory creation or update...');
        const {productId, companyId, vendorId, batches, createdBy} = req.body;

        // ✅ 1. Validate Product Exists
        const product = await Products.findById(productId).session(session);
        if (!product) {
            throw new Error('Product not found.');
        }

        const newBatches = Array.isArray(batches) ? batches : [batches];
        const totalQuantity = newBatches.reduce((sum, batch) => sum + Number(batch.quantity || 0), 0);

        const ledgerDebitAmount = newBatches.reduce((sum, batch) => {
            const qty = Number(batch.quantity || 0);
            const price = batch.purchasePrice != null
                ? Number(batch.purchasePrice)
                : Number(product.price.unitPurchasePrice || 0);
            return sum + (qty * price);
        }, 0);

        const debitCaption = 'Inventory';
        const creditCaption = 'Vendor Payable';

        // ✅ 2. Check Existing Inventory
        let inventoryRecord;
        const existingInventory = await Inventory.findOne({productId, companyId, vendorId}).session(session);

        if (existingInventory) {
            logger.info('📦 Existing inventory found. Updating...');
            existingInventory.batches.push(...newBatches);
            existingInventory.totalQuantity += totalQuantity;
            await existingInventory.save({session});

            // 🔄 Re-fetch updated inventory to get barcodes correctly
            inventoryRecord = await Inventory.findById(existingInventory._id).session(session);
        } else {
            logger.info('🆕 No inventory found. Creating new...');
            const [createdInventory] = await Inventory.create([{
                productId,
                companyId,
                vendorId,
                batches: newBatches,
                totalQuantity,
                createdBy
            }], {session});

            inventoryRecord = await Inventory.findById(createdInventory._id).session(session);
        }

        // ✅ 3. Insert Serialized Units if Applicable
        if (product.isSerialized) {
            logger.info('🔎 Product is serialized. Handling serialized units...');

            for (let i = 0; i < batches.length; i++) {
                const incomingBatch = batches[i];
                const savedBatch = inventoryRecord.batches[i];

                const finalBarcode = savedBatch?.barcode;
                if (!finalBarcode) {
                    throw new Error(`Barcode missing for batch ${i + 1}`);
                }

                const items = incomingBatch.items || [];
                if (items.length !== incomingBatch.quantity) {
                    throw new Error(`Mismatch between quantity and unit items in batch ${i + 1}`);
                }

                const unitDocs = items.map((unit, idx) => {
                    const hasAnyField = !!unit.serialNumber?.trim() || !!unit.modelNumber?.trim() || Number(unit.warrantyMonths || 0) > 0;
                    if (!hasAnyField) {
                        throw new Error(`Unit ${idx + 1} in batch ${i + 1} must have at least one field filled.`);
                    }

                    return {
                        companyId,
                        productId,
                        inventoryId: inventoryRecord._id,
                        batchBarcode: finalBarcode,
                        sku: product.sku,
                        serialNumber: unit.serialNumber?.trim(),
                        modelNumber: unit.modelNumber?.trim(),
                        warrantyMonths: unit.warrantyMonths,
                        createdBy
                    };
                });

                const serials = unitDocs.map(u => u.serialNumber).filter(Boolean);
                if (new Set(serials).size !== serials.length) {
                    throw new Error(`Duplicate serial numbers detected in batch ${i + 1}`);
                }

                await InventoryUnits.insertMany(unitDocs, {session});
            }

        }

        // ✅ 4. Ensure Vendor Account Exists
        let accountId;
        const existingAccount = await Account.findOne({
            entityId: vendorId,
            companyId,
            isDeleted: false
        }).session(session);

        if (existingAccount) {
            accountId = existingAccount._id;
        } else {
            const newAccount = await Account.create([{
                entityId: vendorId,
                entityType: 'Vendor',
                status: 'Active',
                companyId,
                createdBy
            }], {session});

            accountId = newAccount[0]._id;
        }

        // ✅ 5. Ledger Entry (if any amount involved)
        if (ledgerDebitAmount > 0) {
            await createDoubleLedgerEntry({
                companyId,
                transactionId: new mongoose.Types.ObjectId().toString(),
                transactionType: 'Purchase',
                referenceType: 'Inventory',
                description: `Added or updated inventory for product: ${productId}`,
                debitAccount: debitCaption,
                debitAmount: ledgerDebitAmount,
                creditAccount: creditCaption,
                creditAmount: ledgerDebitAmount,
                linkedEntityId: vendorId,
                accountId,
                createdBy
            });
        } else {
            logger.warn('⚠️ No ledger entry created because debit amount is zero.');
        }

        await session.commitTransaction();
        session.endSession();

        logger.info('✅ Inventory operation completed successfully.');
        return successResponse(res, inventoryRecord, existingInventory ? 'Inventory updated successfully.' : 'Inventory created successfully.');
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        logger.error('❌ Error creating/updating inventory:', error);
        return errorResponse(res, error.message);
    }
};

export const printBarCodes = async (req, res) => {
    try {
        logger.info('Printing barcodes...');
        const {quantity, sellingPrice, mgf_dt, expiry_dt, barcode, productName} = req.body;
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
            barcodes: Array.from({length: 1}, () => ({
                mgf_dt: formattedMgfDate,
                expiry_dt: formattedExpiryDate
            }))
        };

        console.log('Processed barcodeData:', JSON.stringify(barcodeData, null, 2));

        // ✅ Generate the PDF
        const pdfPath = await generatePDF('barcodes', barcodeData, barcodePath);
        return successResponse(res, {pdfPath}, 'Barcode PDF generated successfully');

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
            .populate('productId')
            .populate('vendorId')
            .sort({createdAt: -1})
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean(); // ✅ lean()

        const totalRecords = await Inventory.countDocuments(filter);

        const inventoryIds = inventoryItems.map(item => item._id);
        const inventoryUnits = await InventoryUnits.find({
            inventoryId: {$in: inventoryIds}
        }).lean();

        const unitsMap = inventoryUnits.reduce((acc, unit) => {
            const invId = unit.inventoryId.toString();
            if (!acc[invId]) acc[invId] = [];
            acc[invId].push(unit);
            return acc;
        }, {});

        // 🔥 Final clean construction
        const inventoryWithUnits = inventoryItems.map(item => {
            const newItem = {
                ...item,
                product: item.productId,  // ✅ populated full product
                vendor: item.vendorId,    // ✅ populated full vendor
                productId: item.productId?._id || item.productId, // ✅ ID only
                vendorId: item.vendorId?._id || item.vendorId,    // ✅ ID only
                units: unitsMap[item._id.toString()] || []        // ✅ attached units
            };

            return newItem;
        });

        return successResponse(res, {
            inventoryItems: inventoryWithUnits,
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { batches, createdBy, productId, vendorId } = req.body;

        // ✅ Fetch existing inventory
        const inventory = await Inventory.findById(req.params.id).session(session);
        if (!inventory) {
            throw new Error('Inventory not found.');
        }

        // ✅ Fetch related product
        const product = await Products.findById(productId).lean();
        if (!product) {
            throw new Error('Product not found.');
        }

        // ✅ Step 1: Prepare fields to update
        let updateFields = { updatedBy: createdBy };

        if (Array.isArray(batches) && batches.length > 0) {
            updateFields.batches = batches;
            updateFields.totalQuantity = batches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
        }

        if (productId) updateFields.productId = productId;
        if (vendorId) updateFields.vendorId = vendorId;

        // ✅ Step 2: Update inventory
        await Inventory.findOneAndUpdate(
            { _id: req.params.id },
            { $set: updateFields },
            { new: true, runValidators: true, session }
        );

        // ✅ Step 3: RE-FETCH updated inventory
        const updatedInventory = await Inventory.findById(req.params.id).lean().session(session);

        // ✅ Step 4: Handle Serialized Units
        if (product.isSerialized) {
            logger.info('🔄 Handling serialized units...');

            // 4a: Delete old units
            await InventoryUnits.deleteMany({ inventoryId: req.params.id }).session(session);

            // 4b: Prepare new units
            const unitDocs = [];
            for (let i = 0; i < updatedInventory.batches.length; i++) {
                const batch = updatedInventory.batches[i]; // Now fully updated from Mongo
                const { barcode = '' } = batch;
                const incomingBatch = batches[i];
                const items = incomingBatch.items || [];

                if (!barcode) {
                    throw new Error(`Batch ${i + 1} is missing barcode after update.`);
                }

                items.forEach((item, idx) => {
                    const hasAnyField = item.serialNumber || item.modelNumber || item.warrantyMonths;
                    if (hasAnyField) {
                        unitDocs.push({
                            companyId: updatedInventory.companyId,
                            productId,
                            inventoryId: updatedInventory._id,
                            batchBarcode: barcode,
                            sku: product.sku,
                            serialNumber: item.serialNumber || '',
                            modelNumber: item.modelNumber || '',
                            warrantyMonths: item.warrantyMonths || 0,
                            createdBy,
                            status: 'In Stock'
                        });
                    }
                });
            }

            if (unitDocs.length > 0) {
                await InventoryUnits.insertMany(unitDocs, { session });
            }
        }

        // ✅ Commit transaction
        await session.commitTransaction();
        session.endSession();

        logger.info(`✅ Inventory updated for Product ID: ${productId}`);
        return successResponse(res, {}, 'Inventory updated successfully');
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        logger.error('❌ Error updating inventory:', error);
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

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.error('Validation failed for getAvailableInventory:', errors.array());
            return errorResponse(res, errors.array());
        }

        const { companyId, includeBatches } = req.query;

        if (!companyId) {
            logger.error('Missing required query parameters: companyId.');
            return errorResponse(res, 'companyId is a required query parameter.');
        }

        const query = {
            companyId,
            isDeleted: false,
        };

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

        // ✅ Fetch product names + isSerialized
        const productIds = inventories.map(inv => inv.productId);
        const products = await Products.find(
            { _id: { $in: productIds } },
            { _id: 1, productName: 1, isSerialized: 1 }
        ).lean();

        const productMap = products.reduce((map, product) => {
            map[product._id] = {
                name: product.productName,
                isSerialized: product.isSerialized || false
            };
            return map;
        }, {});

        const processedInventories = inventories.map(inventory => {
            let sortedBatches = inventory.batches?.filter(batch => batch.quantity > 0) || [];

            return {
                productId: inventory.productId,
                name: productMap[inventory.productId]?.name || 'Unknown Product',
                companyId: inventory.companyId,
                totalQuantity: inventory.totalQuantity,
                isSerialized: productMap[inventory.productId]?.isSerialized || false, // ✅ OUTSIDE
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

        logger.info(`Inventory fetched successfully for Company: ${companyId}`);
        return successResponse(res, processedInventories, 'Available inventory retrieved successfully');
    } catch (error) {
        logger.error('Error fetching available inventory:', error);
        return errorResponse(res, error.message);
    }
};
