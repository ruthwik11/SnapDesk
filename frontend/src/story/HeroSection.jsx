import React from 'react';
import { useScroll } from '@/motion/SmoothScrollProvider';
import { Sparkles, ArrowDown, Shield, Eye, Scale, Cpu } from 'lucide-react';

export function HeroSection({ onSelectPortal }) {
  const { scrollTo } = useScroll();

  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10"
    >
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Pre-title Tag */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-gold/15 border border-gold/40 text-gold text-xs font-comfortaa uppercase tracking-widest animate-in fade-in duration-700">
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          <span>Meta Model API Connected • SAM 3.1 &amp; Muse Spark</span>
        </div>

        {/* Masterpiece Titles */}
        <h1 className="font-comfortaa font-bold text-5xl sm:text-7xl lg:text-8xl tracking-tight text-light leading-[1.05]">
          Beyond <span className="gold-text-gradient font-comfortaa">Customer Support.</span>
        </h1>

        <p className="font-comfortaa text-sm sm:text-base tracking-[0.25em] text-gold/90 uppercase font-semibold">
          BUILT WITH PURPOSE, MADE FOR PEOPLE.
        </p>

        <p className="font-sans text-base sm:text-xl text-g7 max-w-2xl mx-auto font-normal leading-relaxed">
          The autonomous visual damage triage and policy enforcement platform. Powered by Meta SAM 3.1 computer-vision segmentation and Muse Spark multimodal deliberation.
        </p>

        {/* Action Buttons */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onSelectPortal('customer')}
            className="bg-gold hover:bg-white text-dark font-medium px-6 py-3 rounded-full text-sm sm:text-base transition-all shadow-lg shadow-gold/25 flex items-center space-x-2 font-sans"
          >
            <span>Customer Dispute Intake</span>
            <ArrowDown className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectPortal('business')}
            className="bg-g2 hover:bg-g3 text-light border border-g3/80 hover:border-gold/50 px-6 py-3 rounded-full text-sm sm:text-base transition-all flex items-center space-x-2 font-sans"
          >
            <Shield className="w-4 h-4 text-gold" />
            <span>Business Tenant Hub</span>
          </button>
        </div>

        {/* Technical Coordinate Indicators */}
        <div className="pt-10 text-xs font-mono text-g6 flex items-center justify-center space-x-4 opacity-80">
          <span className="flex items-center space-x-1">
            <Eye className="w-3.5 h-3.5 text-gold" />
            <span>SAM 3.1 VISION</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Cpu className="w-3.5 h-3.5 text-gold" />
            <span>MUSE SPARK DELIBERATION</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Scale className="w-3.5 h-3.5 text-gold" />
            <span>DETERMINISTIC POLICIES</span>
          </span>
        </div>

        {/* Scroll Indicator */}
        <div
          onClick={() => scrollTo('#accounts')}
          className="pt-6 cursor-pointer flex flex-col items-center text-g6 hover:text-gold transition-colors"
        >
          <span className="text-[11px] font-mono uppercase tracking-widest mb-1">
            Select Account Type
          </span>
          <ArrowDown className="w-4 h-4 animate-bounce text-gold" />
        </div>
      </div>
    </section>
  );
}

