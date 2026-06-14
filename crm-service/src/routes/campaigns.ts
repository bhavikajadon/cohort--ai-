import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { all, get, run } from '../db/database';
import { getCustomersForFilter, generatePersonalizedMessages } from '../services/aiService';

const router = Router();
const CHANNEL_URL = process.env.CHANNEL_SERVICE_URL || 'http://localhost:3001';
const CRM_URL = process.env.CRM_CALLBACK_URL || 'http://localhost:3000';

router.get('/', (_req: Request, res: Response) => {
  const campaigns = all(`
    SELECT c.*, s.name as segment_name, s.natural_language_query
    FROM campaigns c LEFT JOIN segments s ON c.segment_id = s.id
    ORDER BY c.created_at DESC
  `);
  res.json(campaigns);
});

router.get('/:id', (req: Request, res: Response) => {
  const campaign = get(`
    SELECT c.*, s.name as segment_name, s.filter_query, s.ai_reasoning
    FROM campaigns c LEFT JOIN segments s ON c.segment_id = s.id
    WHERE c.id = :id
  `, { ':id': req.params.id });
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  return res.json(campaign);
});

router.get('/:id/communications', (req: Request, res: Response) => {
  const comms = all(`
    SELECT comm.*, cust.name as customer_name, cust.tier, cust.city
    FROM communications comm JOIN customers cust ON comm.customer_id = cust.id
    WHERE comm.campaign_id = :id ORDER BY comm.created_at ASC
  `, { ':id': req.params.id });
  return res.json(comms);
});

router.post('/', (req: Request, res: Response) => {
  const { name, segmentId, channel, messageTemplate } = req.body;
  if (!name || !segmentId || !channel || !messageTemplate)
    return res.status(400).json({ error: 'name, segmentId, channel, messageTemplate required' });
  const seg = get('SELECT * FROM segments WHERE id = :id', { ':id': segmentId }) as any;
  if (!seg) return res.status(404).json({ error: 'Segment not found' });
  const id = uuidv4();
  run(`INSERT INTO campaigns (id,name,segment_id,channel,message_template,total_recipients)
       VALUES (:id,:name,:sid,:ch,:tpl,:total)`, {
    ':id': id, ':name': name, ':sid': segmentId, ':ch': channel,
    ':tpl': messageTemplate, ':total': seg.customer_count
  });
  const campaign = get('SELECT * FROM campaigns WHERE id = :id', { ':id': id });
  return res.status(201).json(campaign);
});

router.post('/:id/send', async (req: Request, res: Response) => {
  const campaign = get(`
    SELECT c.*, s.filter_query, s.name as segment_name, s.description as segment_description
    FROM campaigns c JOIN segments s ON c.segment_id = s.id WHERE c.id = :id
  `, { ':id': req.params.id }) as any;
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.status !== 'draft') return res.status(400).json({ error: 'Campaign already sent' });

  const customerIds = getCustomersForFilter(campaign.filter_query);
  if (!customerIds.length) return res.status(400).json({ error: 'No customers match this segment' });

  const customers = all(
    `SELECT id,name,email,phone,tier,city,preferred_category,total_spent FROM customers WHERE id IN (${customerIds.map((_,i)=>':id'+i).join(',')})`,
    Object.fromEntries(customerIds.map((id,i) => [`:id${i}`, id]))
  ) as any[];

  run('UPDATE campaigns SET status=:s, sent_at=datetime(\'now\'), total_recipients=:t WHERE id=:id',
    { ':s': 'sending', ':t': customers.length, ':id': campaign.id });

  let messages: Array<{ customerId: string; message: string }> = [];
  try {
    messages = await generatePersonalizedMessages(
      customers.slice(0, 20),
      { segmentDescription: campaign.segment_description || campaign.segment_name, channel: campaign.channel, goal: campaign.message_template }
    );
    customers.slice(20).forEach(c => messages.push({
      customerId: c.id,
      message: campaign.message_template.replace('{{name}}', c.name.split(' ')[0])
    }));
  } catch {
    messages = customers.map(c => ({
      customerId: c.id,
      message: campaign.message_template.replace('{{name}}', c.name.split(' ')[0])
    }));
  }

  const toSend: Array<{ commId: string; customer: any; message: string }> = [];

  customers.forEach(customer => {
    const msg = messages.find(m => m.customerId === customer.id);
    const message = msg?.message || campaign.message_template;
    const commId = uuidv4();
    run(`INSERT INTO communications (id,campaign_id,customer_id,channel,personalized_message,status,sent_at)
         VALUES (:id,:cid,:uid,:ch,:msg,'sent',datetime('now'))`, {
      ':id': commId, ':cid': campaign.id, ':uid': customer.id,
      ':ch': campaign.channel, ':msg': message
    });
    toSend.push({ commId, customer, message });
  });

  run('UPDATE campaigns SET sent_count=:c WHERE id=:id', { ':c': customers.length, ':id': campaign.id });

  // Fire-and-forget to channel service
  // TODO (Production): Replace with BullMQ queue for rate-limited, retriable dispatch
  setImmediate(async () => {
    for (const { commId, customer, message } of toSend) {
      try {
        await axios.post(`${CHANNEL_URL}/api/send`, {
          commId, campaignId: campaign.id, customerId: customer.id,
          channel: campaign.channel, message,
          recipient: campaign.channel === 'email' ? customer.email : customer.phone,
          callbackUrl: `${CRM_URL}/api/receipts/callback`,
        }, { timeout: 5000 });
      } catch {
        run(`UPDATE communications SET status='failed', failed_reason='Channel service unreachable' WHERE id=:id`, { ':id': commId });
        run('UPDATE campaigns SET failed_count=failed_count+1 WHERE id=:id', { ':id': campaign.id });
      }
    }
  });

  return res.json({ success: true, campaignId: campaign.id, recipientCount: customers.length });
});

export default router;
