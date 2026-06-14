import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { all, get, run } from '../db/database';
import { buildSegmentFromNL, countCustomersForFilter, getCustomersForFilter } from '../services/aiService';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const segments = all(`
    SELECT s.*, (SELECT COUNT(*) FROM campaigns c WHERE c.segment_id = s.id) as campaign_count
    FROM segments s ORDER BY s.created_at DESC
  `);
  res.json(segments);
});

router.post('/ai-build', async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const result = await buildSegmentFromNL(query);
    const customerCount = countCustomersForFilter(result.filterQuery);
    return res.json({ ...result, customerCount, naturalLanguageQuery: query });
  } catch (err) {
    console.error('AI segment build error:', err);
    return res.status(500).json({ error: 'AI segment generation failed', details: String(err) });
  }
});

router.post('/', (req: Request, res: Response) => {
  const { name, description, filterQuery, naturalLanguageQuery, aiReasoning } = req.body;
  if (!name || !filterQuery) return res.status(400).json({ error: 'name and filterQuery are required' });
  const customerCount = countCustomersForFilter(filterQuery);
  const id = uuidv4();
  run(`INSERT INTO segments (id,name,description,filter_query,natural_language_query,customer_count,ai_reasoning)
       VALUES (:id,:name,:desc,:fq,:nlq,:count,:ai)`, {
    ':id': id, ':name': name, ':desc': description || '',
    ':fq': filterQuery, ':nlq': naturalLanguageQuery || '',
    ':count': customerCount, ':ai': aiReasoning ? JSON.stringify(aiReasoning) : null
  });
  const seg = get('SELECT * FROM segments WHERE id = :id', { ':id': id });
  return res.status(201).json(seg);
});

router.get('/:id/customers', (req: Request, res: Response) => {
  const seg = get('SELECT * FROM segments WHERE id = :id', { ':id': req.params.id }) as any;
  if (!seg) return res.status(404).json({ error: 'Segment not found' });
  const ids = getCustomersForFilter(seg.filter_query);
  if (!ids.length) return res.json({ customers: [], total: 0 });
  const customers = all(
    `SELECT id,name,email,tier,city,total_spent,last_purchase_date,preferred_category FROM customers WHERE id IN (${ids.map((_,i) => ':id'+i).join(',')}) ORDER BY total_spent DESC LIMIT 50`,
    Object.fromEntries(ids.map((id, i) => [`:id${i}`, id]))
  );
  return res.json({ customers, total: ids.length });
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = get('SELECT id FROM segments WHERE id = :id', { ':id': req.params.id });
  if (!existing) return res.status(404).json({ error: 'Segment not found' });
  run('DELETE FROM segments WHERE id = :id', { ':id': req.params.id });
  return res.json({ success: true });
});

export default router;
