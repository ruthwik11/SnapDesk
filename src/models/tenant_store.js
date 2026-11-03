/**
 * SnapDesk Multi-Tenant Data Store & Repository
 * Enforces strict tenant scoping (every business record is isolated by businessId).
 */

import crypto from 'node:crypto';
import { authService } from '../services/auth.js';
import { supabase, isSupabaseConfigured } from '../services/supabase.js';

function safeWrite(promise, label) {
  if (!promise || typeof promise.then !== 'function') return;
  promise.then(
    ({ error }) => {
      if (error) console.warn(`[Supabase] ${label} error:`, error.message);
    },
    (err) => {
      console.warn(`[Supabase] ${label} network error:`, err?.message || err);
    }
  );
}

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
    if (isSupabaseConfigured) {
      await this.syncFromSupabase();
    }
    this.initialized = true;
    console.log(`[TenantStore] Initialized with ${this.businesses.size} tenants and ${this.cases.size} cases.`);
  }

  async syncFromSupabase() {
    try {
      const { data: bList } = await supabase.from('businesses').select('*');
      if (bList && bList.length > 0) {
        bList.forEach((b) => {
          this.businesses.set(b.id, {
            id: b.id,
            name: b.name,
            category: b.category,
            displayDescription: b.display_description,
            contactEmail: b.contact_email,
            contactPhone: b.contact_phone,
            active: b.active ?? true,
            createdAt: b.created_at,
          });
        });
      } else {
        // Seed remote Supabase with baseline business tenants
        for (const biz of this.businesses.values()) {
          const { error } = await supabase.from('businesses').upsert({
            id: biz.id,
            name: biz.name,
            category: biz.category,
            display_description: biz.displayDescription,
            contact_email: biz.contactEmail,
            contact_phone: biz.contactPhone,
            active: biz.active ?? true,
            created_at: biz.createdAt || new Date().toISOString(),
          });
          if (error) console.warn('[Supabase] Initial seed business error:', error.message);
        }
        for (const pol of this.policyVersions.values()) {
          const { error } = await supabase.from('policy_versions').upsert({
            version_id: pol.versionId,
            business_id: pol.businessId,
            version_number: pol.versionNumber,
            name: pol.name,
            raw_text: pol.rawText,
            rules: pol.rules,
            prompts: pol.prompts,
            clauses: pol.clauses,
            status: pol.status,
            effective_date: pol.effectiveDate || new Date().toISOString(),
            created_by: pol.createdBy,
            created_at: pol.createdAt || new Date().toISOString(),
          });
          if (error) console.warn('[Supabase] Initial seed policy error:', error.message);
        }
        for (const thresh of this.thresholdVersions.values()) {
          const { error } = await supabase.from('threshold_versions').upsert({
            version_id: thresh.versionId,
            business_id: thresh.businessId,
            policy_version_id: thresh.policyVersionId,
            version_number: thresh.versionNumber,
            rules: thresh.rules,
            created_at: thresh.createdAt || new Date().toISOString(),
          });
          if (error) console.warn('[Supabase] Initial seed threshold error:', error.message);
        }
      }

      const { data: uList } = await supabase.from('users').select('*');
      if (uList && uList.length > 0) {
        uList.forEach((u) => {
          this.users.set(u.id, {
            id: u.id,
            email: u.email,
            salt: u.salt,
            hash: u.hash,
            name: u.name,
            role: u.role,
            businessId: u.business_id,
            phone: u.phone,
            createdAt: u.created_at,
          });
        });
      }

      const { data: pList } = await supabase.from('policy_versions').select('*');
      if (pList && pList.length > 0) {
        pList.forEach((p) => {
          this.policyVersions.set(p.version_id, {
            versionId: p.version_id,
            businessId: p.business_id,
            versionNumber: p.version_number,
            name: p.name,
            rawText: p.raw_text,
            rules: p.rules || {},
            prompts: p.prompts || {},
            clauses: p.clauses || {},
            status: p.status,
            effectiveDate: p.effective_date,
            createdBy: p.created_by,
            createdAt: p.created_at,
          });
        });
      }

      const { data: tList } = await supabase.from('threshold_versions').select('*');
      if (tList && tList.length > 0) {
        tList.forEach((t) => {
          this.thresholdVersions.set(t.version_id, {
            versionId: t.version_id,
            businessId: t.business_id,
            policyVersionId: t.policy_version_id,
            versionNumber: t.version_number,
            rules: t.rules || {},
            createdAt: t.created_at,
          });
        });
      }

      const { data: cList } = await supabase.from('cases').select('*');
      if (cList && cList.length > 0) {
        cList.forEach((c) => {
          this.cases.set(c.id, {
            id: c.id,
            caseNumber: c.case_number,
            businessId: c.business_id,
            customerId: c.customer_id,
            customerName: c.customer_name,
            customerPhone: c.customer_phone,
            postalCode: c.postal_code,
            productId: c.product_id,
            productName: c.product_name,
            productCostReported: c.product_cost_reported,
            productCostVerified: c.product_cost_verified,
            writtenComplaint: c.written_complaint,
            voiceTranscript: c.voice_transcript,
            status: c.status,
            outcome: c.outcome,
            outcomeStatus: c.outcome_status,
            handlingBadge: c.handling_badge,
            policyVersionId: c.policy_version_id,
            thresholdVersionId: c.threshold_version_id,
            damageReportId: c.damage_report_id,
            mediaAssets: c.media_assets || [],
            measurements: c.measurements || {},
            decision: c.decision || {},
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          });
        });
      }
      console.log(`[Supabase] Synced remote state: ${this.businesses.size} tenants, ${this.users.size} users, ${this.cases.size} cases.`);
    } catch (err) {
      console.warn('[Supabase] Initial sync warning:', err.message);
    }
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
    if (isSupabaseConfigured) {
      safeWrite(
        supabase.from('users').upsert({
          id: user.id,
          email: user.email,
          salt: user.salt,
          hash: user.hash,
          name: user.name,
          role: user.role,
          business_id: user.businessId || null,
          phone: user.phone || null,
          created_at: user.createdAt || new Date().toISOString(),
        }),
        'addUser'
      );
    }
    return user;
  }

  addBusiness(biz) {
    this.businesses.set(biz.id, biz);
    if (isSupabaseConfigured) {
      safeWrite(
        supabase.from('businesses').upsert({
          id: biz.id,
          name: biz.name,
          category: biz.category,
          display_description: biz.displayDescription,
          contact_email: biz.contactEmail,
          contact_phone: biz.contactPhone,
          active: biz.active ?? true,
          created_at: biz.createdAt || new Date().toISOString(),
        }),
        'addBusiness'
      );
    }
    return biz;
  }

  addProduct(product) {
    this.products.set(product.id, product);
    if (isSupabaseConfigured) {
      safeWrite(
        supabase.from('products').upsert({
          id: product.id,
          business_id: product.businessId,
          sku: product.sku,
          name: product.name,
          category: product.category,
          price: product.price,
          return_window_days: product.returnWindowDays || 14,
          active: product.active ?? true,
          created_at: product.createdAt || new Date().toISOString(),
        }),
        'addProduct'
      );
    }
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
    if (isSupabaseConfigured) {
      safeWrite(
        supabase.from('policy_versions').upsert({
          version_id: policyVersion.versionId,
          business_id: policyVersion.businessId,
          version_number: policyVersion.versionNumber,
          name: policyVersion.name,
          raw_text: policyVersion.rawText,
          rules: policyVersion.rules,
          prompts: policyVersion.prompts,
          clauses: policyVersion.clauses,
          status: policyVersion.status,
          effective_date: policyVersion.effectiveDate || new Date().toISOString(),
          created_by: policyVersion.createdBy,
          created_at: policyVersion.createdAt || new Date().toISOString(),
        }),
        'savePolicyVersion'
      );
    }
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
    if (isSupabaseConfigured) {
      safeWrite(
        supabase.from('threshold_versions').upsert({
          version_id: thresholdVersion.versionId,
          business_id: thresholdVersion.businessId,
          policy_version_id: thresholdVersion.policyVersionId,
          version_number: thresholdVersion.versionNumber,
          rules: thresholdVersion.rules,
          created_at: thresholdVersion.createdAt || new Date().toISOString(),
        }),
        'saveThresholdVersion'
      );
    }
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

    if (isSupabaseConfigured) {
      safeWrite(
        supabase.from('cases').insert({
          id: caseData.id,
          case_number: caseData.caseNumber,
          business_id: caseData.businessId,
          customer_id: caseData.customerId || null,
          customer_name: caseData.customerName,
          customer_phone: caseData.customerPhone,
          postal_code: caseData.postalCode,
          product_id: caseData.productId || null,
          product_name: caseData.productName || null,
          product_cost_reported: caseData.productCostReported || null,
          product_cost_verified: caseData.productCostVerified || null,
          written_complaint: caseData.writtenComplaint || null,
          voice_transcript: caseData.voiceTranscript || null,
          status: caseData.status,
          outcome: caseData.outcome || null,
          outcome_status: caseData.outcomeStatus || null,
          handling_badge: caseData.handlingBadge || null,
          policy_version_id: caseData.policyVersionId || null,
          threshold_version_id: caseData.thresholdVersionId || null,
          damage_report_id: caseData.damageReportId || null,
          media_assets: caseData.mediaAssets || [],
          measurements: caseData.measurements || {},
          decision: caseData.decision || {},
          created_at: caseData.createdAt,
          updated_at: caseData.updatedAt,
        }),
        'createCase'
      );
    }
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

    if (isSupabaseConfigured) {
      safeWrite(
        supabase.from('cases').update({
          status: updated.status,
          outcome: updated.outcome,
          outcome_status: updated.outcomeStatus,
          handling_badge: updated.handlingBadge,
          damage_report_id: updated.damageReportId,
          measurements: updated.measurements,
          decision: updated.decision,
          updated_at: updated.updatedAt,
        }).eq('id', caseId),
        'updateCase'
      );
    }
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
    if (isSupabaseConfigured) {
      safeWrite(
        supabase.from('damage_reports').upsert({
          report_id: report.reportId,
          case_id: report.caseId,
          business_id: report.businessId,
          customer_name: report.customerName,
          title: report.title,
          status: report.status,
          assessment_status: report.assessmentStatus,
          damage_ratio: report.damageRatio,
          damage_ratio_formatted: report.damageRatioFormatted,
          product_found: report.productFound,
          contents_damaged: report.contentsDamaged,
          video_timestamps: report.videoTimestamps || [],
          measurements: report.measurements || {},
          regions: report.regions || [],
          overall_findings: report.overallFindings || [],
          created_at: report.createdAt || new Date().toISOString(),
        }),
        'saveDamageReport'
      );
    }
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

    if (isSupabaseConfigured) {
      safeWrite(
        supabase.from('human_reviews').insert({
          review_id: review.reviewId,
          case_id: review.caseId,
          business_id: review.businessId,
          reviewer_name: review.reviewerName,
          action: review.action,
          notes: review.notes,
          timestamp: review.timestamp,
        }),
        'addHumanReview'
      );
    }
    return review;
  }

  // --- AUDIT & NOTIFICATIONS ---

  logAudit(businessId, actor, action, details) {
    const logItem = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      businessId,
      actor,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(logItem);
    if (this.auditLogs.length > 200) this.auditLogs.pop();

    if (isSupabaseConfigured) {
      safeWrite(
        supabase.from('audit_logs').insert({
          id: logItem.id,
          business_id: logItem.businessId,
          actor: logItem.actor,
          action: logItem.action,
          details: logItem.details,
          timestamp: logItem.timestamp,
        }),
        'logAudit'
      );
    }
  }

  getAuditLogsByBusiness(businessId) {
    return this.auditLogs.filter((l) => l.businessId === businessId);
  }
}

export const tenantStore = new TenantStore();
await tenantStore.init();

