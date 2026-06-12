const router = require('express').Router();

// Existing foundation modules
router.use('/auth', require('./modules/auth/auth.routes'));
router.use('/users', require('./modules/users/user.routes'));
router.use('/kilns', require('./modules/kilns/kiln.routes'));
router.use('/workers', require('./modules/workers/worker.routes'));
router.use('/attendance', require('./modules/attendance/attendance.routes'));
router.use('/production', require('./modules/production/production.routes'));
router.use('/stock', require('./modules/stock/stock.routes'));
router.use('/villages', require('./modules/customers/village.routes'));
router.use('/customers', require('./modules/customers/customer.routes'));
router.use('/orders', require('./modules/orders/order.routes'));
router.use('/udhari', require('./modules/udhari/udhari.routes'));
router.use('/payments', require('./modules/payments/payment.routes'));
router.use('/leads', require('./modules/leads/lead.routes'));
router.use('/voice-remarks', require('./modules/voiceRemarks/voiceRemark.routes'));
router.use('/notifications', require('./modules/notifications/notification.routes'));
router.use('/dashboard', require('./modules/dashboard/dashboard.routes'));
router.use('/logs', require('./modules/logs/activityLog.routes'));
router.use('/constants', require('./modules/constants/constants.routes'));

// Complete Kiln ERP modules
router.use('/seasons', require('./modules/seasons/season.routes'));
router.use('/worker-categories', require('./modules/workerCategories/workerCategory.routes'));
router.use('/brick-categories', require('./modules/brickCategories/brickCategory.routes'));
router.use('/processes', require('./modules/processes/process.routes'));
router.use('/process-entries', require('./modules/processEntries/processEntry.routes'));
router.use('/stock-ledger', require('./modules/stockLedger/stockLedger.routes'));
router.use('/worker-ledger', require('./modules/workerLedger/workerLedger.routes'));
router.use('/payroll', require('./modules/payroll/payroll.routes'));
router.use('/chambers', require('./modules/chambers/chamber.routes'));
router.use('/fuel', require('./modules/fuel/fuel.routes'));
router.use('/dispatches', require('./modules/dispatches/dispatch.routes'));
router.use('/customer-ledger', require('./modules/customerLedger/customerLedger.routes'));
router.use('/expense-categories', require('./modules/expenseCategories/expenseCategory.routes'));
router.use('/expenses', require('./modules/expenses/expense.routes'));
router.use('/suppliers', require('./modules/suppliers/supplier.routes'));
router.use('/purchases', require('./modules/purchases/purchase.routes'));
router.use('/supplier-ledger', require('./modules/supplierLedger/supplierLedger.routes'));
router.use('/vehicles', require('./modules/vehicles/vehicle.routes'));
router.use('/cashbook', require('./modules/cashbook/cashbook.routes'));
router.use('/reports', require('./modules/reports/report.routes'));

module.exports = router;
