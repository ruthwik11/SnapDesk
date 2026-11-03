import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { BarChart3, PieChart, TrendingUp, AlertTriangle, ArrowUpDown, Loader2 } from 'lucide-react';

export function BusinessAnalyticsTab() {
  const [productsData, setProductsData] = useState({ rankedByDamage: [], rankedByReturn: [] });
  const [resolutionsData, setResolutionsData] = useState({ distribution: [], totalCases: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [prodRes, resRes] = await Promise.all([
        api.getProductAnalytics(),
        api.getResolutionAnalytics(),
      ]);
      if (prodRes.success) setProductsData(prodRes);
      if (resRes.success) setResolutionsData(resRes);
    } catch (err) {
      console.warn('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-g6 flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
        <span className="text-xs font-mono">Aggregating dispute &amp; product telemetry...</span>
      </div>
    );
  }

  const distribution = resolutionsData.distribution || [];

  return (
    <div className="space-y-8">
      
      {/* Top: Resolution Outcome Distribution (Visual Breakdown) */}
      <div className="bg-g1 border border-g3 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-g3/60 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-gold text-xs font-mono uppercase">
              <PieChart className="w-4 h-4" />
              <span>Resolution Distribution Telemetry</span>
            </div>
            <h3 className="font-serif font-bold text-xl text-light mt-1">
              Dispute Outcome Breakdown
            </h3>
          </div>
          <span className="text-xs font-mono text-g6">
            Total Tenant Cases: {resolutionsData.totalCases}
          </span>
        </div>

        {/* Stacked Progress Bar */}
        <div className="w-full h-4 bg-g2 rounded-full overflow-hidden flex shadow-inner">
          {distribution.map((item, idx) => (
            <div
              key={idx}
              title={`${item.label}: ${item.percentage}% (${item.count})`}
              className="h-full transition-all duration-500 hover:opacity-90 cursor-pointer"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.color,
              }}
            />
          ))}
        </div>

        {/* Grid of resolution badges with percentage bars */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {distribution.map((item, idx) => (
            <div key={idx} className="bg-dark/70 border border-g3 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-g6 truncate font-sans">{item.label}</span>
              </div>
              <div className="font-serif font-bold text-xl text-light">
                {item.count}
              </div>
              <div className="text-[10px] font-mono text-gold">
                {item.percentage}% of claims
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Product Return & Damage Ranking Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Ranked By Damage Complaints */}
        <div className="bg-g1 border border-g3 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-g3/60 pb-3">
            <div className="flex items-center space-x-2 text-xs font-mono text-light">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="font-semibold">Top Products by Damage Volume</span>
            </div>
            <span className="text-[10px] font-mono text-g6">Ranked by disputes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] font-mono uppercase text-g6 border-b border-g3/40">
                <tr>
                  <th className="py-2">Product Name</th>
                  <th className="py-2 text-right">Disputes</th>
                  <th className="py-2 text-right">Avg Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-g3/30 font-mono">
                {(productsData.rankedByDamage || []).slice(0, 6).map((item, idx) => (
                  <tr key={idx} className="hover:bg-g2/40">
                    <td className="py-2.5 font-sans font-medium text-light truncate max-w-[180px]">
                      {item.name}
                    </td>
                    <td className="py-2.5 text-right font-bold text-red-400">
                      {item.damageComplaintCount}
                    </td>
                    <td className="py-2.5 text-right text-g6">
                      ${item.price?.toFixed(2) || '50.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ranked By Return Volume */}
        <div className="bg-g1 border border-g3 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-g3/60 pb-3">
            <div className="flex items-center space-x-2 text-xs font-mono text-light">
              <TrendingUp className="w-4 h-4 text-gold" />
              <span className="font-semibold">Top Products by Return Volume</span>
            </div>
            <span className="text-[10px] font-mono text-g6">Ranked by returns</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] font-mono uppercase text-g6 border-b border-g3/40">
                <tr>
                  <th className="py-2">Product Name</th>
                  <th className="py-2 text-right">Returns</th>
                  <th className="py-2 text-right">SKU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-g3/30 font-mono">
                {(productsData.rankedByReturn || []).slice(0, 6).map((item, idx) => (
                  <tr key={idx} className="hover:bg-g2/40">
                    <td className="py-2.5 font-sans font-medium text-light truncate max-w-[180px]">
                      {item.name}
                    </td>
                    <td className="py-2.5 text-right font-bold text-gold">
                      {item.returnCount}
                    </td>
                    <td className="py-2.5 text-right text-g6">
                      {item.sku}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}

