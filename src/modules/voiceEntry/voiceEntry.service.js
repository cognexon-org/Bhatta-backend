const { parseDeterministic } = require('./parsers/domain.parser');
const { extractWithAi, meter } = require('./ai/providerRouter.service');
const { resolveVoiceEntities } = require('./resolvers/entityResolver.service');
const { getAiUsageModel } = require('../../platform/aiUsage.model');

const SUPPORTED_TASKS = ['PROCESS_ENTRY','EXPENSE_ENTRY','CUSTOMER_PAYMENT','WORKER_ADVANCE','ATTENDANCE','DISPATCH'];

function hasValue(value) {
  return value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0);
}

function mergeEvidenceFirst(deterministic, aiData) {
  const merged = { ...(aiData || {}) };
  // Deterministic evidence wins whenever it actually extracted a value.
  for (const [key, value] of Object.entries(deterministic || {})) {
    if (hasValue(value)) merged[key] = value;
  }
  return merged;
}

function validateBusiness(task, data) {
  const errors = [];
  const warnings = [];
  const positive = (name) => {
    if (hasValue(data[name]) && Number(data[name]) <= 0) errors.push(`${name} must be greater than zero`);
  };
  if (task === 'PROCESS_ENTRY') positive('quantityOut');
  if (task === 'EXPENSE_ENTRY' || task === 'CUSTOMER_PAYMENT' || task === 'WORKER_ADVANCE') positive('amount');
  if (task === 'DISPATCH') positive('quantity');
  if (data.rate !== undefined && data.rate !== null && Number(data.rate) < 0) errors.push('rate cannot be negative');
  if (data.ratePerThousand !== undefined && data.ratePerThousand !== null && Number(data.ratePerThousand) < 0) errors.push('ratePerThousand cannot be negative');
  if (task === 'PROCESS_ENTRY' && ['BHARAI','PHUKAI','NIKASI'].includes(data.processCode) && !data.chamberId) warnings.push('Selected process normally requires a chamber; choose it before saving.');
  return { errors, warnings };
}

function requiredFields(task) {
  return {
    PROCESS_ENTRY: ['processCode','quantityOut'],
    EXPENSE_ENTRY: ['amount','categoryId'],
    CUSTOMER_PAYMENT: ['amount','customerId'],
    WORKER_ADVANCE: ['amount','workerId'],
    ATTENDANCE: ['entries'],
    DISPATCH: ['quantity','customerId','items']
  }[task] || [];
}

function computeConfidence(task, data, unresolved, validation) {
  const required = requiredFields(task);
  const satisfied = required.filter((field) => hasValue(data[field])).length;
  let score = required.length ? satisfied / required.length : 0.5;
  if (unresolved.length) score -= Math.min(0.35, unresolved.length * 0.07);
  if (validation.errors.length) score -= 0.3;
  return Math.max(0.05, Math.min(0.99, Number(score.toFixed(2))));
}

function clearResolvedFlags(unresolvedFields, data) {
  const unresolved = new Set(unresolvedFields || []);
  for (const field of [...unresolved]) {
    const cleanField = field.includes(':') ? null : field;
    if (cleanField && hasValue(data[cleanField])) unresolved.delete(field);
    if (field === 'workerNames' && (data.workerContributions?.length || data.entries?.length || data.workerNames?.length)) unresolved.delete(field);
    if (field === 'categorySpoken' && data.categoryId) unresolved.delete(field);
    if (field === 'customerName' && data.customerId) unresolved.delete(field);
    if (field === 'workerName' && data.workerId) unresolved.delete(field);
    if (field === 'brickCategoryCode' && data.items?.length) unresolved.delete(field);
    if (field === 'statusMapping' && data.entries?.length) unresolved.delete(field);
  }
  return [...unresolved];
}

async function currentMonthUsage(tenant) {
  const AiUsage = getAiUsageModel();
  const start = new Date();
  start.setUTCDate(1); start.setUTCHours(0,0,0,0);
  const [voiceActions, aiCalls] = await Promise.all([
    AiUsage.countDocuments({ tenantId: tenant._id, createdAt: { $gte: start }, success: true }),
    AiUsage.countDocuments({ tenantId: tenant._id, createdAt: { $gte: start }, provider: { $in: ['GROQ','GEMINI'] }, success: true })
  ]);
  return { voiceActions, aiCalls };
}

async function parseVoiceEntry(req) {
  const tenant = req.tenant;
  if (tenant.features?.voiceEntry === false || tenant.voice?.enabled === false) {
    const error = new Error('Voice entry is disabled for this tenant');
    error.statusCode = 403;
    throw error;
  }

  const task = String(req.body.task || '').trim().toUpperCase();
  const transcript = String(req.body.transcript || '').trim();
  const language = req.body.language || tenant.voice?.defaultLanguage || 'hi-IN';
  if (!SUPPORTED_TASKS.includes(task)) {
    const error = new Error(`Unsupported voice task. Use: ${SUPPORTED_TASKS.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
  if (!transcript || transcript.length < 2) {
    const error = new Error('transcript is required');
    error.statusCode = 400;
    throw error;
  }

  const usage = await currentMonthUsage(tenant);
  const voiceLimit = Number(tenant.limits?.monthlyVoiceActions || 0);
  if (voiceLimit > 0 && usage.voiceActions >= voiceLimit) {
    const error = new Error('Monthly voice-entry allowance reached for this tenant');
    error.statusCode = 429;
    throw error;
  }

  const deterministic = parseDeterministic(task, transcript, language);
  // Resolve exact tenant master-data mentions before deciding to spend an LLM call.
  // This makes common Hindi entries (known worker/customer/category names) deterministic-first.
  const firstResolution = await resolveVoiceEntities(task, deterministic.data, req);
  const firstUnresolved = clearResolvedFlags(
    [...(deterministic.unresolvedFields || []), ...(firstResolution.unresolved || [])],
    firstResolution.data
  );
  const firstValidation = validateBusiness(task, firstResolution.data);
  const firstConfidence = computeConfidence(task, firstResolution.data, firstUnresolved, firstValidation);

  let aiResult = null;
  let aiWarning = null;
  const aiLimit = Number(tenant.limits?.monthlyAiCalls || 0);
  const aiQuotaAvailable = aiLimit <= 0 || usage.aiCalls < aiLimit;
  const shouldEscalate = tenant.ai?.enabled !== false && tenant.ai?.provider !== 'deterministic' && aiQuotaAvailable && (firstUnresolved.length > 0 || firstConfidence < 0.85 || transcript.length > 120);
  if (!aiQuotaAvailable) aiWarning = 'Monthly AI allowance reached. Deterministic parsing remains available; complete unresolved fields manually.';

  if (shouldEscalate) {
    try {
      aiResult = await extractWithAi({ tenant, task, transcript, language });
    } catch (error) {
      aiWarning = 'AI extraction was unavailable. Deterministic values were kept; complete unresolved fields manually.';
      await meter(tenant, task, { provider: 'DETERMINISTIC', latencyMs: 0 }).catch(() => {});
      console.warn(`[voice-entry][${tenant.code}] AI fallback to manual: ${error.message}`);
    }
  } else {
    await meter(tenant, task, { provider: 'DETERMINISTIC', latencyMs: 0 }).catch(() => {});
  }

  const merged = mergeEvidenceFirst(firstResolution.data, aiResult?.data);
  const resolved = await resolveVoiceEntities(task, merged, req);
  const initialUnresolved = clearResolvedFlags(
    [...(deterministic.unresolvedFields || []), ...(resolved.unresolved || [])],
    resolved.data
  );

  const validation = validateBusiness(task, resolved.data);
  const confidence = computeConfidence(task, resolved.data, initialUnresolved, validation);

  return {
    task,
    language,
    transcript,
    source: aiResult ? `DETERMINISTIC_${aiResult.provider}` : 'DETERMINISTIC',
    data: resolved.data,
    confidence,
    unresolvedFields: initialUnresolved,
    ambiguities: resolved.ambiguities,
    validation,
    requiresConfirmation: true,
    ai: {
      used: Boolean(aiResult),
      provider: aiResult?.provider || null,
      model: aiResult?.model || null,
      fallbackUsed: Boolean(aiResult?.fallbackUsed),
      latencyMs: aiResult?.latencyMs || 0
    },
    usage: { voiceActionsThisMonth: usage.voiceActions + 1, aiCallsThisMonth: usage.aiCalls + (aiResult ? 1 : 0), monthlyVoiceLimit: Number(tenant.limits?.monthlyVoiceActions || 0), monthlyAiLimit: Number(tenant.limits?.monthlyAiCalls || 0) },
    warnings: [aiWarning, ...(validation.warnings || [])].filter(Boolean)
  };
}

module.exports = { parseVoiceEntry, SUPPORTED_TASKS };
