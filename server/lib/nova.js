import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// On-demand Nova invocation requires the regional inference-profile prefix
// (e.g. "us.amazon.nova-lite-v1:0"), not the bare "amazon.nova-lite-v1:0".
export const NOVA_MODELS = {
  lite: 'us.amazon.nova-lite-v1:0',
  pro: 'us.amazon.nova-pro-v1:0',
};

// Default model is env-overridable; falls back to Nova Lite for cost.
export const DEFAULT_MEAL_MODEL = process.env.BEDROCK_MEAL_MODEL_ID || NOVA_MODELS.lite;

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined, // fall back to the default AWS credential chain
});

/**
 * Invoke an Amazon Nova model via the native Bedrock runtime.
 * Nova uses the "messages-v1" schema, NOT the Anthropic Messages format,
 * and the reply lives at output.message.content[0].text.
 *
 * @param {object}   opts
 * @param {string}   opts.system       - system instructions
 * @param {string}   opts.user         - user message
 * @param {Array}   [opts.images]      - [{ format: 'jpeg', data: <base64 string> }]
 * @param {string}  [opts.model]       - model id / inference profile
 * @param {number}  [opts.maxTokens]
 * @param {number}  [opts.temperature]
 * @returns {Promise<string>} the model's text output
 */
export async function invokeNova({
  system,
  user,
  images = [],
  model = DEFAULT_MEAL_MODEL,
  maxTokens = 2048,
  temperature = 0.4,
}) {
  // Nova InvokeModel takes image bytes as a base64 STRING in the JSON body.
  const content = [
    ...images.map(img => ({
      image: { format: img.format || 'jpeg', source: { bytes: img.data } },
    })),
    { text: user },
  ];

  const body = {
    schemaVersion: 'messages-v1',
    ...(system ? { system: [{ text: system }] } : {}),
    messages: [{ role: 'user', content }],
    inferenceConfig: { maxTokens, temperature, topP: 0.9 },
  };

  const command = new InvokeModelCommand({
    modelId: model,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(body),
  });

  const response = await client.send(command);
  const decoded = JSON.parse(new TextDecoder().decode(response.body));
  return decoded?.output?.message?.content?.[0]?.text ?? '';
}

/**
 * Safely extract a JSON object from a model response, tolerating markdown
 * fences or stray prose around the JSON. Returns null on failure.
 */
export function extractJson(raw) {
  if (!raw) return null;
  let text = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  // If the model wrapped JSON in prose, grab the outermost {...} block.
  if (text[0] !== '{') {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
