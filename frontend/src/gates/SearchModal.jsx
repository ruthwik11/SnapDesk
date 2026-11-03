import React, { useEffect, useRef } from 'react';
import { useEscapeKey } from '@/hooks/useKeyboard';
import { useScroll } from '@/motion/SmoothScrollProvider';
import { Search, X, CornerDownLeft, Sparkles, Building2, ShieldCheck, Cpu } from 'lucide-react';

export function SearchModal({
  isOpen,
  onClose,
  searchTerm,
  setSearchTerm,
  filteredResults,
  selectedIndex,
  setSelectedIndex,
  clearSearch,
  onSelectMerchant,
}) {
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const { scrollTo } = useScroll();

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Arrow key traversal and Enter selection
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (filteredResults.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredResults[selectedIndex];
        if (selected) {
          handleSelectResult(selected);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  const handleSelectResult = (item) => {
    if (item.businessId && onSelectMerchant) {
      onSelectMerchant(item.businessId);
    }
    if (item.target) {
      scrollTo(item.target);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-g1 border border-gold/40 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-g3 bg-dark/60">
          <Search className="w-5 h-5 text-gold mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search policies, businesses, SAM 3.1 vision, tickets, clauses..."
            className="w-full bg-transparent text-light placeholder-g6 text-sm sm:text-base focus:outline-none font-sans"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="p-1 text-g6 hover:text-light transition-colors mr-2"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block bg-g2 text-g6 border border-g3 text-[11px] font-mono px-2 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Suggestion Chips */}
        {!searchTerm && (
          <div className="p-4 border-b border-g3/60 bg-dark/30">
            <div className="text-[11px] uppercase tracking-wider text-g6 font-mono font-semibold mb-2">
              Popular Lookups
            </div>
            <div className="flex flex-wrap gap-2">
              {['Apex Logistics', 'Clause 4.1', 'SAM 3.1', 'Customer Intake', 'High Value', 'Decision Engine'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setSearchTerm(chip)}
                  className="text-xs bg-g2 hover:bg-g3 text-g7 hover:text-gold px-2.5 py-1 rounded-full border border-g3 transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        <div ref={listRef} className="max-h-96 overflow-y-auto divide-y divide-g3/30 p-2">
          {searchTerm && filteredResults.length === 0 ? (
            <div className="text-center py-12 text-g6 text-sm">
              <p>No matching SnapDesk topics or merchants found.</p>
              <p className="text-xs mt-1 text-g6/80">Try searching for "Apex", "policy", "damage", or "refund".</p>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                    isSelected ? 'bg-gold/15 border border-gold/40 text-light' : 'hover:bg-g2 text-g7'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm text-light">{item.title}</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-g2 text-gold border border-gold/20">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-g6 line-clamp-1">{item.summary}</p>
                  </div>
                  {isSelected && (
                    <CornerDownLeft className="w-4 h-4 text-gold flex-shrink-0 mt-1" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-dark/80 border-t border-g3/60 text-[11px] font-mono text-g6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>SnapDesk Knowledge Graph</span>
        </div>
      </div>
    </div>
  );
}

