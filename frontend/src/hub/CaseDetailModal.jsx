import React from 'react';
import { useEscapeKey } from '@/hooks/useKeyboard';
import {
  X,
  FileText,
  Eye,
  Scale,
  CheckCircle2,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  DollarSign
} from 'lucide-react';

export function CaseDetailModal({ caseItem, onClose, onActionSubmitted }) {
  useEscapeKey(onClose, Boolean(caseItem));

  if (!caseItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-g1 border border-gold/40 rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-g6 hover:text-light transition-colors"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="border-b border-g3/60 pb-4 mb-6">
          <div className="flex items-center space-x-2 text-gold font-mono text-[11px] uppercase mb-1">
            <span>Case File #{caseItem.caseNumber}</span>
            <span>•</span>
            <span className="capitalize">{caseItem.status}</span>
          </div>
          <h3 className="font-serif font-bold text-2xl text-light">
            Claim Investigation Workspace
          </h3>
        </div>

        {/* Customer Information */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-dark/60 p-4 rounded-xl border border-g3/60 mb-6 font-mono">
          <div>
            <span className="text-g6 block text-[10px]">Customer</span>
            <span className="text-light font-medium">{caseItem.customerName}</span>
          </div>
          <div>
            <span className="text-g6 block text-[10px]">Phone</span>
            <span className="text-light">{caseItem.customerPhone || 'N/A'}</span>
          </div>
          <div>
            <span className="text-g6 block text-[10px]">Postal Code</span>
            <span className="text-light">{caseItem.postalCode || 'N/A'}</span>
          </div>
          <div>
            <span className="text-g6 block text-[10px]">Reported Cost</span>
            <span className="text-gold font-semibold">
              {caseItem.productCostReported ? `$${caseItem.productCostReported.toFixed(2)}` : 'Not specified'}
            </span>
          </div>
        </div>

        {/* Written Concern & Voice Transcript */}
        <div className="space-y-3 mb-6">
          <div className="text-[11px] font-mono uppercase tracking-widest text-g6">
            Customer Statement
          </div>
          <div className="bg-dark/80 p-3.5 rounded-xl border border-g3 text-g7 leading-relaxed">
            "{caseItem.writtenComplaint}"
          </div>
          {caseItem.voiceTranscript && (
            <div className="bg-dark/50 p-3 rounded-lg border border-gold/20 text-gold text-[11px] font-mono">
              <strong>Voice Transcript:</strong> "{caseItem.voiceTranscript}"
            </div>
          )}
        </div>

        {/* Submitted Evidence Gallery */}
        <div className="space-y-3 mb-6">
          <div className="text-[11px] font-mono uppercase tracking-widest text-g6">
            Photographic Evidence ({caseItem.mediaAssets?.length || 0} files)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(caseItem.mediaAssets || []).map((asset, idx) => (
              <div key={idx} className="bg-dark border border-g3 rounded-lg overflow-hidden p-1">
                <img
                  src={asset.mediaUrl}
                  alt={`Evidence ${idx + 1}`}
                  className="w-full h-32 object-cover rounded"
                />
                <div className="p-1 text-[9px] font-mono text-g6 truncate">
                  SHA-256: {asset.sha256Digest?.slice(0, 16)}...
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decision & Handling Summary */}
        <div className="bg-dark/90 border border-gold/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-serif font-bold text-sm text-light">Autonomous Deliberation</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
              caseItem.handlingBadge === 'ai_handled'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                : 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
            }`}>
              {caseItem.handlingBadge}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-g6 block text-[10px]">Ruling Outcome</span>
              <span className="text-gold font-bold text-sm capitalize">{caseItem.outcome}</span>
            </div>
            <div>
              <span className="text-g6 block text-[10px]">Authorization Status</span>
              <span className="text-light capitalize">{caseItem.outcomeStatus}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

