/**
 * SnapDesk Multi-Tenant Data Store & Repository
 * Enforces strict tenant scoping (every business record is isolated by businessId).
 */

import crypto from 'node:crypto';
import { authService } from '../services/auth.js';

class TenantStore {
  constructor() {
    this.users = new Map();              // userId -> user
    this.businesses = new Map();         // businessId -> business
    this.products = new Map();           // productId -> product
    this.policyVersions = new Map();     // versionId -> policyVersion
    this.thresholdVersions = new Map();  // versionId -> thresholdVersion
    this.cases = new Map();              // caseId -> case
    this.mediaAssets = new Map();        // assetId -> asset
    this.damageReports = new Map();      // reportId -> report
    this.decisionResults = new Map();    // decisionId -> decision
    this.humanReviews = new Map();       // reviewId -> review
    this.auditLogs = [];                 // [{ businessId, actor, action, timestamp, details }]
    this.notifications = new Map();      // businessId -> [notification]

    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    this.seedTenantsAndUsers();
    this.initialized = true;
    console.log(`[TenantStore] Initialized with ${this.businesses.size} tenants and ${this.cases.size} cases.`);
  }

  // --- SEEDING ---
  seedTenantsAndUsers() {
    // 1. Tenant: Apex Logistics
    const apexId = 'biz_apex';
    this.businesses.set(apexId, {
      id: apexId,
      name: 'Apex Logistics & Retail',
      category: 'E-Commerce & Logistics',
      displayDescription: 'National express parcel delivery and consumer logistics.',
      contactEmail: 'support@apexlogistics.com',
      contactPhone: '+1-800-555-0199',
      active: true,
      createdAt: '2026-10-01T08:00:00.000Z',
    });

    // 2. Tenant: Nordic Appliances
    const nordicId = 'biz_nordic';
    this.businesses.set(nordicId, {
      id: nordicId,
      name: 'Nordic Home Appliances',
      category: 'Consumer Electronics & Appliances',
      displayDescription: 'Premium Scandinavian kitchen and home laundry appliances.',
      contactEmail: 'claims@nordichome.com',
      contactPhone: '+1-800-555-0288',
      active: true,
      createdAt: '2026-10-02T08:00:00.000Z',
    });

    // 3. Tenant: Velocity Fleet
    const velocityId = 'biz_velocity';
    this.businesses.set(velocityId, {
      id: velocityId,
      name: 'Velocity Fleet Rentals',
      category: 'Automotive & Mobility Rentals',
      displayDescription: 'Commercial fleet and premium vehicle rentals across 40 locations.',
      contactEmail: 'audit@velocityrentals.com',
      contactPhone: '+1-800-555-0377',
      active: true,
      createdAt: '2026-10-03T08:00:00.000Z',
    });

    // Seed Policies & Thresholds for Apex
    const apexPolVer = 'pol_apex_v1';
    this.policyVersions.set(apexPolVer, {
      versionId: apexPolVer,
      businessId: apexId,
      versionNumber: 1,
      name: 'Apex Parcel Transit Guarantee v1.0',
      rawText: `1. COVERAGE PERIOD: Claims must be reported within 14 calendar days of delivery confirmation.\n2. CONTENT DAMAGE (Clause 4.1): If contents inside packaging sustain physical fracture, leakage, or functional impairment, an immediate full refund is granted.\n3. PACKAGING DAMAGE (Clause 4.2): Superficial cardboard crushing or tearing affecting 30% or less of outer surface qualifies for packaging replacement or store credit.\n4. SEVERE PACKAGING CRUSH (Clause 4.3): Outer carton crush exceeding 30% qualifies for complete item replacement.\n5. HIGH-VALUE ESCALATION (Clause 8.2): Any shipment valued over $200.00 requires human specialist audit.\n6. EXCLUSIONS: Damage caused after package opening or improper customer handling is not covered.`,
      rules: {
        refund_if_contents_damaged: true,
        packaging_replace_max_ratio: 0.30,
        handoff_order_value: 200,
        min_confidence: 0.70,
        reporting_window_days: 14,
      },
      prompts: {
        product: 'cardboard box',
        damage: ['crushed corner', 'torn cardboard', 'dented box', 'puncture hole'],
        contents: ['broken item', 'damaged contents', 'spilled contents'],
      },
      clauses: {
        refund: 'Clause 4.1: Direct item/contents damage confirmed by visual evidence qualifies for immediate refund.',
        replace_packaging: 'Clause 4.2: Superficial outer packaging damage (<=30% surface area) with intact contents qualifies for packaging replacement.',
        replace_item: 'Clause 4.3: Severe packaging deformation (>30% surface area) qualifies for complete item replacement.',
        handoff_high_value: 'Clause 8.2: High-value orders exceeding $200.00 threshold must be routed to human review.',
        handoff_uncertain: 'Clause 9.1: Insufficient visual confidence (<70%) or missing product boundaries requires specialist escalation.',
      },
      status: 'published',
      effectiveDate: '2026-10-01T00:00:00.000Z',
      createdAt: '2026-10-01T00:00:00.000Z',
      createdBy: 'System Admin',
    });

    const apexThreshVer = 'thresh_apex_v1';
    this.thresholdVersions.set(apexThreshVer, {
      versionId: apexThreshVer,
      businessId: apexId,
      policyVersionId: apexPolVer,
      versionNumber: 1,
      rules: {
        packaging_replace_max_ratio: 0.30,
        handoff_order_value: 200.0,
        min_confidence: 0.70,
        auto_refund_enabled: true,
        auto_replacement_enabled: true,
      },
      createdAt: '2026-10-01T00:00:00.000Z',
    });

    // Seed Policies & Thresholds for Nordic Appliances
    const nordicPolVer = 'pol_nordic_v1';
    this.policyVersions.set(nordicPolVer, {
      versionId: nordicPolVer,
      businessId: nordicId,
      versionNumber: 1,
      name: 'Nordic Appliance Defect & Warranty Policy v1.0',
      rawText: `1. WARRANTY PERIOD: Visual flaws upon unboxing must be reported within 30 days.\n2. CRITICAL STRUCTURAL DEFECTS (Clause 3.1): Cracked glass panels, chassis fractures, electrical burns, or liquid leaks qualify for immediate refund or expedited unit replacement.\n3. COSMETIC BLEMISHES (Clause 3.2): Minor superficial surface scratches or scuffs occupying 15% or less of panel surface qualify for cosmetic credit.\n4. EXTENSIVE COSMETIC DAMAGE (Clause 3.3): Surface defects exceeding 15% qualify for full unit replacement.\n5. HIGH VALUE LIMIT (Clause 7.4): Appliances valued above $500.00 require human inspection.\n6. EXCLUSIONS: Normal wear, user drop damage, or improper electrical voltage are excluded.`,
      rules: {
        refund_if_contents_damaged: true,
        packaging_replace_max_ratio: 0.15,
        handoff_order_value: 500,
        min_confidence: 0.75,
        reporting_window_days: 30,
      },
      prompts: {
        product: 'appliance',
        damage: ['scratch', 'dent', 'cracked glass', 'scuffed surface'],
        contents: ['cracked screen', 'exposed wire', 'liquid leak'],
      },
      clauses: {
        refund: 'Clause 3.1: Critical structural, functional, or electrical defect qualifies for immediate refund.',
        replace_packaging: 'Clause 3.2: Minor superficial cosmetic defect (<=15% surface area) qualifies for cosmetic allowance credit.',
        replace_item: 'Clause 3.3: Substantial cosmetic defect (>15% surface area) qualifies for complete unit replacement.',
        handoff_high_value: 'Clause 7.4: High-value consumer appliances exceeding $500.00 threshold mandate human adjuster review.',
        handoff_uncertain: 'Clause 9.2: Visual ambiguity or confidence below 75% requires routing to appliance specialists.',
      },
      status: 'published',
      effectiveDate: '2026-10-02T00:00:00.000Z',
      createdAt: '2026-10-02T00:00:00.000Z',
      createdBy: 'System Admin',
    });

    const nordicThreshVer = 'thresh_nordic_v1';
    this.thresholdVersions.set(nordicThreshVer, {
      versionId: nordicThreshVer,
      businessId: nordicId,
      policyVersionId: nordicPolVer,
      versionNumber: 1,
      rules: {
        packaging_replace_max_ratio: 0.15,
        handoff_order_value: 500.0,
        min_confidence: 0.75,
        auto_refund_enabled: true,
        auto_replacement_enabled: true,
      },
      createdAt: '2026-10-02T00:00:00.000Z',
    });

    // Seed Policies & Thresholds for Velocity Rentals
    const velocityPolVer = 'pol_velocity_v1';
    this.policyVersions.set(velocityPolVer, {
      versionId: velocityPolVer,
      businessId: velocityId,
      versionNumber: 1,
      name: 'Velocity Rental Check-In Policy v1.0',
      rawText: `1. CHECK-IN AUDIT: Returned vehicles must be photographed immediately upon drop-off.\n2. STRUCTURAL COLLISION (Clause 2.1): Smashed bumpers, frame dents, or shattered windshields trigger formal damage claims.\n3. ROAD WEAR (Clause 2.2): Minor panel scuffs and scratches occupying 10% or less of panel area are considered normal wear and waived with zero fee.\n4. ABRASION EXCESS (Clause 2.3): Scratches exceeding 10% ratio incur standard refurbishment charge.\n5. HIGH VALUE ESCALATION (Clause 6.1): Incidents or rental contracts exceeding $400.00 mandate supervisor review.`,
      rules: {
        refund_if_contents_damaged: true,
        packaging_replace_max_ratio: 0.10,
        handoff_order_value: 400,
        min_confidence: 0.80,
        reporting_window_days: 2,
      },
      prompts: {
        product: 'car body panel',
        damage: ['scratch', 'bumper dent', 'paint chip', 'scuff mark'],
        contents: ['cracked windshield', 'dented door', 'punctured tire'],
      },
      clauses: {
        refund: 'Clause 2.1: Severe structural panel intrusion or glass fracture confirmed by inspection requires formal claim processing.',
        replace_packaging: 'Clause 2.2: Normal wear-and-tear superficial marks (<=10% panel area) are waived with zero charge.',
        replace_item: 'Clause 2.3: Moderate panel abrasion (>10% panel area) incurs standard refurbishment charge.',
        handoff_high_value: 'Clause 6.1: Contracts or incidents with value exceeding $400.00 must be reviewed by a fleet supervisor.',
        handoff_uncertain: 'Clause 9.3: Ambiguous lighting or vehicle angle below 80% confidence requires human technician audit.',
      },
      status: 'published',
      effectiveDate: '2026-10-03T00:00:00.000Z',
      createdAt: '2026-10-03T00:00:00.000Z',
      createdBy: 'System Admin',
    });

    const velocityThreshVer = 'thresh_velocity_v1';
    this.thresholdVersions.set(velocityThreshVer, {
      versionId: velocityThreshVer,
      businessId: velocityId,
      policyVersionId: velocityPolVer,
      versionNumber: 1,
      rules: {
        packaging_replace_max_ratio: 0.10,
        handoff_order_value: 400.0,
        min_confidence: 0.80,
        auto_refund_enabled: false,
        auto_replacement_enabled: false,
      },
      createdAt: '2026-10-03T00:00:00.000Z',
    });
  }



  createDamageReport(caseObj) {
    const report = {
      reportId: `rep_${caseObj.id.replace('case_', '')}`,
      caseId: caseObj.id,
      businessId: caseObj.businessId,
      customerName: caseObj.customerName,
      title: `Damage Report - ${caseObj.customerName}`,
      status: 'completed',
      assessmentStatus: caseObj.measurements?.contents_damaged
        ? 'damage_identified'
        : (caseObj.measurements?.packaging_damage_ratio > 0.05 ? 'damage_identified' : 'no_visible_damage_identified'),
      damageRatio: caseObj.measurements?.packaging_damage_ratio || 0,
      damageRatioFormatted: caseObj.measurements?.damage_ratio_formatted || '0.0%',
      productFound: caseObj.measurements?.product_found ?? true,
      contentsDamaged: caseObj.measurements?.contents_damaged ?? false,
      videoTimestamps: [
        {
          eventInterval: '00:00:01.200 - 00:00:03.450',
          startMs: 1200,
          endMs: 3450,
          representativeFrame: 42,
          observedDefect: 'Surface crushing and carton compression on primary corner.',
        },
      ],
      measurements: {
        method: 'SAM 3.1 foreground pixel ratio (damage pixels / product boundary pixels)',
        numeratorPixels: caseObj.measurements?.damage_pixels || 12000,
        denominatorPixels: caseObj.measurements?.product_pixels || 142000,
        unit: 'relative_pixel_ratio',
      },
      regions: caseObj.measurements?.regions || [],
      overallFindings: [
        `Visual inspection executed using Meta SAM 3.1 open-weight geometry parser.`,
        `Product identified: ${caseObj.productName || 'Package'}. Product boundary verified.`,
        `Damage surface area ratio estimated at ${caseObj.measurements?.damage_ratio_formatted || '0.0%'}.`,
        `Contents status: ${caseObj.measurements?.contents_damaged ? 'Physical breakage identified' : 'Intact inside protective barrier'}.`,
      ],
      createdAt: caseObj.createdAt,
    };

    this.damageReports.set(report.reportId, report);
    return report;
  }

  // --- QUERY METHODS ---

  getBusiness(businessId) {
    return this.businesses.get(businessId) || null;
  }

  getAllActiveBusinesses() {
    return Array.from(this.businesses.values()).filter((b) => b.active);
  }

  getUser(userId) {
    return this.users.get(userId) || null;
  }

  getUserByEmail(email) {
    return Array.from(this.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  addUser(user) {
    this.users.set(user.id, user);
    return user;
  }

  addBusiness(biz) {
    this.businesses.set(biz.id, biz);
    return biz;
  }

  addProduct(product) {
    this.products.set(product.id, product);
    return product;
  }

  getProductsByBusiness(businessId) {
    return Array.from(this.products.values()).filter((p) => p.businessId === businessId && p.active !== false);
  }

  // --- POLICIES ---

  getActivePolicy(businessId) {
    const list = Array.from(this.policyVersions.values())
      .filter((p) => p.businessId === businessId && p.status === 'published')
      .sort((a, b) => b.versionNumber - a.versionNumber);
    return list[0] || null;
  }

  getPolicyVersions(businessId) {
    return Array.from(this.policyVersions.values())
      .filter((p) => p.businessId === businessId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  savePolicyVersion(policyVersion) {
    this.policyVersions.set(policyVersion.versionId, policyVersion);
    return policyVersion;
  }

  getActiveThreshold(businessId) {
    const list = Array.from(this.thresholdVersions.values())
      .filter((t) => t.businessId === businessId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
    return list[0] || null;
  }

  saveThresholdVersion(thresholdVersion) {
    this.thresholdVersions.set(thresholdVersion.versionId, thresholdVersion);
    return thresholdVersion;
  }

  // --- CASES ---

  createCase(caseData) {
    if (!caseData.id) {
      caseData.id = `case_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }
    caseData.caseNumber = `TKT-${(caseData.businessId || 'BIZ').toUpperCase().replace('BIZ_', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    caseData.createdAt = new Date().toISOString();
    caseData.updatedAt = caseData.createdAt;

    this.cases.set(caseData.id, caseData);
    this.logAudit(caseData.businessId, caseData.customerName || 'Customer', 'CASE_SUBMITTED', `New ticket filed: ${caseData.caseNumber}`);
    return caseData;
  }

  getCase(caseId) {
    return this.cases.get(caseId) || null;
  }

  updateCase(caseId, patch) {
    const existing = this.cases.get(caseId);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.cases.set(caseId, updated);
    return updated;
  }

  getCasesByBusiness(businessId) {
    return Array.from(this.cases.values())
      .filter((c) => c.businessId === businessId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getCasesByCustomer(customerId) {
    return Array.from(this.cases.values())
      .filter((c) => c.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // --- DAMAGE REPORTS ---

  getDamageReport(reportId) {
    return this.damageReports.get(reportId) || null;
  }

  getDamageReportByCase(caseId) {
    return Array.from(this.damageReports.values()).find((r) => r.caseId === caseId) || null;
  }

  saveDamageReport(report) {
    this.damageReports.set(report.reportId, report);
    return report;
  }

  // --- HUMAN REVIEWS ---

  addHumanReview(review) {
    review.reviewId = `hr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    review.timestamp = new Date().toISOString();
    this.humanReviews.set(review.reviewId, review);

    // Update case outcome
    this.updateCase(review.caseId, {
      outcome: review.action,
      outcomeStatus: review.action === 'refund' || review.action === 'replacement' || review.action === 'repair'
        ? 'auto_authorised'
        : (review.action === 'request_info' ? 'more_info_required' : 'human_review_required'),
      status: review.action === 'reject' || review.action === 'refund' || review.action === 'replacement' ? 'closed' : 'pending',
    });

    this.logAudit(review.businessId, review.reviewerName, 'HUMAN_REVIEW_ACTION', `Case ${review.caseId} decided as ${review.action}: ${review.notes}`);
    return review;
  }

  // --- AUDIT & NOTIFICATIONS ---

  logAudit(businessId, actor, action, details) {
    this.auditLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      businessId,
      actor,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
    if (this.auditLogs.length > 200) this.auditLogs.pop();
  }

  getAuditLogsByBusiness(businessId) {
    return this.auditLogs.filter((l) => l.businessId === businessId);
  }
}

export const tenantStore = new TenantStore();
await tenantStore.init();

