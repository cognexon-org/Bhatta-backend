const axios = require('axios');

async function extractWithGroq({ apiKey, model, task, transcript, language, schema }) {
  if (!apiKey) throw new Error('Groq API key is not configured for this tenant');
  const started = Date.now();
  const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model,
    messages: [
      {
        role: 'system',
        content: `You extract structured brick-kiln ERP form data from short spoken transcripts. The speaker may use Hindi, Hinglish or English. Task=${task}. Never invent database IDs. Use null/empty arrays when the transcript does not contain evidence. Normalize only obvious domain terms and numbers. Return only schema-compliant JSON.`
      },
      { role: 'user', content: `Language hint: ${language}\nTranscript: ${transcript}` }
    ],
    temperature: 0.1,
    reasoning_effort: 'low',
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: `bhatta_${task.toLowerCase()}`,
        strict: true,
        schema
      }
    }
  }, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    timeout: Number(process.env.VOICE_AI_TIMEOUT_MS || 15000)
  });
  const content = response.data?.choices?.[0]?.message?.content || '{}';
  return {
    data: JSON.parse(content),
    provider: 'GROQ',
    model,
    latencyMs: Date.now() - started,
    inputTokens: response.data?.usage?.prompt_tokens || 0,
    outputTokens: response.data?.usage?.completion_tokens || 0
  };
}
module.exports = { extractWithGroq };
