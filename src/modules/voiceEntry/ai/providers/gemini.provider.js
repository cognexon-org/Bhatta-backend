const axios = require('axios');

async function extractWithGemini({ apiKey, model, task, transcript, language, schema }) {
  if (!apiKey) throw new Error('Gemini API key is not configured for this tenant');
  const started = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await axios.post(url, {
    systemInstruction: {
      parts: [{ text: `You extract structured brick-kiln ERP form data. Speaker may use Hindi, Hinglish or English. Task=${task}. Never invent MongoDB IDs. Use null/empty arrays when evidence is absent. Normalize obvious domain terms and numbers.` }]
    },
    contents: [{ role: 'user', parts: [{ text: `Language hint: ${language}\nTranscript: ${transcript}` }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseJsonSchema: schema
    }
  }, {
    params: { key: apiKey },
    headers: { 'Content-Type': 'application/json' },
    timeout: Number(process.env.VOICE_AI_TIMEOUT_MS || 15000)
  });
  const content = response.data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '{}';
  return {
    data: JSON.parse(content),
    provider: 'GEMINI',
    model,
    latencyMs: Date.now() - started,
    inputTokens: response.data?.usageMetadata?.promptTokenCount || 0,
    outputTokens: response.data?.usageMetadata?.candidatesTokenCount || 0
  };
}
module.exports = { extractWithGemini };
