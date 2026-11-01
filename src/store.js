import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const POLICIES_DIR = path.resolve(__dirname, '../policies');

class CaseStore {
  constructor() {
    this.policies = new Map();
    this.cases = new Map();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    await this.loadPolicies();
    this.seedDemoCases();
    this.initialized = true;
  }

  async loadPolicies() {
    try {
      const files = await readdir(POLICIES_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(POLICIES_DIR, file);
          const raw = await readFile(filePath, 'utf-8');
          const policy = JSON.parse(raw);
          this.policies.set(policy.id, policy);
        }
      }
      console.log(`[Store] Loaded ${this.policies.size} policy templates from disk.`);
    } catch (err) {
      console.error('[Store] Error loading policies:', err.message);
    }
  }

  getPolicy(id) {
    return this.policies.get(id) || this.policies.get('parcel-damage');
  }

  getAllPolicies() {
    return Array.from(this.policies.values());
  }

  async savePolicy(policy) {
    if (!policy.id) {
      throw new Error('Policy requires a valid id.');
    }
    this.policies.set(policy.id, policy);
    const filePath = path.join(POLICIES_DIR, `${policy.id}.json`);
    await writeFile(filePath, JSON.stringify(policy, null, 2), 'utf-8');
    return policy;
  }

  saveCase(caseData) {
    this.cases.set(caseData.id, caseData);
    return caseData;
  }

  getCase(id) {
    return this.cases.get(id) || null;
  }

  getAllCases() {
    return Array.from(this.cases.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  seedDemoCases() {
    const seed1 = {
      id: 'case_demo_101',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      policyId: 'parcel-damage',
      policyName: 'Parcel Delivery Damage',
      customerMessage: 'My package arrived with a crushed upper corner. The item inside looks fine but box was broken.',
      orderValue: 45.0,
      finalDecision: 'replace_packaging',
      status: 'AUTO_RESOLVED',
      flags: [],
      measurements: {
        mock: true,
        product_found: true,
        contents_damaged: false,
        packaging_damage_ratio: 0.16,
        regions: [
          {
            label: 'cardboard box',
            type: 'product',
            area_ratio: 1.0,
            bbox: [0.08, 0.08, 0.84, 0.84],
            mask: { w: 640, h: 480, path: 'M 50,40 L 590,40 L 590,440 L 50,440 Z' },
          },
          {
            label: 'crushed corner',
            type: 'damage',
            area_ratio: 0.16,
            bbox: [0.55, 0.10, 0.35, 0.35],
            mask: { w: 640, h: 480, path: 'M 350,80 Q 450,60 530,120 Q 570,220 510,260 Q 430,280 370,230 Z' },
          },
        ],
      },
      modelDecision: {
        decision: 'replace_packaging',
        clause: 'Clause 4.2: Superficial packaging damage (<=30%) qualifies for packaging replacement.',
        confidence: 0.94,
        reasons: ['Outer packaging sustained 16.0% surface crush (below 30% limit)', 'Contents verified intact'],
        reply: 'We inspected your package: the outer packaging sustained minor transit wear (16.0%), but your item remains safe. We issued a courtesy $10 store credit.',
      },
      evidencePacket: {
        caseId: 'case_demo_101',
        policy: { name: 'Parcel Delivery Damage', appliedClause: 'Clause 4.2' },
        vision: { packagingDamagePercent: '16.0%', productFound: true, contentsDamaged: false },
        ruling: { finalDecision: 'replace_packaging', status: 'AUTO_RESOLVED', flags: [] },
      },
    };

    const seed2 = {
      id: 'case_demo_102',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      policyId: 'parcel-damage',
      policyName: 'Parcel Delivery Damage',
      customerMessage: 'The box was torn open and the porcelain vase inside was completely shattered!',
      orderValue: 85.0,
      finalDecision: 'refund',
      status: 'AUTO_RESOLVED',
      flags: [],
      measurements: {
        mock: true,
        product_found: true,
        contents_damaged: true,
        packaging_damage_ratio: 0.48,
        regions: [
          {
            label: 'cardboard box',
            type: 'product',
            area_ratio: 1.0,
            bbox: [0.08, 0.08, 0.84, 0.84],
            mask: { w: 640, h: 480, path: 'M 50,40 L 590,40 L 590,440 L 50,440 Z' },
          },
          {
            label: 'broken item',
            type: 'contents',
            area_ratio: 0.48,
            bbox: [0.28, 0.25, 0.45, 0.45],
            mask: { w: 640, h: 480, path: 'M 200,160 Q 320,130 400,190 Q 440,310 370,360 Q 250,380 180,310 Z' },
          },
        ],
      },
      modelDecision: {
        decision: 'refund',
        clause: 'Clause 4.1: Direct item/contents damage confirmed by visual inspection qualifies for full refund.',
        confidence: 0.98,
        reasons: ['Internal contents damage confirmed by SAM 3.1 segmentation', 'Clause 4.1 warrants immediate full refund'],
        reply: 'We are so sorry your porcelain vase arrived broken. Under Clause 4.1, an immediate full refund of $85.00 has been issued to your original payment method.',
      },
      evidencePacket: {
        caseId: 'case_demo_102',
        policy: { name: 'Parcel Delivery Damage', appliedClause: 'Clause 4.1' },
        vision: { packagingDamagePercent: '48.0%', productFound: true, contentsDamaged: true },
        ruling: { finalDecision: 'refund', status: 'AUTO_RESOLVED', flags: [] },
      },
    };

    const seed3 = {
      id: 'case_demo_103',
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      policyId: 'parcel-damage',
      policyName: 'Parcel Delivery Damage',
      customerMessage: 'Delivered luxury camera set was dropped and dented on the corner.',
      orderValue: 850.0,
      finalDecision: 'handoff',
      status: 'HANDOFF',
      flags: ['high_value_order'],
      handoffSummary: 'Case escalated under deterministic guardrail [high_value_order]. Order value ($850.00) exceeds safety cap ($200.00). Human adjuster inspection required.',
      measurements: {
        mock: true,
        product_found: true,
        contents_damaged: false,
        packaging_damage_ratio: 0.22,
        regions: [],
      },
      modelDecision: {
        decision: 'replace_item',
        clause: 'Clause 4.3: Severe packaging deformation qualifies for item replacement.',
        confidence: 0.91,
        reasons: ['High damage impact to box'],
        reply: 'Your claim has been escalated to a senior support specialist for priority review.',
      },
      evidencePacket: {
        caseId: 'case_demo_103',
        policy: { name: 'Parcel Delivery Damage', appliedClause: 'Clause 8.2' },
        vision: { packagingDamagePercent: '22.0%', productFound: true, contentsDamaged: false },
        ruling: { finalDecision: 'handoff', status: 'HANDOFF', flags: ['high_value_order'] },
      },
    };

    this.saveCase(seed1);
    this.saveCase(seed2);
    this.saveCase(seed3);
  }
}

export const caseStore = new CaseStore();

