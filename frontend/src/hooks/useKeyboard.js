import { useEffect } from 'react';

export function useEscapeKey(callback, isActive = true) {
  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        callback();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [callback, isActive]);
}

export function useGlobalShortcut(code, callback, options = { ctrlOrCmd: true }) {
  useEffect(() => {
    function handleKeyDown(event) {
      const isMac = typeof window !== 'undefined' && window.navigator.userAgent.includes('Mac');
      const hasModifier = options.ctrlOrCmd ? (isMac ? event.metaKey : event.ctrlKey) : true;

      if (hasModifier && event.code === code) {
        event.preventDefault();
        event.stopPropagation();
        callback(event);
      }
    }

    document.body.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.removeEventListener('keydown', handleKeyDown);
    };
  }, [code, callback, options.ctrlOrCmd]);
}

