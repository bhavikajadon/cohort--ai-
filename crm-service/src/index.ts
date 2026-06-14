import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDb, initializeDatabase } from './db/database';

// 1. Statically import your routes the modern way
import customersRouter from './routes/customers';
import segmentsRouter from './routes/segments';
import campaignsRouter from './routes/campaigns';
import receiptsRouter from './routes/receipts';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());
app.use((req, _res, next) => { 
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`); 
  next(); 
});

app.get('/health', (_req, res) => res.json({ 
  status: 'ok', 
  service: 'cohortai-crm', 
  brand: 'Tommy Hilfiger India', 
  ts: new Date().toISOString() 
}));

// 2. Mount routes immediately. The handlers inside them 
// won't execute until requests actually hit the server.
app.use('/api/customers', customersRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/receipts', receiptsRouter);

// 3. Add a global error handler to prevent the API from crashing silently
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// 4. Use a clean top-level async initialization block
const startServer = async () => {
  try {
    // Wait for the WebAssembly SQLite engine to spin up
    await getDb();
    
    // Create tables if they don't exist
    initializeDatabase();

    // Only start accepting traffic once the database is guaranteed ready
    app.listen(PORT, () => {
      console.log(`🚀 Cohort AI CRM running on port ${PORT}`);
      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('⚠️  WARNING: ANTHROPIC_API_KEY is not set in the environment variables.');
      }
    });
  } catch (err) {
    console.error('❌ Failed to initialize database or start server:', err);
    process.exit(1);
  }
};

startServer(); 