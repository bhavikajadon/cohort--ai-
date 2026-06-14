import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, segmentsApi } from '../lib/api';
import {
  Send, Plus, Zap, CheckCircle, Eye, MousePointer,
  ShoppingBag, XCircle, Clock, Loader, BarChart2, ArrowLeft, Sparkles
} from 'lucide-react';

const CHANNELS = [
  { value: 'whatsapp', emoji: '💬', label: 'WhatsApp' },
  { value: 'sms',      emoji: '📱', label: 'SMS'       },
  { value: 'email',    emoji: '📧', label: 'Email'     },
  { value: 'rcs',      emoji: '✨', label: 'RCS'       },
];

type CommStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'converted' | 'failed';

const STATUS_CFG: Record<CommStatus, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  queued:    { icon: Clock,        color: 'text-brand-gray',    bg: 'bg-brand-surface',     label: 'Queued'    },
  sent:      { icon: Send,         color: 'text-blue-500',      bg: 'bg-blue-50',            label: 'Sent'      },
  delivered: { icon: CheckCircle,  color: 'text-teal-600',      bg: 'bg-teal-50',            label: 'Delivered' },
  opened:    { icon: Eye,          color: 'text-brand-orange',  bg: 'bg-brand-orange-pale',  label: 'Opened'    },
  clicked:   { icon: MousePointer, color: 'text-purple-600',    bg: 'bg-purple-50',          label: 'Clicked'   },
  converted: { icon: ShoppingBag,  color: 'text-brand-success', bg: 'bg-green-50',           label: 'Converted' },
  failed:    { icon: XCircle,      color: 'text-brand-danger',  bg: 'bg-red-50',             label: 'Failed'    },
};

const FUNNEL_STAGES: CommStatus[] = ['sent', 'delivered', 'opened', 'clicked', 'converted'];

// The Signature: Live Waterfall Row — the orange glow fires through each stage
function WaterfallRow({ comm, index }: { comm: any; index: number }) {
  const currentIdx = FUNNEL_STAGES.indexOf(comm.status as CommStatus);
  const isFailed = comm.status === 'failed';

  return (
    <div
      className="flex items-center gap-3 py-3 border-b border-brand-border last:border-0 animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 25, 400)}ms` }}
    >
      {/* Customer */}
      <div className="w-36 flex-shrink-0">
        <p className="text-brand-black text-xs font-medium truncate">{comm.customer_name}</p>
        <p className="text-brand-gray-light text-[10px]">{comm.tier} · {comm.city}</p>
      </div>

      {/* Pipeline — signature orange glow effect */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {FUNNEL_STAGES.map((stage, i) => {
          const cfg = STATUS_CFG[stage];
          const Icon = cfg.icon;
          const reached = !isFailed && i <= currentIdx;
          const active = !isFailed && i === currentIdx;

          return (
            <div key={stage} className="flex items-center gap-1 flex-shrink-0">
              <div className={`
                flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all duration-500
                ${reached
                  ? active
                    ? `${cfg.bg} ${cfg.color} ring-1 ring-brand-orange/40 shadow-orange-sm animate-glow`
                    : `${cfg.bg} ${cfg.color}`
                  : 'bg-transparent text-brand-border'}
              `}>
                <Icon size={9} />
                <span className="hidden sm:inline">{cfg.label}</span>
              </div>
              {i < FUNNEL_STAGES.length - 1 && (
                <div className={`h-px w-2 flex-shrink-0 transition-colors duration-500 ${reached && i < currentIdx ? 'bg-brand-orange' : 'bg-brand-border'}`} />
              )}
            </div>
          );
        })}
        {isFailed && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-red-50 text-brand-danger ring-1 ring-red-200">
            <XCircle size={9} /> Failed
          </div>
        )}
      </div>
    </div>
  );
}

function FunnelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <span className="text-brand-gray text-xs">{label}</span>
        <span className="text-brand-black text-xs font-semibold">
          {count} <span className="text-brand-gray font-normal">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="bg-brand-surface rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CampaignDetail({ campaign, onBack }: { campaign: any; onBack: () => void }) {
  const [comms, setComms] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const isLive = campaign.status === 'sending';

  const fetchData = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([campaignsApi.communications(campaign.id), campaignsApi.stats(campaign.id)]);
      setComms(c);
      setStats(s);
    } catch {}
  }, [campaign.id]);

  useEffect(() => {
    fetchData();
    if (isLive) {
      const iv = setInterval(fetchData, 2000);
      return () => clearInterval(iv);
    }
  }, [fetchData, isLive]);

  const fs = stats?.funnelStats;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-ghost text-xs px-3 py-2">
          <ArrowLeft size={13} /> Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display font-bold text-brand-black text-lg truncate">{campaign.name}</h2>
            {isLive && (
              <span className="tag bg-brand-orange-pale text-brand-orange border border-brand-orange/20 text-[10px] animate-pulse-orange">
                ● LIVE
              </span>
            )}
            {campaign.status === 'completed' && (
              <span className="tag bg-green-50 text-green-700 border border-green-200 text-[10px]">✓ Completed</span>
            )}
          </div>
          <p className="text-brand-gray text-xs mt-0.5">{campaign.segment_name} · {campaign.channel} · {campaign.total_recipients} recipients</p>
        </div>
      </div>

      {/* Funnel */}
      {fs && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <BarChart2 size={14} className="text-brand-orange" />
              <h3 className="font-display font-semibold text-brand-black text-sm">Delivery Funnel</h3>
            </div>
            {isLive && (
              <span className="flex items-center gap-1.5 text-brand-orange text-xs animate-pulse-orange">
                <div className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
                Live updating
              </span>
            )}
          </div>
          <FunnelBar label="Sent"      count={fs.sent}      total={fs.sent}      color="bg-blue-400"       />
          <FunnelBar label="Delivered" count={fs.delivered} total={fs.sent}      color="bg-teal-500"       />
          <FunnelBar label="Opened"    count={fs.opened}    total={fs.delivered} color="bg-brand-orange"   />
          <FunnelBar label="Clicked"   count={fs.clicked}   total={fs.opened}    color="bg-purple-500"     />
          <FunnelBar label="Converted" count={fs.converted} total={fs.clicked}   color="bg-brand-success"  />
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-brand-border">
            {[
              { label: 'Delivery', val: fs.deliveryRate + '%', color: 'text-teal-600' },
              { label: 'Open rate', val: fs.openRate + '%', color: 'text-brand-orange' },
              { label: 'Click rate', val: fs.clickRate + '%', color: 'text-purple-600' },
              { label: 'Conversion', val: fs.conversionRate + '%', color: 'text-brand-success' },
            ].map(m => (
              <div key={m.label} className="text-center">
                <div className={`font-display font-bold text-lg ${m.color}`}>{m.val}</div>
                <div className="text-brand-gray-light text-[10px] uppercase tracking-wide">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Waterfall — THE SIGNATURE FEATURE */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between bg-brand-surface">
          <div>
            <h3 className="font-display font-semibold text-brand-black text-sm">Live Message Tracker</h3>
            <p className="text-brand-gray text-xs mt-0.5">Watch messages move through the delivery pipeline in real time</p>
          </div>
          <div className="text-brand-orange font-display font-bold text-xl">{comms.length}</div>
        </div>
        <div className="divide-y divide-brand-border max-h-96 overflow-y-auto px-5">
          {comms.length === 0
            ? <div className="py-10 text-center text-brand-gray text-sm">No messages dispatched yet</div>
            : comms.map((c, i) => <WaterfallRow key={c.id} comm={c} index={i} />)
          }
        </div>
      </div>
    </div>
  );
}

// ─── Create campaign form ────────────────────────────────────────
function CreateCampaign({ onSuccess, onBack }: { onSuccess: (c: any) => void; onBack: () => void }) {
  const [form, setForm] = useState({ name: '', segmentId: '', channel: 'whatsapp', messageTemplate: '' });
  const { data: segments = [] } = useQuery({ queryKey: ['segments'], queryFn: segmentsApi.list });

  const createMutation = useMutation({
    mutationFn: (data: object) => campaignsApi.create(data),
    onSuccess: (campaign) => onSuccess(campaign),
  });

  const selectedSeg = segments.find((s: any) => s.id === form.segmentId);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-ghost text-xs px-3 py-2"><ArrowLeft size={13} /> Back</button>
        <div>
          <h2 className="font-display font-bold text-brand-black text-xl">New Campaign</h2>
          <p className="text-brand-gray text-sm">AI will personalize each message per shopper</p>
        </div>
      </div>

      <div className="card p-5 space-y-5">
        {/* Name */}
        <div>
          <label className="label">Campaign Name</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Monsoon Re-engagement · Gold Tier"
            className="input"
          />
        </div>

        {/* Segment */}
        <div>
          <label className="label">Target Segment</label>
          <select
            value={form.segmentId}
            onChange={e => setForm(f => ({ ...f, segmentId: e.target.value }))}
            className="input"
          >
            <option value="">Select a segment…</option>
            {segments.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} — {s.customer_count} shoppers</option>
            ))}
          </select>
          {selectedSeg && (
            <div className="mt-2 flex items-center gap-2 text-xs text-brand-gray">
              <CheckCircle size={11} className="text-brand-success" />
              {selectedSeg.customer_count} shoppers will receive this campaign
            </div>
          )}
          {segments.length === 0 && (
            <p className="text-brand-warning text-xs mt-2">No segments yet — build one in the Segments tab first</p>
          )}
        </div>

        {/* Channel */}
        <div>
          <label className="label">Channel</label>
          <div className="grid grid-cols-4 gap-2">
            {CHANNELS.map(ch => (
              <button
                key={ch.value}
                onClick={() => setForm(f => ({ ...f, channel: ch.value }))}
                className={`py-2.5 px-3 rounded-xl border text-sm transition-all duration-150 flex flex-col items-center gap-1 ${
                  form.channel === ch.value
                    ? 'border-brand-orange bg-brand-orange-pale text-brand-black shadow-orange-sm'
                    : 'border-brand-border text-brand-gray hover:border-brand-border-dark bg-brand-bg'
                }`}
              >
                <span>{ch.emoji}</span>
                <span className="text-[11px] font-medium">{ch.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Message goal */}
        <div>
          <label className="label">
            Message Goal
            <span className="ml-2 text-brand-orange normal-case tracking-normal font-normal">
              AI personalizes per shopper
            </span>
          </label>
          <textarea
            value={form.messageTemplate}
            onChange={e => setForm(f => ({ ...f, messageTemplate: e.target.value }))}
            placeholder="Describe the campaign goal and tone, e.g. 'Re-engage lapsed Gold customers with 15% off on their preferred category. Warm Tommy Hilfiger tone, aspirational.'"
            className="input resize-none h-24"
          />
        </div>

        <button
          onClick={() => createMutation.mutate(form)}
          disabled={!form.name || !form.segmentId || !form.messageTemplate || createMutation.isPending}
          className="btn-primary w-full justify-center"
        >
          {createMutation.isPending
            ? <><Loader size={14} className="animate-spin" /> Creating…</>
            : <><Plus size={14} /> Create Campaign</>
          }
        </button>

        {createMutation.isError && (
          <p className="text-brand-danger text-sm text-center">
            {(createMutation.error as any)?.response?.data?.error || 'Failed to create campaign'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Campaigns page ─────────────────────────────────────────
export default function Campaigns() {
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selected, setSelected] = useState<any>(null);
  const [sending, setSending] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignsApi.list,
    refetchInterval: view === 'list' ? 3000 : false,
  });

  const handleSend = async (id: string) => {
    setSending(id);
    try {
      await campaignsApi.send(id);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      const updated = await campaignsApi.get(id);
      setSelected(updated);
      setView('detail');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to send');
    } finally {
      setSending(null);
    }
  };

  if (view === 'detail' && selected) {
    return <CampaignDetail campaign={selected} onBack={() => { setView('list'); setSelected(null); }} />;
  }
  if (view === 'create') {
    return (
      <CreateCampaign
        onBack={() => setView('list')}
        onSuccess={(camp) => { setSelected(camp); setView('detail'); }}
      />
    );
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
            <span className="text-brand-orange text-xs font-medium uppercase tracking-widest">Campaign Center</span>
          </div>
          <h1 className="font-display font-bold text-brand-black text-2xl">Campaigns</h1>
          <p className="text-brand-gray text-sm mt-1">AI-personalized messages across WhatsApp, SMS, Email, RCS</p>
        </div>
        <button onClick={() => setView('create')} className="btn-primary flex-shrink-0">
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {isLoading && (
        <div className="card p-10 text-center">
          <div className="w-5 h-5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!isLoading && campaigns.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 bg-brand-orange-pale rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Send size={22} className="text-brand-orange" />
          </div>
          <p className="font-display font-bold text-brand-black text-base">No campaigns yet</p>
          <p className="text-brand-gray text-sm mt-1 mb-5">
            Create a segment first, then launch your first AI-powered campaign
          </p>
          <button onClick={() => setView('create')} className="btn-primary mx-auto">
            Create first campaign <Plus size={14} />
          </button>
        </div>
      )}

      <div className="space-y-3">
        {campaigns.map((c: any) => (
          <div key={c.id} className="card p-4 hover:shadow-card-hover transition-all duration-200">
            <div className="flex items-start gap-4">
              {/* Channel icon */}
              <div className="w-10 h-10 bg-brand-surface rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                {CHANNELS.find(ch => ch.value === c.channel)?.emoji || '📨'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-brand-black font-semibold text-sm">{c.name}</h3>
                  <span className={`tag text-[10px] ${
                    c.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                    c.status === 'sending'   ? 'bg-brand-orange-pale text-brand-orange border border-brand-orange/20 animate-pulse-orange' :
                    'bg-brand-surface text-brand-gray border border-brand-border'
                  }`}>
                    {c.status === 'sending' ? '● ' : ''}{c.status}
                  </span>
                  {c.ai_reasoning && (
                    <span className="tag bg-brand-orange-pale text-brand-orange border border-brand-orange/20 text-[10px]">
                      <Sparkles size={8} /> AI personalized
                    </span>
                  )}
                </div>
                <p className="text-brand-gray text-xs mt-0.5">{c.segment_name} · {c.total_recipients} recipients</p>

                {c.status !== 'draft' && (
                  <div className="flex items-center gap-4 mt-2.5">
                    {/* Mini funnel */}
                    {[
                      { label: 'Sent', val: c.sent_count, color: 'text-blue-500' },
                      { label: 'Delivered', val: c.delivered_count, color: 'text-teal-600' },
                      { label: 'Opened', val: c.opened_count, color: 'text-brand-orange' },
                      { label: 'Clicked', val: c.clicked_count, color: 'text-purple-600' },
                      { label: 'Converted', val: c.converted_count, color: 'text-brand-success' },
                    ].map(m => (
                      <div key={m.label} className="text-center">
                        <div className={`font-display font-bold text-sm ${m.color}`}>{m.val}</div>
                        <div className="text-brand-gray-light text-[9px] uppercase tracking-wider">{m.label}</div>
                      </div>
                    ))}
                    {c.failed_count > 0 && (
                      <div className="text-center">
                        <div className="font-display font-bold text-sm text-brand-danger">{c.failed_count}</div>
                        <div className="text-brand-gray-light text-[9px] uppercase tracking-wider">Failed</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 flex-shrink-0">
                {c.status === 'draft' && (
                  <button
                    onClick={() => handleSend(c.id)}
                    disabled={sending === c.id}
                    className="btn-primary text-xs px-3 py-2"
                  >
                    {sending === c.id ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
                    Send
                  </button>
                )}
                <button
                  onClick={() => { setSelected(c); setView('detail'); }}
                  className="btn-ghost text-xs px-3 py-2"
                >
                  <BarChart2 size={12} /> Track
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
