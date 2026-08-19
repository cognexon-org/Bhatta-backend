const mongoose = require('mongoose');
const { getMasterConnection } = require('../config/db');

const tenantSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'DISABLED'], default: 'ACTIVE' },
  database: {
    mode: { type: String, enum: ['DEDICATED_URI', 'SHARED_ROOT'], default: 'DEDICATED_URI' },
    uriEnv: { type: String, trim: true },
    databaseName: { type: String, required: true, trim: true }
  },
  ai: {
    enabled: { type: Boolean, default: true },
    provider: { type: String, enum: ['deterministic', 'groq', 'gemini', 'auto'], default: 'auto' },
    primary: { type: String, enum: ['groq', 'gemini'], default: 'groq' },
    fallback: { type: String, enum: ['groq', 'gemini', 'none'], default: 'gemini' },
    groqApiKeyEnv: { type: String, trim: true },
    geminiApiKeyEnv: { type: String, trim: true },
    groqModel: { type: String, default: 'openai/gpt-oss-20b' },
    geminiModel: { type: String, default: 'gemini-2.5-flash' }
  },
  voice: {
    enabled: { type: Boolean, default: true },
    defaultLanguage: { type: String, enum: ['hi-IN', 'en-IN'], default: 'hi-IN' },
    supportedLanguages: { type: [String], default: ['hi-IN', 'en-IN'] },
    deterministicFirst: { type: Boolean, default: true }
  },
  limits: {
    monthlyVoiceActions: { type: Number, default: 5000 },
    monthlyAiCalls: { type: Number, default: 2000 }
  },
  features: {
    voiceEntry: { type: Boolean, default: true }
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

tenantSchema.index({ code: 1, status: 1 });

function getTenantModel() {
  const connection = getMasterConnection();
  return connection.models.Tenant || connection.model('Tenant', tenantSchema);
}

module.exports = { getTenantModel, tenantSchema };
