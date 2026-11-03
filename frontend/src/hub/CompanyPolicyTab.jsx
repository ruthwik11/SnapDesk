import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { FileEdit, History, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export function CompanyPolicyTab() {
  const [activePolicy, setActivePolicy] = useState(null);
  const [versions, setVersions] = useState([]);
  const [rawText, setRawText] = useState('');
  const [policyName, setPolicyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const res = await api.getPolicy();
      if (res.success) {
        setActivePolicy(res.activePolicy);
        setVersions(res.versions || []);
        if (res.activePolicy) {
          setRawText(res.activePolicy.rawText || '');
          setPolicyName(res.activePolicy.name || '');
        }
      }
    } catch (err) {
      setErrorMsg('Failed to load company policies.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.savePolicy({
        rawText,
        name: policyName || `Policy Version ${(versions.length + 1)}.0`,
        status: 'published',
      });
      if (res.success) {
        setActivePolicy(res.policy);
        setVersions((prev) => [res.policy, ...prev]);
        setSuccessMsg(`Successfully published ${res.policy.name}!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to publish policy.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-g6 flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
        <span className="text-xs font-mono">Loading tenant policy manuscript...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Editor Box */}
      <div className="bg-g1 border border-gold/40 rounded-xl p-6 sm:p-8 shadow-xl relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-g3/60 pb-5 mb-6">
          <div>
            <div className="flex items-center space-x-2 text-gold text-xs font-mono uppercase">
              <FileEdit className="w-4 h-4" />
              <span>Tenant Policy Governance</span>
            </div>
            <h3 className="font-serif font-bold text-2xl text-light mt-1">
              Company Policy Manuscript Editor
            </h3>
            <p className="text-xs text-g6 mt-1">
              Active: <strong className="text-gold">{activePolicy?.name || 'Standard Policy v1.0'}</strong> • Version ID: {activePolicy?.versionId}
            </p>
          </div>

          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Strict Tenant Isolation
          </span>
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

        <form onSubmit={handleSavePolicy} className="space-y-5 text-xs">
          <div>
            <label className="block text-g7 font-medium mb-1.5">Policy Version Title</label>
            <input
              type="text"
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              placeholder="e.g. Apex Standard Damage Policy v2.0"
              className="w-full bg-dark border border-g3 rounded-lg px-3 py-2 text-light placeholder-g6 focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-g7 font-medium mb-1.5 flex items-center justify-between">
              <span>Full Policy Text (Natural Language Manuscript) *</span>
              <span className="text-[10px] text-g6 font-mono">Compiled by Muse Spark into evaluation rules</span>
            </label>
            <textarea
              required
              rows={10}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Enter policy clauses (e.g. 1. COVERAGE: Claims must be reported within 14 calendar days...)"
              className="w-full bg-dark border border-g3 rounded-xl p-4 font-mono text-xs text-light placeholder-g6 focus:outline-none focus:border-gold leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-g3/60 flex items-center justify-between">
            <span className="text-[11px] text-g6 font-mono">
              Changes take effect immediately for new claims
            </span>

            <button
              type="submit"
              disabled={saving}
              className="bg-gold hover:bg-white disabled:opacity-50 text-dark font-semibold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-gold/20 flex items-center space-x-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Publishing Version...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Publish New Version</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Version History Drawer */}
      <div className="bg-g1 border border-g3 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-xs font-mono text-light border-b border-g3/60 pb-3">
          <History className="w-4 h-4 text-gold" />
          <span className="font-semibold">Published Policy Versions ({versions.length})</span>
        </div>

        <div className="divide-y divide-g3/30 text-xs">
          {versions.map((ver, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between">
              <div>
                <div className="text-light font-medium">{ver.name}</div>
                <div className="text-[10px] font-mono text-g6 mt-0.5">
                  ID: {ver.versionId} • Created by: {ver.createdBy || 'Administrator'} • {new Date(ver.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                idx === 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-g2 text-g6'
              }`}>
                {idx === 0 ? 'Active' : 'Archived'}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

