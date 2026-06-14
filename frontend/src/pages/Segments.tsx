import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { segmentsApi } from '../lib/api';
import {
  Sparkles, Users, Zap, AlertTriangle, Clock,
  TrendingUp, MessageSquare, Trash2, Loader, Plus, ArrowRight, Filter
} from 'lucide-react';

const QUICK_QUERIES = [
  "Gold or Platinum customers who haven't purchased in 60+ days",
  "Customers who love Denim and spent over ₹15,000 lifetime",
  "Mumbai and Delhi shoppers who bought in the last 90 days",
  "High-value customers inactive for 45+ days with ₹20k+ spend",
  "Bronze tier customers with 2+ orders — ready for upgrade",
];

function ReasoningCard({ reasoning }: { reasoning: any }) {
  if (!reasoning) return null;
  return (
    <div className="bg-brand-orange-pale border border-brand-orange/20 rounded-xl p-5 space-y-4 animate-fade-up">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-brand-orange" />
        <span className="text-brand-orange text-xs font-semibold uppercase tracking-widest">AI Audience Intelligence</span>
      </div>

      <p className="text-brand-black text-sm leading-relaxed">{reasoning.whyThisAudience}</p>

      <div className="grid grid-cols-2 gap-2.5">
        {[
          { icon: AlertTriangle, color: 'text-brand-warning', label: 'Churn Risk', value: reasoning.churnRisk },
          { icon: MessageSquare, color: 'text-brand-success', label: 'Best Channel', value: reasoning.recommendedChannel },
          { icon: Clock, color: 'text-brand-info', label: 'Best Time', value: reasoning.bestSendTime },
          { icon: TrendingUp, color: 'text-brand-orange', label: 'Revenue Impact', value: reasoning.estimatedRevenueImpact },
        ].map(({ icon: Icon, color, label, value }) => (
          <div key={label} className="bg-brand-white rounded-xl p-3.5 border border-brand-border">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon size={11} className={color} />
              <span className="text-brand-gray text-[10px] uppercase tracking-wider font-medium">{label}</span>
            </div>
            <p className="text-brand-black text-xs font-medium leading-snug">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-brand-white rounded-xl p-3.5 border border-brand-border">
        <p className="text-brand-gray text-[10px] uppercase tracking-wider font-medium mb-1.5">Audience Insight</p>
        <p className="text-brand-black text-xs leading-relaxed">{reasoning.audienceInsight}</p>
      </div>
    </div>
  );
}

export default function Segments({ onNavigate }: { onNavigate: (p: any) => void }) {
  const [nlQuery, setNlQuery] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['segments'],
    queryFn: segmentsApi.list,
  });

  const aiBuildMutation = useMutation({
    mutationFn: (query: string) => segmentsApi.aiBuild(query),
    onSuccess: (data) => setAiResult(data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => segmentsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['segments'] }),
  });

  const handleSave = async () => {
    if (!aiResult) return;
    setSaving(true);
    try {
      await segmentsApi.create({
        name: aiResult.segmentName,
        description: aiResult.description,
        filterQuery: aiResult.filterQuery,
        naturalLanguageQuery: nlQuery,
        aiReasoning: aiResult.aiReasoning,
      });
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      setAiResult(null);
      setNlQuery('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
            <span className="text-brand-orange text-xs font-medium uppercase tracking-widest">AI-Powered</span>
          </div>
          <h1 className="font-display font-bold text-brand-black text-2xl">Audience Segments</h1>
          <p className="text-brand-gray text-sm mt-1">Describe your audience in plain English — AI builds the filter</p>
        </div>
        <div className="tag bg-brand-surface text-brand-gray border border-brand-border">
          {segments.length} saved
        </div>
      </div>

      {/* AI Builder */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-orange rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles size={13} className="text-white" />
          </div>
          <div>
            <h2 className="text-brand-black text-sm font-semibold">AI Segment Builder</h2>
            <p className="text-brand-gray text-xs">Natural language → precise SQL filter → strategic reasoning</p>
          </div>
        </div>

        <textarea
          value={nlQuery}
          onChange={e => setNlQuery(e.target.value)}
          placeholder="e.g. 'Gold customers who haven't bought in 2 months but spent over ₹20,000 lifetime'"
          className="input resize-none h-20 font-sans"
        />

        {/* Quick query chips */}
        <div className="flex flex-wrap gap-2">
          {QUICK_QUERIES.map(q => (
            <button
              key={q}
              onClick={() => setNlQuery(q)}
              className="text-[11px] bg-brand-bg border border-brand-border text-brand-gray hover:text-brand-black hover:border-brand-orange/40 rounded-full px-3 py-1.5 transition-all duration-150"
            >
              {q.length > 48 ? q.slice(0, 48) + '…' : q}
            </button>
          ))}
        </div>

        <button
          onClick={() => aiBuildMutation.mutate(nlQuery)}
          disabled={!nlQuery.trim() || aiBuildMutation.isPending}
          className="btn-primary"
        >
          {aiBuildMutation.isPending
            ? <><Loader size={14} className="animate-spin" /> Building segment…</>
            : <><Zap size={14} /> Build with AI</>
          }
        </button>

        {aiBuildMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">
            Failed to build segment. Check your Anthropic API key in .env
          </div>
        )}
      </div>

      {/* AI Result */}
      {aiResult && (
        <div className="card p-5 space-y-4 border-brand-orange/30 animate-slide-right">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-brand-black text-lg leading-tight">{aiResult.segmentName}</h3>
              <p className="text-brand-gray text-sm mt-0.5">{aiResult.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-display font-bold text-brand-orange text-3xl">{aiResult.customerCount}</div>
              <div className="text-brand-gray text-xs">matched shoppers</div>
            </div>
          </div>

          <div className="bg-brand-surface rounded-xl p-3.5">
            <p className="text-brand-gray-light text-[10px] uppercase tracking-wider font-medium mb-2 font-mono">Generated SQL filter</p>
            <code className="text-green-700 text-xs font-mono break-all">{aiResult.filterQuery}</code>
          </div>

          <ReasoningCard reasoning={aiResult.aiReasoning} />

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || aiResult.customerCount === 0}
              className="btn-primary"
            >
              {saving ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
              Save Segment ({aiResult.customerCount} shoppers)
            </button>
            <button
              onClick={() => { handleSave().then(() => onNavigate('campaigns')); }}
              disabled={saving || aiResult.customerCount === 0}
              className="btn-ghost"
            >
              Save & Create Campaign <ArrowRight size={13} />
            </button>
            <button onClick={() => setAiResult(null)} className="btn-ghost ml-auto text-brand-danger border-red-100 hover:border-red-200">
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Saved Segments */}
      <div className="space-y-3">
        <h2 className="font-display font-semibold text-brand-black text-sm flex items-center gap-2">
          <Filter size={14} className="text-brand-orange" />
          Saved Segments
        </h2>

        {isLoading && (
          <div className="card p-8 text-center">
            <div className="w-5 h-5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!isLoading && segments.length === 0 && (
          <div className="card p-10 text-center">
            <div className="w-12 h-12 bg-brand-orange-pale rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={20} className="text-brand-orange" />
            </div>
            <p className="font-display font-semibold text-brand-black text-sm">No segments yet</p>
            <p className="text-brand-gray text-xs mt-1">Build your first audience above using natural language</p>
          </div>
        )}

        {segments.map((seg: any) => {
          const reasoning = seg.ai_reasoning ? JSON.parse(seg.ai_reasoning) : null;
          const churnLabel = reasoning?.churnRisk?.split('—')[0]?.trim() || '';
          const channelLabel = reasoning?.recommendedChannel?.split('—')[0]?.trim() || '';

          return (
            <div
              key={seg.id}
              className="card p-4 hover:shadow-card-hover transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-brand-black font-semibold text-sm">{seg.name}</h3>
                    {seg.ai_reasoning && (
                      <span className="tag bg-brand-orange-pale text-brand-orange border border-brand-orange/20 text-[10px]">
                        <Sparkles size={9} /> AI
                      </span>
                    )}
                  </div>
                  <p className="text-brand-gray text-xs mt-0.5 truncate">{seg.natural_language_query || seg.description}</p>
                  {reasoning && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {churnLabel && (
                        <span className={`tag text-[10px] ${
                          churnLabel.includes('High') ? 'bg-red-50 text-red-600' :
                          churnLabel.includes('Medium') ? 'bg-amber-50 text-amber-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {churnLabel} churn risk
                        </span>
                      )}
                      {channelLabel && (
                        <span className="tag bg-brand-surface text-brand-gray text-[10px]">{channelLabel}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-display font-bold text-brand-orange text-xl">{seg.customer_count}</div>
                    <div className="text-brand-gray-light text-[10px]">shoppers</div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(seg.id)}
                    className="p-1.5 text-brand-gray-light hover:text-brand-danger transition-colors rounded-lg hover:bg-red-50"
                    title="Delete segment"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
