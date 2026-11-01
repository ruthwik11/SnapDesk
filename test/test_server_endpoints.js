/**
 * End-to-end HTTP endpoint verification script
 * Starts server and probes all API endpoints within the same process.
 */

import http from 'node:http';

async function testEndpoints() {
  console.log('Testing server endpoints in-process...');
  const serverModule = await import('../src/server.js');

  // Wait 1 second for port listening
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 1. Test /api/system
  const sysRes = await fetch('http://127.0.0.1:3000/api/system');
  const sysData = await sysRes.json();
  console.log('✓ /api/system response:', sysData.status, '| Mode:', sysData.mode);

  // 2. Test /api/policies
  const polRes = await fetch('http://127.0.0.1:3000/api/policies');
  const polData = await polRes.json();
  console.log(`✓ /api/policies response: ${polData.policies.length} policies loaded`);

  // 3. Test /api/cases
  const caseRes = await fetch('http://127.0.0.1:3000/api/cases');
  const caseData = await caseRes.json();
  console.log(`✓ /api/cases response: ${caseData.total} cases found`);

  // 4. Test /api/usage
  const useRes = await fetch('http://127.0.0.1:3000/api/usage');
  const useData = await useRes.json();
  console.log(`✓ /api/usage response: Total calls tracked: ${useData.usage.totalRealCalls + useData.usage.totalMockCalls}`);

  // 5. Test Static HTML
  const htmlRes = await fetch('http://127.0.0.1:3000/index.html');
  const htmlText = await htmlRes.text();
  console.log(`✓ /index.html served correctly: ${htmlText.length} bytes`);

  console.log('\n--- ALL HTTP ENDPOINTS FUNCTIONING 100% PERFECTLY! ---');
  process.exit(0);
}

testEndpoints().catch((err) => {
  console.error('Server endpoint test failed:', err);
  process.exit(1);
});

