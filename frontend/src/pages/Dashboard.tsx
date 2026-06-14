import { useQuery } from '@tanstack/react-query';
import { customersApi, campaignsApi } from '../lib/api';
import { TrendingUp, Users, AlertTriangle, Crown, ArrowRight, Zap, Activity } from 'lucide-react';

function StatCard({ label, value, sub, accent = false, onClick }: {
  label: string; value: string | number; sub?: string; accent?: boolean; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`card p-5 ${onClick ? 'cursor-pointer hover:shadow-card-hover transition-shadow duration-200' : ''}
        ${accent ? 'bg-brand-orange border-brand-orange' : ''}`}
    >
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? 'text-orange-200' : 'text-brand-gray'}`}>{label}</p>
      <p className={`text-3xl font-display font-bold mt-2 leading-none ${accent ? 'text-white' : 'text-brand-black'}`}>{value}</p>
      {sub && <p className={`text-xs mt-2 ${accent ? 'text-orange-100' : 'text-brand-gray'}`}>{sub}</p>}
    </div>
  );
}

const TIER_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  Platinum: { bg: 'bg-yellow-50',  text: 'text-yellow-700',  bar: 'bg-yellow-400' },
  Gold:     { bg: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-400'  },
  Silver:   { bg: 'bg-slate-50',   text: 'text-slate-600',   bar: 'bg-slate-400'  },
  Bronze:   { bg: 'bg-orange-50',  text: 'text-orange-700',  bar: 'bg-orange-400' },
};

export default function Dashboard({ onNavigate }: { onNavigate: (p: any) => void }) {
  const { data: stats, isLoading } = useQuery({ queryKey: ['customer-stats'], queryFn: customersApi.stats });
  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: campaignsApi.list });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-brand-surface rounded-xl" />)}
      </div>
    );
  }

  const lapsedPct = stats ? Math.round((stats.lapsed_90d / stats.total_customers) * 100) : 0;
  const recentCampaigns = campaigns.slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Hero header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-pulse-orange" />
            <span className="text-brand-orange text-xs font-medium uppercase tracking-widest">Live Dashboard</span>
          </div>
          <h1 className="font-display font-bold text-brand-black text-2xl lg:text-3xl leading-tight">
            Tommy Hilfiger India
          </h1>
          <p className="text-brand-gray text-sm mt-1">Customer engagement overview</p>
        </div>
        <button
          onClick={() => onNavigate('campaigns')}
          className="btn-primary flex-shrink-0"
        >
          <Zap size={14} /> New Campaign
        </button>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          accent
          label="Total Shoppers"
          value={stats?.total_customers || 0}
          sub="Active base"
        />
        <StatCard
          label="Lifetime Revenue"
          value={`₹${((stats?.total_revenue || 0) / 100000).toFixed(1)}L`}
          sub="Customer LTV"
        />
        <StatCard
          label="Active Last 30d"
          value={stats?.active_last_30d || 0}
          sub={`${100 - lapsedPct}% retention`}
          onClick={() => onNavigate('customers')}
        />
        <StatCard
          label="Churn Risk"
          value={stats?.lapsed_90d || 0}
          sub={`${lapsedPct}% lapsed 90d+`}
          onClick={() => onNavigate('segments')}
        />
      </div>

      {/* Two-column: tiers + city */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Tier breakdown */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-brand-black text-sm">Shopper Tiers</h2>
            <Crown size={14} className="text-brand-orange" />
          </div>
          <div className="space-y-3">
            {[
              { tier: 'Platinum', count: stats?.platinum_count || 0, threshold: '₹50k+' },
              { tier: 'Gold',     count: stats?.gold_count    || 0, threshold: '₹25k+' },
              { tier: 'Silver',   count: stats?.silver_count  || 0, threshold: '₹10k+' },
              { tier: 'Bronze',   count: stats?.bronze_count  || 0, threshold: 'Under ₹10k' },
            ].map(({ tier, count, threshold }) => {
              const pct = stats?.total_customers ? (count / stats.total_customers) * 100 : 0;
              const col = TIER_COLORS[tier];
              return (
                <div key={tier} className="flex items-center gap-3">
                  <span className={`tag ${col.bg} ${col.text} w-16 justify-center`}>{tier}</span>
                  <div className="flex-1 bg-brand-surface rounded-full h-1.5">
                    <div
                      className={`${col.bar} h-1.5 rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-brand-black text-sm font-medium w-6 text-right">{count}</span>
                  <span className="text-brand-gray-light text-xs w-20 text-right">{threshold}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top cities */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-brand-black text-sm">Revenue by City</h2>
            <TrendingUp size={14} className="text-brand-orange" />
          </div>
          {stats?.topCities ? (
            <div className="space-y-2.5">
              {stats.topCities.map((city: any, i: number) => {
                const maxRev = stats.topCities[0].revenue;
                const pct = (city.revenue / maxRev) * 100;
                return (
                  <div key={city.city} className="flex items-center gap-3">
                    <span className="text-brand-gray-light text-xs w-4">{i + 1}</span>
                    <span className="text-brand-black text-sm w-24">{city.city}</span>
                    <div className="flex-1 bg-brand-surface rounded-full h-1.5">
                      <div
                        className="bg-brand-orange h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-brand-orange text-sm font-medium w-16 text-right">
                      ₹{(city.revenue / 1000).toFixed(0)}K
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-brand-gray text-sm">No data yet</p>
          )}
        </div>
      </div>

      {/* Avg LTV callout */}
      <div className="card p-5 flex items-center gap-4 border-brand-orange/20 bg-brand-orange-pale">
        <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center flex-shrink-0 shadow-orange-sm">
          <Activity size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-brand-black font-semibold text-sm">Average Shopper Value</p>
          <p className="text-brand-gray text-xs mt-0.5">
            ₹{Math.round(stats?.avg_customer_value || 0).toLocaleString('en-IN')} lifetime spend per customer —
            {(stats?.lapsed_90d || 0) > 10 ? ' re-engage lapsed shoppers to unlock ₹' + Math.round((stats?.lapsed_90d || 0) * (stats?.avg_customer_value || 0) / 1000) + 'K in at-risk revenue.' : ' healthy retention rate.'}
          </p>
        </div>
        <button onClick={() => onNavigate('segments')} className="btn-ghost text-xs flex-shrink-0">
          Build segment <ArrowRight size={12} />
        </button>
      </div>

      {/* Recent campaigns */}
      {recentCampaigns.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
            <h2 className="font-display font-semibold text-brand-black text-sm">Recent Campaigns</h2>
            <button onClick={() => onNavigate('campaigns')} className="text-brand-orange text-xs hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-brand-border">
            {recentCampaigns.map((c: any) => (
              <div key={c.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-brand-bg/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-brand-black text-sm font-medium truncate">{c.name}</p>
                  <p className="text-brand-gray text-xs mt-0.5">{c.segment_name} · {c.channel}</p>
                </div>
                <div className="flex items-center gap-4 text-xs flex-shrink-0">
                  {c.status !== 'draft' && (
                    <>
                      <span className="text-brand-gray">{c.sent_count} sent</span>
                      <span className="text-brand-success font-medium">{c.opened_count} opened</span>
                    </>
                  )}
                  <span className={`tag ${
                    c.status === 'completed' ? 'bg-green-50 text-green-700' :
                    c.status === 'sending' ? 'bg-orange-50 text-brand-orange' :
                    'bg-brand-surface text-brand-gray'
                  }`}>
                    {c.status === 'sending' ? '● ' : ''}{c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentCampaigns.length === 0 && (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 bg-brand-orange-pale rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={20} className="text-brand-orange" />
          </div>
          <p className="font-display font-semibold text-brand-black text-sm">No campaigns yet</p>
          <p className="text-brand-gray text-xs mt-1 mb-4">Build your first AI segment and launch a campaign</p>
          <button onClick={() => onNavigate('segments')} className="btn-primary mx-auto">
            Build a segment <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
