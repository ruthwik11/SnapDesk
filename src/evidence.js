/**
 * SnapDesk Evidence Packet Builder
 * Compiles a forensic-grade visual & policy audit trail for every processed case.
 * Renders vector SVG layers directly from SAM 3.1 segmentations (no Muse Image used).
 */

export function buildSvgOverlay(regions = [], width = 640, height = 480) {
  const elements = [];

  for (let idx = 0; idx < regions.length; idx++) {
    const r = regions[idx];
    const isProduct = r.type === 'product';
    const isContents = r.type === 'contents';

    const strokeColor = isContents ? '#dc2626' : (isProduct ? '#3b82f6' : '#ef4444');
    const fillColor = isContents
      ? 'rgba(220, 38, 38, 0.45)'
      : (isProduct ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.40)');

    // 1. Render SAM Mask Path if present
    if (r.mask && r.mask.path) {
      elements.push(`
      <!-- Mask: ${r.label} (${r.type}) -->
      <path d="${r.mask.path}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round" />`);
    }

    // 2. Render Normalized Bounding Box
    if (Array.isArray(r.bbox) && r.bbox.length === 4) {
      const [bx, by, bw, bh] = r.bbox;
      const x = Math.round(bx * width);
      const y = Math.round(by * height);
      const w = Math.round(bw * width);
      const h = Math.round(bh * height);

      const labelText = `${r.label.toUpperCase()} (${(r.area_ratio * 100).toFixed(1)}%)`;

      elements.push(`
      <!-- Bounding Box: ${r.label} -->
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="${isProduct ? '6,4' : 'none'}" />
      <g transform="translate(${x}, ${Math.max(16, y - 6)})">
        <rect x="0" y="-14" width="${Math.max(80, labelText.length * 7.5)}" height="18" rx="4" fill="${strokeColor}" />
        <text x="6" y="-1" fill="#ffffff" font-size="10" font-family="system-ui, sans-serif" font-weight="600">${labelText}</text>
      </g>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="snapdesk-svg-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
    <defs>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
    </defs>
    ${elements.join('\n')}
  </svg>`;
}

export function buildEvidencePacket({
  caseId,
  createdAt,
  policy,
  customerMessage,
  orderValue,
  mediaUrl,
  measurements,
  modelDecision,
  guardrailResult,
  handoffSummary = '',
  agentTrace = [],
  timelineNarrative = '',
}) {
  const svgOverlay = buildSvgOverlay(measurements.regions || [], 640, 480);

  return {
    caseId,
    timestamp: createdAt,
    policy: {
      id: policy.id,
      name: policy.name,
      category: policy.category || 'Retail Support',
      appliedClause: modelDecision.clause || policy.clauses?.refund,
    },
    intake: {
      customerMessage,
      orderValue: Number(orderValue),
      hasMedia: Boolean(mediaUrl),
    },
    vision: {
      mock: measurements.mock,
      productFound: measurements.product_found,
      contentsDamaged: measurements.contents_damaged,
      packagingDamageRatio: measurements.packaging_damage_ratio,
      packagingDamagePercent: `${(measurements.packaging_damage_ratio * 100).toFixed(1)}%`,
      regionsCount: (measurements.regions || []).length,
      regions: measurements.regions,
      svgOverlay,
    },
    ruling: {
      finalDecision: guardrailResult.final,
      modelDecision: guardrailResult.model_decision,
      status: guardrailResult.final === 'handoff' ? 'HANDOFF' : 'AUTO_RESOLVED',
      isOverridden: guardrailResult.triggered,
      flags: guardrailResult.flags,
      confidence: modelDecision.confidence,
      reasons: modelDecision.reasons,
      customerReply: modelDecision.reply,
      handoffSummary,
    },
    agentTrace,
    timelineNarrative,
  };
}

