require('dotenv').config();
const connectDB = require('../src/config/db');
const { closeDB } = require('../src/config/db');
const { getTenantModel } = require('../src/platform/tenant.model');

async function main() {
  await connectDB();
  const Tenant = getTenantModel();
  const code = String(process.env.TENANT_CODE || '').trim().toUpperCase();
  const name = String(process.env.TENANT_NAME || '').trim();
  const slug = String(process.env.TENANT_SLUG || code.toLowerCase()).trim().toLowerCase();
  const databaseName = process.env.TENANT_DB_NAME || `bhatta_${code}`;
  const uriEnv = process.env.TENANT_MONGO_URI_ENV || `MONGO_URI_${code}`;
  if (!code || !name) throw new Error('TENANT_CODE and TENANT_NAME are required');

  const payload = {
    code,
    name,
    slug,
    status: 'ACTIVE',
    database: { mode: process.env.TENANT_DB_MODE || 'DEDICATED_URI', uriEnv, databaseName },
    ai: {
      enabled: process.env.TENANT_AI_ENABLED !== 'false',
      provider: process.env.TENANT_AI_PROVIDER || 'auto',
      primary: process.env.TENANT_AI_PRIMARY || 'groq',
      fallback: process.env.TENANT_AI_FALLBACK || 'gemini',
      groqApiKeyEnv: process.env.TENANT_GROQ_KEY_ENV || `GROQ_API_KEY_${code}`,
      geminiApiKeyEnv: process.env.TENANT_GEMINI_KEY_ENV || `GEMINI_API_KEY_${code}`,
      groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    },
    voice: { enabled: true, defaultLanguage: process.env.TENANT_DEFAULT_LANGUAGE || 'hi-IN', supportedLanguages: ['hi-IN','en-IN'], deterministicFirst: true },
    limits: { monthlyVoiceActions: Number(process.env.TENANT_MONTHLY_VOICE_ACTIONS || 5000), monthlyAiCalls: Number(process.env.TENANT_MONTHLY_AI_CALLS || 2000) },
    features: { voiceEntry: true }
  };

  const tenant = await Tenant.findOneAndUpdate({ code }, { $set: payload }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
  console.log('Tenant registered:', { id: tenant._id, code: tenant.code, name: tenant.name, databaseName, uriEnv });
  await closeDB();
}

main().catch(async (error) => { console.error(error); await closeDB().catch(() => {}); process.exit(1); });
