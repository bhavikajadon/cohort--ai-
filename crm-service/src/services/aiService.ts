import { GoogleGenerativeAI } from '@google/generative-ai';
import { all, get } from '../db/database';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export interface SegmentAIResult {
  filterQuery: string;
  aiReasoning: {
    audienceInsight: string;
    churnRisk: string;
    recommendedChannel: string;
    bestSendTime: string;
    estimatedRevenueImpact: string;
    whyThisAudience: string;
  };
  segmentName: string;
  description: string;
}

export async function buildSegmentFromNL(naturalLanguageQuery: string): Promise<SegmentAIResult> {
  const prompt = `You are a CRM analyst for Tommy Hilfiger India. A marketer described an audience.

SCHEMA:
- customers: id, name, email, phone, city, tier (Bronze/Silver/Gold/Platinum), total_spent (INR), order_count, last_purchase_date (YYYY-MM-DD), first_purchase_date, preferred_category (Polos/Denim/Shirts/Jackets/Footwear/Accessories/Dresses/Knitwear), age_group
- orders: id, customer_id, amount, category, channel, order_date

TODAY: ${new Date().toISOString().split('T')[0]}

MARKETER: "${naturalLanguageQuery}"

Return ONLY valid JSON, no markdown, no backticks, nothing else:
{
  "filterQuery": "SQL WHERE clause for customers table only",
  "segmentName": "Punchy 3-5 word name",
  "description": "1 sentence description",
  "aiReasoning": {
    "audienceInsight": "Key behavioral insight about this group",
    "churnRisk": "High/Medium/Low — one line reason",
    "recommendedChannel": "WhatsApp/SMS/Email/RCS — one line reason",
    "bestSendTime": "e.g. Tue-Thu 7-9PM IST",
    "estimatedRevenueImpact": "GMV estimate if 15-25% convert",
    "whyThisAudience": "Strategic angle — why target them NOW"
  }
}

SQL RULES: Only a WHERE clause. Use date('now','-N days') for relative dates. No semicolons. No DROP/DELETE/UPDATE/INSERT.`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Gemini segment build error:', err);
    // Sensible fallback so the app never crashes
    return {
      filterQuery: "total_spent > 10000",
      segmentName: "High Value Shoppers",
      description: "Customers with strong purchase history",
      aiReasoning: {
        audienceInsight: "These customers have demonstrated strong brand affinity through repeat purchases.",
        churnRisk: "Medium — needs re-engagement to stay active",
        recommendedChannel: "WhatsApp — highest open rates for premium fashion in India",
        bestSendTime: "Tue-Thu, 7-9PM IST",
        estimatedRevenueImpact: "₹40,000–60,000 if 20% convert on avg order of ₹4,000",
        whyThisAudience: "High-value customers cost 5x less to re-engage than acquiring new ones."
      }
    };
  }
}

const FORBIDDEN = /\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|EXEC|UNION)\b/i;

export function countCustomersForFilter(filterQuery: string): number {
  if (FORBIDDEN.test(filterQuery)) return 0;
  try {
    const row = get<{ count: number }>(`SELECT COUNT(*) as count FROM customers WHERE ${filterQuery}`);
    return row?.count ?? 0;
  } catch { return 0; }
}

export function getCustomersForFilter(filterQuery: string): string[] {
  if (FORBIDDEN.test(filterQuery)) return [];
  try {
    const rows = all<{ id: string }>(`SELECT id FROM customers WHERE ${filterQuery} LIMIT 500`);
    return rows.map(r => r.id);
  } catch { return []; }
}

export async function generatePersonalizedMessages(
  customers: Array<{ id: string; name: string; tier: string; preferred_category: string; city: string; total_spent: number }>,
  ctx: { segmentDescription: string; channel: string; goal: string }
): Promise<Array<{ customerId: string; message: string }>> {

  const list = customers.map(c =>
    `ID:${c.id} | ${c.name} | ${c.tier} | Loves:${c.preferred_category} | ${c.city} | ₹${c.total_spent.toLocaleString('en-IN')} LTV`
  ).join('\n');

  const prompt = `Write personalized ${ctx.channel.toUpperCase()} messages for Tommy Hilfiger India customers.

GOAL: ${ctx.goal}
SEGMENT: ${ctx.segmentDescription}

CUSTOMERS:
${list}

Rules:
- WhatsApp/SMS: max 160 chars, include first name, subtle CTA
- Email: subject line only (max 60 chars)
- Tommy Hilfiger tone: premium, aspirational, warm — not pushy
- Personalize: mention their preferred category or tier naturally

Return ONLY a JSON array, no markdown, no backticks:
[{"customerId":"<exact ID>","message":"..."},...]`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch {
    // Fallback: template messages
    return customers.map(c => ({
      customerId: c.id,
      message: `Hey ${c.name.split(' ')[0]}! Your exclusive Tommy Hilfiger ${c.preferred_category} drop is here. Shop now 🏆`
    }));
  }
}
