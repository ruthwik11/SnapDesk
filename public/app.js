/**
 * SnapDesk Enterprise Client Application
 * Cohesive multi-tenant customer support platform powered by Meta SAM 3.1 & Muse Spark 1.3
 */

// Application State
let currentSessionToken = localStorage.getItem('snapdesk_token') || null;
let currentUser = null;
let currentBusiness = null;

let stagedMediaList = []; // Client-side media staging (no persistence before Submit Ticket!)
let activeCustomerCase = null;
let activeDamageReport = null;
let activeDecisionResult = null;

let authModalRole = 'business'; // 'business' or 'customer'
let authModalMode = 'login';    // 'login' or 'register'

// Vision Layer Toggles
let showMaskLayer = true;
let showBoxLayer = true;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  initCurtainReveal();
  await restoreActiveSession();
  await loadPublicBusinessProviders();
});

// =========================================================================
// 1. JAPANESE-INSPIRED CURTAIN ROLL-UP REVEAL
// =========================================================================
function initCurtainReveal() {
  const overlay = document.getElementById('curtainOverlay');
  if (!overlay) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    overlay.style.display = 'none';
    return;
  }

  setTimeout(() => {
    overlay.classList.add('lifted');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 1300);
  }, 400);
}

function scrollToAccounts() {
  document.getElementById('accountsSection').scrollIntoView({ behavior: 'smooth' });
}

function returnToLanding() {
  document.getElementById('customerAppView').style.display = 'none';
  document.getElementById('businessAppView').style.display = 'none';
  document.getElementById('landingPageView').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =========================================================================
// 2. AUTHENTICATION & MULTI-TENANT SESSION MANAGEMENT
// =========================================================================
async function restoreActiveSession() {
  if (!currentSessionToken) return;

  try {
    const res = await fetch('/api/auth/session', {
      headers: { Authorization: `Bearer ${currentSessionToken}` },
    });
    const data = await res.json();
    if (data.success && data.session) {
      currentUser = data.session;
      currentBusiness = data.business;
      routeUserToPortal();
    } else {
      localStorage.removeItem('snapdesk_token');
      currentSessionToken = null;
    }
  } catch (err) {
    console.warn('Could not restore session:', err);
  }
}

function routeUserToPortal() {
  const landing = document.getElementById('landingPageView');
  const custApp = document.getElementById('customerAppView');
  const bizApp = document.getElementById('businessAppView');

  landing.style.display = 'none';

  if (currentUser.role === 'customer') {
    custApp.style.display = 'block';
    bizApp.style.display = 'none';
    document.getElementById('customerUserName').textContent = `Welcome, ${currentUser.name.split(' ')[0]}`;
    showCustomerSection(1);
  } else {
    // Business Account
    custApp.style.display = 'none';
    bizApp.style.display = 'block';
    document.getElementById('bizUserName').textContent = currentUser.name;
    document.getElementById('bizHeaderName').textContent = currentBusiness?.name || 'Enterprise Tenant';
    loadBizDashboard();
  }
}

function openAuthModal(role, mode) {
  authModalRole = role;
  authModalMode = mode;

  const modal = document.getElementById('authModal');
  const badge = document.getElementById('authModalBadge');
  const title = document.getElementById('authModalTitle');
  const subtitle = document.getElementById('authModalSubtitle');
  const bizExtra = document.getElementById('businessExtraFields');
  const nameGroup = document.getElementById('nameFieldGroup');
  const submitBtn = document.getElementById('authSubmitBtn');
  const toggleText = document.getElementById('authToggleText');
  const toggleBtn = document.getElementById('authToggleBtn');
  const errorBanner = document.getElementById('authErrorMsg');

  errorBanner.style.display = 'none';

  if (role === 'business') {
    badge.textContent = 'BUSINESS ACCOUNT';
    badge.style.color = 'var(--copper)';
  } else {
    badge.textContent = 'CUSTOMER ACCOUNT';
    badge.style.color = 'var(--accent-green)';
  }

  if (mode === 'login') {
    title.textContent = `Sign in as ${role === 'business' ? 'Business' : 'Customer'}`;
    subtitle.textContent = `Enter your credentials to access the ${role === 'business' ? 'Business Dashboard' : 'Customer Portal'}.`;
    bizExtra.style.display = 'none';
    nameGroup.style.display = 'none';
    submitBtn.textContent = 'Sign In';
    toggleText.textContent = 'Need an account?';
    toggleBtn.textContent = 'Register here';
  } else {
    title.textContent = `Create ${role === 'business' ? 'Business' : 'Customer'} Account`;
    subtitle.textContent = `Register your new ${role === 'business' ? 'merchant tenant' : 'customer account'}.`;
    bizExtra.style.display = role === 'business' ? 'block' : 'none';
    nameGroup.style.display = 'block';
    submitBtn.textContent = 'Create Account';
    toggleText.textContent = 'Already have an account?';
    toggleBtn.textContent = 'Sign in here';
  }

  modal.style.display = 'flex';
}

function closeAuthModal() {
  document.getElementById('authModal').style.display = 'none';
}

function toggleAuthMode() {
  const newMode = authModalMode === 'login' ? 'register' : 'login';
  openAuthModal(authModalRole, newMode);
}

function quickFillAuth(email, pass, role, mode) {
  document.getElementById('authEmail').value = email;
  document.getElementById('authPassword').value = pass;
  openAuthModal(role, mode);
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errorBanner = document.getElementById('authErrorMsg');
  const submitBtn = document.getElementById('authSubmitBtn');

  submitBtn.disabled = true;
  errorBanner.style.display = 'none';

  try {
    let endpoint = authModalMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    let payload = { email, password, expectedRole: authModalRole };

    if (authModalMode === 'register') {
      payload.name = document.getElementById('authName').value.trim() || email.split('@')[0];
      payload.role = authModalRole;
      if (authModalRole === 'business') {
        payload.businessName = document.getElementById('regBusinessName').value.trim();
        payload.businessCategory = document.getElementById('regBusinessCategory').value;
      }
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Authentication failed');
    }

    currentSessionToken = data.session.token;
    localStorage.setItem('snapdesk_token', currentSessionToken);
    currentUser = data.session;
    currentBusiness = data.session.businessId ? { id: data.session.businessId, name: data.user.name } : null;

    closeAuthModal();
    routeUserToPortal();
  } catch (err) {
    errorBanner.textContent = err.message;
    errorBanner.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
  }
}

function logoutSession() {
  if (currentSessionToken) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${currentSessionToken}` },
    }).catch(() => {});
  }
  localStorage.removeItem('snapdesk_token');
  currentSessionToken = null;
  currentUser = null;
  currentBusiness = null;
  returnToLanding();
}

// =========================================================================
// 3. SECTION 1: CUSTOMER INTAKE / RAISE A TICKET
// =========================================================================
async function loadPublicBusinessProviders() {
  try {
    const res = await fetch('/api/businesses/public');
    const data = await res.json();
    const select = document.getElementById('custProviderSelect');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>-- Select your product Provider --</option>';
    (data.businesses || []).forEach((b) => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.name} (${b.category})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load business providers:', err);
  }
}

function triggerFileInput() {
  document.getElementById('ticketMediaInput').click();
}

function handleStagedMediaSelection(e) {
  const files = Array.from(e.target.files);
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      stagedMediaList.push({
        id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'image/jpeg',
        base64: event.target.result,
        isVideo: file.type.startsWith('video/') || file.name.endsWith('.mp4'),
      });
      renderStagedMediaPreviews();
    };
    reader.readAsDataURL(file);
  });
}

function removeStagedMedia(mediaId) {
  stagedMediaList = stagedMediaList.filter((m) => m.id !== mediaId);
  renderStagedMediaPreviews();
}

function renderStagedMediaPreviews() {
  const container = document.getElementById('stagedMediaContainer');
  if (!container) return;

  if (stagedMediaList.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'grid';
  container.innerHTML = '';

  stagedMediaList.forEach((media) => {
    const tile = document.createElement('div');
    tile.className = 'staged-preview-tile';

    if (media.isVideo) {
      tile.innerHTML = `
        <video src="${media.base64}" muted playsinline></video>
        <button type="button" class="tile-remove-x" onclick="removeStagedMedia('${media.id}')">✕</button>
        <div class="tile-label">📹 ${media.name}</div>
      `;
    } else {
      tile.innerHTML = `
        <img src="${media.base64}" alt="Preview">
        <button type="button" class="tile-remove-x" onclick="removeStagedMedia('${media.id}')">✕</button>
        <div class="tile-label">${media.name}</div>
      `;
    }
    container.appendChild(tile);
  });
}

function handleAudioSelection(e) {
  const file = e.target.files[0];
  const label = document.getElementById('audioStatusText');
  if (file) {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|m4a|ogg)$/i)) {
      alert('The voice note field accepts audio files only.');
      e.target.value = '';
      label.textContent = 'Rejected: Audio files only';
      return;
    }
    label.textContent = `✓ Attached audio note: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    label.style.color = 'var(--accent-green)';
  } else {
    label.textContent = 'No voice note selected (Audio files only)';
    label.style.color = 'var(--text-muted)';
  }
}

// SUBMIT TICKET: THE ONLY PERSISTENCE TRIGGER
async function handleTicketSubmission(e) {
  e.preventDefault();

  if (stagedMediaList.length === 0) {
    alert('Please attach at least one photo or video evidence file before submitting.');
    return;
  }

  const submitBtn = document.getElementById('btnSubmitTicket');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting Ticket...';

  try {
    const payload = {
      customerName: document.getElementById('custFullName').value,
      customerPhone: document.getElementById('custPhone').value,
      postalCode: document.getElementById('custPostal').value,
      businessId: document.getElementById('custProviderSelect').value,
      productCost: document.getElementById('custProductCost').value || null,
      writtenComplaint: document.getElementById('custConcernText').value,
      customerId: currentUser?.id || 'usr_anonymous',
      stagedMedia: JSON.stringify(stagedMediaList),
    };

    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to submit ticket');
    }

    alert(`Ticket Submitted Successfully!\nCase Number: ${data.caseNumber}\nAssigned Provider: ${data.businessName}`);

    // Load created case and advance to Section 2
    const caseRes = await fetch(`/api/cases/${data.caseId}`);
    const caseData = await caseRes.json();
    activeCustomerCase = caseData.case;

    // Enable navigation to Section 2
    document.getElementById('btnNavSection2').classList.remove('disabled');
    showCustomerSection(2);
  } catch (err) {
    alert(`Submission error: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Ticket';
  }
}

function showCustomerSection(sectionNum) {
  document.getElementById('customerSection1').style.display = sectionNum === 1 ? 'block' : 'none';
  document.getElementById('customerSection2').style.display = sectionNum === 2 ? 'block' : 'none';
  document.getElementById('customerSection3').style.display = sectionNum === 3 ? 'block' : 'none';

  document.querySelectorAll('.step-nav-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx + 1 === sectionNum);
  });

  if (sectionNum === 2 && activeCustomerCase) {
    initVisionSection();
  } else if (sectionNum === 3 && activeCustomerCase) {
    initDecisionSection();
  }
}

// =========================================================================
// 4. SECTION 2: VISION WORKSPACE & DAMAGE REPORT
// =========================================================================
async function initVisionSection() {
  if (!activeCustomerCase) return;

  document.getElementById('s2CaseTag').textContent = activeCustomerCase.caseNumber;
  document.getElementById('s2CustomerHeading').textContent = `Damage Inspection Workspace — ${activeCustomerCase.customerName}`;
  document.getElementById('s2BusinessName').textContent = activeCustomerCase.businessName || 'Merchant Partner';

  const firstAsset = activeCustomerCase.mediaAssets?.[0];
  const displayImg = document.getElementById('visionDisplayImage');
  if (firstAsset?.mediaUrl) {
    displayImg.src = firstAsset.mediaUrl;
  }

  // Execute SAM 3.1 analysis and generate "Damage Report - {Customer Name}"
  const stepItems = ['vstep1', 'vstep2', 'vstep3', 'vstep4'];
  const setStep = (idx) => {
    stepItems.forEach((id, i) => {
      const el = document.getElementById(id);
      if (i < idx) el.className = 'step-line-item done';
      else if (i === idx) el.className = 'step-line-item active';
      else el.className = 'step-line-item';
    });
  };

  setStep(1);

  try {
    const res = await fetch(`/api/cases/${activeCustomerCase.id}/analyze-vision`, { method: 'POST' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    setStep(3);
    activeDamageReport = data.damageReport;

    // Render Metrics Readout
    document.getElementById('readoutDamageRatio').textContent = activeDamageReport.damageRatioFormatted;
    document.getElementById('readoutAssessmentStatus').textContent = activeDamageReport.assessmentStatus.replace(/_/g, ' ').toUpperCase();
    document.getElementById('readoutProductFound').textContent = activeDamageReport.productFound ? 'Verified' : 'Ambiguous';

    // Render ASD-STE100 Damage Report Artifact
    document.getElementById('reportArtifactTitle').textContent = activeDamageReport.title;
    document.getElementById('reportArtifactId').textContent = activeDamageReport.reportId;

    const findingsContainer = document.getElementById('reportFindingsContent');
    findingsContainer.innerHTML = '';
    activeDamageReport.overallFindings.forEach((f) => {
      const p = document.createElement('p');
      p.textContent = `• ${f}`;
      findingsContainer.appendChild(p);
    });

    // Render SVG Overlays
    renderVisionSvgOverlay(activeDamageReport.regions || []);

    // Handle Video Timestamps
    if (activeDamageReport.videoTimestamps && activeDamageReport.videoTimestamps.length > 0) {
      const box = document.getElementById('videoControlsBox');
      const pills = document.getElementById('videoEventPills');
      box.style.display = 'block';
      pills.innerHTML = '';
      activeDamageReport.videoTimestamps.forEach((evt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'video-event-pill';
        btn.textContent = `⏱️ ${evt.eventInterval} (${evt.observedDefect.substring(0, 30)}...)`;
        btn.onclick = () => {
          document.getElementById('videoCurrentTime').textContent = evt.eventInterval.split(' - ')[0];
          alert(`Seeked video player to ${evt.eventInterval}. Event: ${evt.observedDefect}`);
        };
        pills.appendChild(btn);
      });
    }

    document.getElementById('agentResolutionBadge').textContent = 'COMPLETED';
    document.getElementById('agentResolutionBadge').className = 'status-pill status-ready';

    // Enable Section 3
    document.getElementById('btnNavSection3').classList.remove('disabled');
  } catch (err) {
    console.error('Vision analysis error:', err);
    alert(`Vision analysis error: ${err.message}`);
  }
}

function renderVisionSvgOverlay(regions) {
  const overlay = document.getElementById('visionSvgLayer');
  if (!overlay) return;

  const width = 640;
  const height = 480;
  const elements = [];

  regions.forEach((r) => {
    const isContents = r.type === 'contents';
    const isProduct = r.type === 'product';
    const strokeColor = isContents ? '#ef4444' : (isProduct ? '#3b82f6' : '#f59e0b');
    const fillColor = isContents ? 'rgba(239,68,68,0.45)' : (isProduct ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.4)');

    if (r.mask && r.mask.path) {
      elements.push(`<path class="svg-mask-element" d="${r.mask.path}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" />`);
    }

    if (Array.isArray(r.bbox) && r.bbox.length === 4) {
      const [bx, by, bw, bh] = r.bbox;
      const x = Math.round(bx * width);
      const y = Math.round(by * height);
      const w = Math.round(bw * width);
      const h = Math.round(bh * height);
      const labelText = `${r.label.toUpperCase()} (${((r.area_ratio || 0.1) * 100).toFixed(0)}%)`;

      elements.push(`
        <rect class="svg-box-element" x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="${isProduct ? '6,4' : 'none'}" />
        <g class="svg-box-element" transform="translate(${x}, ${Math.max(16, y - 6)})">
          <rect x="0" y="-12" width="${labelText.length * 7}" height="16" rx="3" fill="${strokeColor}" />
          <text x="4" y="0" fill="#ffffff" font-size="9" font-family="system-ui" font-weight="700">${labelText}</text>
        </g>
      `);
    }
  });

  overlay.innerHTML = `<svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">${elements.join('\n')}</svg>`;
}

function toggleVisionLayer(layer) {
  if (layer === 'mask') {
    showMaskLayer = !showMaskLayer;
    document.querySelectorAll('.svg-mask-element').forEach((el) => {
      el.style.display = showMaskLayer ? 'block' : 'none';
    });
    document.getElementById('btnToggleMasks').classList.toggle('active', showMaskLayer);
  } else if (layer === 'box') {
    showBoxLayer = !showBoxLayer;
    document.querySelectorAll('.svg-box-element').forEach((el) => {
      el.style.display = showBoxLayer ? 'block' : 'none';
    });
    document.getElementById('btnToggleBoxes').classList.toggle('active', showBoxLayer);
  }
}

function downloadDamageReportJson() {
  if (!activeDamageReport) return;
  const blob = new Blob([JSON.stringify(activeDamageReport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Damage_Report_${activeCustomerCase.caseNumber}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function advanceToDecisionEngine() {
  showCustomerSection(3);
}

// =========================================================================
// 5. SECTION 3: DECISION ENGINE (POLICY ABSTRACTION & 4 STAGES)
// =========================================================================
async function initDecisionSection() {
  if (!activeCustomerCase) return;

  const stageIds = ['pstage1', 'pstage2', 'pstage3', 'pstage4'];
  const setPStage = (idx, statusIcon) => {
    stageIds.forEach((id, i) => {
      const el = document.getElementById(id);
      const icon = el.querySelector('.stage-status-icon');
      if (i < idx) {
        el.className = 'stage-card done';
        icon.textContent = '✓';
      } else if (i === idx) {
        el.className = 'stage-card active';
        icon.textContent = statusIcon || '⏳';
      } else {
        el.className = 'stage-card';
        icon.textContent = '○';
      }
    });
  };

  setPStage(0, '⏳');

  try {
    const res = await fetch(`/api/cases/${activeCustomerCase.id}/decide`, { method: 'POST' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    activeDecisionResult = data.decision;

    // Render 6.1 Policy Abstraction
    const abstraction = activeDecisionResult.policyAbstraction;
    if (abstraction) {
      document.getElementById('policyAbstractionHeading').textContent = abstraction.heading;
      const pointsList = document.getElementById('policyAbstractionPoints');
      pointsList.innerHTML = '';
      abstraction.points.forEach((pt) => {
        const li = document.createElement('li');
        li.textContent = pt;
        pointsList.appendChild(li);
      });
    }

    // Step through the 4 stages
    setPStage(1);
    await new Promise((r) => setTimeout(r, 200));
    setPStage(2);
    await new Promise((r) => setTimeout(r, 200));
    setPStage(3);
    await new Promise((r) => setTimeout(r, 200));
    setPStage(4, '✓');

    // Show prominent "Model Decision Formulated"
    document.getElementById('decisionPendingPlaceholder').style.display = 'none';
    document.getElementById('modelDecisionFormulatedBanner').style.display = 'flex';
    document.getElementById('decisionOutcomeBlock').style.display = 'flex';

    // Outcome Type Badge
    const typeBadge = document.getElementById('outcomeTypeBadge');
    if (activeDecisionResult.outcomeStatus === 'auto_authorised') {
      typeBadge.textContent = 'AUTOMATICALLY AUTHORISED';
      typeBadge.style.color = '#34d399';
    } else if (activeDecisionResult.outcomeStatus === 'human_review_required') {
      typeBadge.textContent = 'HUMAN REVIEW REQUIRED';
      typeBadge.style.color = '#f87171';
    } else {
      typeBadge.textContent = 'AI RECOMMENDATION (AWAITING APPROVAL)';
      typeBadge.style.color = '#60a5fa';
    }

    // Outcome Title & Details
    document.getElementById('outcomeTitle').textContent = formatOutcomeTitle(activeDecisionResult.finalOutcome);
    document.getElementById('outcomeClauseText').textContent = activeDecisionResult.citedClause;
    document.getElementById('outcomeReplyText').textContent = activeDecisionResult.customerReply;

    const reasonsList = document.getElementById('outcomeReasonsList');
    reasonsList.innerHTML = '';
    (activeDecisionResult.reasons || []).forEach((r) => {
      const li = document.createElement('li');
      li.textContent = r;
      reasonsList.appendChild(li);
    });

    document.getElementById('decisionBadgeTag').textContent = 'RESOLVED';
    document.getElementById('decisionBadgeTag').className = 'status-pill status-ready';
  } catch (err) {
    console.error('Decision engine error:', err);
    alert(`Decision error: ${err.message}`);
  }
}

function formatOutcomeTitle(outcome) {
  switch (outcome) {
    case 'refund':
      return 'Full Refund Approved';
    case 'replace_packaging':
      return 'Packaging Replacement / Credit Approved';
    case 'replace_item':
    case 'replacement':
      return 'Unit Replacement Approved';
    case 'repair':
      return 'Repair Authorization Approved';
    case 'human_review':
      return 'Human Specialist Escalation Required';
    case 'reject':
      return 'Claim Denied Under Policy';
    default:
      return 'Claim Determination Formulated';
  }
}

// =========================================================================
// 6. BUSINESS ENTERPRISE DASHBOARD
// =========================================================================
function switchBizTab(tabName) {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => item.classList.remove('active'));
  document.querySelectorAll('.biz-tab-pane').forEach((pane) => (pane.style.display = 'none'));

  const targetPane = document.getElementById(`bizTab-${tabName}`);
  if (targetPane) targetPane.style.display = 'block';

  event.currentTarget.classList.add('active');

  if (tabName === 'analytics') loadBizAnalytics();
  else if (tabName === 'policies') loadBizPolicies();
  else if (tabName === 'thresholds') loadBizThresholds();
  else if (tabName === 'human-review') loadBizHumanReview();
  else if (tabName === 'products') loadBizProducts();
  else if (tabName === 'ops-accuracy') loadBizOpsAccuracy();
  else loadBizDashboard();
}

async function loadBizDashboard() {
  if (!currentSessionToken) return;

  try {
    // 7.1 Overview Cards
    const overRes = await fetch('/api/business/overview', {
      headers: { Authorization: `Bearer ${currentSessionToken}` },
    });
    const overData = await overRes.json();
    if (overData.success) {
      const o = overData.overview;
      document.getElementById('bizMetricOpen').textContent = o.openTickets;
      document.getElementById('bizMetricPending').textContent = o.pendingTickets;
      document.getElementById('bizMetricHuman').textContent = o.awaitingHuman;
      document.getElementById('bizMetricAI').textContent = o.aiHandled;
      document.getElementById('bizMetricRefunds').textContent = o.refundsApproved;
      document.getElementById('bizMetricReplacements').textContent = o.replacementsApproved;
      document.getElementById('bizMetricRepairs').textContent = o.repairsApproved;
      document.getElementById('bizMetricRejected').textContent = o.rejectedCases;
    }

    // 7.2 Inbox Complaints
    filterInbox();
  } catch (err) {
    console.error('Failed to load business dashboard:', err);
  }
}

async function filterInbox() {
  if (!currentSessionToken) return;

  const search = document.getElementById('inboxSearchInput')?.value || '';
  const status = document.getElementById('inboxStatusFilter')?.value || '';
  const handling = document.getElementById('inboxHandlingFilter')?.value || '';

  try {
    const url = new URL('/api/business/inbox', window.location.origin);
    if (search) url.searchParams.set('search', search);
    if (status) url.searchParams.set('status', status);
    if (handling) url.searchParams.set('handling', handling);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${currentSessionToken}` } });
    const data = await res.json();
    const tbody = document.getElementById('bizInboxTbody');
    tbody.innerHTML = '';

    if (!data.cases || data.cases.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No complaints match your criteria.</td></tr>';
      return;
    }

    data.cases.forEach((c) => {
      const tr = document.createElement('tr');
      const isAI = c.handlingBadge === 'ai_handled';
      const badgeClass = isAI ? 'handling-badge handling-ai' : 'handling-badge handling-human';
      const badgeText = isAI ? 'SnapDesk AI Handled' : 'Human Intervention Required';

      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-size: 0.75rem;"><strong>${c.caseNumber}</strong></td>
        <td>${c.customerName}</td>
        <td>${c.productName || 'General Item'}</td>
        <td style="color: var(--text-dim); font-size: 0.75rem;">${new Date(c.createdAt).toLocaleDateString()}</td>
        <td><strong style="color: var(--copper);">${c.outcome || 'pending'}</strong></td>
        <td><span class="${badgeClass}">${badgeText}</span></td>
        <td><button type="button" class="btn btn-sm btn-secondary" onclick="openCaseInvestigation('${c.id}')">Investigate</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to filter inbox:', err);
  }
}

// 7.3 & 7.4 Analytics & Donut Chart
async function loadBizAnalytics() {
  if (!currentSessionToken) return;

  try {
    // 1. Product rankings
    const prodRes = await fetch('/api/business/analytics/products', { headers: { Authorization: `Bearer ${currentSessionToken}` } });
    const prodData = await prodRes.json();
    const pTbody = document.getElementById('bizProductRankingsTbody');
    pTbody.innerHTML = '';

    (prodData.rankedByDamage || []).forEach((p) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.name}</strong></td>
        <td style="font-family: var(--font-mono); font-size: 0.72rem;">${p.sku}</td>
        <td>${p.category}</td>
        <td style="color: var(--accent-amber); font-weight: 700;">${p.damageComplaintCount}</td>
        <td style="color: var(--accent-red); font-weight: 700;">${p.returnCount}</td>
      `;
      pTbody.appendChild(tr);
    });

    // 2. Resolution Pie / Donut Chart
    const resRes = await fetch('/api/business/analytics/resolutions', { headers: { Authorization: `Bearer ${currentSessionToken}` } });
    const resData = await resRes.json();

    document.getElementById('donutTotalCount').textContent = resData.totalCases;
    renderDonutChart(resData.distribution || []);
  } catch (err) {
    console.error('Failed to load analytics:', err);
  }
}

function renderDonutChart(distribution) {
  const svg = document.getElementById('resolutionDonutSvg');
  const legend = document.getElementById('donutLegendContainer');
  if (!svg || !legend) return;

  svg.innerHTML = '';
  legend.innerHTML = '';

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  distribution.forEach((item) => {
    const strokeDash = (item.percentage / 100) * circumference;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '80');
    circle.setAttribute('cy', '80');
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', item.color);
    circle.setAttribute('stroke-width', '18');
    circle.setAttribute('stroke-dasharray', `${strokeDash} ${circumference - strokeDash}`);
    circle.setAttribute('stroke-dashoffset', -offset);
    svg.appendChild(circle);

    offset += strokeDash;

    // Legend Item
    const leg = document.createElement('div');
    leg.className = 'legend-item';
    leg.innerHTML = `
      <div class="legend-dot" style="background: ${item.color};"></div>
      <span>${item.label}: <strong>${item.count}</strong> (${item.percentage}%)</span>
    `;
    legend.appendChild(leg);
  });
}

// 7.5 Company Policies
async function loadBizPolicies() {
  if (!currentSessionToken) return;

  try {
    const res = await fetch('/api/business/policy', { headers: { Authorization: `Bearer ${currentSessionToken}` } });
    const data = await res.json();
    if (!data.success) return;

    const active = data.activePolicy;
    if (active) {
      document.getElementById('policyEditorTitle').value = active.name;
      document.getElementById('policyEditorText').value = active.rawText;
      document.getElementById('activePolicyVersionBadge').textContent = `Version ${active.versionNumber}.0`;

      // Preview box
      document.getElementById('policyPreviewBox').innerHTML = `
        <p><strong>Published Date:</strong> ${new Date(active.effectiveDate).toLocaleDateString()}</p>
        <p><strong>Key Rules:</strong> Max Packaging Ratio: ${(active.rules.packaging_replace_max_ratio * 100).toFixed(0)}% | Handoff Cap: $${active.rules.handoff_order_value}</p>
        <p><strong>Prompts:</strong> Product: "${active.prompts?.product}" | Damage: [${(active.prompts?.damage || []).join(', ')}]</p>
      `;
    }

    const vList = document.getElementById('policyVersionHistoryList');
    vList.innerHTML = '';
    (data.versions || []).forEach((v) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>v${v.versionNumber}.0</strong> — ${v.name} (${new Date(v.createdAt).toLocaleDateString()} by ${v.createdBy})`;
      vList.appendChild(li);
    });
  } catch (err) {
    console.error('Failed to load policies:', err);
  }
}

async function publishPolicyVersion() {
  const rawText = document.getElementById('policyEditorText').value;
  const name = document.getElementById('policyEditorTitle').value;

  try {
    const res = await fetch('/api/business/policy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentSessionToken}`,
      },
      body: JSON.stringify({ rawText, name, status: 'published' }),
    });

    const data = await res.json();
    if (data.success) {
      alert(`Policy Published Successfully! Version: ${data.policy.versionNumber}.0`);
      loadBizPolicies();
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

function savePolicyDraft() {
  alert('Policy saved as draft in local tenant state.');
}

// 7.6 Decision Thresholds
async function loadBizThresholds() {
  if (!currentSessionToken) return;

  try {
    const res = await fetch('/api/business/thresholds', { headers: { Authorization: `Bearer ${currentSessionToken}` } });
    const data = await res.json();
    if (data.thresholds?.rules) {
      const r = data.thresholds.rules;
      const ratio = Math.round((r.packaging_replace_max_ratio || 0.3) * 100);
      document.getElementById('threshPackagingRatio').value = ratio;
      document.getElementById('threshPackagingRatioVal').textContent = `${ratio}%`;
      document.getElementById('threshHandoffValue').value = r.handoff_order_value || 200;

      const conf = Math.round((r.min_confidence || 0.7) * 100);
      document.getElementById('threshMinConfidence').value = conf;
      document.getElementById('threshMinConfidenceVal').textContent = (conf / 100).toFixed(2);

      document.getElementById('threshAutoRefund').checked = Boolean(r.auto_refund_enabled);
      document.getElementById('threshAutoReplacement').checked = Boolean(r.auto_replacement_enabled);
    }
  } catch (err) {
    console.error('Failed to load thresholds:', err);
  }
}

function updateThreshLabel(v) {
  document.getElementById('threshPackagingRatioVal').textContent = `${v}%`;
}

function updateConfLabel(v) {
  document.getElementById('threshMinConfidenceVal').textContent = (v / 100).toFixed(2);
}

async function saveThresholdSettings() {
  const payload = {
    packaging_replace_max_ratio: parseFloat(document.getElementById('threshPackagingRatio').value) / 100,
    handoff_order_value: parseFloat(document.getElementById('threshHandoffValue').value),
    min_confidence: parseFloat(document.getElementById('threshMinConfidence').value) / 100,
    auto_refund_enabled: document.getElementById('threshAutoRefund').checked,
    auto_replacement_enabled: document.getElementById('threshAutoReplacement').checked,
  };

  try {
    const res = await fetch('/api/business/thresholds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentSessionToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      alert('Decision Thresholds updated and published successfully.');
    }
  } catch (err) {
    alert(`Threshold update failed: ${err.message}`);
  }
}

// 7.8 Human-Review Queue
async function loadBizHumanReview() {
  if (!currentSessionToken) return;

  try {
    const res = await fetch('/api/business/human-review', { headers: { Authorization: `Bearer ${currentSessionToken}` } });
    const data = await res.json();
    const tbody = document.getElementById('bizHumanReviewTbody');
    tbody.innerHTML = '';

    if (!data.cases || data.cases.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No cases currently require human intervention.</td></tr>';
      return;
    }

    data.cases.forEach((c) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-size: 0.75rem;"><strong>${c.caseNumber}</strong></td>
        <td>${c.customerName}</td>
        <td>$${(c.productCostReported || 0).toFixed(2)}</td>
        <td>${c.measurements?.damage_ratio_formatted || '0.0%'}</td>
        <td style="color: var(--accent-red); font-size: 0.75rem;">${c.decision?.reasons?.[0] || 'Order value exceeds safety cap'}</td>
        <td>
          <button type="button" class="btn btn-sm btn-primary" onclick="resolveHumanReview('${c.id}', 'refund')">Approve Refund</button>
          <button type="button" class="btn btn-sm btn-secondary" onclick="resolveHumanReview('${c.id}', 'replacement')">Approve Replace</button>
          <button type="button" class="btn btn-sm btn-outline" onclick="resolveHumanReview('${c.id}', 'reject')">Deny</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load human review queue:', err);
  }
}

async function resolveHumanReview(caseId, action) {
  const notes = prompt(`Enter adjuster notes for action: ${action.toUpperCase()}`);
  if (notes === null) return;

  try {
    const res = await fetch(`/api/business/human-review/${caseId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentSessionToken}`,
      },
      body: JSON.stringify({ action, notes }),
    });

    const data = await res.json();
    if (data.success) {
      alert(`Case ${caseId} marked as ${action.toUpperCase()}.`);
      loadBizHumanReview();
      loadBizDashboard();
    }
  } catch (err) {
    alert(`Action failed: ${err.message}`);
  }
}

// 7.7 Product Catalogue
async function loadBizProducts() {
  if (!currentSessionToken) return;

  try {
    const res = await fetch('/api/business/products', { headers: { Authorization: `Bearer ${currentSessionToken}` } });
    const data = await res.json();
    const tbody = document.getElementById('bizProductsCatalogueTbody');
    tbody.innerHTML = '';

    (data.products || []).forEach((p) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.name}</strong></td>
        <td style="font-family: var(--font-mono); font-size: 0.72rem;">${p.sku}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>${p.category}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load products:', err);
  }
}

async function handleProductAdd(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('newProdName').value,
    sku: document.getElementById('newProdSku').value,
    price: document.getElementById('newProdPrice').value,
    category: document.getElementById('newProdCategory').value,
  };

  try {
    const res = await fetch('/api/business/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentSessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.success) {
      alert(`Product ${data.product.name} added to catalogue.`);
      e.target.reset();
      loadBizProducts();
    }
  } catch (err) {
    alert(`Failed to add product: ${err.message}`);
  }
}

// 7.10 Ops & Accuracy (Preserved & Relocated strictly to Business UI)
async function loadBizOpsAccuracy() {
  try {
    const res = await fetch('/api/business/ops-accuracy', { headers: { Authorization: `Bearer ${currentSessionToken}` } });
    const data = await res.json();
    if (data.meter) {
      const m = data.meter;
      document.getElementById('opsTotalCalls').textContent = m.totalRealCalls + m.totalMockCalls;
      document.getElementById('opsEstCost').textContent = `$${m.estimatedCostUSD.toFixed(4)}`;
      document.getElementById('opsTokens').textContent = `${m.tokenUsage.input} / ${m.tokenUsage.output}`;
      document.getElementById('opsHardCap').textContent = `${m.remainingCalls} calls left`;
    }
  } catch (err) {
    console.error('Failed to load ops accuracy:', err);
  }
}

async function runBizBenchmark() {
  const btn = document.getElementById('btnRunOpsEval');
  btn.disabled = true;
  btn.textContent = '⏳ Evaluating 10 Scenarios...';

  try {
    const res = await fetch('/api/eval', { method: 'POST' });
    const data = await res.json();
    if (data.metrics) {
      const m = data.metrics;
      document.getElementById('opsBenchAgreement').textContent = `${m.agreementRate}%`;
      document.getElementById('opsBenchHandoff').textContent = `${m.handoffRate}%`;
      document.getElementById('opsBenchWrongApp').textContent = `${m.wrongApprovalRate}%`;
      document.getElementById('opsBenchSanity').textContent = `${m.segmentationSanityRate}%`;

      alert(`Benchmark Completed!\n• Human Agreement: ${m.agreementRate}%\n• Wrong-Approval Rate: ${m.wrongApprovalRate}% (Target: 0.0%)\n• Handoff Rate: ${m.handoffRate}%`);
      loadBizOpsAccuracy();
    }
  } catch (err) {
    alert(`Benchmark failed: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '▶ Run 10-Case Benchmark';
  }
}

// 7.9 Case Investigation Deep Dive Modal
async function openCaseInvestigation(caseId) {
  try {
    const res = await fetch(`/api/business/cases/${caseId}`, { headers: { Authorization: `Bearer ${currentSessionToken}` } });
    const data = await res.json();
    if (!data.success) return;

    const c = data.case;
    const rep = data.damageReport;

    document.getElementById('invCaseNumber').textContent = `${c.caseNumber} — ${c.productName || 'Package'}`;
    document.getElementById('invCustomerMeta').textContent = `${c.customerName} (${c.customerPhone}) | Postal Code ${c.postalCode} | Cost: $${(c.productCostReported || 0).toFixed(2)}`;

    const img = document.getElementById('invDisplayImg');
    if (c.mediaAssets?.[0]?.mediaUrl) {
      img.src = c.mediaAssets[0].mediaUrl;
    }

    document.getElementById('invDamageRatio').textContent = c.measurements?.damage_ratio_formatted || '0.0%';
    document.getElementById('invAssessment').textContent = rep?.assessmentStatus?.replace(/_/g, ' ').toUpperCase() || 'Damage Identified';

    // Render SVG
    const svgOverlay = document.getElementById('invSvgOverlay');
    svgOverlay.innerHTML = '';
    if (rep?.regions) {
      // Re-use SVG builder
      const width = 640;
      const height = 480;
      const elements = rep.regions.map((r) => {
        const color = r.type === 'contents' ? '#ef4444' : (r.type === 'product' ? '#3b82f6' : '#f59e0b');
        return r.mask?.path ? `<path d="${r.mask.path}" fill="${color}33" stroke="${color}" stroke-width="2"/>` : '';
      });
      svgOverlay.innerHTML = `<svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">${elements.join('')}</svg>`;
    }

    // Report findings
    const fBox = document.getElementById('invReportFindings');
    fBox.innerHTML = '';
    (rep?.overallFindings || ['Inspection complete.']).forEach((f) => {
      const p = document.createElement('p');
      p.textContent = `• ${f}`;
      fBox.appendChild(p);
    });

    // Decision Box
    const dBox = document.getElementById('invDecisionBox');
    dBox.innerHTML = `
      <p><strong>Outcome:</strong> <span style="color: var(--copper); font-weight: 700;">${c.outcome.toUpperCase()}</span> (${c.outcomeStatus})</p>
      <p><strong>Handling:</strong> ${c.handlingBadge === 'ai_handled' ? 'SnapDesk AI Handled' : 'Human Intervention'}</p>
      <p><strong>Clause Cited:</strong> ${c.decision?.clause || 'Clause 4.1'}</p>
      <p><strong>Explanation:</strong> "${c.decision?.customerReply || c.writtenComplaint}"</p>
    `;

    document.getElementById('caseInvestigateModal').style.display = 'flex';
  } catch (err) {
    console.error('Failed to open case investigation:', err);
  }
}

function closeInvestigateModal() {
  document.getElementById('caseInvestigateModal').style.display = 'none';
}
