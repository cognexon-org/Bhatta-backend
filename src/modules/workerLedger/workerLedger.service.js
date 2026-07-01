const Worker = require('../workers/worker.model');
const WorkerLedger = require('./workerLedger.model');

function effect(type, amount) {
  const plus = ['EARNING', 'OPENING_BALANCE'];
  const minus = ['ADVANCE', 'PAYMENT', 'DEDUCTION'];
  if (plus.includes(type)) return { debit: Number(amount), credit: 0, delta: Number(amount) };
  if (minus.includes(type)) return { debit: 0, credit: Number(amount), delta: -Number(amount) };
  return { debit: Number(amount) >= 0 ? Number(amount) : 0, credit: Number(amount) < 0 ? Math.abs(Number(amount)) : 0, delta: Number(amount) };
}

async function createWorkerLedgerEntry(payload) {
  const { session } = payload;
  const worker = await Worker.findById(payload.workerId).session(session || null);
  if (!worker) throw new Error('Worker not found');
  const amount = Number(payload.amount || 0);
  if (amount < 0) throw new Error('Amount cannot be negative');
  const e = effect(payload.transactionType, amount);
  const balanceAfter = Number(worker.currentBalance || 0) + e.delta;
  const rows = await WorkerLedger.create([{ ...payload, session: undefined, kilnId: payload.kilnId || worker.kilnId, seasonId: payload.seasonId || worker.seasonId, managerId: payload.managerId || worker.assignedManagerId, debit: e.debit, credit: e.credit, balanceAfter }], session ? { session } : undefined);
  worker.currentBalance = balanceAfter;
  await Worker.updateOne({ _id: worker._id }, { $set: { currentBalance: balanceAfter } }, session ? { session } : undefined);
  return rows[0];
}

module.exports = { createWorkerLedgerEntry };
