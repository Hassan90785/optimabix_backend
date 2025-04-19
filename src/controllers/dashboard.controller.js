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
        case 'all':
            return { startDate: moment('2024-01-01'), endDate: now.clone().endOf('day')};

        case 'custom':
            return {
                startDate: moment(customStartDate).startOf('day'),
                endDate: moment(customEndDate).endOf('day')
            };
        default:
            return {startDate: moment('2000-01-01'), endDate: now.clone().endOf('day')};
    }
};const getLedgerKPIs = async (companyId, startDate, endDate) => {
    const matchBase = {
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false,
        date: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate(),
        },
    };

    const [
        // ✅ Net Sales Revenue (excluding tax and discounts)
        salesRevenueResult,

        // ✅ Actual Cash Received from Customers
        cashCollectedResult,

        // ✅ Discounts Given to Customers (all types)
        discountsGivenResult,

        // ✅ Value of Inventory added (e.g. through Purchases)
        inventoryValueResult,

        // ✅ All cash inflow (Payments, Purchases, Deposits etc.)
        cashInBankResult,

        // ✅ Total AR Debits (Amount owed by customers)
        receivablesDebits,

        // ✅ Total AR Credits (Payments or settlement against receivables)
        receivablesCredits,

        // ✅ Total Customer count (including dual-role 'Both')
        customerCount,

        // ✅ Total Vendor count (including dual-role 'Both')
        vendorCount,
    ] = await Promise.all([
        // ✅ Total Net Sales = Sum of credit to 'Sales Revenue'
        Ledger.aggregate([
            {
                $match: {
                    ...matchBase,
                    transactionType: "Sale",
                    account: "Sales Revenue",
                    entryType: "credit",
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                },
            },
        ]),

        // ✅ Payments Received = Cash/Bank debits from 'Payment' transactions
        Ledger.aggregate([
            {
                $match: {
                    ...matchBase,
                    transactionType: 'Payment',
                    account: 'Cash/Bank',
                    entryType: 'debit',
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ]),

        // ✅ Discounts Given = All entries involving 'Discount' accounts
        Ledger.aggregate([
            {
                $match: {
                    ...matchBase,
                    account: { $regex: /discount/i },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ]),

        // ✅ Inventory Value = Debit to 'Inventory' account
        Ledger.aggregate([
            {
                $match: {
                    ...matchBase,
                    account: 'Inventory',
                    entryType: 'debit',
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ]),

        // ✅ Cash in Bank = All debits to 'Cash/Bank' regardless of transaction type
        Ledger.aggregate([
            {
                $match: {
                    ...matchBase,
                    account: 'Cash/Bank',
                    entryType: 'debit',
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ]),

        // ✅ Total AR Debits — credit sales (customer billed)
        Ledger.aggregate([
            {
                $match: {
                    ...matchBase,
                    account: 'Accounts Receivable',
                    entryType: 'debit',
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ]),

        // ✅ Total AR Credits — payments received (customer settled)
        Ledger.aggregate([
            {
                $match: {
                    ...matchBase,
                    account: 'Accounts Receivable',
                    entryType: 'credit',
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ]),

        // ✅ Customer count from Entities
        Entities.countDocuments({
            companyId: new mongoose.Types.ObjectId(companyId),
            isDeleted: false,
            type: { $in: ['Customer', 'Both'] },
        }),

        // ✅ Vendor count from Entities
        Entities.countDocuments({
            companyId: new mongoose.Types.ObjectId(companyId),
            isDeleted: false,
            type: { $in: ['Vendor', 'Both'] },
        }),
    ]);

    // Helper to extract total from aggregate result
    const extractTotal = (res) => res?.[0]?.total || 0;

    // Calculate outstanding receivables = AR Debits - AR Credits
    const totalDebits = extractTotal(receivablesDebits);
    const totalCredits = extractTotal(receivablesCredits);
    const outstandingReceivables = totalDebits - totalCredits;

    // Return formatted KPI object
    return {
        totalSales: extractTotal(salesRevenueResult),         // Net Sales Revenue
        paymentsReceived: extractTotal(cashCollectedResult),  // Cash In from Payments
        discountsGiven: extractTotal(discountsGivenResult),   // Total Discounts
        inventoryValue: extractTotal(inventoryValueResult),   // Total Inventory Value Added
        cashInBank: extractTotal(cashInBankResult),           // Total Cash in Bank (across sources)
        outstandingReceivables,                               // AR still pending
        totalCustomers: customerCount,                        // Total Active Customers
        totalVendors: vendorCount,                            // Total Active Vendors
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
