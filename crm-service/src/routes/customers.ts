import { Router, Request, Response } from 'express';
import { all, get } from '../db/database';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const search = (req.query.search as string) || '';
  const tier = (req.query.tier as string) || '';

  let where = 'WHERE 1=1';
  const params: Record<string, any> = {};

  if (search) { where += " AND (c.name LIKE :search OR c.email LIKE :search OR c.city LIKE :search)"; params[':search'] = `%${search}%`; }
  if (tier)   { where += " AND c.tier = :tier"; params[':tier'] = tier; }

  const customers = all(`
    SELECT c.* FROM customers c ${where}
    ORDER BY c.total_spent DESC LIMIT :limit OFFSET :offset
  `, { ...params, ':limit': limit, ':offset': offset });

  const total = (get<{count:number}>(`SELECT COUNT(*) as count FROM customers c ${where}`, params) ?? { count: 0 }).count;
  res.json({ customers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get('/stats', (_req: Request, res: Response) => {
  const stats = get(`
    SELECT 
      COUNT(*) as total_customers,
      COALESCE(SUM(total_spent), 0) as total_revenue,
      COALESCE(AVG(total_spent), 0) as avg_customer_value,
      COUNT(CASE WHEN last_purchase_date >= date('now', '-30 days') THEN 1 END) as active_last_30d,
      COUNT(CASE WHEN last_purchase_date < date('now', '-90 days') THEN 1 END) as lapsed_90d,
      COUNT(CASE WHEN tier = 'Platinum' THEN 1 END) as platinum_count,
      COUNT(CASE WHEN tier = 'Gold' THEN 1 END) as gold_count,
      COUNT(CASE WHEN tier = 'Silver' THEN 1 END) as silver_count,
      COUNT(CASE WHEN tier = 'Bronze' THEN 1 END) as bronze_count
    FROM customers
  `);
  const topCities = all(`SELECT city, COUNT(*) as count, SUM(total_spent) as revenue FROM customers GROUP BY city ORDER BY revenue DESC LIMIT 5`);
  const topCategories = all(`SELECT preferred_category, COUNT(*) as count FROM customers GROUP BY preferred_category ORDER BY count DESC LIMIT 5`);
  res.json({ ...stats, topCities, topCategories });
});

router.get('/:id', (req: Request, res: Response) => {
  const customer = get('SELECT * FROM customers WHERE id = :id', { ':id': req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const orders = all('SELECT * FROM orders WHERE customer_id = :id ORDER BY order_date DESC LIMIT 10', { ':id': req.params.id });
  return res.json({ customer, orders });
});

export default router;
