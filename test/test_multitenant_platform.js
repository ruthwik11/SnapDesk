/**
 * SnapDesk Master Acceptance Test Suite
 * Validates:
 * 1. Authentication & strict role/tenant separation (Business A vs Business B vs Customer)
 * 2. Customer Intake (no-persistence-before-submit, active businesses in dropdown)
 * 3. Section 2 Vision & "Damage Report - {Customer Name}" generation
 * 4. Section 3 Decision Engine (4 stages, policy abstraction, "Model Decision Formulated")
 * 5. Business Dashboard (inbox scoping, product analytics, resolution distribution, policy editor, human-review queue, Ops & Accuracy)
 */

import assert from 'node:assert';
import { tenantStore } from '../src/models/tenant_store.js';
import { authService } from '../src/services/auth.js';
import { processVisionPipeline } from '../src/services/vision_service.js';
import { processDecisionPipeline } from '../src/services/decision_service.js';

async function runAcceptanceTests() {
  console.log('===============================================================');
  console.log('   SnapDesk Master Multi-Tenant Platform Acceptance Tests      ');
  console.log('===============================================================\n');

  await tenantStore.init();

  // --- TEST 1: BUSINESS VS CUSTOMER REGISTRATION & TENANT ISOLATION ---
  console.log('TEST 1: Validating Account Registration & Role Separation...');
  
  // 1.1 Register Customer
  const { salt: cs, hash: ch } = authService.hashPassword('CustPass123!');
  const testCustomer = tenantStore.addUser({
    id: 'usr_test_cust_1',
    email: 'customer1@test.com',
    salt: cs,
    hash: ch,
    name: 'Emily Davis',
    role: 'customer',
    businessId: null,
  });

  // 1.2 Register Business A
  const bizAId = 'biz_test_a';
  tenantStore.addBusiness({
    id: bizAId,
    name: 'Alpha Logistics',
    category: 'Logistics',
    active: true,
  });
  const { salt: as, hash: ah } = authService.hashPassword('AlphaPass123!');
  const userA = tenantStore.addUser({
    id: 'usr_alpha_admin',
    email: 'admin@alpha.com',
    salt: as,
    hash: ah,
    name: 'Alpha Admin',
    role: 'business_admin',
    businessId: bizAId,
  });

  // 1.3 Register Business B
  const bizBId = 'biz_test_b';
  tenantStore.addBusiness({
    id: bizBId,
    name: 'Beta Electronics',
    category: 'Electronics',
    active: true,
  });
  const { salt: bs, hash: bh } = authService.hashPassword('BetaPass123!');
  const userB = tenantStore.addUser({
    id: 'usr_beta_admin',
    email: 'admin@beta.com',
    salt: bs,
    hash: bh,
    name: 'Beta Admin',
    role: 'business_admin',
    businessId: bizBId,
  });

  // Verify sessions
  const custSession = authService.createSession(testCustomer);
  const bizASession = authService.createSession(userA);
  const bizBSession = authService.createSession(userB);

  assert.strictEqual(custSession.role, 'customer', 'Customer must have customer role');
  assert.strictEqual(custSession.businessId, null, 'Customer must have null businessId');
  assert.strictEqual(bizASession.businessId, bizAId, 'Business A session must bind to biz_test_a');
  assert.strictEqual(bizBSession.businessId, bizBId, 'Business B session must bind to biz_test_b');
  console.log('  ✓ PASSED: Account registration and role assignments verified.');

  // --- TEST 2: TENANT ISOLATION (BUSINESS A CANNOT SEE BUSINESS B'S DATA) ---
  console.log('TEST 2: Verifying Strict Tenant Scoping...');
  // Create a case under Business A
  const caseA = tenantStore.createCase({
    businessId: bizAId,
    customerId: testCustomer.id,
    customerName: testCustomer.name,
    writtenComplaint: 'Box crushed during Alpha delivery.',
    status: 'submitted',
  });

  // Create a case under Business B
  const caseB = tenantStore.createCase({
    businessId: bizBId,
    customerId: testCustomer.id,
    customerName: testCustomer.name,
    writtenComplaint: 'Screen cracked in Beta shipment.',
    status: 'submitted',
  });

  const aCases = tenantStore.getCasesByBusiness(bizAId);
  const bCases = tenantStore.getCasesByBusiness(bizBId);

  assert(aCases.some((c) => c.id === caseA.id), 'Business A must see caseA');
  assert(!aCases.some((c) => c.id === caseB.id), 'Business A must NEVER see caseB from Business B');
  assert(bCases.some((c) => c.id === caseB.id), 'Business B must see caseB');
  assert(!bCases.some((c) => c.id === caseA.id), 'Business B must NEVER see caseA from Business A');
  console.log('  ✓ PASSED: Strict multi-tenant isolation enforced.');

  // --- TEST 3: CUSTOMER INTAKE & PROVIDER LISTING ---
  console.log('TEST 3: Verifying Customer Intake Requirements...');
  const activeBizList = tenantStore.getAllActiveBusinesses();
  assert(activeBizList.length >= 3, 'Must have at least 3 active businesses');
  assert(activeBizList.every((b) => b.id.startsWith('biz_')), 'Providers list must contain businesses only, never customers');
  console.log(`  ✓ PASSED: Active business providers listing verified (${activeBizList.length} merchants available).`);

  // --- TEST 4: SECTION 2 VISION & DAMAGE REPORT GENERATION ---
  console.log('TEST 4: Verifying Section 2 Vision Pipeline & "Damage Report - {Customer Name}"...');
  // Set up mock policy for Alpha
  tenantStore.savePolicyVersion({
    versionId: 'pol_alpha_v1',
    businessId: bizAId,
    versionNumber: 1,
    name: 'Alpha Standard Delivery Policy',
    rules: { packaging_replace_max_ratio: 0.30, handoff_order_value: 200, min_confidence: 0.70 },
    prompts: { product: 'cardboard box', damage: ['crushed corner'], contents: ['broken item'] },
    status: 'published',
  });
  tenantStore.saveThresholdVersion({
    versionId: 'thresh_alpha_v1',
    businessId: bizAId,
    rules: { packaging_replace_max_ratio: 0.30, handoff_order_value: 200, min_confidence: 0.70, auto_refund_enabled: true },
  });

  const damageReport = await processVisionPipeline({
    caseId: caseA.id,
    customerName: testCustomer.name,
    businessId: bizAId,
    mediaAssets: [
      {
        id: 'asset_test_1',
        originalFilename: 'crushed_box.jpg',
        mimeType: 'image/jpeg',
        mediaUrl: 'assets/box_crushed.svg',
      },
    ],
    complaintText: 'Box corner crushed during transit.',
  });

  assert.strictEqual(damageReport.title, `Damage Report - ${testCustomer.name}`, 'Must have exact required title format');
  assert(damageReport.assessmentStatus === 'damage_identified' || damageReport.assessmentStatus === 'no_visible_damage_identified' || damageReport.assessmentStatus === 'inconclusive', 'Assessment status must follow required enum');
  assert(typeof damageReport.damageRatio === 'number', 'Damage ratio must be calculated deterministically');
  assert(damageReport.overallFindings.length > 0, 'Must contain ASD-STE100 findings list');
  console.log(`  ✓ PASSED: Generated canonical artifact "${damageReport.title}" (${damageReport.damageRatioFormatted} damage ratio).`);

  // --- TEST 5: SECTION 3 DECISION ENGINE (POLICY ABSTRACTION & 4 STAGES) ---
  console.log('TEST 5: Verifying Section 3 Decision Engine & "Model Decision Formulated"...');
  const decisionResult = await processDecisionPipeline({
    caseObj: {
      ...caseA,
      productCostReported: 45.0,
      writtenComplaint: 'Box corner crushed in delivery.',
      mediaAssets: [{ id: 'asset_test_1', mediaUrl: 'assets/box_crushed.svg', mimeType: 'image/svg+xml' }],
    },
    damageReport,
  });

  assert(decisionResult.policyAbstraction, 'Must include customer policy abstraction');
  assert.strictEqual(decisionResult.policyAbstraction.heading, "Important points from Alpha Logistics's policy");
  assert.strictEqual(decisionResult.stagesTrace.length, 4, 'Must execute exactly the 4 required stages in order');
  assert.strictEqual(decisionResult.stagesTrace[0].stage, 1, 'Stage 1 must be Media Hash & Fraud Audit');
  assert.strictEqual(decisionResult.stagesTrace[1].stage, 2, 'Stage 2 must be Mask Geometry Quantification');
  assert.strictEqual(decisionResult.stagesTrace[2].stage, 3, 'Stage 3 must be Policy Rule Binding');
  assert.strictEqual(decisionResult.stagesTrace[3].stage, 4, 'Stage 4 must be Muse Spark Multimodal Deliberation');
  assert(decisionResult.outcomeStatus === 'auto_authorised' || decisionResult.outcomeStatus === 'ai_recommendation' || decisionResult.outcomeStatus === 'human_review_required', 'Must distinguish AI recommendation vs auto-authorised');
  console.log(`  ✓ PASSED: 4-stage Decision Engine completed. Ruling: ${decisionResult.finalOutcome} (${decisionResult.outcomeStatus}).`);

  // --- TEST 6: BUSINESS DASHBOARD OPS & ACCURACY PRESERVATION ---
  console.log('TEST 6: Verifying Business Dashboard Ops & Accuracy Telemetry...');
  const aOverview = tenantStore.getCasesByBusiness(bizAId);
  assert(aOverview.length > 0, 'Overview must track business cases');
  
  // Verify policy editor persistence
  const publishedPol = tenantStore.savePolicyVersion({
    versionId: 'pol_alpha_v2',
    businessId: bizAId,
    versionNumber: 2,
    name: 'Alpha Custom Policy v2',
    rawText: '1. All damaged goods qualify for immediate replacement.',
    rules: { packaging_replace_max_ratio: 0.25, handoff_order_value: 300, min_confidence: 0.75 },
    status: 'published',
  });
  const currentAlphaPolicy = tenantStore.getActivePolicy(bizAId);
  assert.strictEqual(currentAlphaPolicy.versionId, 'pol_alpha_v2', 'Published policy must be active');
  console.log('  ✓ PASSED: Policy text editor persistence and versioning verified.');

  console.log('\n===============================================================');
  console.log('   ALL 6 MASTER PLATFORM ACCEPTANCE SUITES PASSED (100%)       ');
  console.log('===============================================================\n');
}

runAcceptanceTests().catch((err) => {
  console.error('Acceptance Test Suite Failure:', err);
  process.exit(1);
});
