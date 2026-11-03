import React from 'react';
import {
  Inbox,
  CheckCircle,
  Clock,
  RotateCcw,
  Package,
  Wrench,
  XCircle,
  BrainCircuit,
  UserCheck
} from 'lucide-react';

export function BusinessOverviewTab({ overview = {}, onSelectTab }) {
  const cards = [
    {
      title: 'Open Tickets',
      value: overview.openTickets ?? 0,
      icon: Inbox,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      tab: 'inbox',
    },
    {
      title: 'Closed Tickets',
      value: overview.closedTickets ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      tab: 'inbox',
    },
    {
      title: 'Pending Cases',
      value: overview.pendingTickets ?? 0,
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/30',
      tab: 'inbox',
    },
    {
      title: 'Refunds Approved',
      value: overview.refundsApproved ?? 0,
      icon: RotateCcw,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      tab: 'analytics',
    },
    {
      title: 'Replacements Approved',
      value: overview.replacementsApproved ?? 0,
      icon: Package,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/30',
      tab: 'analytics',
    },
    {
      title: 'Repairs Approved',
      value: overview.repairsApproved ?? 0,
      icon: Wrench,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/30',
      tab: 'analytics',
    },
    {
      title: 'Claims Rejected',
      value: overview.rejectedCases ?? 0,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/30',
      tab: 'analytics',
    },
    {
      title: 'Needs Human Review',
      value: overview.awaitingHuman ?? 0,
      icon: UserCheck,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      tab: 'human-review',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Overview Stat Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => onSelectTab(card.tab)}
              className={`p-5 rounded-xl border bg-dark/70 hover:bg-dark transition-all cursor-pointer ${card.bg} relative overflow-hidden group`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-g6 font-medium font-sans">{card.title}</span>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="font-serif font-bold text-3xl sm:text-4xl text-light">
                {card.value}
              </div>
              <div className="mt-2 text-[10px] text-g6 font-mono flex items-center justify-between">
                <span>View records</span>
                <span className="text-gold group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operational Highlights Box */}
      <div className="bg-g1 border border-g3 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase text-gold">
            <BrainCircuit className="w-4 h-4" />
            <span>Autonomous Automation Status</span>
          </div>
          <h3 className="font-serif font-bold text-xl text-light">
            AI Triage Ratio: {overview.totalCases ? (((overview.aiHandled || 0) / overview.totalCases) * 100).toFixed(0) : '100'}%
          </h3>
          <p className="text-xs text-g6 max-w-xl">
            Complaints meeting policy conditions are auto-resolved by SAM 3.1 &amp; Muse Spark within deterministic financial thresholds. High-value claims or uncertain confidence are safely routed to your human specialist queue.
          </p>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          <button
            onClick={() => onSelectTab('policy')}
            className="px-4 py-2 bg-g2 hover:bg-g3 border border-g3 rounded-lg text-xs text-light transition-colors"
          >
            Review Policy
          </button>
          <button
            onClick={() => onSelectTab('thresholds')}
            className="px-4 py-2 bg-gold hover:bg-white text-dark font-semibold rounded-lg text-xs transition-colors"
          >
            Edit Thresholds
          </button>
        </div>
      </div>
    </div>
  );
}

