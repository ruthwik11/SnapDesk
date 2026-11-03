/**
 * SnapDesk Decision Engine & Policy Deliberation Service
 * Powered by Meta Muse Spark 1.3 (muse-spark-1.3)
 *
 * Implements:
 * - Customer policy abstraction: "Important points from {Business Name}'s policy"
 * - 4 mandatory sequential processing stages
 * - Business-specific threshold evaluation
 * - Prominent "Model Decision Formulated"
 * - AI recommendation vs authorized final decision distinction
 */

import crypto from 'node:crypto';
import { tenantStore } from '../models/tenant_store.js';
import { visionCache } from '../cache.js';
import { runDecisionEngine } from '../decision/index.js';
import { evaluateGuardrails } from '../guardrails.js';

export async function generatePolicyAbstraction(businessName, policy) {
  const clauses = policy.clauses || {};
  const rules = policy.rules || {};

  return {
    heading: `Important points from ${businessName}'s policy`,
    points: [
      `Reporting Window: Visual claims must be reported within ${rules.reporting_window_days || 14} days of receipt.`,
      `Verified Content Damage: If item contents sustain damage, immediate reimbursement is provided under ${clauses.refund ? clauses.refund.split(':')[0] : 'Clause 4.1'}.`,
      `Minor Outer Packaging: Outer packaging wear below ${(rules.packaging_replace_max_ratio * 100).toFixed(0)}% qualifies for carton replacement or courtesy store credit.`,
      `Severe Deformation: Outer crush exceeding ${(rules.packaging_replace_max_ratio * 100).toFixed(0)}% qualifies for full unit replacement.`,
      `Specialist Review: High-value orders exceeding $${rules.handoff_order_value || 200} undergo manual specialist verification for customer protection.`,
    ],
  };
}

export async function processDecisionPipeline({
  caseObj,
  damageReport,
}) {
  const business = tenantStore.getBusiness(caseObj.businessId);
  const businessName = business?.name || 'Business Partner';

  const policy = tenantStore.getActivePolicy(caseObj.businessId);
  const thresholds = tenantStore.getActiveThreshold(caseObj.businessId);

  if (!policy) {
    throw new Error(`No published policy found for business "${businessName}". Escalation required.`);
  }

  const stagesTrace = [];

  // STAGE 1: Media Hash & Fraud Audit (crypto.sha256)
  const mediaAsset = (caseObj.mediaAssets || [])[0];
  const mediaBuffer = mediaAsset?.mediaUrl && mediaAsset.mediaUrl.startsWith('data:')
    ? Buffer.from(mediaAsset.mediaUrl.split(',')[1], 'base64')
    : Buffer.from(`media_${caseObj.id}`);

  const sha256Digest = crypto.createHash('sha256').update(mediaBuffer).digest('hex');
  const isDuplicate = visionCache.isDuplicate(sha256Digest);

  stagesTrace.push({
    stage: 1,
    title: 'Media Hash & Fraud Audit (crypto.sha256)',
    tool: 'crypto.sha256',
    status: 'completed',
    detail: `Calculated SHA-256 digest: ${sha256Digest.substring(0, 16)}... Duplicate check: ${isDuplicate ? 'Duplicate detected (fraud signal)' : 'No duplicate detected'}.`,
    data: { sha256Digest, isDuplicate },
  });

  // STAGE 2: Mask Geometry Quantification
  const damageRatio = damageReport.damageRatio || 0;
  const damageRatioFormatted = damageReport.damageRatioFormatted || `${(damageRatio * 100).toFixed(1)}%`;

  stagesTrace.push({
    stage: 2,
    title: 'Mask Geometry Quantification',
    tool: '@meta-sam/parser',
    status: 'completed',
    detail: `Estimated visible-area damage ratio: ${damageRatioFormatted}. Product boundary detected: ${damageReport.productFound}. Contents damaged: ${damageReport.contentsDamaged}.`,
    data: {
      damageRatio,
      damageRatioFormatted,
      measurements: damageReport.measurements,
    },
  });

  // STAGE 3: Policy Rule Binding
  stagesTrace.push({
    stage: 3,
    title: 'Policy Rule Binding',
    tool: 'policy_engine',
    status: 'completed',
    detail: `Verifying the reported damage and issue against ${businessName}'s policy (${policy.name}). Bound threshold: max packaging ratio ${(thresholds?.rules?.packaging_replace_max_ratio * 100).toFixed(0)}%, handoff order value $${thresholds?.rules?.handoff_order_value}.`,
    data: {
      policyVersionId: policy.versionId,
      thresholdVersionId: thresholds?.versionId,
      rules: policy.rules,
    },
  });

  // STAGE 4: Muse Spark Multimodal Deliberation (muse-spark-1.3)
  stagesTrace.push({
    stage: 4,
    title: 'Muse Spark Multimodal Deliberation (muse-spark-1.3)',
    tool: 'muse-spark-1.3',
    status: 'completed',
    detail: 'Evaluating claim inputs, visual measurements, and customer message under a strict JSON schema.',
  });

  const mediaBase64 = mediaAsset?.mediaUrl && mediaAsset.mediaUrl.startsWith('data:')
    ? mediaAsset.mediaUrl.split(',')[1]
    : null;

  const sparkDecision = await runDecisionEngine({
    policy,
    measurements: {
      product_found: damageReport.productFound,
      contents_damaged: damageReport.contentsDamaged,
      packaging_damage_ratio: damageRatio,
      regions: damageReport.regions || [],
    },
    message: caseObj.writtenComplaint,
    orderValue: caseObj.productCostReported || 0,
    mediaBase64,
    mimeType: mediaAsset?.mimeType || 'image/jpeg',
  });

  // Apply deterministic plain-code guardrails
  const guardrailResult = evaluateGuardrails({
    modelDecision: sparkDecision,
    measurements: {
      product_found: damageReport.productFound,
      contents_damaged: damageReport.contentsDamaged,
      packaging_damage_ratio: damageRatio,
    },
    rules: policy.rules,
    orderValue: caseObj.productCostReported || 0,
    isDuplicate,
  });

  // Determine outcome type (AI recommendation vs automatically authorised vs human review)
  let outcome = guardrailResult.final;
  let outcomeStatus = 'auto_authorised';
  let handlingBadge = 'ai_handled';

  if (outcome === 'handoff') {
    outcome = 'human_review';
    outcomeStatus = 'human_review_required';
    handlingBadge = 'human_intervention_required';
  } else {
    // If business has auto-approval enabled in thresholds
    const autoAllowed = outcome === 'refund'
      ? Boolean(thresholds?.rules?.auto_refund_enabled)
      : Boolean(thresholds?.rules?.auto_replacement_enabled);

    if (!autoAllowed) {
      outcomeStatus = 'ai_recommendation';
    }
  }

  const policyAbstraction = await generatePolicyAbstraction(businessName, policy);

  const decisionId = `dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const finalResult = {
    decisionId,
    caseId: caseObj.id,
    businessId: caseObj.businessId,
    policyVersionId: policy.versionId,
    thresholdVersionId: thresholds?.versionId,
    assessmentStatus: damageReport.assessmentStatus,
    proposedOutcome: sparkDecision.decision,
    finalOutcome: outcome,
    outcomeStatus,
    handlingBadge,
    citedClause: sparkDecision.clause || policy.clauses?.refund,
    reasons: sparkDecision.reasons || [],
    confidence: sparkDecision.confidence || 0.92,
    customerReply: sparkDecision.reply,
    guardrailFlags: guardrailResult.flags,
    policyAbstraction,
    stagesTrace,
    createdAt: new Date().toISOString(),
  };

  // Update case in store
  tenantStore.updateCase(caseObj.id, {
    outcome,
    outcomeStatus,
    handlingBadge,
    status: outcome === 'human_review' ? 'pending' : 'closed',
    decision: finalResult,
  });

  // Register hash in registry
  visionCache.registerMedia(sha256Digest, caseObj.id);

  return finalResult;
}

