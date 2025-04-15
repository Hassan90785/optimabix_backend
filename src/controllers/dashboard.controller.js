import mongoose from 'mongoose';
import moment from 'moment';
import {Entities, Inventory, Ledger, POSTransaction, Products} from '../models/index.js';
import {errorResponse, logger, successResponse} from '../utils/index.js';

// 🎯 Utility: Compute date range from filter
const getDateRangeFromFilter = (filter, customStartDate, customEndDate) => {
    const now = moment();
    switch (filter) {
        case 'today':
            return {startDate: now.clone().startOf('day'), endDate: now.clone().endOf('day')};
        case 'week':
            return {startDate: now.clone().startOf('week'), endDate: now.clone().endOf('day')};
        case 'month':
            return {startDate: now.clone().startOf('month'), endDate: now.clone().endOf('day')};
        case 'custom':
            return {
                startDate: moment(customStartDate).startOf('day'),
                endDate: moment(customEndDate).endOf('day')
            };
        default:
            return {startDate: moment('2000-01-01'), endDate: now.clone().endOf('day')};
    }
};

// 📊 Ledger KPIs
const getLedgerKPIs = async (companyId, startDate, endDate) => {
    const match = {
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false,
        date: {$gte: startDate.toDate(), $lte: endDate.toDate()},
    };

    const grouped = await Ledger.aggregate([
        {$match: match},
        {$group: {_id: '$transactionType', total: {$sum: '$amount'}}},
    ]);

    const cashInBank = await Ledger.aggregate([
        {
            $match: {
                ...match,
                account: 'Cash/Bank',
                entryType: 'debit',
            },
        },
        {$group: {_id: null, total: {$sum: '$amount'}}},
    ]);

    const getAmount = (type) => grouped.find((k) => k._id === type)?.total || 0;

    return {
        totalSales: getAmount('Sale'),
        paymentsReceived: getAmount('Payment'),
        discountsGiven: getAmount('Discount'),
        cashInBank: cashInBank[0]?.total || 0,
    };
};

// 📈 Sales Chart
const getSalesChart = async (companyId, startDate, endDate) => {
    const salesData = await Ledger.aggregate([
        {
            $match: {
                companyId: new mongoose.Types.ObjectId(companyId),
                isDeleted: false,
                transactionType: 'Sale',
                entryType: 'credit',
                date: {
                    $gte: startDate.toDate(),
                    $lte: endDate.toDate(),
                },
            },
        },
        {
            $group: {
                _id: {
                    year: {$year: '$date'},
                    month: {$month: '$date'},
                },
                totalSales: {$sum: '$amount'},
            },
        },
        {$sort: {'_id.year': 1, '_id.month': 1}},
    ]);

    const labels = [];
    const values = [];
    const monthsDiff = endDate.diff(startDate, 'months') + 1;

    for (let i = 0; i < monthsDiff; i++) {
        const current = moment(startDate).add(i, 'months');
        const label = current.format('MMM');

        const total = salesData.find(
            (s) => s._id.month === current.month() + 1 && s._id.year === current.year()
        )?.totalSales || 0;

        labels.push(label);
        values.push(total);
    }

    return {labels, data: values};
};

// 📦 Inventory Value
const getInventoryValue = async (companyId) => {
    const inventories = await Inventory.find({companyId, isDeleted: false}).lean();
    let total = 0;

    for (const inv of inventories) {
        for (const batch of inv.batches) {
            total += (batch.quantity || 0) * (batch.purchasePrice || 0);
        }
    }

    return total;
};

// 👥 Entity Counts
const getEntityCounts = async (companyId) => {
    const [customers, vendors] = await Promise.all([
        Entities.countDocuments({
            companyId,
            isDeleted: false,
            entityType: {$in: ['Customer', 'Both']},
        }),
        Entities.countDocuments({
            companyId,
            isDeleted: false,
            entityType: {$in: ['Vendor', 'Both']},
        }),
    ]);

    return {totalCustomers: customers, totalVendors: vendors};
};

// 🧾 Inventory Table
const getInventoryTable = async (companyId) => {
    const [inventories, products] = await Promise.all([
        Inventory.find({companyId, isDeleted: false}).lean(),
        Products.find({companyId, isDeleted: false}).select('productName').lean(),
    ]);

    const productMap = Object.fromEntries(products.map((p) => [p._id.toString(), p.productName]));

    return inventories.map((inv) => {
        const product = productMap[inv.productId?.toString()] || 'Unknown';
        const quantity = inv.totalQuantity || 0;
        const value = inv.batches.reduce(
            (sum, b) => sum + (b.quantity || 0) * (b.purchasePrice || 0),
            0
        );
        return {product, quantity, value};
    });
};

// 🔝 Top Products
const getTopProducts = async (companyId) => {
    const agg = await POSTransaction.aggregate([
        {
            $match: {
                companyId: new mongoose.Types.ObjectId(companyId),
                isDeleted: false,
            },
        },
        {$unwind: '$products'},
        {
            $group: {
                _id: '$products.productId',
                unitsSold: {$sum: '$products.quantity'},
                revenue: {$sum: '$products.totalPrice'},
            },
        },
        {$sort: {unitsSold: -1}},
        {$limit: 8},
    ]);

    const productNames = await Products.find({_id: {$in: agg.map((p) => p._id)}})
        .select('productName')
        .lean();

    return agg.map((p) => ({
        name: productNames.find((prod) => prod._id.toString() === p._id.toString())?.productName || 'Unknown',
        unitsSold: p.unitsSold,
        revenue: p.revenue,
    }));
};

// 🚀 Dashboard Controller
export const getDashboard = async (req, res) => {
    try {
        const {companyId, filter = 'month', customStartDate, customEndDate} = req.body;

        if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
            return errorResponse(res, 'Valid companyId is required', 400);
        }

        const {startDate, endDate} = getDateRangeFromFilter(filter, customStartDate, customEndDate);

        const [ledgerKPIs, inventoryValue, entityCounts, salesChart, inventoryTable, topProducts] =
            await Promise.all([
                getLedgerKPIs(companyId, startDate, endDate),
                getInventoryValue(companyId),
                getEntityCounts(companyId),
                getSalesChart(companyId, startDate, endDate),
                getInventoryTable(companyId),
                getTopProducts(companyId),
            ]);

        logger.info(`✅ Dashboard data loaded for company: ${companyId}`);

        return successResponse(res, {
            kpis: {
                ...ledgerKPIs,
                inventoryValue,
                ...entityCounts,
                outstandingReceivables: 0 // Placeholder
            },
            salesChart,
            inventoryTable,
            topProducts,
        });
    } catch (error) {
        logger.error('❌ Error fetching dashboard data:', error);
        return errorResponse(res, error.message);
    }
};
