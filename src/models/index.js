import mongoose from 'mongoose';

// Exporting all models using ESM style
export { default as Modules } from './modules.model.js';
export { default as Roles } from './roles.model.js';
export { default as Users } from './users.model.js';
export { default as Companies } from './companies.model.js';
export { default as Entities } from './entities.model.js';
export { default as Products } from './products.model.js';
export { default as Inventory } from './inventory.model.js';
export { default as Discounts } from './discounts.model.js';
export { default as TaxConfiguration } from './taxConfigurations.model.js';
export { default as POSTransaction } from './posTransactions.model.js';
export { default as Ledger } from './ledger.model.js';
export { default as Payments } from './payments.model.js';
export { default as Invoices } from './invoices.model.js';
export { default as Admin } from './admin.model.js';
export { default as StockAdjustment } from './stockAdjustments.model.js';
export { default as SubscriptionPlan } from './subscriptionPlans.model.js';
export { default as AuditLog } from './auditLogs.model.js';

// Exporting mongoose instance if needed for central management
export default mongoose;
