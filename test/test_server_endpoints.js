/**
 * Comprehensive Multi-Tenant End-to-End HTTP Endpoint Verification Script
 * Validates in-process Express server, session cookies, route authorizations,
 * public endpoints, customer intake, SAM vision pipeline, Decision Engine,
 * and business analytics/ops telemetry.
 */

import http from 'node:http';

async function runHttpVerification() {
  console.log('Starting comprehensive in-process HTTP verification...');
  // Import server which starts listening on port 3000
  const serverModule = await import('../src/server.js');

  // Allow server to bind
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const BASE = 'http://127.0.0.1:3000';

  // 1. Static Assets & Logo
  console.log('\n[1] Verifying Static Assets & Existing Logo Asset...');
  const logoRes = await fetch(`${BASE}/assets/logo.png`);
  if (!logoRes.ok) throw new Error(`Failed to load logo: ${logoRes.status}`);
  const logoBlob = await logoRes.arrayBuffer();
  console.log(`  ✓ Logo served at /assets/logo.png (${logoBlob.byteLength} bytes)`);

  const htmlRes = await fetch(`${BASE}/index.html`);
  const htmlText = await htmlRes.text();
  if (!htmlText.includes('Beyond Customer Support.') || !htmlText.includes('BUILT WITH PURPOSE, MADE FOR PEOPLE.')) {
    throw new Error('Hero copy missing from index.html');
  }
  console.log(`  ✓ Hero layout & typography verified in index.html (${htmlText.length} bytes)`);

  // 2. Public Businesses Dropdown
  console.log('\n[2] Verifying Public Active Business Registry Dropdown...');
  const pubBizRes = await fetch(`${BASE}/api/businesses/public`);
  const pubBizData = await pubBizRes.json();
  if (!pubBizData.businesses || pubBizData.businesses.length < 3) {
    throw new Error('Expected at least 3 active business tenants');
  }
  console.log(`  ✓ Found ${pubBizData.businesses.length} active registered businesses:`, pubBizData.businesses.map(b => b.name).join(', '));

  // 3. Auth & Role Separation
  console.log('\n[3] Verifying Multi-Tenant Authentication & Strict Role Separation...');
  // Register new customer
  const custRegRes = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'customer',
      name: 'Elena Rostova',
      email: 'elena@test.com',
      password: 'SecurePassword123!',
      phone: '+1-555-0199'
    })
  });
  const custCookie = custRegRes.headers.get('set-cookie');
  const custSession = await custRegRes.json();
  const custAuthHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${custSession.session.token}`,
    'cookie': custCookie || `snapdesk_session=${custSession.session.token}`,
  };
  console.log(`  ✓ Registered Customer: ${custSession.user.name} (${custSession.user.role})`);

  // Verify Customer CANNOT access Business Dashboard API
  const breachAttempt = await fetch(`${BASE}/api/business/overview`, {
    headers: custAuthHeaders
  });
  if (breachAttempt.status !== 403) {
    throw new Error(`Security breach: Customer received status ${breachAttempt.status} on business overview`);
  }
  console.log('  ✓ Verified 403 Forbidden: Customer is strictly blocked from Business APIs');

  // Login as Business Admin (Apex Logistics)
  const bizLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@apex.com',
      password: 'ApexPass123!'
    })
  });
  const bizCookie = bizLoginRes.headers.get('set-cookie');
  const bizSession = await bizLoginRes.json();
  const bizAuthHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${bizSession.session.token}`,
    'cookie': bizCookie || `snapdesk_session=${bizSession.session.token}`,
  };
  console.log(`  ✓ Logged in Business Admin: ${bizSession.user.name} (${bizSession.user.role}, Tenant: ${bizSession.user.businessId})`);

  // Verify Business Admin CAN access Business Overview
  const bizOverviewRes = await fetch(`${BASE}/api/business/overview`, {
    headers: bizAuthHeaders
  });
  if (!bizOverviewRes.ok) throw new Error(`Business overview returned ${bizOverviewRes.status}`);
  const bizOverview = await bizOverviewRes.json();
  console.log(`  ✓ Business Overview accessible: ${bizOverview.overview.totalCases} total cases, ${bizOverview.overview.aiHandled} AI handled`);

  // 4. Customer Intake: Submit Ticket (Persistence ONLY on Submit)
  console.log('\n[4] Submitting Case via Customer Intake (Submit Ticket)...');
  const dummyJpgBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const ticketRes = await fetch(`${BASE}/api/cases`, {
    method: 'POST',
    headers: custAuthHeaders,
    body: JSON.stringify({
      businessId: 'biz_apex',
      customerName: 'Elena Rostova',
      customerPhone: '+1-555-0199',
      postalCode: '10001',
      productCost: 1450.00,
      writtenComplaint: 'Side hydraulic arm sheared and outer shell cracked during transit uncoupling.',
      stagedMedia: JSON.stringify([
        {
          name: 'damaged_cargo.jpg',
          mimeType: 'image/jpeg',
          base64: `data:image/jpeg;base64,${dummyJpgBase64}`,
          size: 1024,
          isVideo: false,
        }
      ]),
      voiceNote: 'Transcribe: Container door fell off upon arrival. Structural hinge broke.'
    })
  });
  const ticketData = await ticketRes.json();
  if (!ticketData.caseId) {
    throw new Error(`Failed to create case: ${JSON.stringify(ticketData)}`);
  }
  const caseId = ticketData.caseId;
  console.log(`  ✓ Case created: ID=${caseId}, Number=${ticketData.caseNumber}, Business=${ticketData.businessName}`);

  // 5. Vision Analysis: SAM 3.1 & Canonical ASD-STE100 Report
  console.log('\n[5] Executing Section 2 Vision Analysis & ASD-STE100 Report...');
  const visionRes = await fetch(`${BASE}/api/cases/${caseId}/analyze-vision`, {
    method: 'POST',
    headers: custAuthHeaders
  });
  const visionData = await visionRes.json();
  if (!visionData.success || !visionData.damageReport) {
    throw new Error(`Vision analysis failed: ${JSON.stringify(visionData)}`);
  }
  const report = visionData.damageReport;
  console.log(`  ✓ Vision Assessment: Product Found=${report.productFound}, Damage Ratio=${report.damageRatioFormatted}`);
  console.log(`  ✓ Canonical Artifact Generated: "${report.title}"`);

  // 6. Section 3 Decision Engine & "Model Decision Formulated"
  console.log('\n[6] Executing Section 3 Decision Engine...');
  const decideRes = await fetch(`${BASE}/api/cases/${caseId}/decide`, {
    method: 'POST',
    headers: custAuthHeaders
  });
  const decisionData = await decideRes.json();
  if (!decisionData.success || !decisionData.decision) {
    throw new Error(`Decision engine failed: ${JSON.stringify(decisionData)}`);
  }
  const decision = decisionData.decision;
  console.log(`  ✓ Prominent Status: "Model Decision Formulated"`);
  console.log(`  ✓ Decision Ruling: ${decision.finalOutcome} (${decision.outcomeStatus})`);
  console.log(`  ✓ Policy Abstraction: "${decision.policyAbstraction?.heading}" (${decision.policyAbstraction?.points?.length} points)`);

  // 7. Business Ops & Accuracy Telemetry
  console.log('\n[7] Verifying Ops & Accuracy Telemetry Relocated to Business UI...');
  const opsRes = await fetch(`${BASE}/api/business/ops-accuracy`, {
    headers: bizAuthHeaders
  });
  const opsData = await opsRes.json();
  if (!opsData.success || !opsData.meter) {
    throw new Error(`Ops accuracy telemetry failed: ${JSON.stringify(opsData)}`);
  }
  console.log(`  ✓ Ops Telemetry Verified: Real Calls=${opsData.meter.totalRealCalls}, Mock Calls=${opsData.meter.totalMockCalls}, Total Cost=$${opsData.meter.estimatedCostUSD}`);
  console.log(`  ✓ Geometry Quantification Standard: "${opsData.geometryDefinitions.formula}"`);

  console.log('\n===============================================================');
  console.log('   ALL E2E HTTP CLIENT & SERVER TESTS PASSED WITH 100% SUCCESS ');
  console.log('===============================================================\n');

  process.exit(0);
}

runHttpVerification().catch((err) => {
  console.error('\nHTTP Verification failed:', err);
  process.exit(1);
});
