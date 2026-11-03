import { useState, useMemo, useCallback } from 'react';
import { useGlobalShortcut } from './useKeyboard';

export const SNAPDESK_SEARCH_INDEX = [
  {
    id: 'sec-hero',
    title: 'Landing & Architecture',
    badge: 'Overview',
    category: 'Navigation',
    summary: 'Autonomous visual damage triage and policy enforcement powered by Meta SAM 3.1 and Muse Spark.',
    target: '#hero',
  },
  {
    id: 'sec-accounts',
    title: 'Portal Selection & Authentication',
    badge: 'Security',
    category: 'Navigation',
    summary: 'Strict separation of Enterprise Multi-Tenant Business Accounts and Customer Dispute Resolution Accounts.',
    target: '#accounts',
  },
  {
    id: 'sec-intake',
    title: 'Customer Intake: Raise a Claim',
    badge: 'Customer Portal',
    category: 'Workflows',
    summary: 'Submit visual evidence (photo/video), optional audio voice note, and concern description with submit-only persistence.',
    target: '#customer-intake',
  },
  {
    id: 'sec-vision',
    title: 'Vision Analysis & SAM 3.1 Workspace',
    badge: 'Computer Vision',
    category: 'AI Pipeline',
    summary: 'Zero-shot mask segmentation, polygon area damage quantification, and canonical ASD-STE100 Damage Report generation.',
    target: '#vision',
  },
  {
    id: 'sec-decision',
    title: 'Decision Engine: 4-Stage Deliberation',
    badge: 'Reasoning',
    category: 'AI Pipeline',
    summary: 'Media Hash SHA-256 Audit, Mask Geometry Quantification, Tenant Policy Rule Binding, and Muse Spark Multimodal Deliberation.',
    target: '#decision-engine',
  },
  {
    id: 'sec-biz-overview',
    title: 'Business Dashboard Overview',
    badge: 'Tenant Hub',
    category: 'Enterprise',
    summary: 'Live counts for open tickets, approved refunds, replacements, repairs, rejections, and AI-handled vs human review cases.',
    target: '#business-hub',
  },
  {
    id: 'sec-inbox',
    title: 'Complaint Inbox & Dispute Ledger',
    badge: 'Tenant Hub',
    category: 'Enterprise',
    summary: 'Comprehensive ledger of incoming disputes with AI-handled and human-intervention-required handling badges.',
    target: '#business-hub',
  },
  {
    id: 'sec-analytics',
    title: 'Product Damage & Return Analytics',
    badge: 'Intelligence',
    category: 'Enterprise',
    summary: 'Per-product damage ratios, high-frequency return items, and resolution outcome distributions.',
    target: '#business-hub',
  },
  {
    id: 'sec-policy',
    title: 'Company Policy Manuscript Editor',
    badge: 'Governance',
    category: 'Enterprise',
    summary: 'Strictly tenant-isolated editable policy manuscript with version history and customer-facing abstraction compiler.',
    target: '#business-hub',
  },
  {
    id: 'sec-thresholds',
    title: 'Deterministic Decision Thresholds',
    badge: 'Governance',
    category: 'Enterprise',
    summary: 'Configure packaging damage ratio limits, high-value order human escalation caps, and minimum confidence scores.',
    target: '#business-hub',
  },
  {
    id: 'sec-human-review',
    title: 'Human Review & Specialist Queue',
    badge: 'Operations',
    category: 'Enterprise',
    summary: 'Review queue for claims exceeding risk thresholds or flagged by uncertain visual confidence.',
    target: '#business-hub',
  },
  {
    id: 'sec-ops',
    title: 'Ops & Accuracy Telemetry Meter',
    badge: 'Telemetry',
    category: 'Enterprise',
    summary: 'Relocated operational telemetry tracking real vs mock Meta Model API calls, token usage, cost meters, and evaluation benchmarks.',
    target: '#business-hub',
  },
  {
    id: 'clause-4-1',
    title: 'Clause 4.1: Direct Fracture Full Refund',
    badge: 'Policy Clause',
    category: 'Rules',
    summary: 'Direct item or contents fracture confirmed by visual segmentation automatically qualifies for immediate refund authorization.',
    target: '#decision-engine',
  },
  {
    id: 'clause-4-2',
    title: 'Clause 4.2: Superficial Packaging Credit',
    badge: 'Policy Clause',
    category: 'Rules',
    summary: 'Superficial outer carton transit wear (<=30% surface area) qualifies for packaging credit or box replacement.',
    target: '#decision-engine',
  },
  {
    id: 'clause-4-3',
    title: 'Clause 4.3: Severe Packaging Replacement',
    badge: 'Policy Clause',
    category: 'Rules',
    summary: 'Outer packaging deformation exceeding 30% surface ratio qualifies for complete unit replacement.',
    target: '#decision-engine',
  },
  {
    id: 'clause-8-2',
    title: 'Clause 8.2: High-Value Human Escalation',
    badge: 'Guardrail',
    category: 'Rules',
    summary: 'Orders reported or verified above $200.00 must be routed to human review regardless of model confidence.',
    target: '#decision-engine',
  },
];

export function useSearch(businesses = []) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Global Cmd+K / Ctrl+K shortcut to toggle search
  useGlobalShortcut('KeyK', () => {
    setIsOpen((prev) => !prev);
  });

  // Dynamic search pool combining static index + active registered businesses
  const allItems = useMemo(() => {
    const list = [...SNAPDESK_SEARCH_INDEX];
    businesses.forEach((biz) => {
      list.push({
        id: `biz-${biz.id}`,
        title: biz.name,
        badge: biz.category || 'Registered Merchant',
        category: 'Merchant Partner',
        summary: biz.displayDescription || `Registered product provider: ${biz.name}`,
        target: '#customer-intake',
        businessId: biz.id,
      });
    });
    return list;
  }, [businesses]);

  const filteredResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [searchTerm, allItems]);

  const openSearch = useCallback(() => {
    setIsOpen(true);
    setSearchTerm('');
    setSelectedIndex(0);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
    setSelectedIndex(0);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSelectedIndex(0);
  }, []);

  return {
    isOpen,
    searchTerm,
    setSearchTerm,
    filteredResults,
    selectedIndex,
    setSelectedIndex,
    openSearch,
    closeSearch,
    clearSearch,
  };
}

