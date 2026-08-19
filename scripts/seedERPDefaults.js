require('dotenv').config();
const connectDB = require('../src/config/db');
const { closeDB } = require('../src/config/db');
const { getTenantModel } = require('../src/platform/tenant.model');
const { getTenantConnection } = require('../src/platform/tenantConnectionManager');
const { runWithTenant } = require('../src/platform/tenantContext');
const StockCategory = require('../src/modules/stock/stockCategory.model');
const WorkerCategory = require('../src/modules/workerCategories/workerCategory.model');
const Process = require('../src/modules/processes/process.model');
const FuelType = require('../src/modules/fuel/fuelType.model');
const ExpenseCategory = require('../src/modules/expenseCategories/expenseCategory.model');
const { seedDefaults } = require('../src/modules/constants/constants.controller');

async function upsertByCode(Model, rows, map = (x) => x) {
  for (const row of rows) {
    const payload = map(row);
    await Model.updateOne({ code: payload.code }, { $set: payload }, { upsert: true });
  }
}

async function seedTenant() {
  await upsertByCode(StockCategory, seedDefaults.brickCategories, (x) => ({
    name: x.name, nameHindi: x.nameHindi, code: x.code, categoryGroup: x.categoryGroup,
    saleable: x.saleable, allowDispatch: x.allowDispatch, isActive: true
  }));
  await upsertByCode(WorkerCategory, seedDefaults.workerCategories, (x) => ({
    name: x.en, nameHindi: x.hi, code: x.code,
    defaultSalaryType: ['ETH_PATHAI', 'BHARAI', 'NIKASI', 'CHHANTAI'].includes(x.code) ? 'PIECE_RATE' : 'DAILY',
    unit: ['ETH_PATHAI', 'BHARAI', 'NIKASI', 'CHHANTAI'].includes(x.code) ? 'PER_1000' : 'DAY',
    isProductionLinked: ['ETH_PATHAI', 'BHARAI', 'NIKASI', 'CHHANTAI', 'PHUKAI', 'RAABIS', 'SUKHAI'].includes(x.code), isActive: true
  }));
  await upsertByCode(Process, seedDefaults.processes, (x) => ({
    code: x.code, name: x.name, nameHindi: x.nameHindi, sequenceNo: x.sequenceNo || 0,
    inputCategoryCodes: x.inputCategoryCodes || [], outputCategoryCodes: x.outputCategoryCodes || [],
    requiresChamber: Boolean(x.requiresChamber), requiresWorkers: Boolean(x.requiresWorkers), requiresFuel: Boolean(x.requiresFuel), affectsStock: Boolean(x.affectsStock), isActive: true
  }));
  await upsertByCode(FuelType, seedDefaults.fuelTypes, (x) => ({ code: x.code, name: x.name, nameHindi: x.nameHindi, unit: x.unit, isActive: true }));
  await upsertByCode(ExpenseCategory, seedDefaults.expenseCategories, (x) => ({
    code: x.code || x, name: x.name || String(x).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()),
    nameHindi: x.nameHindi, requiresApproval: Boolean(x.requiresApproval), approvalLimitAmount: Number(x.approvalLimitAmount || 0), isActive: true
  }));
}

async function seed() {
  await connectDB();
  const Tenant = getTenantModel();
  const code = String(process.env.SEED_TENANT_CODE || process.env.TENANT_CODE || '').toUpperCase();
  if (!code) throw new Error('SEED_TENANT_CODE is required');
  const tenant = await Tenant.findOne({ code, status: 'ACTIVE' });
  if (!tenant) throw new Error(`Active tenant not found: ${code}`);
  const connection = await getTenantConnection(tenant);
  await runWithTenant({ tenant, connection }, seedTenant);
  console.log(`[${tenant.code}] ERP default master data seeded`);
  await closeDB();
}

seed().catch(async (error) => { console.error(error); await closeDB().catch(() => {}); process.exit(1); });
