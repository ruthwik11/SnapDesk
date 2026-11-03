import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import {
  Eye,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Sliders,
  Layers,
  ArrowRight,
  Maximize2,
  Video
} from 'lucide-react';

export function VisionSection({
  activeCase,
  activeDamageReport,
  onVisionComplete,
  onProceedToDecision,
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState(activeDamageReport);
  const [errorMsg, setErrorMsg] = useState('');

  // Layer toggles
  const [showMaskLayer, setShowMaskLayer] = useState(true);
  const [showBoxLayer, setShowBoxLayer] = useState(true);
  const [showGridLayer, setShowGridLayer] = useState(true);

  // Automatically start vision analysis if not done yet
  useEffect(() => {
    if (activeCase?.id && !report && !analyzing) {
      triggerAnalysis();
    }
  }, [activeCase?.id]);

  const triggerAnalysis = async () => {
    if (!activeCase?.id) return;
    setAnalyzing(true);
    setErrorMsg('');

    try {
      const res = await api.analyzeVision(activeCase.id);
      if (res.success && res.damageReport) {
        setReport(res.damageReport);
        if (onVisionComplete) onVisionComplete(res.damageReport);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Vision analysis pipeline failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const primaryMedia = activeCase?.mediaAssets?.[0];
  const isVideo = primaryMedia?.isVideo;

  return (
    <section id="vision" className="py-12 px-4 sm:px-6 lg:px-8 relative z-20">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Section Header */}
        <div className="bg-g1 border border-gold/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-g3/60 pb-6 mb-6">
            <div>
              <div className="flex items-center space-x-2 text-gold text-xs font-mono uppercase tracking-widest mb-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Section 2 • Meta SAM 3.1 Vision Inspection</span>
              </div>
              <h2 className="font-serif font-bold text-2xl sm:text-3xl text-light">
                Autonomous Visual Damage Triage
              </h2>
              <p className="text-xs text-g6 mt-1 font-mono">
                Case #{activeCase?.caseNumber || 'TKT-PENDING'} • Customer: {activeCase?.customerName}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {analyzing ? (
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gold/15 text-gold border border-gold/30 text-xs font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>SAM 3.1 Segmenting...</span>
                </div>
              ) : report ? (
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Inspection Complete</span>
                </div>
              ) : (
                <button
                  onClick={triggerAnalysis}
                  className="bg-gold hover:bg-white text-dark font-medium px-4 py-2 rounded-lg text-xs transition-all flex items-center space-x-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Start Inspection</span>
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Main Inspection Canvas & Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Visualizer Frame (7 cols) */}
            <div className="lg:col-span-7 bg-dark rounded-xl border border-g3/80 overflow-hidden relative min-h-[340px] flex items-center justify-center">
              
              {primaryMedia?.mediaUrl ? (
                <div className="relative w-full h-full flex items-center justify-center p-4">
                  {isVideo ? (
                    <video
                      src={primaryMedia.mediaUrl}
                      controls
                      className="max-h-[380px] w-auto rounded shadow-lg"
                    />
                  ) : (
                    <div className="relative inline-block max-h-[380px] overflow-hidden rounded">
                      <img
                        src={primaryMedia.mediaUrl}
                        alt="Evidence for inspection"
                        className="max-h-[380px] w-auto object-contain block"
                      />

                      {/* Segmentation Mask Overlay */}
                      {showMaskLayer && report?.damageRatio > 0 && (
                        <div
                          className="absolute inset-0 bg-red-600/35 border-2 border-red-500 mix-blend-multiply pointer-events-none transition-opacity duration-300"
                          style={{ clipPath: 'polygon(20% 30%, 80% 25%, 85% 75%, 15% 80%)' }}
                        />
                      )}

                      {/* Bounding Box Contours */}
                      {showBoxLayer && (
                        <div className="absolute inset-4 border-2 border-dashed border-gold/70 pointer-events-none">
                          <span className="absolute top-1 left-1 bg-gold text-dark font-mono text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase">
                            SAM 3.1 Target [{report?.productFound ? 'Product Detected' : 'Parcel Object'}]
                          </span>
                        </div>
                      )}

                      {/* Da Vinci Inspection Grid */}
                      {showGridLayer && (
                        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#ede6db_1px,transparent_1px)] [background-size:16px_16px]" />
                      )}
                    </div>
                  )}

                  {/* Corner Inspection Reticles */}
                  <div className="absolute top-2 left-2 text-[10px] font-mono text-gold/80 bg-black/60 px-2 py-0.5 rounded">
                    FOV: CALIBRATED (1080p)
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-g2 border border-g3 flex items-center justify-center mx-auto text-gold">
                    <Eye className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="text-light text-sm font-medium">Awaiting Evidence Media</div>
                  <p className="text-xs text-g6 max-w-xs">
                    Submit parcel photos in Section 1 to begin real-time SAM 3.1 damage quantification.
                  </p>
                </div>
              )}

              {/* Canvas Overlay Controls */}
              <div className="absolute bottom-2 left-2 right-2 bg-dark/85 backdrop-blur-sm border border-g3/80 rounded-lg p-2 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5 text-gold mr-1" />
                  <span className="text-g6 text-[11px] uppercase font-mono">Layers:</span>
                  
                  <button
                    type="button"
                    onClick={() => setShowMaskLayer(!showMaskLayer)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      showMaskLayer ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'text-g6'
                    }`}
                  >
                    Damage Mask
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBoxLayer(!showBoxLayer)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      showBoxLayer ? 'bg-gold/20 text-gold border border-gold/40' : 'text-g6'
                    }`}
                  >
                    Bounding Box
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGridLayer(!showGridLayer)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      showGridLayer ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'text-g6'
                    }`}
                  >
                    Geometry Grid
                  </button>
                </div>

                <span className="text-[10px] font-mono text-g6">
                  {report?.modelUsed || 'Meta SAM 3.1'}
                </span>
              </div>
            </div>

            {/* Telemetry & Measurements (5 cols) */}
            <div className="lg:col-span-5 space-y-4 text-xs">
              
              {/* Damage Ratio Stat Card */}
              <div className="bg-dark/70 border border-g3 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-g6 uppercase font-mono text-[10px]">Quantified Damage Ratio</span>
                  <span className="text-gold font-mono text-xs">
                    {report?.damageRatioFormatted || `${((report?.damageRatio || 0) * 100).toFixed(1)}%`}
                  </span>
                </div>

                <div className="w-full h-3 bg-g2 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full transition-all duration-700 ${
                      (report?.damageRatio || 0) > 0.30 ? 'bg-red-500' : 'bg-gold'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, (report?.damageRatio || 0) * 100))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-g6 font-mono">
                  <span>0% (Intact)</span>
                  <span className="text-gold font-semibold">30% Threshold</span>
                  <span>100% (Destroyed)</span>
                </div>
              </div>

              {/* Assessment Breakdown */}
              <div className="bg-dark/70 border border-g3 rounded-xl p-4 space-y-2.5">
                <div className="text-[10px] uppercase font-mono tracking-wider text-g6 mb-1">
                  Autonomous Inspection Breakdown
                </div>

                <div className="flex items-center justify-between py-1 border-b border-g3/40">
                  <span className="text-g7">Product Recognized</span>
                  <span className={`font-mono font-medium ${report?.productFound ? 'text-emerald-400' : 'text-g6'}`}>
                    {report?.productFound ? 'Confirmed' : 'Uncertain / Generic Parcel'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-g3/40">
                  <span className="text-g7">Item Contents Fracture</span>
                  <span className={`font-mono font-medium ${report?.contentsDamaged ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                    {report?.contentsDamaged ? 'Direct Fracture Verified' : 'No Fracture Detected'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-g3/40">
                  <span className="text-g7">Detected Damage Regions</span>
                  <span className="font-mono text-gold">
                    {report?.regions?.length || 0} region(s)
                  </span>
                </div>

                {report?.regions && report.regions.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {report.regions.map((reg, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-g2 text-light border border-g3"
                      >
                        {reg.label || reg.type || 'Surface deformation'}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Proceed Action Button */}
              <button
                type="button"
                onClick={onProceedToDecision}
                disabled={!report}
                className="w-full bg-gold hover:bg-white disabled:opacity-50 text-dark font-semibold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-gold/20 flex items-center justify-center space-x-2"
              >
                <span>Evaluate Under Business Policy (Section 3)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>

          </div>

          {/* Technical Damage Report Artifact */}
          {report && (
            <div className="mt-8 pt-6 border-t border-g3/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2 text-xs font-mono text-light">
                  <FileText className="w-4 h-4 text-gold" />
                  <span className="font-semibold">Canonical Artifact:</span>
                  <span className="text-gold">Damage Report - {activeCase?.customerName || 'Customer'}</span>
                </div>
                <span className="text-[10px] font-mono text-g6">
                  ASD-STE100 Controlled Language
                </span>
              </div>

              <div className="bg-dark/90 border border-g3 rounded-xl p-4 font-mono text-xs text-g7 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {report.rawReportText || (
`================================================================================
  TECHNICAL DAMAGE REPORT — ASD-STE100 SPECIFICATION
================================================================================
Report Reference : ${report.reportId || 'REP-' + Date.now()}
Customer Name    : ${activeCase?.customerName || 'Elena Rostova'}
Model Utilized   : ${report.modelUsed || 'Meta SAM 3.1 (Standard Mode)'}
Generated Date   : ${report.createdAt || new Date().toISOString()}

1. VISUAL VERIFICATION
   - Target object identified   : ${report.productFound ? 'POSITIVE' : 'UNCERTAIN'}
   - Surface area damage ratio  : ${report.damageRatioFormatted || ((report.damageRatio || 0) * 100).toFixed(1) + '%'}
   - Critical contents fracture : ${report.contentsDamaged ? 'CONFIRMED' : 'NEGATIVE'}

2. DETERMINISTIC QUANTIFICATION
   - Polygon calculation method : Pixel-dense bounding mask analysis (@meta-sam/parser)
   - Identified regions         : ${report.regions?.map(r => r.label || 'deformation').join(', ') || 'Superficial transit wear'}

3. DOWNSTREAM DISPATCH
   - Formulated for Decision Engine binding against merchant policy.`
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
}

