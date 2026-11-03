/**
 * SnapDesk Business Portal Routes
 * Strictly tenant-isolated: all queries and mutations are filtered by req.businessId.
 */

import express from 'express';
import { tenantStore } from '../models/tenant_store.js';
import { requireBusiness } from '../services/auth.js';
import { meter } from '../meter.js';
import { runEvaluation } from '../eval.js';

const router = express.Router();

// --- 1. PUBLIC ENDPOINT FOR CUSTOMER INTAKE ---
// Returns active business providers only (never customers)
router.get('/public', (req, res) => {
  const list = tenantStore.getAllActiveBusinesses().map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    displayDescription: b.displayDescription,
  }));
  res.json({ success: true, businesses: list });
});

// All routes below require an authenticated Business Account
router.use(requireBusiness);

// --- 2. BUSINESS DASHBOARD OVERVIEW ---
router.get('/overview', (req, res) => {
  const businessId = req.businessId;
  const cases = tenantStore.getCasesByBusiness(businessId);

  const openTickets = cases.filter((c) => c.status !== 'closed').length;
  const closedTickets = cases.filter((c) => c.status === 'closed').length;
  const pendingTickets = cases.filter((c) => c.status === 'pending').length;

  const awaitingHuman = cases.filter((c) => c.outcome === 'human_review' || c.handlingBadge === 'human_intervention_required').length;
  const aiHandled = cases.filter((c) => c.handlingBadge === 'ai_handled').length;

  const refundsApproved = cases.filter((c) => c.outcome === 'refund' && c.outcomeStatus === 'auto_authorised').length;
  const repairsApproved = cases.filter((c) => c.outcome === 'repair').length;
  const replacementsApproved = cases.filter((c) => c.outcome === 'replace_item' || c.outcome === 'replacement').length;
  const rejectedCases = cases.filter((c) => c.outcome === 'reject').length;

  res.json({
    success: true,
    overview: {
      totalCases: cases.length,
      openTickets,
      closedTickets,
      pendingTickets,
      awaitingHuman,
      aiHandled,
      refundsApproved,
      repairsApproved,
      replacementsApproved,
      rejectedCases,
    },
  });
});

// --- 3. INBOX ---
router.get('/inbox', (req, res) => {
  const businessId = req.businessId;
  let cases = tenantStore.getCasesByBusiness(businessId);

  const { status, handling, search } = req.query;
  if (status) {
    cases = cases.filter((c) => c.status === status);
  }
  if (handling) {
    cases = cases.filter((c) => c.handlingBadge === handling);
  }
  if (search) {
    const q = search.toLowerCase();
    cases = cases.filter(
      (c) =>
        c.caseNumber.toLowerCase().includes(q) ||
        (c.customerName && c.customerName.toLowerCase().includes(q)) ||
        (c.productName && c.productName.toLowerCase().includes(q)) ||
        (c.writtenComplaint && c.writtenComplaint.toLowerCase().includes(q))
    );
  }

  res.json({
    success: true,
    total: cases.length,
    cases,
  });
});

// --- 4. PRODUCT DAMAGE & RETURN ANALYTICS ---
router.get('/analytics/products', (req, res) => {
  const businessId = req.businessId;
  const cases = tenantStore.getCasesByBusiness(businessId);
  const products = tenantStore.getProductsByBusiness(businessId);

  // Calculate damage and return counts per product
  const productStats = new Map();
  products.forEach((p) => {
    productStats.set(p.id, {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: p.price,
      damageComplaintCount: 0,
      returnCount: 0,
      avgDamageRatio: 0,
    });
  });

  cases.forEach((c) => {
    let stat = c.productId ? productStats.get(c.productId) : null;
    if (!stat) {
      stat = {
        id: c.productId || 'unassigned',
        name: c.productName || 'General Parcel Item',
        sku: 'GEN-01',
        category: 'General',
        price: c.productCostReported || 50,
        damageComplaintCount: 0,
        returnCount: 0,
        avgDamageRatio: 0,
      };
      productStats.set(stat.id, stat);
    }

    stat.damageComplaintCount += 1;
    if (c.outcome === 'refund' || c.outcome === 'replace_item') {
      stat.returnCount += 1;
    }
  });

  const rankedByDamage = Array.from(productStats.values()).sort((a, b) => b.damageComplaintCount - a.damageComplaintCount);
  const rankedByReturn = Array.from(productStats.values()).sort((a, b) => b.returnCount - a.returnCount);

  res.json({
    success: true,
    rankedByDamage,
    rankedByReturn,
  });
});

// --- 5. RESOLUTION ANALYTICS (PIE / DONUT DATA) ---
router.get('/analytics/resolutions', (req, res) => {
  const businessId = req.businessId;
  const cases = tenantStore.getCasesByBusiness(businessId);
  const total = cases.length || 1;

  const counts = {
    pending: 0,
    refund_approved: 0,
    repair_approved: 0,
    replacement_approved: 0,
    rejected: 0,
    human_review: 0,
  };

  cases.forEach((c) => {
    if (c.outcome === 'human_review' || c.outcomeStatus === 'human_review_required') {
      counts.human_review += 1;
    } else if (c.outcome === 'refund') {
      counts.refund_approved += 1;
    } else if (c.outcome === 'replace_item' || c.outcome === 'replacement' || c.outcome === 'replace_packaging') {
      counts.replacement_approved += 1;
    } else if (c.outcome === 'repair') {
      counts.repair_approved += 1;
    } else if (c.outcome === 'reject') {
      counts.rejected += 1;
    } else {
      counts.pending += 1;
    }
  });

  const distribution = [
    { label: 'Refunds Approved', count: counts.refund_approved, percentage: parseFloat(((counts.refund_approved / total) * 100).toFixed(1)), color: '#10b981' },
    { label: 'Replacements Approved', count: counts.replacement_approved, percentage: parseFloat(((counts.replacement_approved / total) * 100).toFixed(1)), color: '#3b82f6' },
    { label: 'Repairs Approved', count: counts.repair_approved, percentage: parseFloat(((counts.repair_approved / total) * 100).toFixed(1)), color: '#8b5cf6' },
    { label: 'Human Review Required', count: counts.human_review, percentage: parseFloat(((counts.human_review / total) * 100).toFixed(1)), color: '#f59e0b' },
    { label: 'Claims Rejected', count: counts.rejected, percentage: parseFloat(((counts.rejected / total) * 100).toFixed(1)), color: '#ef4444' },
    { label: 'Pending Processing', count: counts.pending, percentage: parseFloat(((counts.pending / total) * 100).toFixed(1)), color: '#64748b' },
  ];

  res.json({
    success: true,
    totalCases: cases.length,
    counts,
    distribution,
  });
});

// --- 6. COMPANY POLICIES (MAJOR DASHBOARD AREA) ---
router.get('/policy', (req, res) => {
  const businessId = req.businessId;
  const activePolicy = tenantStore.getActivePolicy(businessId);
  const versions = tenantStore.getPolicyVersions(businessId);

  res.json({
    success: true,
    activePolicy,
    versions,
  });
});

router.post('/policy', (req, res) => {
  const businessId = req.businessId;
  const { rawText, name, status = 'published', rules = {}, prompts = {} } = req.body;

  if (!rawText || rawText.trim().length < 10) {
    return res.status(400).json({ success: false, error: 'Policy text is required (minimum 10 characters).' });
  }

  const existingVersions = tenantStore.getPolicyVersions(businessId);
  const nextVerNumber = existingVersions.length + 1;
  const versionId = `pol_${businessId}_v${nextVerNumber}`;

  const newPolicyVersion = {
    versionId,
    businessId,
    versionNumber: nextVerNumber,
    name: name || `Policy Version ${nextVerNumber}.0`,
    rawText,
    rules: {
      refund_if_contents_damaged: rules.refund_if_contents_damaged ?? true,
      packaging_replace_max_ratio: rules.packaging_replace_max_ratio ?? 0.30,
      handoff_order_value: rules.handoff_order_value ?? 200,
      min_confidence: rules.min_confidence ?? 0.70,
      reporting_window_days: rules.reporting_window_days ?? 14,
    },
    prompts: prompts.product ? prompts : {
      product: 'product',
      damage: ['packaging damage', 'crack', 'dent', 'scratch'],
      contents: ['broken contents', 'leak'],
    },
    clauses: {
      refund: 'Clause 4.1: Direct item/contents damage confirmed by visual evidence qualifies for immediate refund.',
      replace_packaging: `Clause 4.2: Superficial outer packaging damage (<=${((rules.packaging_replace_max_ratio || 0.3) * 100).toFixed(0)}%) qualifies for packaging replacement.`,
      replace_item: 'Clause 4.3: Severe packaging deformation qualifies for complete item replacement.',
      handoff_high_value: `Clause 8.2: High-value orders exceeding $${rules.handoff_order_value || 200} require specialist handoff.`,
      handoff_uncertain: 'Clause 9.1: Insufficient visual confidence requires human escalation.',
    },
    status, // 'published' or 'draft'
    effectiveDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: req.user.name,
  };

  tenantStore.savePolicyVersion(newPolicyVersion);
  tenantStore.logAudit(businessId, req.user.name, 'POLICY_UPDATED', `Published policy version ${nextVerNumber}: ${newPolicyVersion.name}`);

  res.status(201).json({
    success: true,
    policy: newPolicyVersion,
  });
});

// --- 7. DECISION THRESHOLDS CONFIGURATION ---
router.get('/thresholds', (req, res) => {
  const businessId = req.businessId;
  const activeThreshold = tenantStore.getActiveThreshold(businessId);
  res.json({ success: true, thresholds: activeThreshold });
});

router.post('/thresholds', (req, res) => {
  const businessId = req.businessId;
  const { packaging_replace_max_ratio, handoff_order_value, min_confidence, auto_refund_enabled, auto_replacement_enabled } = req.body;

  const activePolicy = tenantStore.getActivePolicy(businessId);
  const versionId = `thresh_${businessId}_${Date.now()}`;

  const newThreshold = {
    versionId,
    businessId,
    policyVersionId: activePolicy?.versionId,
    versionNumber: Date.now(),
    rules: {
      packaging_replace_max_ratio: parseFloat(packaging_replace_max_ratio ?? 0.30),
      handoff_order_value: parseFloat(handoff_order_value ?? 200.0),
      min_confidence: parseFloat(min_confidence ?? 0.70),
      auto_refund_enabled: Boolean(auto_refund_enabled),
      auto_replacement_enabled: Boolean(auto_replacement_enabled),
    },
    createdAt: new Date().toISOString(),
  };

  tenantStore.saveThresholdVersion(newThreshold);
  tenantStore.logAudit(businessId, req.user.name, 'THRESHOLDS_UPDATED', `Updated thresholds: Max Ratio=${packaging_replace_max_ratio}, Cap=$${handoff_order_value}`);

  res.json({ success: true, thresholds: newThreshold });
});

// --- 8. PRODUCT CATALOGUE ---
router.get('/products', (req, res) => {
  const products = tenantStore.getProductsByBusiness(req.businessId);
  res.json({ success: true, products });
});

router.post('/products', (req, res) => {
  const { sku, name, category, price, returnWindowDays } = req.body;
  if (!name || !price) {
    return res.status(400).json({ success: false, error: 'Product name and price are required.' });
  }

  const product = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    businessId: req.businessId,
    sku: sku || `SKU-${Date.now().toString().slice(-5)}`,
    name,
    category: category || 'General',
    price: parseFloat(price),
    returnWindowDays: parseInt(returnWindowDays || 14, 10),
    active: true,
  };

  tenantStore.addProduct(product);
  res.status(201).json({ success: true, product });
});

// --- 9. HUMAN-REVIEW QUEUE ---
router.get('/human-review', (req, res) => {
  const businessId = req.businessId;
  const cases = tenantStore.getCasesByBusiness(businessId).filter((c) => c.outcome === 'human_review' || c.handlingBadge === 'human_intervention_required');
  res.json({ success: true, total: cases.length, cases });
});

router.post('/human-review/:caseId', (req, res) => {
  const businessId = req.businessId;
  const caseObj = tenantStore.getCase(req.params.caseId);

  if (!caseObj || caseObj.businessId !== businessId) {
    return res.status(404).json({ success: false, error: 'Case not found in your tenant scope.' });
  }

  const { action, notes } = req.body; // action: 'refund' | 'replacement' | 'repair' | 'reject' | 'request_info'
  if (!action) {
    return res.status(400).json({ success: false, error: 'Review action is required.' });
  }

  const review = tenantStore.addHumanReview({
    caseId: caseObj.id,
    businessId,
    reviewerId: req.user.userId,
    reviewerName: req.user.name,
    action,
    notes: notes || '',
    beforeState: caseObj.outcome,
    afterState: action,
  });

  const updatedCase = tenantStore.getCase(caseObj.id);
  res.json({ success: true, review, case: updatedCase });
});

// --- 10. CASE INVESTIGATION WORKSPACE ---
router.get('/cases/:caseId', (req, res) => {
  const businessId = req.businessId;
  const caseObj = tenantStore.getCase(req.params.caseId);

  if (!caseObj || caseObj.businessId !== businessId) {
    return res.status(404).json({ success: false, error: 'Case not found or unauthorized.' });
  }

  const damageReport = tenantStore.getDamageReportByCase(caseObj.id);
  const auditTrail = tenantStore.getAuditLogsByBusiness(businessId).filter((l) => l.details.includes(caseObj.caseNumber) || l.details.includes(caseObj.id));

  res.json({
    success: true,
    case: caseObj,
    damageReport,
    auditTrail,
  });
});

// --- 11. OPS & ACCURACY (MOVED TO BUSINESS PORTAL) ---
router.get('/ops-accuracy', async (req, res) => {
  const usageStats = meter.getUsageStats();

  res.json({
    success: true,
    meter: usageStats,
    geometryDefinitions: {
      formula: 'Estimated Visible-Area Ratio = (Damage Foreground Pixels / Product Boundary Pixels) * 100',
      modelUsed: 'Meta SAM 3.1 (sam-3.1)',
      geometryParser: '@meta-sam/parser (MIT)',
      sourceType: 'Deterministic pixel count ratio computed from validated vector polygon masks.',
    },
  });
});

export default router;

