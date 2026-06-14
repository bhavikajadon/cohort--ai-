import axios from 'axios';

// Realistic delivery outcome probabilities per channel
// Based on industry benchmarks for Indian fashion/retail
const CHANNEL_PROFILES = {
  whatsapp: {
    deliveryRate: 0.94,   // 94% delivery
    openRate: 0.72,       // 72% of delivered get opened (WhatsApp has high open rates)
    clickRate: 0.18,      // 18% of opened click CTA
    conversionRate: 0.12, // 12% of clicked convert to purchase
    failureReasons: ['Number not on WhatsApp', 'Blocked by user', 'Delivery timeout'],
    // Timing: WhatsApp delivers fast
    deliveryDelayMs: [800, 3000],
    openDelayMs: [2000, 15000],
    clickDelayMs: [3000, 30000],
    convertDelayMs: [5000, 60000],
  },
  sms: {
    deliveryRate: 0.89,
    openRate: 0.45,
    clickRate: 0.08,
    conversionRate: 0.06,
    failureReasons: ['DND registered', 'Invalid number', 'Carrier rejection'],
    deliveryDelayMs: [1000, 5000],
    openDelayMs: [3000, 20000],
    clickDelayMs: [5000, 45000],
    convertDelayMs: [8000, 90000],
  },
  email: {
    deliveryRate: 0.96,
    openRate: 0.28,
    clickRate: 0.06,
    conversionRate: 0.04,
    failureReasons: ['Inbox full', 'Invalid email', 'Spam filter blocked'],
    deliveryDelayMs: [2000, 8000],
    openDelayMs: [10000, 60000],
    clickDelayMs: [15000, 90000],
    convertDelayMs: [20000, 120000],
  },
  rcs: {
    deliveryRate: 0.78,   // RCS adoption still growing in India
    openRate: 0.55,
    clickRate: 0.15,
    conversionRate: 0.10,
    failureReasons: ['RCS not supported on device', 'Carrier not enabled', 'Network timeout'],
    deliveryDelayMs: [1500, 6000],
    openDelayMs: [2500, 18000],
    clickDelayMs: [4000, 35000],
    convertDelayMs: [6000, 70000],
  },
};

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fireCallback(
  callbackUrl: string,
  commId: string,
  campaignId: string,
  status: string,
  reason?: string,
  retryCount = 0
): Promise<void> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  try {
    await axios.post(callbackUrl, {
      commId,
      campaignId,
      status,
      reason,
      timestamp: new Date().toISOString(),
    }, { timeout: 5000 });

    console.log(`📨 Callback fired: ${commId} → ${status}`);
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      // TODO (Production): Use exponential backoff + dead letter queue for failed callbacks
      console.warn(`⚠️  Callback failed for ${commId} (attempt ${retryCount + 1}/${MAX_RETRIES}), retrying...`);
      await delay(RETRY_DELAY_MS * Math.pow(2, retryCount));
      return fireCallback(callbackUrl, commId, campaignId, status, reason, retryCount + 1);
    } else {
      console.error(`❌ Callback permanently failed for ${commId} after ${MAX_RETRIES} retries`);
      // TODO (Production): Persist to a failed_callbacks table for manual replay
    }
  }
}

export interface SendRequest {
  commId: string;
  campaignId: string;
  customerId: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'rcs';
  message: string;
  recipient: string;
  callbackUrl: string;
}

// Simulate the full lifecycle of a single communication asynchronously
export async function simulateDelivery(request: SendRequest): Promise<void> {
  const profile = CHANNEL_PROFILES[request.channel] || CHANNEL_PROFILES.sms;
  const { commId, campaignId, callbackUrl } = request;

  // STEP 1: Delivery simulation
  await delay(randomBetween(profile.deliveryDelayMs[0], profile.deliveryDelayMs[1]));

  const isDelivered = Math.random() < profile.deliveryRate;

  if (!isDelivered) {
    const reason = profile.failureReasons[Math.floor(Math.random() * profile.failureReasons.length)];
    await fireCallback(callbackUrl, commId, campaignId, 'failed', reason);
    return;
  }

  await fireCallback(callbackUrl, commId, campaignId, 'delivered');

  // STEP 2: Open simulation
  await delay(randomBetween(profile.openDelayMs[0], profile.openDelayMs[1]));

  const isOpened = Math.random() < profile.openRate;
  if (!isOpened) return; // Delivered but not opened — normal

  await fireCallback(callbackUrl, commId, campaignId, 'opened');

  // STEP 3: Click simulation
  await delay(randomBetween(profile.clickDelayMs[0], profile.clickDelayMs[1]));

  const isClicked = Math.random() < profile.clickRate;
  if (!isClicked) return;

  await fireCallback(callbackUrl, commId, campaignId, 'clicked');

  // STEP 4: Conversion simulation (purchase event)
  await delay(randomBetween(profile.convertDelayMs[0], profile.convertDelayMs[1]));

  const isConverted = Math.random() < profile.conversionRate;
  if (isConverted) {
    await fireCallback(callbackUrl, commId, campaignId, 'converted');
  }
}
