import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import Lenis from 'lenis';

const ScrollContext = createContext({
  scrollProgress: 0,
  scrollY: 0,
  activeSection: 'hero',
  lenis: null,
  scrollTo: () => {},
});

export const useScroll = () => useContext(ScrollContext);

export function SmoothScrollProvider({ children }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');
  const lenisRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      const handleNativeScroll = () => {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = totalHeight > 0 ? window.scrollY / totalHeight : 0;
        setScrollProgress(progress);
        setScrollY(window.scrollY);
      };
      window.addEventListener('scroll', handleNativeScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleNativeScroll);
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    lenisRef.current = lenis;

    function onScroll(e) {
      setScrollProgress(e.progress);
      setScrollY(e.scroll);

      // Dynamically resolve active section by scroll
      const sections = ['hero', 'accounts', 'customer-intake', 'vision', 'decision-engine', 'business-hub'];
      const curIndex = Math.min(sections.length - 1, Math.floor(e.progress * sections.length));
      setActiveSection(sections[curIndex]);
    }

    lenis.on('scroll', onScroll);

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  const scrollTo = (target, options = {}) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, { offset: -60, ...options });
    } else {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <ScrollContext.Provider value={{ scrollProgress, scrollY, activeSection, lenis: lenisRef.current, scrollTo }}>
      {children}
    </ScrollContext.Provider>
  );
}

