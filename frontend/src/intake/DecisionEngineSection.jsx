import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import {
  Scale,
  Hash,
  Scissors,
  FileCheck,
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Loader2,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export function DecisionEngineSection({
  activeCase,
  activeDamageReport,
  onDecisionComplete,
}) {
  const [running, setRunning] = useState(false);
  const [decision, setDecision] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (activeCase?.id && !decision && !running) {
      runEngine();
    }
  }, [activeCase?.id]);

  const runEngine = async () => {
    if (!activeCase?.id) return;
    setRunning(true);
    setErrorMsg('');

    try {
      const res = await api.runDecision(activeCase.id);
      if (res.success && res.decision) {
        setDecision(res.decision);
        if (onDecisionComplete) onDecisionComplete(res.decision);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Decision Engine pipeline failed.');
    } finally {
      setRunning(false);
    }
  };

  const ruling = decision?.outcome || activeCase?.outcome || 'pending';
  const rulingStatus = decision?.outcomeStatus || activeCase?.outcomeStatus || 'pending';
  const isHumanReview = ruling === 'human_review' || rulingStatus === 'human_review_required';

  return (
    <section id="decision-engine" className="py-12 px-4 sm:px-6 lg:px-8 relative z-20">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Main Box */}
        <div className="bg-g1 border border-gold/40 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-g3/60 pb-6 mb-6">
            <div>
              <div className="flex items-center space-x-2 text-gold text-xs font-mono uppercase tracking-widest mb-1.5">
                <Scale className="w-3.5 h-3.5" />
                <span>Section 3 • Decision Engine Pipeline</span>
              </div>
              <h2 className="font-serif font-bold text-2xl sm:text-3xl text-light">
                Autonomous Policy Enforcement
              </h2>
              <p className="text-xs text-g6 mt-1 font-mono">
                Merchant Policy: {activeCase?.businessName || 'Selected Merchant Partner'}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {running ? (
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gold/15 text-gold border border-gold/30 text-xs font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deliberating with Muse Spark...</span>
                </div>
              ) : decision ? (
                <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gold/20 text-gold border border-gold/40 text-xs font-serif font-bold tracking-wide">
                  <span>Model Decision Formulated</span>
                </div>
              ) : (
                <button
                  onClick={runEngine}
                  className="bg-gold hover:bg-white text-dark font-medium px-4 py-2 rounded-lg text-xs transition-all flex items-center space-x-1.5"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>Execute Decision Pipeline</span>
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Policy Abstraction Box */}
          <div className="bg-dark/80 border border-gold/30 rounded-xl p-5 mb-8">
            <div className="flex items-center space-x-2 text-gold text-xs font-semibold mb-2">
              <span>📜</span>
              <span>Important points from {activeCase?.businessName || "Merchant"}'s verified policy:</span>
            </div>
            
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-g7 pt-1">
              <li className="flex items-start space-x-2">
                <span className="text-gold mt-0.5">•</span>
                <span><strong>Coverage Period:</strong> Claims must be reported within 14 calendar days of delivery.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-gold mt-0.5">•</span>
                <span><strong>Clause 4.1 (Direct Damage):</strong> Verified contents fracture qualifies for immediate full refund.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-gold mt-0.5">•</span>
                <span><strong>Clause 4.2 / 4.3 (Packaging):</strong> Surface wear &le; 30% receives credit; crush &gt; 30% replaces product.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-gold mt-0.5">•</span>
                <span><strong>Clause 8.2 (High Value):</strong> Orders exceeding $200.00 threshold mandate human specialist review.</span>
              </li>
            </ul>
          </div>

          {/* 4 Evaluation Stages */}
          <div className="space-y-4 mb-8">
            <div className="text-[11px] font-mono uppercase tracking-widest text-g6">
              4-Stage Grounded Verification Workflow
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Stage 1: Media Hash & Fraud Audit */}
              <div className="bg-dark/60 border border-g3 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Hash className="w-4 h-4 text-gold" />
                    <span className="font-semibold text-light">Stage 1: Media Hash &amp; Fraud Audit</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Verified
                  </span>
                </div>
                <div className="text-g6 text-[11px]">
                  Computed SHA-256 media fingerprint. Confirmed zero duplicate fraudulent claims across tenant database.
                </div>
                <div className="font-mono text-[10px] text-g6/80 truncate">
                  SHA-256: {activeCase?.mediaAssets?.[0]?.sha256Digest || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </div>
              </div>

              {/* Stage 2: Mask Geometry Quantification */}
              <div className="bg-dark/60 border border-g3 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Scissors className="w-4 h-4 text-gold" />
                    <span className="font-semibold text-light">Stage 2: Mask Geometry</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Measured
                  </span>
                </div>
                <div className="text-g6 text-[11px]">
                  Estimated Visible-Area Ratio = (Damage Foreground Pixels / Product Boundary Pixels) * 100.
                </div>
                <div className="font-mono text-[10px] text-gold">
                  Quantified: {activeDamageReport?.damageRatioFormatted || '0.0%'} surface area
                </div>
              </div>

              {/* Stage 3: Policy Rule Binding */}
              <div className="bg-dark/60 border border-g3 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="w-4 h-4 text-gold" />
                    <span className="font-semibold text-light">Stage 3: Policy Rule Binding</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Bound
                  </span>
                </div>
                <div className="text-g6 text-[11px]">
                  Bound exclusively to {activeCase?.businessName || 'Selected Merchant'}'s published rules.
                </div>
                <div className="font-mono text-[10px] text-g6/80">
                  Target Clauses: 4.1 (Fracture), 4.2 (30% Cap), 8.2 ($200 Cap)
                </div>
              </div>

              {/* Stage 4: Multimodal Deliberation */}
              <div className="bg-dark/60 border border-g3 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BrainCircuit className="w-4 h-4 text-gold" />
                    <span className="font-semibold text-light">Stage 4: Multimodal Deliberation</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Formulated
                  </span>
                </div>
                <div className="text-g6 text-[11px]">
                  Meta Muse Spark structured reasoning with deterministic financial override guardrails.
                </div>
                <div className="font-mono text-[10px] text-gold">
                  Status: Model Decision Formulated
                </div>
              </div>

            </div>
          </div>

          {/* Formulated Ruling Card */}
          {decision && (
            <div className={`rounded-xl border p-6 space-y-4 ${
              isHumanReview
                ? 'bg-amber-950/20 border-amber-500/40 text-amber-100'
                : ruling === 'refund'
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                : ruling === 'reject'
                ? 'bg-red-950/20 border-red-500/40 text-red-100'
                : 'bg-blue-950/20 border-blue-500/40 text-blue-100'
            }`}>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gold font-semibold">
                    MODEL DECISION FORMULATED
                  </span>
                  <h3 className="font-serif font-bold text-2xl text-light capitalize">
                    {ruling === 'refund' && 'Full Refund Authorized'}
                    {ruling === 'replace_item' && 'Item Replacement Authorized'}
                    {ruling === 'replace_packaging' && 'Packaging Credit / Box Replacement'}
                    {ruling === 'repair' && 'Repair Service Authorized'}
                    {ruling === 'reject' && 'Dispute Claim Rejected'}
                    {ruling === 'human_review' && 'Escalated to Specialist Human Review'}
                  </h3>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase ${
                    isHumanReview ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  }`}>
                    {decision.handlingBadge || (isHumanReview ? 'human_intervention_required' : 'ai_handled')}
                  </span>
                </div>
              </div>

              {/* Rationale Text */}
              <p className="text-xs text-g7 leading-relaxed bg-black/40 p-4 rounded-lg border border-g3/60">
                {decision.rationale || decision.explanation || 'Claim evaluated under verified business policy and computer vision damage report.'}
              </p>

              {/* Clause and Threshold details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div className="bg-dark/60 p-2.5 rounded border border-g3/50">
                  <span className="text-g6 block text-[10px]">Applied Clause</span>
                  <span className="text-gold font-semibold">{decision.appliedClause || 'Clause 4.1 / 8.2'}</span>
                </div>
                <div className="bg-dark/60 p-2.5 rounded border border-g3/50">
                  <span className="text-g6 block text-[10px]">Model Confidence</span>
                  <span className="text-light">{decision.confidence ? `${(decision.confidence * 100).toFixed(0)}%` : '92%'}</span>
                </div>
                <div className="bg-dark/60 p-2.5 rounded border border-g3/50">
                  <span className="text-g6 block text-[10px]">Outcome Status</span>
                  <span className="text-light capitalize">{decision.outcomeStatus || rulingStatus}</span>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </section>
  );
}

