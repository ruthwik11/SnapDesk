/**
 * SnapDesk Evaluation & Accuracy Benchmark Suite
 *
 * Evaluates SnapDesk agent decisions against human ground-truth rulings.
 * Computes:
 * - Agreement Rate (%)
 * - Handoff Rate (%)
 * - Wrong-Approval Rate (%) [Target: 0.0% - AI must never approve an unverified claim]
 * - Segmentation Sanity Rate (%)
 */

import { caseStore } from './store.js';
import { processCaseAgent } from './agent.js';
import { visionCache } from './cache.js';

export const BENCHMARK_CASES = [
  {
    id: 'eval_01',
    name: 'Parcel - Minor Corner Crush',
    policyId: 'parcel-damage',
    filename: 'crushed_corner_minor.jpg',
    hint: 'minor crushed corner',
    message: 'Corner of the carton was slightly crushed during transit. Item inside is completely intact.',
    orderValue: 42.0,
    humanRuling: 'replace_packaging',
    expectedReason: 'Superficial damage (<=30%) with undamaged goods',
  },
  {
    id: 'eval_02',
    name: 'Parcel - Severe Package Crush',
    policyId: 'parcel-damage',
    filename: 'heavy_box_crush.jpg',
    hint: 'heavy severe crush',
    message: 'The entire outer box is heavily compressed and torn.',
    orderValue: 110.0,
    humanRuling: 'replace_item',
    expectedReason: 'Severe box collapse (>30%) requires unit replacement',
  },
  {
    id: 'eval_03',
    name: 'Parcel - Shattered Contents',
    policyId: 'parcel-damage',
    filename: 'broken_ceramic_contents.jpg',
    hint: 'broken ceramic shattered contents',
    message: 'Opened package and ceramic teapot is shattered in pieces.',
    orderValue: 75.0,
    humanRuling: 'refund',
    expectedReason: 'Confirmed content breakage warrants immediate full refund',
  },
  {
    id: 'eval_04',
    name: 'Parcel - High-Value Flagged',
    policyId: 'parcel-damage',
    filename: 'laptop_box_dent.jpg',
    hint: 'minor dent',
    message: 'Delivery driver dropped MacBook Pro box. Corner has dent.',
    orderValue: 1450.0,
    humanRuling: 'handoff',
    expectedReason: 'High value order exceeding $200 threshold must go to specialist',
  },
  {
    id: 'eval_05',
    name: 'Parcel - Unclear Blurry Photo',
    policyId: 'parcel-damage',
    filename: 'blurry_unclear_carpet.jpg',
    hint: 'blurry no_product unclear',
    message: 'Package arrived bad.',
    orderValue: 35.0,
    humanRuling: 'handoff',
    expectedReason: 'Product not detected / ambiguous framing requires handoff',
  },
  {
    id: 'eval_06',
    name: 'Appliance - Minor Toaster Scratch',
    policyId: 'appliance-triage',
    filename: 'toaster_surface_scratch.jpg',
    hint: 'minor scratch',
    message: 'Toaster chrome front has a 1-inch superficial scratch.',
    orderValue: 55.0,
    humanRuling: 'replace_packaging',
    expectedReason: 'Cosmetic flaw (<=15%) gets cosmetic allowance',
  },
  {
    id: 'eval_07',
    name: 'Appliance - Cracked Microwave Glass',
    policyId: 'appliance-triage',
    filename: 'microwave_cracked_glass.jpg',
    hint: 'cracked glass broken',
    message: 'Microwave front door glass is fractured through.',
    orderValue: 180.0,
    humanRuling: 'refund',
    expectedReason: 'Structural glass fracture qualifies for refund/replacement',
  },
  {
    id: 'eval_08',
    name: 'Appliance - High-Value Smart Fridge',
    policyId: 'appliance-triage',
    filename: 'fridge_door_dent.jpg',
    hint: 'heavy dent',
    message: 'Smart refrigerator side panel has a 4-inch dent.',
    orderValue: 2400.0,
    humanRuling: 'handoff',
    expectedReason: 'Order value ($2,400) far exceeds $500 safety threshold',
  },
  {
    id: 'eval_09',
    name: 'Vehicle - Bumper Scuff',
    policyId: 'vehicle-damage',
    filename: 'bumper_light_scuff.jpg',
    hint: 'minor scratch scuff',
    message: 'Returned rental car has light curb scuff on lower plastic valence.',
    orderValue: 90.0,
    humanRuling: 'replace_packaging',
    expectedReason: 'Wear-and-tear below 10% ratio is waived',
  },
  {
    id: 'eval_10',
    name: 'Vehicle - High-Value Collision Damage',
    policyId: 'vehicle-damage',
    filename: 'car_smashed_panel.jpg',
    hint: 'severe dent smashed broken',
    message: 'Left quarter panel is creased and rear bumper hanging.',
    orderValue: 1200.0,
    humanRuling: 'handoff',
    expectedReason: 'Damage fee and contract value exceed supervisor handoff threshold',
  },
];

export async function runEvaluation() {
  await caseStore.init();
  // Clear registry temporarily for clean evaluation
  visionCache.clear();

  const results = [];
  let agreementCount = 0;
  let handoffCount = 0;
  let wrongApprovalCount = 0;
  let segmentationSanityPassCount = 0;

  for (const tc of BENCHMARK_CASES) {
    const policy = caseStore.getPolicy(tc.policyId);
    const fakeBuffer = Buffer.from(`sample_image_data_for_${tc.id}_${tc.filename}`);

    const caseRes = await processCaseAgent({
      caseId: `eval_${tc.id}`,
      policy,
      mediaBuffer: fakeBuffer,
      filename: tc.filename,
      message: tc.message,
      orderValue: tc.orderValue,
      hint: tc.hint,
    });

    const isMatch = caseRes.finalDecision === tc.humanRuling;
    if (isMatch) agreementCount += 1;

    if (caseRes.finalDecision === 'handoff') handoffCount += 1;

    // A wrong approval occurs when a human deemed the case required handoff or refund,
    // but the system mistakenly approved a minor packaging replacement or gave away free goods.
    const isWrongApproval =
      (tc.humanRuling === 'handoff' && caseRes.finalDecision !== 'handoff') ||
      (tc.humanRuling === 'refund' && caseRes.finalDecision === 'replace_packaging');

    if (isWrongApproval) {
      wrongApprovalCount += 1;
    }

    // Segmentation sanity: check that regions array is present and has plausible bounds
    const regions = caseRes.measurements.regions || [];
    const hasSanity =
      !caseRes.measurements.product_found ||
      (regions.length > 0 && caseRes.measurements.packaging_damage_ratio >= 0);
    if (hasSanity) segmentationSanityPassCount += 1;

    results.push({
      id: tc.id,
      name: tc.name,
      policy: policy.name,
      orderValue: tc.orderValue,
      damageRatio: `${(caseRes.measurements.packaging_damage_ratio * 100).toFixed(1)}%`,
      humanRuling: tc.humanRuling,
      snapdeskDecision: caseRes.finalDecision,
      flags: caseRes.flags,
      matched: isMatch,
      wrongApproval: isWrongApproval,
    });
  }

  const total = BENCHMARK_CASES.length;
  const metrics = {
    totalCases: total,
    agreementRate: parseFloat(((agreementCount / total) * 100).toFixed(1)),
    handoffRate: parseFloat(((handoffCount / total) * 100).toFixed(1)),
    wrongApprovalRate: parseFloat(((wrongApprovalCount / total) * 100).toFixed(1)),
    segmentationSanityRate: parseFloat(((segmentationSanityPassCount / total) * 100).toFixed(1)),
    agreementCount,
    handoffCount,
    wrongApprovalCount,
    timestamp: new Date().toISOString(),
    results,
  };

  return metrics;
}

// Direct CLI execution support: node src/eval.js
if (process.argv[1] && process.argv[1].endsWith('eval.js')) {
  console.log('====================================================');
  console.log('  SnapDesk Autonomous Agent Benchmark Evaluation   ');
  console.log('====================================================\n');
  runEvaluation().then((metrics) => {
    console.table(
      metrics.results.map((r) => ({
        Scenario: r.name,
        Value: `$${r.orderValue}`,
        Damage: r.damageRatio,
        'Human Ruling': r.humanRuling,
        'SnapDesk Ruling': r.snapdeskDecision,
        Flags: r.flags.join(', ') || 'none',
        Match: r.matched ? 'YES' : 'NO',
      }))
    );
    console.log('\n--- BENCHMARK RESULTS SUMMARY ---');
    console.log(`Total Cases Evaluated:       ${metrics.totalCases}`);
    console.log(`Agreement with Human Ruling: ${metrics.agreementRate}% (${metrics.agreementCount}/${metrics.totalCases})`);
    console.log(`Handoff / Escalation Rate:   ${metrics.handoffRate}% (${metrics.handoffCount}/${metrics.totalCases})`);
    console.log(`Wrong-Approval Rate:         ${metrics.wrongApprovalRate}% (${metrics.wrongApprovalCount}/${metrics.totalCases}) [CRITICAL SAFETY METRIC]`);
    console.log(`Segmentation Sanity Rate:    ${metrics.segmentationSanityRate}%\n`);
  });
}
