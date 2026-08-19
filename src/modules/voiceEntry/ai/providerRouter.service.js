const { getTaskSchema } = require('../schemas/taskSchemas');
const { extractWithGroq } = require('./providers/groq.provider');
const { extractWithGemini } = require('./providers/gemini.provider');
const { getAiUsageModel } = require('../../../platform/aiUsage.model');

function envSecret(name) {
  return name ? process.env[name] : null;
}

function estimatedGroqCost(inputTokens, outputTokens) {
  return (Number(inputTokens || 0) / 1e6) * 0.075 + (Number(outputTokens || 0) / 1e6) * 0.30;
}
function estimatedGeminiCost(inputTokens, outputTokens) {
  // Planning estimate for paid Gemini 2.5 Flash text tier. Keep metering separate from provider invoices.
  return (Number(inputTokens || 0) / 1e6) * 0.30 + (Number(outputTokens || 0) / 1e6) * 2.50;
}

async function meter(tenant, task, result, { fallbackUsed = false, success = true, errorCode = null } = {}) {
  try {
    const AiUsage = getAiUsageModel();
    const provider = result?.provider || 'DETERMINISTIC';
    const inputTokens = result?.inputTokens || 0;
    const outputTokens = result?.outputTokens || 0;
    const estimatedCostUsd = provider === 'GROQ'
      ? estimatedGroqCost(inputTokens, outputTokens)
      : provider === 'GEMINI' ? estimatedGeminiCost(inputTokens, outputTokens) : 0;
    await AiUsage.create({
      tenantId: tenant._id,
      tenantCode: tenant.code,
      task,
      provider,
      model: result?.model,
      inputTokens,
      outputTokens,
      latencyMs: result?.latencyMs || 0,
      success,
      fallbackUsed,
      errorCode,
      estimatedCostUsd
    });
  } catch (error) {
    console.error('AI usage metering failed:', error.message);
  }
}

async function callProvider(provider, tenant, args) {
  const ai = tenant.ai || {};
  const schema = getTaskSchema(args.task);
  if (provider === 'groq') {
    return extractWithGroq({
      ...args,
      schema,
      apiKey: envSecret(ai.groqApiKeyEnv) || process.env.GROQ_API_KEY,
      model: ai.groqModel || process.env.GROQ_MODEL || 'openai/gpt-oss-20b'
    });
  }
  if (provider === 'gemini') {
    return extractWithGemini({
      ...args,
      schema,
      apiKey: envSecret(ai.geminiApiKeyEnv) || process.env.GEMINI_API_KEY,
      model: ai.geminiModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    });
  }
  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function extractWithAi({ tenant, task, transcript, language }) {
  const ai = tenant.ai || {};
  if (ai.enabled === false || ai.provider === 'deterministic') return null;

  const primary = ai.provider === 'groq' || ai.provider === 'gemini' ? ai.provider : (ai.primary || 'groq');
  const fallback = ai.provider === 'auto' ? (ai.fallback || 'gemini') : 'none';
  try {
    const result = await callProvider(primary, tenant, { task, transcript, language });
    await meter(tenant, task, result);
    return { ...result, fallbackUsed: false };
  } catch (primaryError) {
    if (!fallback || fallback === 'none' || fallback === primary) {
      await meter(tenant, task, { provider: primary.toUpperCase() }, { success: false, errorCode: primaryError.code || 'PROVIDER_ERROR' });
      throw primaryError;
    }
    console.warn(`[voice-ai][${tenant.code}] ${primary} failed; trying ${fallback}: ${primaryError.message}`);
    try {
      const result = await callProvider(fallback, tenant, { task, transcript, language });
      await meter(tenant, task, result, { fallbackUsed: true });
      return { ...result, fallbackUsed: true, primaryError: primaryError.message };
    } catch (fallbackError) {
      await meter(tenant, task, { provider: fallback.toUpperCase() }, { fallbackUsed: true, success: false, errorCode: fallbackError.code || 'PROVIDER_ERROR' });
      const error = new Error(`Voice AI providers unavailable: ${primaryError.message}; ${fallbackError.message}`);
      error.code = 'VOICE_AI_UNAVAILABLE';
      throw error;
    }
  }
}

module.exports = { extractWithAi, meter };
