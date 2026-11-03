import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { CaseDetailModal } from './CaseDetailModal';
import { Search, Filter, Inbox, ChevronRight, Eye, UserCheck, Sparkles, Loader2 } from 'lucide-react';

export function BusinessInboxTab() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHandling, setFilterHandling] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);

  useEffect(() => {
    loadInbox();
  }, [filterHandling, filterStatus]);

  const loadInbox = async () => {
    setLoading(true);
    try {
      const res = await api.getBusinessInbox({
        handling: filterHandling,
        status: filterStatus,
        search: searchQuery,
      });
      if (res.success) {
        setCases(res.cases || []);
      }
    } catch (err) {
      console.warn('Failed to load inbox:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadInbox();
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Header */}
      <div className="bg-g1 border border-g3 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-g6 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets, customers, items..."
            className="w-full bg-dark border border-g3 rounded-lg pl-9 pr-3 py-1.5 text-xs text-light placeholder-g6 focus:outline-none focus:border-gold"
          />
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setFilterHandling('')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterHandling === '' ? 'bg-gold text-dark font-medium' : 'bg-g2 text-g6 hover:text-light'
            }`}
          >
            All Cases
          </button>

          <button
            onClick={() => setFilterHandling('ai_handled')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-colors ${
              filterHandling === 'ai_handled' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-g2 text-g6 hover:text-light'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>AI Handled</span>
          </button>

          <button
            onClick={() => setFilterHandling('human_intervention_required')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-colors ${
              filterHandling === 'human_intervention_required' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-g2 text-g6 hover:text-light'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            <span>Needs Human Review</span>
          </button>
        </div>

      </div>

      {/* Cases Table */}
      <div className="bg-g1 border border-g3 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-g6 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
            <span className="text-xs font-mono">Retrieving tenant complaints...</span>
          </div>
        ) : cases.length === 0 ? (
          <div className="py-20 text-center text-g6 space-y-2">
            <Inbox className="w-8 h-8 mx-auto text-g6/50" />
            <div className="text-sm font-medium text-light">No complaints match your criteria</div>
            <p className="text-xs">Adjust your search or active filter pills.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark/80 text-g6 uppercase font-mono text-[10px] border-b border-g3">
                <tr>
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Complaint Summary</th>
                  <th className="py-3 px-4">Handling Mode</th>
                  <th className="py-3 px-4">Ruling</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-g3/40">
                {cases.map((c) => {
                  const isHuman = c.handlingBadge === 'human_intervention_required' || c.outcome === 'human_review';
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-g2/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedCase(c)}
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-light">
                        {c.caseNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-light">
                        {c.customerName}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-g6">
                        {c.writtenComplaint}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono ${
                          isHuman
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                        }`}>
                          {isHuman ? 'Human Intervention' : 'SnapDesk AI'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium capitalize text-gold">
                        {c.outcome || 'Pending'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCase(c);
                          }}
                          className="px-2.5 py-1 rounded bg-g2 hover:bg-gold hover:text-dark text-g7 transition-colors text-[11px] font-mono inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case Investigation Modal */}
      {selectedCase && (
        <CaseDetailModal
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
        />
      )}

    </div>
  );
}

