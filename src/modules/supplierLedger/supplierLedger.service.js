const Supplier = require('../suppliers/supplier.model');
const SupplierLedger = require('./supplierLedger.model');
async function createSupplierLedgerEntry(payload){ const supplier=await Supplier.findById(payload.supplierId); if(!supplier) throw new Error('Supplier not found'); const debit=Number(payload.debit||0); const credit=Number(payload.credit||0); const balanceAfter=Number(supplier.outstandingAmount||0)+debit-credit; const item=await SupplierLedger.create({ ...payload, balanceAfter }); supplier.outstandingAmount=Math.max(balanceAfter,0); await supplier.save(); return item; }
module.exports = { createSupplierLedgerEntry };
