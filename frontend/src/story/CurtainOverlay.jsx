import React, { useEffect, useState } from 'react';

export function CurtainOverlay() {
  const [lifted, setLifted] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setHidden(true);
      return;
    }

    // Stays on screen 400ms longer (700ms total) before parting ways
    const timer1 = setTimeout(() => {
      setLifted(true);
    }, 700);

    const timer2 = setTimeout(() => {
      setHidden(true);
    }, 1900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      id="curtainOverlay"
      className={`fixed inset-0 z-50 pointer-events-none flex transition-opacity duration-700 ${
        lifted ? 'curtain-lifted' : ''
      }`}
    >
      {/* Left panel (first half) - rolls up with "Snap" offset from center line */}
      <div
        className="flex-1 h-full bg-[#141210] border-r border-gold/30 transition-transform duration-1000 ease-in-out flex items-center justify-end pr-6 sm:pr-8 md:pr-10 select-none overflow-hidden"
        style={{
          transform: lifted ? 'translateY(-100%)' : 'translateY(0)',
          backgroundImage: 'radial-gradient(circle at 75% 50%, #1e1915 0%, #0d0c0a 100%)',
        }}
      >
        <span className="font-comfortaa font-bold text-2xl sm:text-3xl md:text-4xl tracking-wide text-light">
          Snap
        </span>
      </div>

      {/* Right panel (second half) - rolls down with "Desk" offset from center line */}
      <div
        className="flex-1 h-full bg-[#141210] border-l border-gold/30 transition-transform duration-1000 ease-in-out flex items-center justify-start pl-6 sm:pl-8 md:pl-10 select-none overflow-hidden"
        style={{
          transform: lifted ? 'translateY(100%)' : 'translateY(0)',
          backgroundImage: 'radial-gradient(circle at 25% 50%, #1e1915 0%, #0d0c0a 100%)',
        }}
      >
        <span className="font-comfortaa font-bold text-2xl sm:text-3xl md:text-4xl tracking-wide text-light">
          Desk
        </span>
      </div>
    </div>
  );
}
