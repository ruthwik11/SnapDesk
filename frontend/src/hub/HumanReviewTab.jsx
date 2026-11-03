import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { UserCheck, CheckCircle2, AlertTriangle, MessageSquare, Loader2, Check, X, RotateCcw, Package, Wrench } from 'lucide-react';

export function HumanReviewTab() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjudicatingCase, setAdjudicatingCase] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadReviewQueue();
  }, []);

  const loadReviewQueue = async () => {
    setLoading(true);
    try {
      const res = await api.getHumanReviewQueue();
      if (res.success) {
        setCases(res.cases || []);
      }
    } catch (err) {
      console.warn('Human review fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionType) => {
    if (!adjudicatingCase) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.submitHumanReview(adjudicatingCase.id, {
        action: actionType,
        notes: actionNotes.trim(),
      });
      if (res.success) {
        setSuccessMsg(`Successfully resolved ${adjudicatingCase.caseNumber} as ${actionType}.`);
        setCases((prev) => prev.filter((c) => c.id !== adjudicatingCase.id));
        setAdjudicatingCase(null);
        setActionNotes('');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit human review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-g6 flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
        <span className="text-xs font-mono">Loading human review escalations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-g1 border border-g3 rounded-xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-gold text-xs font-mono uppercase">
            <UserCheck className="w-4 h-4" />
            <span>Escalation &amp; Specialist Adjudication</span>
          </div>
          <h3 className="font-serif font-bold text-xl text-light mt-1">
            Human-Review Queue ({cases.length} pending)
          </h3>
          <p className="text-xs text-g6 mt-0.5">
            Disputes exceeding financial thresholds or flagged by low visual confidence.
          </p>
        </div>

        <span className="text-xs font-mono text-gold bg-gold/10 border border-gold/30 px-3 py-1 rounded-full self-start sm:self-auto">
          Deterministic Override Gate
        </span>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Cases Queue */}
      {cases.length === 0 ? (
        <div className="bg-g1 border border-g3 rounded-xl py-20 text-center text-g6 space-y-2">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400/80" />
          <div className="text-sm font-medium text-light">Queue is Clean!</div>
          <p className="text-xs">No customer claims currently require specialist adjudication.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {cases.map((c) => (
            <div
              key={c.id}
              className="bg-g1 border border-g3 hover:border-gold/50 rounded-xl p-5 space-y-4 shadow-lg transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-light">
                    {c.caseNumber}
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-amber-500/15 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded">
                    Human Intervention Required
                  </span>
                </div>

                <div className="text-g6 text-[11px] font-mono">
                  Customer: <strong className="text-light">{c.customerName}</strong> • Reported: ${c.productCostReported?.toFixed(2) || '0.00'}
                </div>

                <p className="text-g7 line-clamp-3 bg-dark/60 p-3 rounded-lg border border-g3/60 italic">
                  "{c.writtenComplaint}"
                </p>
              </div>

              <div className="pt-3 border-t border-g3/60 flex items-center justify-between">
                <span className="text-[10px] font-mono text-g6">
                  {c.mediaAssets?.length || 0} media evidence file(s)
                </span>

                <button
                  type="button"
                  onClick={() => setAdjudicatingCase(c)}
                  className="bg-gold hover:bg-white text-dark font-medium px-4 py-1.5 rounded-lg text-xs transition-all shadow-md shadow-gold/20"
                >
                  Adjudicate Claim
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adjudication Modal */}
      {adjudicatingCase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setAdjudicatingCase(null)}
        >
          <div
            className="w-full max-w-lg bg-g1 border border-gold/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative text-xs space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-g3/60 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-gold">Adjudicate Ticket</span>
                <h4 className="font-serif font-bold text-xl text-light">{adjudicatingCase.caseNumber}</h4>
              </div>
              <button
                onClick={() => setAdjudicatingCase(null)}
                className="text-g6 hover:text-light"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-g7 font-medium">Specialist Review Notes / Reason *</label>
              <textarea
                rows={3}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Enter justification for audit log (e.g. 'Manually verified packaging crush above threshold from video frame 00:12. Authorized full item replacement.')..."
                className="w-full bg-dark border border-g3 rounded-lg p-3 text-light placeholder-g6 focus:outline-none focus:border-gold"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-g7 font-medium">Select Resolution Action:</label>
              <div className="grid grid-cols-2 gap-2 font-medium">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAction('refund')}
                  className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-1.5 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Approve Full Refund</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAction('replacement')}
                  className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Approve Replacement</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAction('repair')}
                  className="p-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Approve Repair</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAction('reject')}
                  className="p-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center justify-center space-x-1.5 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject Claim</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

