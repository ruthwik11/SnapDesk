import React from 'react';
import { useScroll } from '@/motion/SmoothScrollProvider';

export function DaVinciGeometry({ active = true }) {
  const { scrollProgress } = useScroll();

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden opacity-25 select-none transition-opacity duration-700">
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ede6db" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#d8cfc0" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Central Vitruvian Framing Circles */}
        <circle
          cx="720"
          cy="450"
          r="380"
          stroke="url(#goldGradient)"
          strokeWidth="1.2"
          strokeDasharray="6 6"
        />
        <circle
          cx="720"
          cy="450"
          r="235"
          stroke="url(#goldGradient)"
          strokeWidth="0.8"
        />

        {/* Golden Ratio Horizontal & Vertical Construction Lines */}
        <line
          x1="0"
          y1="344"
          x2="1440"
          y2="344"
          stroke="#ede6db"
          strokeWidth="0.6"
          strokeOpacity="0.4"
        />
        <line
          x1="0"
          y1="556"
          x2="1440"
          y2="556"
          stroke="#ede6db"
          strokeWidth="0.6"
          strokeOpacity="0.4"
        />
        <line
          x1="0"
          y1="450"
          x2="1440"
          y2="450"
          stroke="#ede6db"
          strokeWidth="0.8"
          strokeDasharray="4 8"
          strokeOpacity="0.5"
        />
        <line
          x1="720"
          y1="0"
          x2="720"
          y2="900"
          stroke="#ede6db"
          strokeWidth="0.8"
          strokeDasharray="4 8"
          strokeOpacity="0.5"
        />

        {/* Diagonal Vitruvian Perspective lines */}
        <line
          x1="0"
          y1="0"
          x2="1440"
          y2="900"
          stroke="#ede6db"
          strokeWidth="0.5"
          strokeDasharray="2 6"
          strokeOpacity="0.3"
        />
        <line
          x1="1440"
          y1="0"
          x2="0"
          y2="900"
          stroke="#ede6db"
          strokeWidth="0.5"
          strokeDasharray="2 6"
          strokeOpacity="0.3"
        />

        {/* Dynamic scroll-driven golden ratio spiral indicator */}
        <g transform={`translate(720, 450) rotate(${scrollProgress * 90}) translate(-720, -450)`}>
          <path
            d="M720,450 A30,30 0 0,1 750,480 A60,60 0 0,1 690,540 A120,120 0 0,1 570,420 A240,240 0 0,1 810,180"
            fill="none"
            stroke="#ede6db"
            strokeWidth="0.7"
            strokeOpacity="0.45"
            strokeDasharray="4 4"
          />
        </g>
      </svg>
    </div>
  );
}

