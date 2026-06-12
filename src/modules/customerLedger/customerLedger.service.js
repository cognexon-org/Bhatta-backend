const Customer = require('../customers/customer.model');
const CustomerLedger = require('./customerLedger.model');

async function createCustomerLedgerEntry(payload) {
  const { session } = payload;
  const customer = await Customer.findById(payload.customerId).session(session || null);
  if (!customer) throw new Error('Customer not found');
  const debit = Number(payload.debit || 0);
  const credit = Number(payload.credit || 0);
  const balanceAfter = Number(customer.outstandingAmount || 0) + debit - credit;
  const rows = await CustomerLedger.create([{ ...payload, session: undefined, kilnId: payload.kilnId || customer.kilnId, balanceAfter }], session ? { session } : undefined);
  customer.outstandingAmount = Math.max(balanceAfter, 0);
  if (debit) customer.totalUdhari = Number(customer.totalUdhari || 0) + debit;
  if (credit) customer.totalPaid = Number(customer.totalPaid || 0) + credit;
  await customer.save(session ? { session } : undefined);
  return rows[0];
}
module.exports = { createCustomerLedgerEntry };
