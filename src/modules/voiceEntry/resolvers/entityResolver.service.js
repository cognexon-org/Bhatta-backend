const Worker = require('../../workers/worker.model');
const Customer = require('../../customers/customer.model');
const Chamber = require('../../chambers/chamber.model');
const Vehicle = require('../../vehicles/vehicle.model');
const Process = require('../../processes/process.model');
const ExpenseCategory = require('../../expenseCategories/expenseCategory.model');
const StockCategory = require('../../stock/stockCategory.model');

function normalize(value='') {
  return String(value).trim().toLowerCase().replace(/\s+/g,' ');
}
function escapeRegex(value='') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
async function fuzzyByName(Model, spoken, fields, extra={}) {
  if (!spoken) return { match: null, candidates: [] };
  const exactOrContains = new RegExp(escapeRegex(String(spoken).trim()), 'i');
  const query = { ...extra, $or: fields.map((field) => ({ [field]: exactOrContains })) };
  const candidates = await Model.find(query).limit(5);
  const target = normalize(spoken);
  const exact = candidates.find((item) => fields.some((field) => normalize(item[field]) === target));
  if (exact) return { match: exact, candidates };
  return { match: candidates.length === 1 ? candidates[0] : null, candidates };
}
function candidateView(items, fields) {
  return items.map((item) => ({ id: item._id, ...Object.fromEntries(fields.map((f) => [f, item[f]])) }));
}


function mentioned(text, value) {
  const target = normalize(value);
  if (!target || target.length < 2) return false;
  const haystack = ` ${normalize(text).replace(/[,:;।|/\\()\[\]{}_-]+/g, ' ')} `;
  return haystack.includes(` ${target} `);
}

async function findMentioned(Model, transcript, fields, extra = {}, { multiple = false, limit = 500 } = {}) {
  if (!transcript) return multiple ? [] : null;
  const items = await Model.find(extra).select(fields.join(' ')).limit(limit).lean();
  const matches = [];
  for (const item of items) {
    const matchedField = fields.find((field) => item[field] && mentioned(transcript, item[field]));
    if (matchedField) matches.push({ item, length: normalize(item[matchedField]).length });
  }
  matches.sort((a, b) => b.length - a.length);
  if (multiple) {
    const selected = [];
    const names = new Set();
    for (const match of matches) {
      const key = String(match.item._id);
      if (!names.has(key)) { names.add(key); selected.push(match.item); }
    }
    return selected;
  }
  if (!matches.length) return null;
  // Prefer the longest exact spoken master-data match. If equal-length matches exist,
  // leave it unresolved instead of guessing.
  if (matches.length > 1 && matches[0].length === matches[1].length) return null;
  return matches[0].item;
}

async function resolveVoiceEntities(task, data, req) {
  const unresolved = [];
  const ambiguities = {};
  const resolved = { ...data };
  const kilnId = req.body.context?.kilnId || data.kilnId || req.user?.assignedKilnId;

  if (task === 'PROCESS_ENTRY') {
    let process = null;
    if (data.processCode) {
      process = await Process.findOne({ code: data.processCode, isActive: true });
      if (process) {
        resolved.processId = process._id;
        resolved.processName = process.name;
        resolved.processNameHindi = process.nameHindi;
      } else unresolved.push('processCode');
    }

    let processWorkerNames = Array.isArray(data.workerNames) ? data.workerNames.filter(Boolean) : [];
    if (!processWorkerNames.length && process?.requiresWorkers) {
      const mentionedWorkers = await findMentioned(Worker, req.body.transcript, ['name'], { isActive: true, ...(kilnId ? { kilnId } : {}) }, { multiple: true });
      processWorkerNames = mentionedWorkers.map((worker) => worker.name);
      if (processWorkerNames.length) resolved.workerNames = processWorkerNames;
    }
    if (processWorkerNames.length) {
      resolved.workerContributions = [];
      for (const spoken of processWorkerNames) {
        const r = await fuzzyByName(Worker, spoken, ['name'], { isActive: true, ...(kilnId ? { kilnId } : {}) });
        if (r.match) resolved.workerContributions.push({ workerId: r.match._id, workerName: r.match.name, quantity: processWorkerNames.length === 1 ? Number(data.quantityOut || data.quantityIn || 0) : 0, unit: data.unit || 'PER_1000', rate: Number(data.rate || r.match.pieceRate || 0) });
        else {
          unresolved.push(`worker:${spoken}`);
          ambiguities[`worker:${spoken}`] = candidateView(r.candidates, ['name','mobile','categoryCode']);
        }
      }
      if (processWorkerNames.length > 1) unresolved.push('workerAllocation');
    } else if (process?.requiresWorkers) unresolved.push('workerNames');

    if (data.chamberNo) {
      const chamber = await Chamber.findOne({ chamberNo: String(data.chamberNo), isActive: true, ...(kilnId ? { kilnId } : {}) });
      if (chamber) resolved.chamberId = chamber._id;
      else unresolved.push('chamberNo');
    } else if (process?.requiresChamber && !data.chamberId) {
      unresolved.push('chamberNo');
    }

    if (process?.requiresFuel && (!Array.isArray(data.fuelConsumptions) || !data.fuelConsumptions.length)) {
      unresolved.push('fuelConsumptions');
    }
    if (data.processCode === 'CHHANTAI' && (!Array.isArray(data.outputs) || !data.outputs.length)) {
      unresolved.push('outputs');
    }

    if (data.brickCategoryCode) {
      const category = await StockCategory.findOne({ code: data.brickCategoryCode, isActive: true });
      if (category) resolved.stockCategoryId = category._id;
    }
  }

  if (task === 'EXPENSE_ENTRY') {
    let categorySpoken = data.categorySpoken;
    if (!categorySpoken) {
      const category = await findMentioned(ExpenseCategory, req.body.transcript, ['nameHindi','name','code'], { isActive: true });
      if (category) { categorySpoken = category.nameHindi || category.name || category.code; resolved.categorySpoken = categorySpoken; }
    }
    if (categorySpoken) {
      const r = await fuzzyByName(ExpenseCategory, categorySpoken, ['name','nameHindi','code'], { isActive: true });
      if (r.match) { resolved.categoryId = r.match._id; resolved.categoryCode = r.match.code; resolved.categoryName = r.match.name; }
      else { unresolved.push('categorySpoken'); ambiguities.categorySpoken = candidateView(r.candidates, ['code','name','nameHindi']); }
    } else unresolved.push('categorySpoken');
  }

  if (task === 'CUSTOMER_PAYMENT' || task === 'DISPATCH') {
    if (req.body.context?.customerId) {
      const customer = await Customer.findById(req.body.context.customerId);
      if (customer) { resolved.customerId = customer._id; resolved.customerName = customer.name; }
    }
    let spoken = data.customerName;
    if (!spoken && !resolved.customerId) {
      const customer = await findMentioned(Customer, req.body.transcript, ['name','beatName'], { isActive: true, ...(kilnId ? { kilnId } : {}) });
      if (customer) { spoken = customer.name; resolved.customerName = customer.name; }
    }
    if (spoken) {
      const r = await fuzzyByName(Customer, spoken, ['name','mobile','beatName'], { isActive: true, ...(kilnId ? { kilnId } : {}) });
      if (r.match) { resolved.customerId = r.match._id; resolved.customerName = r.match.name; }
      else { unresolved.push('customerName'); ambiguities.customerName = candidateView(r.candidates, ['name','mobile','beatName']); }
    } else if (!resolved.customerId) unresolved.push('customerName');
  }

  if (task === 'WORKER_ADVANCE') {
    if (req.body.context?.workerId) {
      const worker = await Worker.findById(req.body.context.workerId);
      if (worker) { resolved.workerId = worker._id; resolved.workerName = worker.name; }
    }
    let spoken = data.workerName;
    if (!spoken && !resolved.workerId) {
      const worker = await findMentioned(Worker, req.body.transcript, ['name'], { isActive: true, ...(kilnId ? { kilnId } : {}) });
      if (worker) { spoken = worker.name; resolved.workerName = worker.name; }
    }
    if (spoken) {
      const r = await fuzzyByName(Worker, spoken, ['name','mobile'], { isActive: true, ...(kilnId ? { kilnId } : {}) });
      if (r.match) { resolved.workerId = r.match._id; resolved.workerName = r.match.name; }
      else { unresolved.push('workerName'); ambiguities.workerName = candidateView(r.candidates, ['name','mobile','categoryCode']); }
    } else if (!resolved.workerId) unresolved.push('workerName');
  }

  if (task === 'ATTENDANCE') {
    let sourceEntries = Array.isArray(data.entries) && data.entries.length ? data.entries : (data.workerNames || []).map((name) => ({ workerName: name, status: data.status || 'PRESENT' }));
    if (!sourceEntries.length && !data.mixedStatus) {
      const mentionedWorkers = await findMentioned(Worker, req.body.transcript, ['name'], { isActive: true, ...(kilnId ? { kilnId } : {}) }, { multiple: true });
      sourceEntries = mentionedWorkers.map((worker) => ({ workerName: worker.name, status: data.status || 'PRESENT' }));
      if (sourceEntries.length) resolved.workerNames = sourceEntries.map((entry) => entry.workerName);
    }
    resolved.entries = [];
    for (const entry of sourceEntries) {
      const r = await fuzzyByName(Worker, entry.workerName, ['name'], { isActive: true, ...(kilnId ? { kilnId } : {}) });
      if (r.match) resolved.entries.push({ workerId: r.match._id, workerName: r.match.name, status: entry.status || 'PRESENT' });
      else { unresolved.push(`worker:${entry.workerName}`); ambiguities[`worker:${entry.workerName}`] = candidateView(r.candidates, ['name','mobile','categoryCode']); }
    }
    if (!sourceEntries.length) unresolved.push('workerNames');
  }

  if (task === 'DISPATCH') {
    if (data.vehicleNumber) {
      const compact = String(data.vehicleNumber).replace(/[^A-Za-z0-9]/g,'').toUpperCase();
      const vehicles = await Vehicle.find({ isActive: true }).limit(200);
      const matches = vehicles.filter((vehicle) => String(vehicle.vehicleNumber || '').replace(/[^A-Za-z0-9]/g,'').toUpperCase() === compact);
      if (matches.length === 1) {
        resolved.vehicleId = matches[0]._id;
        resolved.vehicleNumber = matches[0].vehicleNumber;
      } else if (matches.length > 1) {
        unresolved.push('vehicleNumber');
        ambiguities.vehicleNumber = candidateView(matches, ['vehicleNumber','ownerName','driverName']);
      }
    }
    if (data.brickCategoryCode) {
      const category = await StockCategory.findOne({ code: data.brickCategoryCode, isActive: true });
      if (category) resolved.items = [{ stockCategoryId: category._id, categoryCode: category.code, quantity: Number(data.quantity || 0), ratePerThousand: Number(data.ratePerThousand || 0) }];
      else unresolved.push('brickCategoryCode');
    }
  }

  if (req.body.context?.kilnId) resolved.kilnId = req.body.context.kilnId;
  if (req.body.context?.seasonId) resolved.seasonId = req.body.context.seasonId;
  if (req.body.context?.managerId) resolved.managerId = req.body.context.managerId;
  return { data: resolved, unresolved, ambiguities };
}

module.exports = { resolveVoiceEntities };
