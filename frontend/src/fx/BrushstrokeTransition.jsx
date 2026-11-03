import React from 'react';

export function BrushstrokeTransition({ height = "100px", flip = false }) {
  return (
    <div
      className={`w-full relative z-20 pointer-events-none overflow-hidden ${
        flip ? 'transform rotate-180' : ''
      }`}
      style={{ height }}
    >
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="w-full h-full fill-dark"
      >
        <path d="M0,0 C150,90 350,-40 500,60 C650,140 900,10 1200,80 L1200,120 L0,120 Z" opacity="0.3" />
        <path d="M0,20 C200,110 400,-10 600,80 C800,130 1000,30 1200,100 L1200,120 L0,120 Z" opacity="0.6" />
        <path d="M0,45 C250,120 450,20 700,95 C950,140 1050,50 1200,115 L1200,120 L0,120 Z" />
      </svg>
    </div>
  );
}

