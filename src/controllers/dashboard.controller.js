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
};

const getLedgerKPIs = async (companyId, startDate, endDate) => {
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

// 📈 Dynamic Sales + Expense Chart with X-Axis granularity
const getSalesChart = async (companyId, startDate, endDate, filter = 'month') => {
    const matchBase = {
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false,
        date: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate(),
        }
    };
    console.log('filter: ', filter)
    // 👇 Determine group key and label formatter
    let groupId, labelBuilder, loopIterator;

    switch (filter) {
        case 'today': {
            groupId = { hour: { $hour: '$date' } };
            loopIterator = Array.from({ length: 24 }, (_, i) => i);
            labelBuilder = (i) => moment().hour(i).format('h A');
            break;
        }
        case 'week': {
            groupId = { day: { $dayOfWeek: '$date' } };
            loopIterator = [1, 2, 3, 4, 5, 6, 7]; // Sun to Sat
            labelBuilder = (i) => moment().day(i).format('ddd');
            break;
        }
        case 'month': {
            const daysInMonth = endDate.date();
            groupId = { day: { $dayOfMonth: '$date' } };
            loopIterator = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            labelBuilder = (i) => moment(startDate).date(i).format('D MMM');
            break;
        }
        case 'year':
        case 'all': {
            groupId = { month: { $month: '$date' }, year: { $year: '$date' } };
            const monthsDiff = endDate.diff(startDate, 'months') + 1;
            loopIterator = Array.from({ length: monthsDiff }, (_, i) => moment(startDate).add(i, 'months'));
            labelBuilder = (m) => m.format('MMM YYYY');
            break;
        }
        case 'custom': {
            const diffHours = endDate.diff(startDate, 'hours');
            const diffDays = endDate.diff(startDate, 'days');
            const diffMonths = endDate.diff(startDate, 'months');

            if (diffHours <= 24) {
                groupId = { hour: { $hour: '$date' } };
                loopIterator = Array.from({ length: 24 }, (_, i) => i);
                labelBuilder = (i) => moment().hour(i).format('h A');
            } else if (diffDays <= 7) {
                groupId = { day: { $dayOfMonth: '$date' } };
                loopIterator = Array.from({ length: diffDays + 1 }, (_, i) => i);
                labelBuilder = (i) => moment(startDate).add(i, 'days').format('ddd D MMM');
            } else if (diffDays <= 60) {
                groupId = { day: { $dayOfMonth: '$date' }, month: { $month: '$date' } };
                loopIterator = Array.from({ length: diffDays + 1 }, (_, i) => i);
                labelBuilder = (i) => moment(startDate).add(i, 'days').format('D MMM');
            } else {
                groupId = { month: { $month: '$date' }, year: { $year: '$date' } };
                loopIterator = Array.from({ length: diffMonths + 1 }, (_, i) => moment(startDate).add(i, 'months'));
                labelBuilder = (m) => m.format('MMM YYYY');
            }
            break;
        }
        default:
            throw new Error('Invalid filter');
    }

    const salesAgg = await Ledger.aggregate([
        { $match: { ...matchBase, transactionType: 'Sale', entryType: 'credit' } },
        { $group: { _id: groupId, total: { $sum: '$amount' } } }
    ]);

    const expenseAgg = await Ledger.aggregate([
        { $match: { ...matchBase, transactionType: 'Expense', entryType: 'debit' } },
        { $group: { _id: groupId, total: { $sum: '$amount' } } }
    ]);

    // 🧠 Helper to match value from aggregation
    const getTotal = (aggArr, matchKey) => {
        return aggArr.find(item => {
            if (filter === 'today') return item._id.hour === matchKey;
            if (filter === 'week') return item._id.day === matchKey;
            if (filter === 'month') return item._id.day === matchKey;
            if (filter === 'year' || filter === 'all') {
                return item._id.month === matchKey.month() + 1 && item._id.year === matchKey.year();
            }
            return false;
        })?.total || 0;
    };

    const labels = [];
    const sales = [];
    const expenses = [];

    for (const point of loopIterator) {
        labels.push(labelBuilder(point));
        sales.push(getTotal(salesAgg, point));
        expenses.push(getTotal(expenseAgg, point));
    }
    console.log('labels: ', labels)
    return {
        labels,
        data: {
            sales,
            expenses
        }
    };
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
                getSalesChart(companyId, startDate, endDate, filter),
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
