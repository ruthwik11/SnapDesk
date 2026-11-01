/**
 * SnapDesk Automated Integration & Guardrail Test Suite
 */

import assert from 'node:assert';
import { caseStore } from '../src/store.js';
import { processCaseAgent } from '../src/agent.js';
import { visionCache } from '../src/cache.js';
import { evaluateGuardrails } from '../src/guardrails.js';

async function runTests() {
  console.log('--- Starting SnapDesk Automated Integration Tests ---');
  await caseStore.init();
  visionCache.clear();

  const parcelPolicy = caseStore.getPolicy('parcel-damage');
  assert(parcelPolicy, 'Parcel policy must be loaded');

  // Test 1: Minor packaging damage -> replace_packaging
  console.log('Testing: Minor packaging damage...');
  const res1 = await processCaseAgent({
    caseId: 'test_minor',
    policy: parcelPolicy,
    mediaBuffer: Buffer.from('img_test_minor'),
    filename: 'minor_box.jpg',
    hint: 'minor scratch dent',
    orderValue: 40.0,
  });
  assert.strictEqual(res1.finalDecision, 'replace_packaging', 'Expected replace_packaging for minor damage');
  assert.strictEqual(res1.flags.length, 0, 'No guardrail flags should trigger');
  console.log('  PASSED: replace_packaging');

  // Test 2: Severe packaging damage -> replace_item
  console.log('Testing: Severe packaging damage...');
  const res2 = await processCaseAgent({
    caseId: 'test_severe',
    policy: parcelPolicy,
    mediaBuffer: Buffer.from('img_test_severe'),
    filename: 'severe_crushed.jpg',
    hint: 'heavy severe crushed',
    orderValue: 70.0,
  });
  assert.strictEqual(res2.finalDecision, 'replace_item', 'Expected replace_item for severe damage');
  console.log('  PASSED: replace_item');

  // Test 3: Shattered contents -> refund
  console.log('Testing: Shattered contents damage...');
  const res3 = await processCaseAgent({
    caseId: 'test_contents',
    policy: parcelPolicy,
    mediaBuffer: Buffer.from('img_test_broken'),
    filename: 'shattered_glass.jpg',
    hint: 'broken shattered ceramic',
    orderValue: 80.0,
  });
  assert.strictEqual(res3.finalDecision, 'refund', 'Expected refund for broken contents');
  console.log('  PASSED: refund');

  // Test 4: High-value financial guardrail override
  console.log('Testing: High-value guardrail override...');
  const res4 = await processCaseAgent({
    caseId: 'test_high_val',
    policy: parcelPolicy,
    mediaBuffer: Buffer.from('img_test_high_val'),
    filename: 'expensive_item.jpg',
    hint: 'minor scratch',
    orderValue: 950.0, // Exceeds $200 threshold
  });
  assert.strictEqual(res4.finalDecision, 'handoff', 'High value order must be overridden to handoff');
  assert(res4.flags.includes('high_value_order'), 'Flags must contain high_value_order');
  console.log('  PASSED: high_value_order guardrail');

  // Test 5: Unclear / Product not found guardrail override
  console.log('Testing: Product not found guardrail override...');
  const res5 = await processCaseAgent({
    caseId: 'test_no_product',
    policy: parcelPolicy,
    mediaBuffer: Buffer.from('img_test_unclear'),
    filename: 'blurry_background.jpg',
    hint: 'blurry no_product unclear',
    orderValue: 30.0,
  });
  assert.strictEqual(res5.finalDecision, 'handoff', 'Unclear image must be overridden to handoff');
  assert(res5.flags.includes('product_not_found'), 'Flags must contain product_not_found');
  console.log('  PASSED: product_not_found guardrail');

  // Test 6: Duplicate media detection
  console.log('Testing: Duplicate photo fraud guardrail...');
  const duplicateBuffer = Buffer.from('identical_media_bytes_12345');
  // First submission
  await processCaseAgent({
    caseId: 'test_orig',
    policy: parcelPolicy,
    mediaBuffer: duplicateBuffer,
    filename: 'original.jpg',
    hint: 'minor',
    orderValue: 20.0,
  });
  // Second submission with exact same media
  const res6 = await processCaseAgent({
    caseId: 'test_dup',
    policy: parcelPolicy,
    mediaBuffer: duplicateBuffer,
    filename: 'reupload.jpg',
    hint: 'minor',
    orderValue: 20.0,
  });
  assert.strictEqual(res6.finalDecision, 'handoff', 'Duplicate photo must trigger handoff');
  assert(res6.flags.includes('duplicate_photo'), 'Flags must contain duplicate_photo');
  console.log('  PASSED: duplicate_photo guardrail');

  // Test 7: Policy Flip Demonstration
  console.log('Testing: Interactive Policy Flip...');
  // Scenario: Damage ratio is 0.22 (22%)
  const policyStrict = {
    ...parcelPolicy,
    rules: { ...parcelPolicy.rules, packaging_replace_max_ratio: 0.15 }, // Strict 15% threshold
  };
  const policyLenient = {
    ...parcelPolicy,
    rules: { ...parcelPolicy.rules, packaging_replace_max_ratio: 0.35 }, // Lenient 35% threshold
  };

  const flipImg = Buffer.from('img_flip_test');
  const resStrict = await processCaseAgent({
    caseId: 'test_flip_strict',
    policy: policyStrict,
    mediaBuffer: flipImg,
    filename: 'box_22_percent.jpg',
    hint: 'moderate packaging damage', // defaults to 0.22 ratio
    orderValue: 50.0,
  });
  assert.strictEqual(resStrict.finalDecision, 'replace_item', 'Strict threshold (15%) must rule replace_item for 22% damage');

  const resLenient = await processCaseAgent({
    caseId: 'test_flip_lenient',
    policy: policyLenient,
    mediaBuffer: flipImg,
    filename: 'box_22_percent.jpg',
    hint: 'moderate packaging damage',
    orderValue: 50.0,
    isRerun: true, // Simulation of business owner re-evaluating the claim under new policy rules
  });
  assert.strictEqual(resLenient.finalDecision, 'replace_packaging', 'Lenient threshold (35%) must flip decision to replace_packaging for 22% damage');
  console.log('  PASSED: Policy Flip successfully flipped decision from replace_item to replace_packaging!');

  console.log('\n--- ALL 7 INTEGRATION TESTS PASSED PERFECTLY! ---');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
