import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { simulateDelivery, SendRequest } from './simulator';

dotenv.config();

const app = express();
// FIX 1: Added radix 10 to parseInt for safety
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: '*' }));
app.use(express.json());

// In-memory queue for tracking (in production: Redis/BullMQ)
// TODO (Production): Replace with a persistent job queue for reliability at scale
const inFlightCount = { value: 0 };

// POST /api/send — CRM calls this to dispatch a communication
// FIX 2: Explicitly type the handler to avoid async/return mismatch warnings
app.post('/api/send', (req: express.Request, res: express.Response): void => {
  const { commId, campaignId, customerId, channel, message, recipient, callbackUrl } = req.body;

  if (!commId || !campaignId || !channel || !callbackUrl) {
    res.status(400).json({ error: 'commId, campaignId, channel, callbackUrl are required' });
    return;
  }

  const validChannels = ['whatsapp', 'sms', 'email', 'rcs'];
  if (!validChannels.includes(channel)) {
    res.status(400).json({ error: `Invalid channel: ${channel}` });
    return;
  }

  console.log(`📤 Received send request: ${commId} via ${channel} to ${recipient}`);

  // Acknowledge immediately — async processing
  res.json({ accepted: true, commId, estimatedDelivery: `${channel} delivery simulation started` });

  // Fire-and-forget simulation
  inFlightCount.value++;
  
  simulateDelivery({
    commId,
    campaignId,
    customerId,
    channel: channel as SendRequest['channel'],
    message,
    recipient,
    callbackUrl,
  })
    // FIX 3: Added .catch() to prevent Unhandled Promise Rejections from crashing the app
    .catch((err) => {
      console.error(`❌ Background simulation failed for ${commId}:`, err.message);
    })
    .finally(() => {
      inFlightCount.value--;
    });
});

// GET /health
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'cohortai-channel-service',
    version: '1.0.0',
    inFlightMessages: inFlightCount.value,
    timestamp: new Date().toISOString(),
    supportedChannels: ['whatsapp', 'sms', 'email', 'rcs'],
  });
});

// FIX 4: Global error handler to catch unexpected crashes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Channel Service Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.listen(PORT, () => {
  console.log(`📡 Cohort AI Channel Service running on port ${PORT}`);
  console.log(`🔄 Async callback simulator ready`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
}); 