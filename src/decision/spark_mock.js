/**
 * Realistic Mock Decision Engine for Muse Spark 1.3
 * Evaluates policy rules deterministically against SAM 3.1 measurements.
 * Produces structured JSON complying with the exact schema.
 */

import { meter } from '../meter.js';

export async function decideWithSparkMock({
  policy,
  measurements,
  message = '',
  orderValue = 0,
}) {
  const startTime = Date.now();
  const rules = policy.rules || {
    refund_if_contents_damaged: true,
    packaging_replace_max_ratio: 0.30,
    handoff_order_value: 200,
    min_confidence: 0.70,
  };

  const clauses = policy.clauses || {
    refund: 'Clause 4.1: Direct item/contents damage confirmed by visual inspection qualifies for full refund.',
    replace_packaging: 'Clause 4.2: Superficial packaging damage with intact contents qualifies for packaging replacement.',
    replace_item: 'Clause 4.3: Severe packaging damage exceeding threshold qualifies for item replacement.',
    handoff_high_value: 'Clause 8.2: High-value orders exceeding threshold require human specialist review.',
    handoff_uncertain: 'Clause 9.1: Ambiguous evidence or low visual confidence requires human handoff.',
  };

  let decision = 'replace_packaging';
  let clause = clauses.replace_packaging;
  const reasons = [];
  let confidence = 0.94;
  const missingInfo = [];
  let reply = '';

  // Rule 1: Product not found
  if (!measurements.product_found) {
    decision = 'handoff';
    clause = clauses.handoff_uncertain;
    confidence = 0.45;
    reasons.push('SAM 3.1 visual segmentation could not identify the expected product in the image.');
    reasons.push('Ambiguous photo framing prevents automated policy application.');
    missingInfo.push('A clear, well-lit photo showing the full package and shipping label');
    reply = "We received your photo, but our visual inspection system could not clearly identify the product or package. To ensure you receive the right resolution, we have escalated this ticket to a human support specialist who will review it shortly. You can also reply with a clearer, wider photo.";
  }
  // Rule 2: Contents damaged
  else if (measurements.contents_damaged && rules.refund_if_contents_damaged) {
    decision = 'refund';
    clause = clauses.refund;
    confidence = 0.96;
    reasons.push('SAM 3.1 detected visible damage to the product contents inside the packaging.');
    reasons.push(`Policy rule '${policy.name}' Clause [Refund] applies: confirmed content damage qualifies for immediate refund.`);
    reply = `We are so sorry your order arrived damaged. Our visual inspection confirmed damage to the item contents. Under our policy (${clause.split(':')[0]}), we have approved an immediate full refund of $${orderValue > 0 ? orderValue.toFixed(2) : 'your order'}. The funds will be credited back to your original payment method in 3-5 business days.`;
  }
  // Rule 3: Packaging damage ratio <= packaging_replace_max_ratio
  else if (measurements.packaging_damage_ratio <= rules.packaging_replace_max_ratio) {
    decision = 'replace_packaging';
    clause = clauses.replace_packaging;
    confidence = 0.92;
    reasons.push(
      `Measured damage ratio of ${(measurements.packaging_damage_ratio * 100).toFixed(1)}% is within the minor threshold of ${(rules.packaging_replace_max_ratio * 100).toFixed(0)}%.`
    );
    reasons.push('Visual evidence indicates contents are undamaged; only external transit packaging is affected.');
    reply = `Thank you for reaching out. We inspected the photo of your delivery: the outer packaging sustained minor transit wear (${(measurements.packaging_damage_ratio * 100).toFixed(1)}% surface area), but the inner item remains protected. Under our policy (${clause.split(':')[0]}), we have issued a replacement packaging kit and a $10 courtesy store credit to your account.`;
  }
  // Rule 4: Packaging damage ratio > packaging_replace_max_ratio
  else {
    decision = 'replace_item';
    clause = clauses.replace_item;
    confidence = 0.91;
    reasons.push(
      `Measured damage ratio of ${(measurements.packaging_damage_ratio * 100).toFixed(1)}% exceeds the packaging replacement threshold of ${(rules.packaging_replace_max_ratio * 100).toFixed(0)}%.`
    );
    reasons.push('Due to the extent of outer packaging crush, internal goods may have sustained concealed shock.');
    reply = `We apologize for the condition in which your delivery arrived. The outer package sustained substantial deformation (${(measurements.packaging_damage_ratio * 100).toFixed(1)}%), exceeding our safe transit limit. Under our policy (${clause.split(':')[0]}), we have arranged an immediate priority replacement of your item with complimentary expedited shipping.`;
  }

  // Adjust reply language if customer message is in another language (e.g. Spanish, French, German)
  const lowerMsg = (message || '').toLowerCase();
  if (lowerMsg.includes('dañado') || lowerMsg.includes('roto') || lowerMsg.includes('paquete')) {
    reply = `Hemos procesado su caso. La inspección visual determinó que corresponde a: ${decision}. Según nuestra política (${clause.split(':')[0]}), su solicitud ha sido procesada de inmediato.`;
  }

  const durationMs = Date.now() - startTime;
  meter.recordCall({
    model: 'muse-spark-1.3',
    type: 'decision_reasoning',
    inputTokens: 620,
    outputTokens: 180,
    durationMs,
    mock: true,
  });

  return {
    decision,
    clause,
    reasons,
    confidence,
    missing_info: missingInfo,
    reply,
    mock: true,
  };
}
