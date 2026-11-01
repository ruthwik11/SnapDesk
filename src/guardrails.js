/**
 * Deterministic Financial & Safety Guardrails
 *
 * DESIGN PRINCIPLE: THE MODEL NEVER HAS THE FINAL SAY ON MONEY.
 * Plain-code deterministic rules strictly override any AI model output.
 * Any triggered guardrail forces a human handoff.
 */

export function evaluateGuardrails({
  modelDecision,
  measurements,
  rules = {},
  orderValue = 0,
  isDuplicate = false,
}) {
  const flags = [];

  const handoffThreshold = Number(rules.handoff_order_value ?? 200);
  const minConfidence = Number(rules.min_confidence ?? 0.70);

  // 1. Duplicate Visual Media Detection (Fraud & Replay Prevention)
  if (isDuplicate) {
    flags.push('duplicate_photo');
  }

  // 2. Visual Ambiguity / No Product Found
  if (!measurements.product_found) {
    flags.push('product_not_found');
  }

  // 3. High-Value Financial Cap (Safeguards company revenue)
  if (Number(orderValue) > handoffThreshold) {
    flags.push('high_value_order');
  }

  // 4. Low AI Confidence Threshold
  if (modelDecision.confidence < minConfidence) {
    flags.push('low_confidence');
  }

  // 5. Missing Required Claim Information
  if (Array.isArray(modelDecision.missing_info) && modelDecision.missing_info.length > 0) {
    flags.push('missing_info');
  }

  // 6. Explicit Model Requested Escalation
  if (modelDecision.decision === 'handoff') {
    flags.push('model_requested_handoff');
  }

  const triggered = flags.length > 0;
  const finalDecision = triggered ? 'handoff' : modelDecision.decision;

  return {
    final: finalDecision,
    model_decision: modelDecision.decision,
    flags,
    triggered,
    thresholdsChecked: {
      orderValue: Number(orderValue),
      handoffThreshold,
      confidence: modelDecision.confidence,
      minConfidence,
      productFound: measurements.product_found,
      isDuplicate,
    },
  };
}
