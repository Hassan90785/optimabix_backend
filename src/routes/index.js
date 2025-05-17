import express from 'express';

// Import all route files
import modulesRoutes from './modules.routes.js';
import rolesRoutes from './roles.routes.js';
import usersRoutes from './users.routes.js';
import companiesRoutes from './companies.routes.js';
import entitiesRoutes from './entities.routes.js';
import productsRoutes from './products.routes.js';
import inventoryRoutes from './inventory.routes.js';
import posTransactionsRoutes from './posTransactions.routes.js';
import ledgerRoutes from './ledger.routes.js';
import paymentsRoutes from './payments.routes.js';
import invoicesRoutes from './invoices.routes.js';
import stockAdjustmentsRoutes from './stockAdjustments.routes.js';
import taxConfigurationsRoutes from './taxConfigurations.routes.js';
import discountsRoutes from './discounts.routes.js';
import subscriptionPlansRoutes from './subscriptionPlans.routes.js';
import auditLogsRoutes from './auditLogs.routes.js';
import adminRoutes from "./admin.routes.js";
import accountRoutes from "./account.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import expenseRoutes from "./expense.routes.js";

const router = express.Router();

// Mount all routes (without API prefix)
router.use('/modules', modulesRoutes);
router.use('/roles', rolesRoutes);
router.use('/users', usersRoutes);
router.use('/companies', companiesRoutes);
router.use('/entities', entitiesRoutes);
router.use('/products', productsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/posTransactions', posTransactionsRoutes);
router.use('/ledger', ledgerRoutes);
router.use('/payments', paymentsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/admin', adminRoutes);
router.use('/stockAdjustments', stockAdjustmentsRoutes);
router.use('/taxConfigurations', taxConfigurationsRoutes);
router.use('/discounts', discountsRoutes);
router.use('/subscriptionPlans', subscriptionPlansRoutes);
router.use('/auditLogs', auditLogsRoutes);
router.use('/accounts', accountRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/expense', expenseRoutes);

export default router;
