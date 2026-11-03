import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Sliders, Save, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

export function DecisionThresholdsTab() {
  const [thresholds, setThresholds] = useState(null);
  const [maxRatio, setMaxRatio] = useState(0.30);
  const [handoffCap, setHandoffCap] = useState(200.0);
  const [minConfidence, setMinConfidence] = useState(0.70);
  const [autoRefund, setAutoRefund] = useState(true);
  const [autoReplacement, setAutoReplacement] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadThresholds();
  }, []);

  const loadThresholds = async () => {
    setLoading(true);
    try {
      const res = await api.getThresholds();
      if (res.success && res.thresholds) {
        setThresholds(res.thresholds);
        const r = res.thresholds.rules || {};
        if (r.packaging_replace_max_ratio !== undefined) setMaxRatio(r.packaging_replace_max_ratio);
        if (r.handoff_order_value !== undefined) setHandoffCap(r.handoff_order_value);
        if (r.min_confidence !== undefined) setMinConfidence(r.min_confidence);
        if (r.auto_refund_enabled !== undefined) setAutoRefund(r.auto_refund_enabled);
        if (r.auto_replacement_enabled !== undefined) setAutoReplacement(r.auto_replacement_enabled);
      }
    } catch (err) {
      setErrorMsg('Failed to load decision thresholds.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.saveThresholds({
        packaging_replace_max_ratio: parseFloat(maxRatio),
        handoff_order_value: parseFloat(handoffCap),
        min_confidence: parseFloat(minConfidence),
        auto_refund_enabled: autoRefund,
        auto_replacement_enabled: autoReplacement,
      });
      if (res.success) {
        setSuccessMsg('Decision thresholds updated successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update thresholds.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-g6 flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
        <span className="text-xs font-mono">Loading decision thresholds...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-g1 border border-gold/40 rounded-xl p-6 sm:p-8 shadow-xl relative">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-g3/60 pb-5 mb-6">
          <div>
            <div className="flex items-center space-x-2 text-gold text-xs font-mono uppercase">
              <Sliders className="w-4 h-4" />
              <span>Deterministic Guardrails</span>
            </div>
            <h3 className="font-serif font-bold text-2xl text-light mt-1">
              Decision Thresholds &amp; Overrides
            </h3>
            <p className="text-xs text-g6 mt-1">
              Deterministic parameters that override AI model output to protect your bottom line.
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 text-xs">
          
          {/* Packaging Ratio Threshold */}
          <div className="bg-dark/70 border border-g3 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-g7 font-medium block">
                  Packaging Replacement Maximum Damage Ratio
                </label>
                <span className="text-[11px] text-g6">
                  Damage below this ratio qualifies for box credit; above triggers full item replacement.
                </span>
              </div>
              <span className="font-mono text-sm text-gold font-bold">
                {(maxRatio * 100).toFixed(0)}%
              </span>
            </div>

            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.05"
              value={maxRatio}
              onChange={(e) => setMaxRatio(parseFloat(e.target.value))}
              className="w-full accent-gold cursor-pointer"
            />
          </div>

          {/* High Value Handoff Cap */}
          <div className="bg-dark/70 border border-g3 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-g7 font-medium block">
                  High-Value Order Human Escalation Cap (USD)
                </label>
                <span className="text-[11px] text-g6">
                  Orders exceeding this monetary value always mandate human review.
                </span>
              </div>
              <span className="font-mono text-sm text-gold font-bold">
                ${handoffCap.toFixed(2)}
              </span>
            </div>

            <div className="relative w-48">
              <span className="absolute left-3 top-2 text-g6">$</span>
              <input
                type="number"
                min="10"
                step="10"
                value={handoffCap}
                onChange={(e) => setHandoffCap(parseFloat(e.target.value))}
                className="w-full bg-dark border border-g3 rounded-lg pl-7 pr-3 py-1.5 text-xs text-light font-mono focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          {/* Min Visual Confidence */}
          <div className="bg-dark/70 border border-g3 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-g7 font-medium block">
                  Minimum SAM 3.1 Visual Confidence
                </label>
                <span className="text-[11px] text-g6">
                  Claims with model confidence below this score escalate to human review.
                </span>
              </div>
              <span className="font-mono text-sm text-gold font-bold">
                {(minConfidence * 100).toFixed(0)}%
              </span>
            </div>

            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="w-full accent-gold cursor-pointer"
            />
          </div>

          {/* Automation Toggles */}
          <div className="bg-dark/70 border border-g3 rounded-xl p-4 space-y-3">
            <label className="text-g7 font-medium block">
              Autonomous Authorization Gates
            </label>

            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-light">Auto-Authorize Verified Item Refunds</span>
                <p className="text-[10px] text-g6">Allow immediate refund authorization when fracture is confirmed.</p>
              </div>
              <input
                type="checkbox"
                checked={autoRefund}
                onChange={(e) => setAutoRefund(e.target.checked)}
                className="w-4 h-4 accent-gold cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-1 border-t border-g3/40">
              <div>
                <span className="text-light">Auto-Authorize Packaging Replacements</span>
                <p className="text-[10px] text-g6">Allow automatic replacement dispatch when packaging damage exceeds threshold.</p>
              </div>
              <input
                type="checkbox"
                checked={autoReplacement}
                onChange={(e) => setAutoReplacement(e.target.checked)}
                className="w-4 h-4 accent-gold cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-g3/60 flex items-center justify-between">
            <span className="text-[11px] text-g6 font-mono">
              Tenant isolated configuration
            </span>

            <button
              type="submit"
              disabled={saving}
              className="bg-gold hover:bg-white disabled:opacity-50 text-dark font-semibold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-gold/20 flex items-center space-x-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Thresholds</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

