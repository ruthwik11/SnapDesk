/**
 * SnapDesk Autonomous Agent Orchestrator
 *
 * Implements the explicit multi-step agent pipeline:
 * INTAKE -> VISUAL_MEASUREMENT -> POLICY_EVALUATION -> MULTIMODAL_REASONING -> GUARDRAIL_OVERRIDE -> EVIDENCE_COMPILATION
 *
 * Generates an on-screen Agent Trace showing every tool call and decision boundary.
 */

import crypto from 'node:crypto';
import { visionCache } from './cache.js';
import { segmentDamage } from './vision/index.js';
import { runDecisionEngine } from './decision/index.js';
import { evaluateGuardrails } from './guardrails.js';
import { generateHandoffSummary, generateTimelineNarrative } from './decision/spark_summary.js';
import { buildEvidencePacket } from './evidence.js';
import { transcribeAudioBuffer } from './voice/transcribe.js';

export async function processCaseAgent({
  caseId = `case_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  policy,
  mediaBuffer,
  mimeType = 'image/jpeg',
  filename = 'upload.jpg',
  audioBuffer = null,
  audioFilename = '',
  message = '',
  orderValue = 0,
  isVideo = false,
  hint = '',
  isRerun = false,
}) {
  const agentTrace = [];
  const logStep = (step, name, tool, detail, output = null) => {
    agentTrace.push({
      step,
      name,
      tool,
      timestamp: new Date().toISOString(),
      detail,
      output,
    });
  };

  // STEP 1: INTAKE & INTEGRITY VERIFICATION
  let customerText = message;
  let voiceTranscription = null;

  if (audioBuffer && audioBuffer.length > 0) {
    logStep(
      'voice_transcribe',
      'Audio Note Transcription',
      'muse-voice-transcribe-1.0',
      'Transcribing customer voice recording into structured text.'
    );
    voiceTranscription = await transcribeAudioBuffer(audioBuffer, audioFilename);
    customerText = customerText ? `${customerText}\n(Voice Note): ${voiceTranscription.transcript}` : voiceTranscription.transcript;
  }

  const mediaHash = visionCache.hashMedia(mediaBuffer || Buffer.from('empty'));
  const isDuplicate = isRerun ? false : visionCache.isDuplicate(mediaHash);

  logStep(
    'integrity_check',
    'Media Hash & Fraud Audit',
    'crypto.sha256',
    isRerun
      ? `Re-evaluation run (${mediaHash.substring(0, 16)}...). Duplicate check bypassed for policy audit.`
      : `Computed SHA-256 digest (${mediaHash.substring(0, 16)}...). Duplicate status: ${isDuplicate}.`,
    { mediaHash, isDuplicate, isRerun }
  );

  // STEP 2: VISUAL MEASUREMENT WITH SAM 3.1
  logStep(
    'sam_segmentation',
    'SAM 3.1 Visual Measurement',
    'sam-3.1',
    `Segmenting product boundary ("${policy.prompts.product}") and damage concepts ([${(policy.prompts.damage || []).join(', ')}]).`
  );

  const measurements = await segmentDamage({
    mediaBuffer,
    mimeType,
    prompts: policy.prompts,
    filename,
    hint,
    isVideo,
  });

  logStep(
    'sam_quantification',
    'Mask Geometry Quantification',
    '@meta-sam/parser',
    `Calculated packaging damage ratio: ${(measurements.packaging_damage_ratio * 100).toFixed(1)}%. Product detected: ${measurements.product_found}. Contents damage: ${measurements.contents_damaged}.`,
    {
      product_found: measurements.product_found,
      contents_damaged: measurements.contents_damaged,
      packaging_damage_ratio: measurements.packaging_damage_ratio,
      region_count: (measurements.regions || []).length,
    }
  );

  // STEP 3: POLICY RETRIEVAL & RULE COMPILATION
  logStep(
    'policy_matching',
    'Policy Rule Binding',
    'policy_engine',
    `Loaded policy "${policy.name}" (Rules: refund_if_contents_damaged=${policy.rules.refund_if_contents_damaged}, max_packaging_ratio=${policy.rules.packaging_replace_max_ratio}, handoff_value=$${policy.rules.handoff_order_value}).`
  );

  // STEP 4: MULTIMODAL REASONING WITH MUSE SPARK
  logStep(
    'spark_reasoning',
    'Muse Spark Multimodal Deliberation',
    'muse-spark-1.3',
    'Evaluating claim inputs, visual measurements, and customer message under strict JSON schema.'
  );

  const mediaBase64 = mediaBuffer ? mediaBuffer.toString('base64') : null;
  const modelDecision = await runDecisionEngine({
    policy,
    measurements,
    message: customerText,
    orderValue: Number(orderValue),
    mediaBase64,
    mimeType,
  });

  logStep(
    'spark_output',
    'Model Decision Formulated',
    'muse-spark-1.3',
    `Spark proposed: "${modelDecision.decision}" under ${modelDecision.clause} (Confidence: ${(modelDecision.confidence * 100).toFixed(0)}%).`,
    {
      proposed_decision: modelDecision.decision,
      clause: modelDecision.clause,
      confidence: modelDecision.confidence,
    }
  );

  // STEP 5: DETERMINISTIC FINANCIAL & SAFETY GUARDRAILS
  logStep(
    'guardrails_evaluation',
    'Deterministic Guardrails Check',
    'guardrails_engine',
    'Executing plain-code financial and fraud overrides. Checking order value, confidence, and duplicates.'
  );

  const guardrailResult = evaluateGuardrails({
    modelDecision,
    measurements,
    rules: policy.rules,
    orderValue: Number(orderValue),
    isDuplicate,
  });

  if (guardrailResult.triggered) {
    logStep(
      'guardrail_override',
      'Human Escalation Triggered',
      'guardrails_engine',
      `Model proposal overridden to HANDOFF due to active flags: [${guardrailResult.flags.join(', ')}].`,
      { flags: guardrailResult.flags }
    );
  } else {
    logStep(
      'guardrail_approved',
      'Guardrails Cleared',
      'guardrails_engine',
      `Automated resolution cleared. Final action: ${guardrailResult.final}.`,
      { final: guardrailResult.final }
    );
  }

  // STEP 6: HANDOFF SUMMARY & EVIDENCE COMPILATION
  let handoffSummary = '';
  if (guardrailResult.final === 'handoff') {
    handoffSummary = await generateHandoffSummary({
      caseId,
      policyName: policy.name,
      flags: guardrailResult.flags,
      measurements,
      orderValue,
      message: customerText,
    });
  }

  const timelineNarrative = generateTimelineNarrative(agentTrace);

  // Register media hash in registry
  visionCache.registerMedia(mediaHash, caseId);

  // Build complete evidence packet
  const mediaDataUrl = mediaBuffer ? `data:${mimeType};base64,${mediaBase64}` : null;
  const evidencePacket = buildEvidencePacket({
    caseId,
    createdAt: new Date().toISOString(),
    policy,
    customerMessage: customerText,
    orderValue: Number(orderValue),
    mediaUrl: mediaDataUrl,
    measurements,
    modelDecision,
    guardrailResult,
    handoffSummary,
    agentTrace,
    timelineNarrative,
  });

  return {
    id: caseId,
    createdAt: evidencePacket.timestamp,
    policyId: policy.id,
    policyName: policy.name,
    customerMessage: customerText,
    orderValue: Number(orderValue),
    mediaHash,
    mediaUrl: mediaDataUrl,
    measurements,
    modelDecision,
    guardrailResult,
    finalDecision: guardrailResult.final,
    status: guardrailResult.final === 'handoff' ? 'HANDOFF' : 'AUTO_RESOLVED',
    flags: guardrailResult.flags,
    handoffSummary,
    agentTrace,
    evidencePacket,
  };
}
