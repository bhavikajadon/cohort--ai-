import { Router, Request, Response } from 'express';
import { get, run, all } from '../db/database';

const router = Router();
type Status = 'delivered'|'opened'|'clicked'|'failed'|'converted';

const TS_COL: Record<Status, string> = {
  delivered: 'delivered_at', opened: 'opened_at',
  clicked: 'clicked_at', converted: 'converted_at', failed: 'failed_reason'
};
const COUNTER: Record<Status, string> = {
  delivered: 'delivered_count', opened: 'opened_count',
  clicked: 'clicked_count', converted: 'converted_count', failed: 'failed_count'
};
const ORDER: Status[] = ['delivered','opened','clicked','converted','failed'];

router.post('/callback', (req: Request, res: Response) => {
  const { commId, campaignId, status, timestamp, reason } = req.body;
  if (!commId || !campaignId || !status) return res.status(400).json({ error: 'commId, campaignId, status required' });
  if (!ORDER.includes(status)) return res.status(400).json({ error: `Invalid status: ${status}` });

  const comm = get('SELECT * FROM communications WHERE id = :id', { ':id': commId }) as any;
  if (!comm) return res.status(404).json({ error: 'Communication not found' });

  const ts = timestamp || new Date().toISOString();
  if (status === 'failed') {
    run("UPDATE communications SET status='failed', failed_reason=:r WHERE id=:id", { ':r': reason||'Unknown', ':id': commId });
  } else {
    const col = TS_COL[status as Status];
    run(`UPDATE communications SET status=:s, ${col}=:ts WHERE id=:id`, { ':s': status, ':ts': ts, ':id': commId });
  }

  const counter = COUNTER[status as Status];
  run(`UPDATE campaigns SET ${counter}=${counter}+1 WHERE id=:id`, { ':id': campaignId });

  // Check completion
  const campaign = get('SELECT * FROM campaigns WHERE id=:id', { ':id': campaignId }) as any;
  if (campaign) {
    const processed = (campaign.delivered_count || 0) + (campaign.failed_count || 0);
    if (processed >= campaign.total_recipients && campaign.status === 'sending') {
      run("UPDATE campaigns SET status='completed', completed_at=datetime('now') WHERE id=:id", { ':id': campaignId });
    }
  }

  return res.json({ success: true });
});

router.get('/campaign/:id/stats', (req: Request, res: Response) => {
  const campaign = get('SELECT * FROM campaigns WHERE id=:id', { ':id': req.params.id }) as any;
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const s = campaign.sent_count || 0;
  const d = campaign.delivered_count || 0;
  const o = campaign.opened_count || 0;
  const cl = campaign.clicked_count || 0;
  const cv = campaign.converted_count || 0;

  const funnelStats = {
    sent: s, delivered: d, opened: o, clicked: cl, converted: cv,
    failed: campaign.failed_count || 0,
    deliveryRate:    s  > 0 ? ((d/s)*100).toFixed(1)  : '0',
    openRate:        d  > 0 ? ((o/d)*100).toFixed(1)  : '0',
    clickRate:       o  > 0 ? ((cl/o)*100).toFixed(1) : '0',
    conversionRate:  cl > 0 ? ((cv/cl)*100).toFixed(1): '0',
  };

  const statusBreakdown = all('SELECT status, COUNT(*) as count FROM communications WHERE campaign_id=:id GROUP BY status', { ':id': req.params.id });
  return res.json({ campaign, funnelStats, statusBreakdown });
});

export default router;
