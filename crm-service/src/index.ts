import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDb, initializeDatabase, all } from './db/database';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000');
const SEED_SECRET = process.env.SEED_SECRET || 'cohortai-seed-2026';

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'cohort-ai-crm',
    brand: 'Tommy Hilfiger India',
    ts: new Date().toISOString()
  });
});

// One-time seed endpoint — hit this in browser after first deploy
// Protected by a secret so random people can't re-seed your data
app.get('/seed/:secret', async (req, res) => {
  if (req.params.secret !== SEED_SECRET) {
    return res.status(403).json({ error: 'Invalid secret' });
  }
  try {
    // Dynamically import and run seed
    const { default: runSeed } = await import('./db/seed-fn');
    await runSeed();
    const count = all<{ count: number }>('SELECT COUNT(*) as count FROM customers');
    return res.json({
      success: true,
      customers: count[0]?.count ?? 0,
      message: 'Tommy Hilfiger India database seeded successfully'
    });
  } catch (err) {
    console.error('Seed error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// Init DB then load routes
getDb().then(async () => {
  initializeDatabase();

  // Auto-seed if empty
  try {
    const count = all<{ count: number }>('SELECT COUNT(*) as count FROM customers');
    if ((count[0]?.count ?? 0) === 0) {
      console.log('📦 Empty DB — auto-seeding...');
      const { default: runSeed } = await import('./db/seed-fn');
      await runSeed();
    }
  } catch (err) {
    console.warn('Auto-seed skipped:', err);
  }

  const customers  = require('./routes/customers').default;
  const segments   = require('./routes/segments').default;
  const campaigns  = require('./routes/campaigns').default;
  const receipts   = require('./routes/receipts').default;

  app.use('/api/customers', customers);
  app.use('/api/segments',  segments);
  app.use('/api/campaigns', campaigns);
  app.use('/api/receipts',  receipts);

  app.listen(PORT, () => {
    console.log(`🚀 Cohort AI CRM running on :${PORT}`);
    console.log(`🌱 Seed URL: /seed/${SEED_SECRET}`);
    if (!process.env.GEMINI_API_KEY) console.warn('⚠️  GEMINI_API_KEY not set');
  });
}).catch(err => {
  console.error('Failed to initialize DB:', err);
  process.exit(1);
});
