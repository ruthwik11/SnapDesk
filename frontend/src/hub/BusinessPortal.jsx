import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { BusinessOverviewTab } from './BusinessOverviewTab';
import { BusinessInboxTab } from './BusinessInboxTab';
import { BusinessAnalyticsTab } from './BusinessAnalyticsTab';
import { CompanyPolicyTab } from './CompanyPolicyTab';
import { DecisionThresholdsTab } from './DecisionThresholdsTab';
import { HumanReviewTab } from './HumanReviewTab';
import { OpsAccuracyTab } from './OpsAccuracyTab';
import {
  LayoutDashboard,
  Inbox,
  BarChart3,
  FileEdit,
  Sliders,
  UserCheck,
  Gauge,
  ArrowLeft,
  Building2
} from 'lucide-react';

export function BusinessPortal({
  currentUser,
  currentBusiness,
  onReturnToLanding,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState({});

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      const res = await api.getBusinessOverview();
      if (res.success && res.overview) {
        setOverview(res.overview);
      }
    } catch (err) {
      console.warn('Overview load error:', err);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: overview.openTickets },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'policy', label: 'Company Policy', icon: FileEdit },
    { id: 'thresholds', label: 'Decision Thresholds', icon: Sliders },
    { id: 'human-review', label: 'Human Review', icon: UserCheck, count: overview.awaitingHuman },
    { id: 'ops-accuracy', label: 'Ops & Accuracy', icon: Gauge },
  ];

  return (
    <div id="business-hub" className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 space-y-8 relative z-20">
      
      {/* Top Banner / Tenant Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 bg-g1 border border-gold/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center space-x-4">
          <button
            onClick={onReturnToLanding}
            className="p-2 rounded-xl bg-g2 text-g6 hover:text-gold hover:bg-g3 transition-colors flex-shrink-0"
            title="Return to Landing Page"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-gold" />
              <h2 className="font-serif font-bold text-xl sm:text-2xl text-light">
                {currentBusiness?.name || 'Enterprise Merchant Portal'}
              </h2>
              <span className="text-[10px] font-mono uppercase bg-gold/15 text-gold border border-gold/30 px-2 py-0.5 rounded-full">
                {currentBusiness?.category || 'Active Tenant'}
              </span>
            </div>
            <p className="text-xs text-g6 mt-0.5 font-mono">
              Admin: {currentUser?.name} ({currentUser?.email}) • Tenant ID: {currentUser?.businessId || 'biz_active'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="hidden sm:inline-block text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
            ● Tenant Isolated
          </span>

          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto flex items-center space-x-2 overflow-x-auto pb-2 border-b border-g3/60">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gold text-dark font-semibold shadow-lg shadow-gold/20'
                  : 'bg-g1/80 text-g6 hover:text-light hover:bg-g2 border border-g3/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-dark text-gold' : 'bg-g3 text-light'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'overview' && (
          <BusinessOverviewTab
            overview={overview}
            onSelectTab={(tabId) => setActiveTab(tabId)}
          />
        )}

        {activeTab === 'inbox' && <BusinessInboxTab />}

        {activeTab === 'analytics' && <BusinessAnalyticsTab />}

        {activeTab === 'policy' && <CompanyPolicyTab />}

        {activeTab === 'thresholds' && <DecisionThresholdsTab />}

        {activeTab === 'human-review' && <HumanReviewTab />}

        {activeTab === 'ops-accuracy' && <OpsAccuracyTab />}
      </div>

    </div>
  );
}

