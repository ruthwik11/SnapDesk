/**
 * Muse Spark Policy Compiler
 * Converts freeform business policy prose into executable rules, SAM 3.1 prompts, and clauses.
 * Follows Meta cookbook 01_api_fundamentals/04_structured_output.
 */

import OpenAI from 'openai';
import { BASE_URL, MODEL_API_KEY, SNAPDESK_MODE, SPARK_MODEL } from '../config.js';
import { meter } from '../meter.js';

export const POLICY_COMPILER_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'URL-friendly kebab-case id' },
    name: { type: 'string', description: 'Human-readable policy title' },
    category: { type: 'string', description: 'Business domain or industry' },
    text: { type: 'string', description: 'Full normalized text of the policy' },
    rules: {
      type: 'object',
      properties: {
        refund_if_contents_damaged: { type: 'boolean' },
        packaging_replace_max_ratio: { type: 'number', minimum: 0.0, maximum: 1.0 },
        handoff_order_value: { type: 'number', minimum: 1 },
        min_confidence: { type: 'number', minimum: 0.0, maximum: 1.0 },
      },
      required: [
        'refund_if_contents_damaged',
        'packaging_replace_max_ratio',
        'handoff_order_value',
        'min_confidence',
      ],
      additionalProperties: false,
    },
    prompts: {
      type: 'object',
      properties: {
        product: { type: 'string', description: 'Primary object noun phrase for SAM 3.1' },
        damage: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of specific damage phrases for SAM 3.1',
        },
        contents: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of severe or inner content damage phrases for SAM 3.1',
        },
      },
      required: ['product', 'damage', 'contents'],
      additionalProperties: false,
    },
    clauses: {
      type: 'object',
      properties: {
        refund: { type: 'string' },
        replace_packaging: { type: 'string' },
        replace_item: { type: 'string' },
        handoff_high_value: { type: 'string' },
        handoff_uncertain: { type: 'string' },
      },
      required: [
        'refund',
        'replace_packaging',
        'replace_item',
        'handoff_high_value',
        'handoff_uncertain',
      ],
      additionalProperties: false,
    },
  },
  required: ['id', 'name', 'category', 'text', 'rules', 'prompts', 'clauses'],
  additionalProperties: false,
};

export async function compilePolicyFromText(rawPolicyText, policyName = 'Custom Policy') {
  if (SNAPDESK_MODE === 'real' && MODEL_API_KEY) {
    try {
      meter.checkBudget();
      const client = new OpenAI({ baseURL: BASE_URL, apiKey: MODEL_API_KEY });
      const startTime = Date.now();

      const response = await client.chat.completions.create({
        model: SPARK_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are the SnapDesk Policy Compiler. You extract executable thresholds, SAM 3.1 computer-vision prompts, and legal clauses from raw business policy text.',
          },
          {
            role: 'user',
            content: `Analyze this business policy and compile it into executable JSON rules:\n\nPolicy Name: ${policyName}\n\n${rawPolicyText}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'compiled_policy',
            strict: true,
            schema: POLICY_COMPILER_SCHEMA,
          },
        },
      });

      meter.recordCall({
        model: SPARK_MODEL,
        type: 'policy_compilation',
        inputTokens: response.usage?.prompt_tokens || 700,
        outputTokens: response.usage?.completion_tokens || 400,
        durationMs: Date.now() - startTime,
        mock: false,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (err) {
      console.warn('[Policy Compiler] Real call failed, falling back to mock compiler:', err.message);
    }
  }

  // Deterministic mock compiler
  const cleanId = policyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const lower = rawPolicyText.toLowerCase();

  // Heuristic extraction of ratio and order value
  let maxRatio = 0.25;
  const ratioMatch = lower.match(/(\d+)%/);
  if (ratioMatch) {
    maxRatio = parseFloat((parseInt(ratioMatch[1], 10) / 100).toFixed(2));
  }

  let handoffValue = 250;
  const valMatch = lower.match(/\$(\d+)/);
  if (valMatch) {
    handoffValue = parseInt(valMatch[1], 10);
  }

  return {
    id: cleanId || `policy-${Date.now()}`,
    name: policyName,
    category: 'Custom Operations',
    text: rawPolicyText,
    rules: {
      refund_if_contents_damaged: true,
      packaging_replace_max_ratio: maxRatio,
      handoff_order_value: handoffValue,
      min_confidence: 0.75,
    },
    prompts: {
      product: 'item',
      damage: ['surface damage', 'crack', 'tear', 'dent'],
      contents: ['broken component', 'interior damage'],
    },
    clauses: {
      refund: 'Clause 1.1: Verified internal or critical damage qualifies for immediate refund.',
      replace_packaging: `Clause 1.2: Superficial external damage below ${(maxRatio * 100).toFixed(0)}% qualifies for partial compensation or packaging repair.`,
      replace_item: `Clause 1.3: Heavy external damage exceeding ${(maxRatio * 100).toFixed(0)}% qualifies for item replacement.`,
      handoff_high_value: `Clause 2.1: Claims exceeding $${handoffValue} require human specialist review.`,
      handoff_uncertain: 'Clause 2.2: Ambiguous damage evidence or low visual confidence mandates specialist escalation.',
    },
  };
}

