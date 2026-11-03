import React, { useState } from 'react';
import { CustomerIntakeSection } from './CustomerIntakeSection';
import { VisionSection } from './VisionSection';
import { DecisionEngineSection } from './DecisionEngineSection';
import { FilePlus, Eye, Scale, ArrowLeft } from 'lucide-react';

export function CustomerPortal({
  businesses = [],
  currentUser,
  onReturnToLanding,
  selectedBusinessId,
}) {
  const [activeStep, setActiveStep] = useState(1); // 1 = Intake, 2 = Vision, 3 = Decision

  const [activeCase, setActiveCase] = useState(null);
  const [activeDamageReport, setActiveDamageReport] = useState(null);
  const [activeDecision, setActiveDecision] = useState(null);

  const handleCaseSubmitted = (caseId, caseNumber, businessName) => {
    setActiveCase({
      id: caseId,
      caseNumber,
      businessName,
      customerName: currentUser?.name || 'Customer',
    });
    setActiveStep(2); // Automatically advance to Vision inspection!
  };

  const handleVisionComplete = (damageReport) => {
    setActiveDamageReport(damageReport);
  };

  const handleDecisionComplete = (decision) => {
    setActiveDecision(decision);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 space-y-8 relative z-20">
      
      {/* Top Breadcrumb & Step Navigation */}
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-g1/90 border border-gold/30 rounded-xl p-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <button
            onClick={onReturnToLanding}
            className="p-1.5 rounded-lg bg-g2 text-g6 hover:text-gold hover:bg-g3 transition-colors"
            title="Return to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="font-serif font-bold text-sm text-light">Customer Dispute Resolution</div>
            <div className="text-[11px] font-mono text-gold">
              {currentUser ? `Signed in as ${currentUser.name}` : 'Dispute Intake Portal'}
            </div>
          </div>
        </div>

        {/* 3 Steps Pills */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setActiveStep(1)}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1.5 transition-all ${
              activeStep === 1
                ? 'bg-gold text-dark font-semibold shadow-md shadow-gold/20'
                : 'bg-g2 text-g6 hover:text-light'
            }`}
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>1. Intake Form</span>
          </button>

          <button
            onClick={() => activeCase && setActiveStep(2)}
            disabled={!activeCase}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              activeStep === 2
                ? 'bg-gold text-dark font-semibold shadow-md shadow-gold/20'
                : 'bg-g2 text-g6 hover:text-light'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>2. Vision Analysis</span>
          </button>

          <button
            onClick={() => activeCase && setActiveStep(3)}
            disabled={!activeCase}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              activeStep === 3
                ? 'bg-gold text-dark font-semibold shadow-md shadow-gold/20'
                : 'bg-g2 text-g6 hover:text-light'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>3. Decision Engine</span>
          </button>
        </div>
      </div>

      {/* Step Views */}
      {activeStep === 1 && (
        <CustomerIntakeSection
          businesses={businesses}
          currentUser={currentUser}
          selectedBusinessId={selectedBusinessId}
          onCaseSubmitted={handleCaseSubmitted}
        />
      )}

      {activeStep === 2 && (
        <VisionSection
          activeCase={activeCase}
          activeDamageReport={activeDamageReport}
          onVisionComplete={handleVisionComplete}
          onProceedToDecision={() => setActiveStep(3)}
        />
      )}

      {activeStep === 3 && (
        <DecisionEngineSection
          activeCase={activeCase}
          activeDamageReport={activeDamageReport}
          onDecisionComplete={handleDecisionComplete}
        />
      )}

    </div>
  );
}

