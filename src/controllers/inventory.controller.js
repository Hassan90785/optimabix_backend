import {Inventory, Ledger, Products} from '../models/index.js';
import {errorResponse, logger, successResponse} from '../utils/index.js';
import {validationResult} from "express-validator";

export const createInventory = async (req, res) => {
    try {
        logger.info('Creating or updating inventory...');
        const {productId, companyId, vendorId, barcode, batches, createdBy} = req.body;

        // Validate product existence
        const productExists = await Products.findById(productId);
        console.log('productExists', productExists)
        if (!productExists) {
            return errorResponse(res, 'Product not found.', 404);
        }

        // Check for existing inventory
        const existingInventory = await Inventory.findOne({productId, companyId, vendorId});
        let totalQuantity = 0;
        let ledgerDescription = '';
        let ledgerDebitAmount = 0;
        let debitCaption = '';
        let creditCaption = '';

        if (existingInventory) {
            logger.info('Updating existing inventory...');
            console.log('batches', batches);

            // Ensure batches is an array
            const newBatches = Array.isArray(batches) ? batches : [batches];

            // Add new batch to existing batches
            existingInventory.batches.push(...newBatches);

            // Calculate total quantity for the new batches
            const newBatchQuantity = newBatches.reduce((sum, batch) => sum + batch.quantity, 0);
            existingInventory.totalQuantity += newBatchQuantity;

            // Save updated inventory
            await existingInventory.save();

            totalQuantity = newBatchQuantity;
            ledgerDescription = `Updated inventory for Product: ${productId}`;
            ledgerDebitAmount = newBatchQuantity * productExists.price.unitPurchasePrice; // Assuming cost price is available in product
            debitCaption = 'Inventory';
            creditCaption = 'Vendor Payable';
            logger.info(`Inventory updated for Product: ${productId}`);
            successResponse(res, existingInventory, 'Inventory updated successfully');
        } else {
            logger.info('Creating new inventory...');
            console.log('batches', batches);
            // Ensure batches is an array
            const newBatches = Array.isArray(batches) ? batches : [batches];
            console.log('newBatches', newBatches);
            // Calculate total quantity from new batches
            totalQuantity = newBatches.reduce((sum, batch) => sum + batch.quantity, 0);

            // Create new inventory record
            const newInventory = await Inventory.create({
                productId,
                companyId,
                vendorId,
                batches: newBatches,
                totalQuantity,
                createdBy,
            });
            console.log('newInventory:', newInventory);
            ledgerDescription = `Added inventory for Product: ${productId}`;
            ledgerDebitAmount = totalQuantity * productExists.price.unitPurchasePrice; // Assuming cost price is available in product
            debitCaption = 'Inventory';
            creditCaption = 'Vendor Payable';
            logger.info(`Inventory added for Product: ${productId}`);
            successResponse(res, newInventory, 'Inventory created successfully');
        }

        // Add ledger entry
        if (ledgerDebitAmount > 0) {
            await Ledger.manageLedgerEntry({
                companyId,
                transactionType: 'Purchase',
                description: ledgerDescription,
                debitAmount: ledgerDebitAmount,
                debitCaption: debitCaption,
                creditCaption: creditCaption,
                creditAmount: ledgerDebitAmount, // Vendor payable liability
                linkedEntityId: vendorId,
                referenceType: 'Inventory',
                createdBy,
            });

            logger.info('Ledger entry created for inventory addition.');
        } else {
            logger.error(`Couldn't add Ledger Entry for inventory addition due to ledgerDebitAmount: ${ledgerDebitAmount}`)
        }
    } catch (error) {
        logger.error('Error creating or updating inventory:', error);
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
        const {batches} = req.body;

        const inventory = await Inventory.findById(req.params.id);
        if (!inventory) {
            return errorResponse(res, 'Inventory not found.', 404);
        }

        // Update batch data and total quantity
        inventory.batches = batches;
        inventory.totalQuantity = batches.reduce((sum, batch) => sum + batch.quantity, 0);
        inventory.updatedBy = req.user._id;

        await inventory.save();
        logger.info(`Inventory updated for Product ID: ${inventory.productId}`);
        return successResponse(res, inventory, 'Inventory updated successfully');
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
        const {companyId, includeBatches} = req.query;

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
            ...(includeBatches === 'true' && {batches: 1}),
        }).lean();

        if (!inventories || inventories.length === 0) {
            logger.warn(`No inventory found for Company: ${companyId}`);
            return errorResponse(res, 'No inventory found');
        }
        // Fetch product titles
        const productIds = inventories.map(inv => inv.productId);
        const products = await Products.find({_id: {$in: productIds}}, {_id: 1, productName: 1}).lean();
        const productMap = products.reduce((map, product) => {
            map[product._id] = product.productName;
            return map;
        }, {});
        // Process inventories with FIFO logic
        const fifoInventories = inventories.map(inventory => {
            const fifoBatches = inventory.batches?.filter(batch => batch.quantity > 0) || [];
            fifoBatches.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded)); // FIFO sorting

            const firstBatch = fifoBatches.length > 0 ? fifoBatches[0] : null;

            return {
                productId: inventory.productId,
                name: productMap[inventory.productId] || 'Unknown Product',
                companyId: inventory.companyId,
                barcode: inventory.barcode,
                totalQuantity: inventory.totalQuantity,
                firstAvailableBatch: firstBatch ? {
                    batchId: firstBatch._id,
                    quantity: firstBatch.quantity,
                    purchasePrice: firstBatch.purchasePrice,
                    sellingPrice: firstBatch.sellingPrice,
                    dateAdded: firstBatch.dateAdded,
                } : null,
            };
        });

        // Respond with inventory data
        logger.info(`Inventory fetched successfully for Company: ${companyId}`);
        return successResponse(res, fifoInventories, 'Available inventory retrieved successfully');
    } catch (error) {
        logger.error('Error fetching available inventory:', error);
        return errorResponse(res, error.message);
    }
};
