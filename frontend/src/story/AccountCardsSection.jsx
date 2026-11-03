import React from 'react';
import { Building2, Package, Check, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

export function AccountCardsSection({ onOpenAuth, onSelectPortal }) {
  return (
    <section id="accounts" className="py-24 px-4 sm:px-6 lg:px-8 relative z-20">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="font-mono text-xs uppercase tracking-widest text-gold bg-gold/10 border border-gold/30 px-3 py-1 rounded-full">
            Choose Your Portal
          </span>
          <h2 className="font-serif font-bold text-3xl sm:text-5xl text-light">
            Select Account Access
          </h2>
          <p className="text-g6 text-sm sm:text-base max-w-xl mx-auto font-light">
            SnapDesk maintains strict tenant isolation, separating enterprise multi-tenant administration from customer dispute resolution.
          </p>
        </div>

        {/* Dual Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Business Portal */}
          <div className="bg-g1/90 border border-gold/40 hover:border-gold transition-all duration-300 rounded-2xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-36 h-36 bg-gold/5 rounded-full filter blur-2xl group-hover:bg-gold/10 transition-all pointer-events-none" />
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase bg-g2 text-gold border border-gold/30 px-2.5 py-1 rounded-full font-semibold">
                  Enterprise Tenant
                </span>
              </div>

              <div>
                <h3 className="font-serif font-bold text-2xl text-light mb-2">Business Portal</h3>
                <p className="text-g6 text-sm leading-relaxed">
                  For merchants, retail operations, and claims adjusters. Manage policies, configure automated thresholds, review human escalations, and monitor inspection accuracy.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-g7 pt-2 border-t border-g3/60">
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>Independent Tenant Isolation &amp; Policy Versions</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>Deterministic Decision Thresholds Editor</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>Product Damage &amp; Return Analytics</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>Human-Review Queue &amp; Case Audit Logs</span>
                </li>
              </ul>
            </div>

            <div className="pt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onOpenAuth('business', 'login')}
                className="bg-gold hover:bg-white text-dark font-medium py-2.5 px-4 rounded-xl text-xs sm:text-sm text-center transition-all shadow-md shadow-gold/20"
              >
                Business Login
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('business', 'register')}
                className="bg-g2 hover:bg-g3 text-light border border-g3 hover:border-gold/50 py-2.5 px-4 rounded-xl text-xs sm:text-sm text-center transition-all"
              >
                Register Company
              </button>
            </div>
          </div>

          {/* Card 2: Customer Portal */}
          <div className="bg-g1/90 border border-g3 hover:border-gold/60 transition-all duration-300 rounded-2xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full filter blur-2xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <Package className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase bg-g2 text-blue-300 border border-blue-400/30 px-2.5 py-1 rounded-full font-semibold">
                  Dispute Resolution
                </span>
              </div>

              <div>
                <h3 className="font-serif font-bold text-2xl text-light mb-2">Customer Portal</h3>
                <p className="text-g6 text-sm leading-relaxed">
                  For buyers and product recipients. File visual damage claims for parcels, appliances, or rentals with automated SAM 3.1 computer-vision measurement.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-g7 pt-2 border-t border-g3/60">
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>Submit Visual Claims (Photo / Video / Audio)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>Real-Time SAM 3.1 Damage Quantification</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>Policy-Grounded Instant Explanations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>Track Case Status &amp; Evidence Packages</span>
                </li>
              </ul>
            </div>

            <div className="pt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onOpenAuth('customer', 'login')}
                className="bg-gold hover:bg-white text-dark font-medium py-2.5 px-4 rounded-xl text-xs sm:text-sm text-center transition-all shadow-md shadow-gold/20"
              >
                Customer Login
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('customer', 'register')}
                className="bg-g2 hover:bg-g3 text-light border border-g3 hover:border-gold/50 py-2.5 px-4 rounded-xl text-xs sm:text-sm text-center transition-all"
              >
                Create Account
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

