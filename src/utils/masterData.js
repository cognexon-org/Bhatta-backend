const mongoose = require('mongoose');
const WorkerCategory = require('../modules/workerCategories/workerCategory.model');
const StockCategory = require('../modules/stock/stockCategory.model');
const Process = require('../modules/processes/process.model');
const FuelType = require('../modules/fuel/fuelType.model');
let ExpenseCategory;
try { ExpenseCategory = require('../modules/expenseCategories/expenseCategory.model'); } catch (e) { ExpenseCategory = null; }

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function invalid(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function objectIdOrNull(value) {
  if (!value) return null;
  return mongoose.Types.ObjectId.isValid(String(value)) ? value : null;
}

async function resolveByIdOrCode(Model, { id, code, label, requireActive = true }) {
  const query = {};
  const objectId = objectIdOrNull(id);
  if (objectId) query._id = objectId;
  else if (code) query.code = normalizeCode(code);
  else throw invalid(`${label} is required`);
  if (requireActive) query.isActive = true;
  const record = await Model.findOne(query);
  if (!record) throw invalid(`Invalid or inactive ${label}`);
  return record;
}

async function resolveWorkerCategory({ categoryId, categoryCode }) {
  return resolveByIdOrCode(WorkerCategory, { id: categoryId, code: categoryCode, label: 'worker category' });
}

async function resolveBrickCategory({ categoryId, categoryCode, allowDispatch } = {}) {
  const category = await resolveByIdOrCode(StockCategory, { id: categoryId, code: categoryCode, label: 'brick/stock category' });
  if (allowDispatch && !category.allowDispatch) throw invalid(`${category.code} cannot be dispatched`);
  return category;
}

async function resolveProcess({ processId, processCode }) {
  return resolveByIdOrCode(Process, { id: processId, code: processCode, label: 'process' });
}

async function resolveFuelType({ fuelTypeId, fuelCode }) {
  return resolveByIdOrCode(FuelType, { id: fuelTypeId, code: fuelCode, label: 'fuel type' });
}

async function resolveExpenseCategory({ categoryId, categoryCode }) {
  if (!ExpenseCategory) return null;
  return resolveByIdOrCode(ExpenseCategory, { id: categoryId, code: categoryCode, label: 'expense category' });
}

module.exports = {
  normalizeCode,
  invalid,
  resolveByIdOrCode,
  resolveWorkerCategory,
  resolveBrickCategory,
  resolveProcess,
  resolveFuelType,
  resolveExpenseCategory
};
