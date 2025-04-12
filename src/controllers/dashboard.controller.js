import mongoose from 'mongoose';
import moment from 'moment';
import {Entities, Inventory, Ledger, POSTransaction, Products} from "../models/index.js";
import {errorResponse, logger, successResponse} from "../utils/index.js";



// 🎯 Utility: Validate companyId & compute date range
const getStartDateFromFilter = (filter) => {
    const now = moment();
    switch (filter) {
        case 'today': return now.startOf('day');
        case 'week': return now.startOf('week');
        case 'month': return now.startOf('month');
        default: return moment('2000-01-01'); // Default to wide range
    }
};


// 📊 1. Fetch KPI metrics from ledger
const getLedgerKPIs = async (companyId, startDate) => {
    const match = {
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false,
        date: { $gte: startDate.toDate() },
    };

    const grouped = await Ledger.aggregate([
        { $match: match },
        { $group: { _id: '$transactionType', total: { $sum: '$amount' } } },
    ]);

    const cashInBank = await Ledger.aggregate([
        {
            $match: {
                ...match,
                account: 'Cash/Bank',
                entryType: 'debit',
            },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const getAmount = (type) =>
        grouped.find((k) => k._id === type)?.total || 0;

    return {
        totalSales: getAmount('Sale'),
        paymentsReceived: getAmount('Payment'),
        discountsGiven: getAmount('Discount'),
        cashInBank: cashInBank[0]?.total || 0,
    };
};


// 📦 2. Calculate Inventory Value
const getInventoryValue = async (companyId) => {
    const inventories = await Inventory.find({
        companyId,
        isDeleted: false,
    }).lean();

    let total = 0;
    for (const inv of inventories) {
        for (const batch of inv.batches) {
            total += (batch.quantity || 0) * (batch.purchasePrice || 0);
        }
    }

    return total;
};


// 👥 3. Count Customers & Vendors
const getEntityCounts = async (companyId) => {
    const [customers, vendors] = await Promise.all([
        Entities.countDocuments({
            companyId,
            isDeleted: false,
            entityType: { $in: ['Customer', 'Both'] },
        }),
        Entities.countDocuments({
            companyId,
            isDeleted: false,
            entityType: { $in: ['Vendor', 'Both'] },
        }),
    ]);

    return { totalCustomers: customers, totalVendors: vendors };
};


// 📈 4. Generate Sales Chart Data
const getSalesChart = async (companyId) => {
    const salesData = await Ledger.aggregate([
        {
            $match: {
                companyId: new mongoose.Types.ObjectId(companyId),
                isDeleted: false,
                transactionType: 'Sale',
                entryType: 'credit',
                date: {
                    $gte: moment().subtract(6, 'months').startOf('month').toDate(),
                },
            },
        },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' },
                },
                totalSales: { $sum: '$amount' },
            },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const labels = [];
    const values = [];
    const now = moment().startOf('month');

    for (let i = 5; i >= 0; i--) {
        const label = now.clone().subtract(i, 'months').format('MMM');
        const data = salesData.find(
            (d) =>
                d._id.month === now.clone().subtract(i, 'months').month() + 1 &&
                d._id.year === now.clone().subtract(i, 'months').year()
        )?.totalSales || 0;

        labels.push(label);
        values.push(data);
    }

    return { labels, data: values };
};


// 🧾 5. Inventory Table Overview
const getInventoryTable = async (companyId) => {
    const [inventories, products] = await Promise.all([
        Inventory.find({ companyId, isDeleted: false }).lean(),
        Products.find({ companyId, isDeleted: false }).select('productName').lean(),
    ]);

    const productMap = Object.fromEntries(
        products.map((p) => [p._id.toString(), p.productName])
    );

    return inventories.map((inv) => {
        const product = productMap[inv.productId?.toString()] || 'Unknown';
        const quantity = inv.totalQuantity || 0;
        const value = inv.batches.reduce(
            (sum, b) => sum + (b.quantity || 0) * (b.purchasePrice || 0),
            0
        );
        return { product, quantity, value };
    });
};


// 🔝 6. Top Products from POS Transactions
const getTopProducts = async (companyId) => {
    const agg = await POSTransaction.aggregate([
        {
            $match: {
                companyId: new mongoose.Types.ObjectId(companyId),
                isDeleted: false,
            },
        },
        { $unwind: '$products' },
        {
            $group: {
                _id: '$products.productId',
                unitsSold: { $sum: '$products.quantity' },
                revenue: { $sum: '$products.totalPrice' },
            },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 8 },
    ]);

    const productNames = await Products.find({
        _id: { $in: agg.map((p) => p._id) },
    })
        .select('productName')
        .lean();

    return agg.map((p) => ({
        name:
            productNames.find((prod) => prod._id.toString() === p._id.toString())
                ?.productName || 'Unknown',
        unitsSold: p.unitsSold,
        revenue: p.revenue,
    }));
};


/**
 * @desc Get dashboard data
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const getDashboard = async (req, res) => {
    try {
        const { companyId, filter = 'month' } = req.body;

        if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
            return errorResponse(res, 'Valid companyId is required', 400);
        }

        const startDate = getStartDateFromFilter(filter);

        // Parallel fetches
        const [ledgerKPIs, inventoryValue, entityCounts, salesChart, inventoryTable, topProducts] =
            await Promise.all([
                getLedgerKPIs(companyId, startDate),
                getInventoryValue(companyId),
                getEntityCounts(companyId),
                getSalesChart(companyId),
                getInventoryTable(companyId),
                getTopProducts(companyId),
            ]);

        logger.info(`Dashboard data loaded for company: ${companyId}`);

        return successResponse(res, {
            kpis: {
                ...ledgerKPIs,
                inventoryValue,
                ...entityCounts,
                outstandingReceivables: 0 // Future enhancement
            },
            salesChart,
            inventoryTable,
            topProducts,
        });
    } catch (error) {
        logger.error('Error fetching dashboard data:', error);
        return errorResponse(res, error.message);
    }
};
