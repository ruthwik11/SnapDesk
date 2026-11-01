/**
 * Muse Spark Summary and Incident Timeline Generator
 * Follows Meta cookbook 01_api_fundamentals/01_chat_completions.
 */

import OpenAI from 'openai';
import { BASE_URL, MODEL_API_KEY, SNAPDESK_MODE, SPARK_MODEL } from '../config.js';
import { meter } from '../meter.js';

export async function generateHandoffSummary({
  caseId,
  policyName,
  flags = [],
  measurements,
  orderValue,
  message,
}) {
  const flagText = flags.join(', ');
  const defaultSummary = `Case ${caseId} (${policyName}) escalated due to deterministic guardrails: [${flagText}]. Order value: $${orderValue}. Measured damage ratio: ${(measurements.packaging_damage_ratio * 100).toFixed(1)}%. Customer message: "${message || 'None'}". Specialist action required to confirm replacement authorization or request higher-resolution photos.`;

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
              'You are a senior claims triage supervisor. Summarize this escalated claim for human support agents in 2 crisp, actionable sentences. State the root cause of escalation, visual findings, and recommended human action.',
          },
          {
            role: 'user',
            content: `Claim ID: ${caseId}\nPolicy: ${policyName}\nEscalation Flags: ${flagText}\nOrder Value: $${orderValue}\nDamage Ratio: ${(measurements.packaging_damage_ratio * 100).toFixed(1)}%\nContents Damaged: ${measurements.contents_damaged}\nCustomer Explanation: "${message}"`,
          },
        ],
        max_tokens: 150,
        temperature: 0.2,
      });

      meter.recordCall({
        model: SPARK_MODEL,
        type: 'handoff_summary',
        inputTokens: response.usage?.prompt_tokens || 300,
        outputTokens: response.usage?.completion_tokens || 80,
        durationMs: Date.now() - startTime,
        mock: false,
      });

      return response.choices[0]?.message?.content?.trim() || defaultSummary;
    } catch (err) {
      console.warn('[Spark Summary] Failed real call, using local summary:', err.message);
    }
  }

  return defaultSummary;
}

export function generateTimelineNarrative(agentTrace) {
  return agentTrace.map((step, idx) => {
    const time = step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : `T+${idx * 40}ms`;
    return `[${time}] ${step.step.toUpperCase()}: ${step.detail}`;
  }).join('\n');
}
