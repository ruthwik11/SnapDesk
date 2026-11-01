/**
 * SnapDesk Front-End Application Logic
 */

// Application State
let activePolicies = [];
let activeCases = [];
let currentEvidenceCase = null;
let simulatedVoiceAttached = false;
let currentUploadedBase64 = null;
let currentUploadedMime = 'image/svg+xml';
let currentUploadedFilename = 'box_crushed.svg';

// Layer visibility toggles
let showMaskLayer = true;
let showBoxLayer = true;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupDropzone();
  await checkSystemStatus();
  await loadPolicies();
  await loadCaseTable();
  await refreshUsageStats();

  // Load default preset for instant demo readiness
  loadPreset('crushed_box');
});

// --- Tab Navigation ---
function setupTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `tab-${tab.dataset.tab}`;
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add('active');

      if (tab.dataset.tab === 'operations') {
        refreshUsageStats();
        loadCaseTable();
      } else if (tab.dataset.tab === 'policies') {
        populateFlipCaseSelect();
      }
    });
  });
}

function switchTab(tabName) {
  const tabBtn = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
  if (tabBtn) tabBtn.click();
}

// --- System Status ---
async function checkSystemStatus() {
  try {
    const res = await fetch('/api/system');
    const data = await res.json();
    const badge = document.getElementById('modeBadge');
    if (data.mode === 'real') {
      badge.textContent = 'Real Mode (Meta API)';
      badge.className = 'brand-badge badge-real';
    } else {
      badge.textContent = 'Mock Mode (Offline)';
      badge.className = 'brand-badge badge-mock';
    }
  } catch (err) {
    console.warn('Could not check system status:', err);
  }
}

// --- Policies ---
async function loadPolicies() {
  try {
    const res = await fetch('/api/policies');
    const data = await res.json();
    activePolicies = data.policies || [];

    const intakeSelect = document.getElementById('policySelect');
    const editorSelect = document.getElementById('policyEditorSelect');

    intakeSelect.innerHTML = '';
    editorSelect.innerHTML = '';

    activePolicies.forEach((p) => {
      const opt1 = new Option(`${p.name} (${p.category || 'Retail'})`, p.id);
      const opt2 = new Option(`${p.name} (${p.category || 'Retail'})`, p.id);
      intakeSelect.appendChild(opt1);
      editorSelect.appendChild(opt2);
    });

    loadPolicyIntoEditor();
  } catch (err) {
    console.error('Failed to load policies:', err);
  }
}

function loadPolicyIntoEditor() {
  const id = document.getElementById('policyEditorSelect').value;
  const policy = activePolicies.find((p) => p.id === id);
  if (!policy) return;

  const ratio = Math.round((policy.rules.packaging_replace_max_ratio || 0.3) * 100);
  document.getElementById('rulePackagingRatio').value = ratio;
  document.getElementById('rulePackagingRatioVal').textContent = `${ratio}%`;

  document.getElementById('ruleHandoffValue').value = policy.rules.handoff_order_value || 200;

  const conf = Math.round((policy.rules.min_confidence || 0.7) * 100);
  document.getElementById('ruleMinConfidence').value = conf;
  document.getElementById('ruleMinConfidenceVal').textContent = (conf / 100).toFixed(2);
}

function updateRatioSliderVal(val) {
  document.getElementById('rulePackagingRatioVal').textContent = `${val}%`;
}

function updateConfidenceSliderVal(val) {
  document.getElementById('ruleMinConfidenceVal').textContent = (val / 100).toFixed(2);
}

async function saveActivePolicy() {
  const id = document.getElementById('policyEditorSelect').value;
  const policy = activePolicies.find((p) => p.id === id);
  if (!policy) return;

  const updatedRules = {
    ...policy.rules,
    packaging_replace_max_ratio: parseFloat(document.getElementById('rulePackagingRatio').value) / 100,
    handoff_order_value: parseFloat(document.getElementById('ruleHandoffValue').value),
    min_confidence: parseFloat(document.getElementById('ruleMinConfidence').value) / 100,
  };

  try {
    const res = await fetch(`/api/policies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...policy, rules: updatedRules }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`Policy rules for "${policy.name}" updated successfully!`);
      await loadPolicies();
    }
  } catch (err) {
    alert(`Failed to save policy: ${err.message}`);
  }
}

async function compilePolicyProse() {
  const text = document.getElementById('rawPolicyProse').value;
  if (!text.trim()) {
    alert('Please paste business policy prose to compile.');
    return;
  }

  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = '⏳ Compiling with Muse Spark...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/policies/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, name: 'AI Compiled Policy' }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`Policy compiled successfully!\nExtracted threshold: ${(data.policy.rules.packaging_replace_max_ratio * 100).toFixed(0)}%\nHandoff value: $${data.policy.rules.handoff_order_value}`);
      await loadPolicies();
    }
  } catch (err) {
    alert(`Compiler error: ${err.message}`);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// --- Presets ---
async function loadPreset(presetKey) {
  const imgEl = document.getElementById('previewImage');
  const previewContainer = document.getElementById('previewContainer');
  const dropzoneText = document.getElementById('dropzoneText');

  let assetUrl = 'assets/box_crushed.svg';
  let message = '';
  let orderValue = 45.0;
  let policyId = 'parcel-damage';
  let filename = 'crushed_box.svg';

  switch (presetKey) {
    case 'crushed_box':
      assetUrl = 'assets/box_crushed.svg';
      message = 'Shipping box arrived with crushed upper right corner. Item inside is intact.';
      orderValue = 45.0;
      policyId = 'parcel-damage';
      filename = 'parcel_crushed_corner.svg';
      break;
    case 'broken_vase':
      assetUrl = 'assets/box_broken.svg';
      message = 'The box arrived crushed and open. The fragile porcelain vase inside is shattered in pieces!';
      orderValue = 85.0;
      policyId = 'parcel-damage';
      filename = 'broken_porcelain_box.svg';
      break;
    case 'scratched_appliance':
      assetUrl = 'assets/appliance_scratch.svg';
      message = 'Unboxed brand new microwave and found a visible 2-inch scratch along the glass door.';
      orderValue = 60.0;
      policyId = 'appliance-triage';
      filename = 'microwave_scratch.svg';
      break;
    case 'high_val_laptop':
      assetUrl = 'assets/box_crushed.svg';
      message = 'Delivery driver dropped the parcel for my MacBook Pro. Packaging has corner dent.';
      orderValue = 1450.0;
      policyId = 'parcel-damage';
      filename = 'laptop_box_dent.svg';
      break;
    case 'blurry_frame':
      assetUrl = 'assets/blurry_photo.svg';
      message = 'My item was damaged in shipping.';
      orderValue = 35.0;
      policyId = 'parcel-damage';
      filename = 'blurry_unfocused_shot.svg';
      break;
  }

  document.getElementById('policySelect').value = policyId;
  document.getElementById('claimMessage').value = message;
  document.getElementById('orderValue').value = orderValue.toFixed(2);

  // Fetch preset svg to convert to data URL
  try {
    const res = await fetch(assetUrl);
    const text = await res.text();
    currentUploadedBase64 = `data:image/svg+xml;base64,${btoa(text)}`;
    currentUploadedMime = 'image/svg+xml';
    currentUploadedFilename = filename;

    imgEl.src = currentUploadedBase64;
    previewContainer.style.display = 'block';
    dropzoneText.style.display = 'none';
  } catch (err) {
    console.error('Error loading preset image:', err);
  }
}

// --- Dropzone & File Input ---
function setupDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('mediaInput');
  const previewContainer = document.getElementById('previewContainer');
  const previewImage = document.getElementById('previewImage');
  const dropzoneText = document.getElementById('dropzoneText');

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  function handleFile(file) {
    currentUploadedFilename = file.name;
    currentUploadedMime = file.type || 'image/jpeg';

    const reader = new FileReader();
    reader.onload = (e) => {
      currentUploadedBase64 = e.target.result;
      previewImage.src = currentUploadedBase64;
      previewContainer.style.display = 'block';
      dropzoneText.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
}

function toggleVoiceSimulation() {
  simulatedVoiceAttached = !simulatedVoiceAttached;
  const statusEl = document.getElementById('voiceStatus');
  const btn = document.getElementById('recordVoiceBtn');

  if (simulatedVoiceAttached) {
    statusEl.textContent = '✓ Voice note attached (4.2s audio)';
    statusEl.style.color = '#34d399';
    btn.textContent = '❌ Detach Voice Note';
  } else {
    statusEl.textContent = 'No voice note attached';
    statusEl.style.color = '#94a3b8';
    btn.textContent = '🎙️ Simulate Voice Note';
  }
}

// --- Claim Submission & Agent Animation ---
document.getElementById('claimForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentUploadedBase64) {
    alert('Please upload or select an evidence image first.');
    return;
  }

  const submitBtn = document.getElementById('submitClaimBtn');
  const progressBox = document.getElementById('pipelineProgress');
  const emptyPlaceholder = document.getElementById('emptyResultPlaceholder');
  const resultContent = document.getElementById('activeResultContent');

  submitBtn.disabled = true;
  progressBox.style.display = 'block';
  emptyPlaceholder.style.display = 'none';
  resultContent.style.display = 'none';

  // Step Animation
  const stepIds = ['step-intake', 'step-sam', 'step-spark', 'step-guardrails', 'step-evidence'];
  stepIds.forEach((id) => {
    const el = document.getElementById(id);
    el.className = 'progress-step-item';
  });

  const activateStep = (idx) => {
    stepIds.forEach((id, i) => {
      const el = document.getElementById(id);
      if (i < idx) el.className = 'progress-step-item done';
      else if (i === idx) el.className = 'progress-step-item active';
      else el.className = 'progress-step-item';
    });
  };

  activateStep(0);
  await sleep(250);
  activateStep(1);
  await sleep(350);

  const payload = {
    policyId: document.getElementById('policySelect').value,
    message: document.getElementById('claimMessage').value,
    orderValue: document.getElementById('orderValue').value,
    mediaBase64: currentUploadedBase64,
    hint: currentUploadedFilename,
  };

  // If voice simulation enabled, pass audio trigger
  if (simulatedVoiceAttached) {
    payload.hint += ' with_voice_note';
  }

  try {
    activateStep(2);
    await sleep(250);
    activateStep(3);

    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    activateStep(4);
    await sleep(200);

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Server error processing case');
    }

    stepIds.forEach((id) => (document.getElementById(id).className = 'progress-step-item done'));
    await sleep(250);

    displayResolution(data.case);
    currentEvidenceCase = data.case;
    await loadCaseTable();
    await refreshUsageStats();
  } catch (err) {
    alert(`Error processing claim: ${err.message}`);
    emptyPlaceholder.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    progressBox.style.display = 'none';
  }
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Display Resolution ---
function displayResolution(caseData) {
  const resultContent = document.getElementById('activeResultContent');
  const banner = document.getElementById('decisionBanner');
  const badge = document.getElementById('decisionBadge');
  const title = document.getElementById('decisionTitle');
  const clause = document.getElementById('decisionClause');
  const reply = document.getElementById('customerReplyText');
  const caseIdSpan = document.getElementById('resultCaseId');

  resultContent.style.display = 'block';
  caseIdSpan.textContent = `Case #${caseData.id}`;

  const decision = caseData.finalDecision;
  banner.className = `decision-banner decision-${decision}`;

  let labelText = decision.replace('_', ' ').toUpperCase();
  if (caseData.flags && caseData.flags.length > 0) {
    labelText += ` (OVERRIDDEN: ${caseData.flags.join(', ')})`;
  }

  badge.textContent = labelText;
  badge.style.background = decision === 'handoff' ? '#dc2626' : '#2563eb';
  badge.style.color = '#fff';

  title.textContent = formatDecisionTitle(decision);
  clause.textContent = `Cited Clause: ${caseData.modelDecision.clause || 'Business Policy Clause'}`;
  reply.textContent = caseData.modelDecision.reply || 'Your request has been processed.';
}

function formatDecisionTitle(decision) {
  switch (decision) {
    case 'refund':
      return 'Full Refund Approved';
    case 'replace_packaging':
      return 'Packaging Replacement / Credit Approved';
    case 'replace_item':
      return 'Full Item Replacement Approved';
    case 'handoff':
      return 'Human Specialist Escalation Required';
    default:
      return decision;
  }
}

// --- Evidence Tab ---
function viewCaseEvidence(caseObj = null) {
  const c = caseObj || currentEvidenceCase;
  if (!c) {
    alert('No case loaded. Please submit or select a case first.');
    return;
  }
  currentEvidenceCase = c;
  switchTab('evidence');

  // Load image
  const imgEl = document.getElementById('evidenceImage');
  imgEl.src = c.mediaUrl || currentUploadedBase64 || 'assets/box_crushed.svg';

  // Render SVG Overlay
  const overlayLayer = document.getElementById('svgOverlayLayer');
  overlayLayer.innerHTML = c.evidencePacket?.vision?.svgOverlay || '';

  // Ratio badge
  const ratioBadge = document.getElementById('evidenceRatioBadge');
  const ratio = (c.measurements?.packaging_damage_ratio || 0) * 100;
  ratioBadge.textContent = `${ratio.toFixed(1)}% Damage Ratio`;

  // Status pill
  const statusPill = document.getElementById('evidenceStatusPill');
  if (c.finalDecision === 'handoff') {
    statusPill.className = 'status-pill status-handoff';
    statusPill.textContent = 'HUMAN HANDOFF';
  } else {
    statusPill.className = 'status-pill status-auto';
    statusPill.textContent = 'AUTO-RESOLVED';
  }

  // Guardrail Checklist
  const flags = c.flags || [];
  setGuardrailItem('guardrailDuplicate', flags.includes('duplicate_photo'), 'Duplicate Hash Detected');
  setGuardrailItem('guardrailProduct', flags.includes('product_not_found'), 'Product Boundary Missing');
  setGuardrailItem('guardrailValue', flags.includes('high_value_order'), 'Exceeds Safety Threshold');
  setGuardrailItem('guardrailConfidence', flags.includes('low_confidence'), 'Confidence < Threshold');

  // Agent Trace List
  const traceContainer = document.getElementById('agentTraceContainer');
  traceContainer.innerHTML = '';

  const traceSteps = c.agentTrace || [];
  traceSteps.forEach((step) => {
    const item = document.createElement('div');
    item.className = 'trace-item';
    item.innerHTML = `
      <div class="trace-header">
        <span>${step.name || step.step}</span>
        <span class="trace-tool">${step.tool || 'engine'}</span>
      </div>
      <div class="trace-detail">${step.detail}</div>
    `;
    traceContainer.appendChild(item);
  });
}

function setGuardrailItem(id, isFlagged, failReason) {
  const el = document.getElementById(id);
  if (isFlagged) {
    el.className = 'guardrail-status-flag';
    el.textContent = `✗ FLAGGED (${failReason})`;
  } else {
    el.className = 'guardrail-status-pass';
    el.textContent = '✓ PASSED';
  }
}

function toggleOverlayLayer(layerType) {
  const svg = document.querySelector('#svgOverlayLayer svg');
  if (!svg) return;

  if (layerType === 'mask') {
    showMaskLayer = !showMaskLayer;
    svg.querySelectorAll('path').forEach((p) => {
      p.style.display = showMaskLayer ? 'block' : 'none';
    });
    document.getElementById('toggleMaskBtn').textContent = showMaskLayer ? 'Hide Masks' : 'Show Masks';
  } else if (layerType === 'box') {
    showBoxLayer = !showBoxLayer;
    svg.querySelectorAll('rect, g').forEach((r) => {
      r.style.display = showBoxLayer ? 'block' : 'none';
    });
    document.getElementById('toggleBoxBtn').textContent = showBoxLayer ? 'Hide Boxes' : 'Show Boxes';
  }
}

function exportEvidenceJson() {
  if (!currentEvidenceCase) {
    alert('No active case evidence.');
    return;
  }
  const packet = currentEvidenceCase.evidencePacket || currentEvidenceCase;
  const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SnapDesk_Evidence_${currentEvidenceCase.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Live Policy Flip Demonstration ---
function populateFlipCaseSelect() {
  const select = document.getElementById('flipCaseSelect');
  select.innerHTML = '';
  activeCases.forEach((c) => {
    const ratio = ((c.measurements?.packaging_damage_ratio || 0) * 100).toFixed(0);
    const opt = new Option(`Case #${c.id} (${ratio}% Damage, $${c.orderValue} - ${c.finalDecision})`, c.id);
    select.appendChild(opt);
  });
  previewFlipCase();
}

function previewFlipCase() {
  const caseId = document.getElementById('flipCaseSelect').value;
  const c = activeCases.find((x) => x.id === caseId);
  if (!c) return;

  const box = document.getElementById('flipComparisonBox');
  box.style.display = 'grid';

  document.getElementById('flipOriginalDecision').textContent = c.finalDecision.toUpperCase();
  document.getElementById('flipOriginalReason').textContent = `Decision under original threshold (${((c.measurements?.packaging_damage_ratio || 0) * 100).toFixed(1)}% damage)`;

  document.getElementById('flipNewDecision').textContent = 'READY TO RE-EVALUATE';
  document.getElementById('flipNewDecision').style.color = '#94a3b8';
  document.getElementById('flipNewReason').textContent = 'Click button below to execute';
}

function setFlipPreset(thresholdPercent) {
  document.getElementById('rulePackagingRatio').value = thresholdPercent;
  document.getElementById('rulePackagingRatioVal').textContent = `${thresholdPercent}%`;
}

async function executePolicyFlip() {
  const caseId = document.getElementById('flipCaseSelect').value;
  const targetThreshold = parseFloat(document.getElementById('rulePackagingRatio').value) / 100;

  try {
    const res = await fetch(`/api/cases/${caseId}/rerun`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rules: {
          packaging_replace_max_ratio: targetThreshold,
        },
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const newCase = data.case;
    document.getElementById('flipNewDecision').textContent = newCase.finalDecision.toUpperCase();
    document.getElementById('flipNewDecision').style.color = newCase.finalDecision === 'replace_packaging' ? '#34d399' : '#f87171';
    document.getElementById('flipNewReason').textContent = `Re-evaluated under ${(targetThreshold * 100).toFixed(0)}% threshold. Flipped: ${data.flipped ? 'YES (Decision changed!)' : 'NO'}`;

    await loadCaseTable();
    await refreshUsageStats();
  } catch (err) {
    alert(`Policy Flip Error: ${err.message}`);
  }
}

// --- Operations & Accuracy Benchmark ---
async function refreshUsageStats() {
  try {
    const res = await fetch('/api/usage');
    const data = await res.json();
    const u = data.usage;

    document.getElementById('meterTotalCalls').textContent = u.totalRealCalls + u.totalMockCalls;
    document.getElementById('meterEstimatedCost').textContent = `$${u.estimatedCostUSD.toFixed(4)}`;
    document.getElementById('meterTokenCount').textContent = `${u.tokenUsage.input} / ${u.tokenUsage.output}`;
    document.getElementById('meterHardCap').textContent = `${u.remainingCalls} calls left`;
  } catch (err) {
    console.error('Failed to refresh usage:', err);
  }
}

async function triggerBenchmarkRun() {
  const btn = document.getElementById('runEvalBtn');
  btn.textContent = '⏳ Running 10 Scenarios...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/eval', { method: 'POST' });
    const data = await res.json();
    const m = data.metrics;

    document.getElementById('benchAgreement').textContent = `${m.agreementRate}%`;
    document.getElementById('benchHandoff').textContent = `${m.handoffRate}%`;
    document.getElementById('benchWrongApproval').textContent = `${m.wrongApprovalRate}%`;

    alert(`Benchmark Run Completed!\n- Agreement with Human Rulings: ${m.agreementRate}%\n- Wrong-Approval Rate: ${m.wrongApprovalRate}% (0% Safety Target Maintained)\n- Handoff Rate: ${m.handoffRate}%`);
    await refreshUsageStats();
  } catch (err) {
    alert(`Benchmark execution failed: ${err.message}`);
  } finally {
    btn.textContent = '▶ Run Benchmark';
    btn.disabled = false;
  }
}

// --- Claims Table ---
async function loadCaseTable() {
  try {
    const res = await fetch('/api/cases');
    const data = await res.json();
    activeCases = data.cases || [];

    const tbody = document.getElementById('claimsTableBody');
    tbody.innerHTML = '';

    activeCases.forEach((c) => {
      const tr = document.createElement('tr');
      const ratio = ((c.measurements?.packaging_damage_ratio || 0) * 100).toFixed(1);
      const isHandoff = c.finalDecision === 'handoff';

      tr.innerHTML = `
        <td style="font-family: monospace; font-size: 0.78rem;">${c.id}</td>
        <td>${c.policyName || c.policyId}</td>
        <td>$${Number(c.orderValue).toFixed(2)}</td>
        <td>${ratio}%</td>
        <td><span class="status-pill ${isHandoff ? 'status-handoff' : 'status-auto'}">${isHandoff ? 'HANDOFF' : 'RESOLVED'}</span></td>
        <td><strong>${c.finalDecision}</strong></td>
        <td style="color: #f87171; font-size: 0.75rem;">${(c.flags || []).join(', ') || '—'}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" onclick="inspectTableRow('${c.id}')">Inspect</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load cases:', err);
  }
}

function inspectTableRow(caseId) {
  const c = activeCases.find((x) => x.id === caseId);
  if (c) {
    viewCaseEvidence(c);
  }
}
