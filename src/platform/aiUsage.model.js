const mongoose = require('mongoose');
const { getMasterConnection } = require('../config/db');

const aiUsageSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  tenantCode: { type: String, required: true, index: true },
  feature: { type: String, default: 'VOICE_ENTRY', index: true },
  task: { type: String, index: true },
  provider: { type: String, enum: ['DETERMINISTIC', 'GROQ', 'GEMINI'], required: true },
  model: String,
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  latencyMs: { type: Number, default: 0 },
  success: { type: Boolean, default: true },
  fallbackUsed: { type: Boolean, default: false },
  errorCode: String,
  estimatedCostUsd: { type: Number, default: 0 },
  // Deliberately excludes transcript/prompt content from billing analytics.
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

aiUsageSchema.index({ tenantId: 1, createdAt: -1 });

function getAiUsageModel() {
  const connection = getMasterConnection();
  return connection.models.AiUsage || connection.model('AiUsage', aiUsageSchema);
}

module.exports = { getAiUsageModel };
