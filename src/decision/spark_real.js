/**
 * Real Meta Model API adapter for Muse Spark 1.3
 * Follows Meta cookbook recipes:
 * - Books/meta-model-cookbook/01_api_fundamentals/04_structured_output.ipynb
 * - Books/meta-model-cookbook/01_api_fundamentals/07_vision_input.ipynb
 *
 * Uses strict JSON Schema structured output with multimodal vision input.
 * Strictly uses Standard-tier model ID 'muse-spark-1.3' (never Contributor IDs).
 */

import OpenAI from 'openai';
import { BASE_URL, MODEL_API_KEY, SPARK_MODEL } from '../config.js';
import { meter } from '../meter.js';

function getClient() {
  if (!MODEL_API_KEY) {
    throw new Error('MODEL_API_KEY is not configured.');
  }
  return new OpenAI({
    baseURL: BASE_URL,
    apiKey: MODEL_API_KEY,
  });
}

export const DECISION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    decision: {
      type: 'string',
      enum: ['refund', 'replace_packaging', 'replace_item', 'handoff'],
      description: 'The policy-grounded support decision',
    },
    clause: {
      type: 'string',
      description: 'The specific policy clause ID and title cited (e.g. Clause 4.1)',
    },
    reasons: {
      type: 'array',
      items: { type: 'string' },
      description: 'Step-by-step reasoning points applying policy rules to SAM 3.1 measurements',
    },
    confidence: {
      type: 'number',
      description: 'Confidence score between 0.0 and 1.0 reflecting clarity of visual evidence and policy fit',
    },
    missing_info: {
      type: 'array',
      items: { type: 'string' },
      description: 'Any missing required customer information',
    },
    reply: {
      type: 'string',
      description: 'Empathetic, clear customer-facing response in the customer language detailing outcome and next steps',
    },
  },
  required: ['decision', 'clause', 'reasons', 'confidence', 'missing_info', 'reply'],
  additionalProperties: false,
};

export async function decideWithSparkReal({
  policy,
  measurements,
  message,
  orderValue,
  mediaBase64 = null,
  mimeType = 'image/jpeg',
}) {
  meter.checkBudget();
  const client = getClient();
  const startTime = Date.now();

  const systemPrompt = `You are SnapDesk, an autonomous customer support agent that can see.
Your job is to apply business policy rules deterministically to visual measurements from SAM 3.1 and the customer complaint.

BUSINESS POLICY:
Name: ${policy.name}
Text:
${policy.text}

NUMERIC RULES:
- refund_if_contents_damaged: ${policy.rules.refund_if_contents_damaged}
- packaging_replace_max_ratio: ${policy.rules.packaging_replace_max_ratio}
- handoff_order_value: ${policy.rules.handoff_order_value}
- min_confidence: ${policy.rules.min_confidence}

CLAUSES AVAILABLE:
${JSON.stringify(policy.clauses || {}, null, 2)}

INSTRUCTIONS:
1. Examine the SAM 3.1 visual measurements and the customer's explanation.
2. Determine which clause governs this claim.
3. If the policy is ambiguous or doesn't cover this case, choose "handoff".
4. Write a concise, polite, empathetic reply to the customer in their language.
5. You must return valid structured JSON adhering strictly to the schema.`;

  const userContent = [
    {
      type: 'text',
      text: `CASE INPUTS:
- Customer Message: "${message || '(No text provided)'}"
- Order Value: $${orderValue || 0}
- SAM 3.1 Measurements:
  * Product Found: ${measurements.product_found}
  * Contents Damaged: ${measurements.contents_damaged}
  * Packaging Damage Ratio: ${(measurements.packaging_damage_ratio * 100).toFixed(2)}%
  * Detected Regions: ${JSON.stringify(
    (measurements.regions || []).map((r) => ({
      label: r.label,
      type: r.type,
      area_ratio: r.area_ratio,
      bbox: r.bbox,
    }))
  )}

Evaluate the claim and output the structured JSON decision.`,
    },
  ];

  // Attach multimodal image to user message if available (Cookbook 01_api_fundamentals/07)
  if (mediaBase64) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${mediaBase64}`,
      },
    });
  }

  const response = await client.chat.completions.create({
    model: SPARK_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'snapdesk_decision',
        strict: true,
        schema: DECISION_JSON_SCHEMA,
      },
    },
    temperature: 0.1,
  });

  const durationMs = Date.now() - startTime;
  const choice = response.choices?.[0];
  const rawText = choice?.message?.content || '{}';
  const decisionResult = JSON.parse(rawText);

  meter.recordCall({
    model: SPARK_MODEL,
    type: 'decision_reasoning',
    inputTokens: response.usage?.prompt_tokens || 800,
    outputTokens: response.usage?.completion_tokens || 200,
    durationMs,
    mock: false,
  });

  return {
    ...decisionResult,
    mock: false,
  };
}

