import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../lib/api';
import { Search, TrendingDown, AlertTriangle } from 'lucide-react';

const TIER_STYLES: Record<string, string> = {
  Platinum: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Gold:     'bg-amber-50 text-amber-700 border border-amber-200',
  Silver:   'bg-slate-50 text-slate-600 border border-slate-200',
  Bronze:   'bg-orange-50 text-orange-600 border border-orange-200',
};

function daysSince(date: string): number {
  if (!date) return 999;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

export default function Customers() {
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, tier],
    queryFn: () => customersApi.list({ page, limit: 20, search: search || undefined, tier: tier || undefined }),
  });

  const customers = data?.customers || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
            <span className="text-brand-orange text-xs font-medium uppercase tracking-widest">Shopper Base</span>
          </div>
          <h1 className="font-display font-bold text-brand-black text-2xl">Customers</h1>
          <p className="text-brand-gray text-sm mt-1">{pagination?.total || 0} Tommy Hilfiger India shoppers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-light pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, city…"
            className="input pl-9"
          />
        </div>
        <select
          value={tier}
          onChange={e => { setTier(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">All tiers</option>
          {['Platinum', 'Gold', 'Silver', 'Bronze'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-brand-surface border-b border-brand-border">
          {['Customer', '', 'Tier', 'Lifetime Spend', 'Last Purchase', 'Category'].map((h, i) => (
            <div key={i} className={`${i === 0 ? 'col-span-4' : i === 1 ? 'hidden' : 'col-span-2'} text-brand-gray text-xs font-medium uppercase tracking-wider`}>
              {h}
            </div>
          ))}
        </div>

        {isLoading && (
          <div className="p-10 text-center">
            <div className="w-5 h-5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-brand-gray text-sm mt-3">Loading shoppers…</p>
          </div>
        )}

        {!isLoading && customers.length === 0 && (
          <div className="p-10 text-center">
            <Search size={28} className="text-brand-border mx-auto mb-3" />
            <p className="text-brand-gray text-sm">No customers match your search</p>
          </div>
        )}

        <div className="divide-y divide-brand-border">
          {customers.map((c: any) => {
            const days = daysSince(c.last_purchase_date);
            const lapsed = days > 90;
            const atRisk = days > 45 && days <= 90;
            return (
              <div key={c.id} className="grid grid-cols-12 gap-3 px-5 py-3.5 hover:bg-brand-bg/60 transition-colors items-center">
                <div className="col-span-4">
                  <p className="text-brand-black text-sm font-medium">{c.name}</p>
                  <p className="text-brand-gray-light text-xs mt-0.5 truncate">{c.email}</p>
                </div>
                <div className="col-span-2">
                  <span className={`tag text-xs ${TIER_STYLES[c.tier]}`}>{c.tier}</span>
                </div>
                <div className="col-span-2">
                  <p className="text-brand-black text-sm font-medium">₹{c.total_spent.toLocaleString('en-IN')}</p>
                  <p className="text-brand-gray-light text-xs">{c.order_count} orders</p>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-1.5">
                    {lapsed && <TrendingDown size={11} className="text-brand-danger flex-shrink-0" />}
                    {atRisk && <AlertTriangle size={11} className="text-brand-warning flex-shrink-0" />}
                    <div>
                      <p className={`text-sm font-medium ${lapsed ? 'text-brand-danger' : atRisk ? 'text-brand-warning' : 'text-brand-black'}`}>
                        {days}d ago
                      </p>
                      {lapsed && <p className="text-[10px] text-brand-danger">Lapsed</p>}
                      {atRisk && <p className="text-[10px] text-brand-warning">At risk</p>}
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="tag bg-brand-surface text-brand-gray text-xs">{c.preferred_category}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-brand-gray text-xs">
            Page {pagination.page} of {pagination.pages} · {pagination.total} shoppers
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="btn-ghost text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
