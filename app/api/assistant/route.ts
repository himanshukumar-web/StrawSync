import { NextRequest, NextResponse } from 'next/server';
import { getSql, isDatabaseConfigured } from '../../../lib/db';
import { ensureDbInitialized } from '../../../lib/dbInit';
import { getServerUser } from '../../../lib/auth-server';
import { insertAuditLog, insertNotification } from '../../../lib/api-utils';
import {
  CROP_COEFFICIENTS,
  calculateDeliveredCost,
  calculateRoadDistanceKm,
  estimateResidue,
  recommendVehicle,
} from '../../../lib/engine';
import {
  type AssistantRequestPayload,
  type ExecutionReceipt,
  type PendingAssistantAction,
  buildCreateListingSummary,
  buildExplanationReply,
  detectExplainTopic,
  detectIntent,
  detectRouteTarget,
  extractCropType,
  extractLandAreaAndUnit,
  extractLocation,
  extractPricePerUnit,
  extractUpiId,
  extractWeightAndUnit,
  formatInr,
  formatWeightLabel,
  isCancellationMessage,
  isConfirmationMessage,
  normalizeSpokenNumbers,
  toAcresNlu,
} from '../../../lib/assistant-nlu';
import type { CropType, LandAreaUnit, OrderStatus, PaymentMethod, WeightUnit } from '../../../types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ aiProvider: resolveConfiguredProvider().provider });
}

export type AiProvider = 'gemini' | 'groq' | 'openai' | 'built-in';

interface LlmNluHint {
  reply?: string;
  intent?: string;
  extractedSlots?: {
    cropType?: CropType;
    quantity?: number;
    weightUnit?: WeightUnit;
    pricePerUnit?: number;
    landArea?: number;
    landUnit?: LandAreaUnit;
    location?: string;
    upiId?: string;
    decision?: 'accept' | 'reject';
    mode?: 'gps' | 'deliver';
  };
  missingField?: string | null;
  navigateTo?: string | null;
}

const VALID_APP_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/farmer/dashboard',
  '/farmer/listings',
  '/farmer/orders',
  '/buyer/dashboard',
  '/buyer/marketplace',
  '/buyer/orders',
  '/logistics/dashboard',
  '/admin/dashboard',
]);

function cleanEnvKey(name: string): string {
  return (process.env[name] || '').trim().replace(/^["']|["']$/g, '');
}

function resolveConfiguredProvider(): { provider: AiProvider; apiKey: string } {
  const geminiKey = cleanEnvKey('GEMINI_API_KEY') || cleanEnvKey('GOOGLE_GENERATIVE_AI_API_KEY');
  if (geminiKey) return { provider: 'gemini', apiKey: geminiKey };
  const groqKey = cleanEnvKey('GROQ_API_KEY');
  if (groqKey) return { provider: 'groq', apiKey: groqKey };
  const openaiKey = cleanEnvKey('OPENAI_API_KEY');
  if (openaiKey) return { provider: 'openai', apiKey: openaiKey };
  return { provider: 'built-in', apiKey: '' };
}

function parseJsonSafe(raw: string): LlmNluHint | null {
  const trimmed = (raw || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed) as LlmNluHint;
}

async function tryLiveLlmPlan(params: {
  message: string;
  lang: 'en' | 'hi';
  user: Awaited<ReturnType<typeof getServerUser>>;
  pending: PendingAssistantAction | null;
  dbContext: Record<string, any>;
}): Promise<{ plan: LlmNluHint | null; aiProvider: AiProvider }> {
  const { provider, apiKey } = resolveConfiguredProvider();
  if (provider === 'built-in' || !apiKey) {
    return { plan: null, aiProvider: 'built-in' };
  }

  const systemPrompt = `You are StrawSync's helpful Agentic Kisan AI Copilot. Users speak Hindi, Hinglish, or English.
Context:
- Preferred UI language: ${params.lang === 'hi' ? 'Hindi / Hinglish (friendly simple tone)' : 'English / clear Indian agricultural terms'}
- Authenticated User: ${params.user ? `${params.user.name} (role: ${params.user.role}, location: ${params.user.location})` : 'Guest (not signed in)'}
- Live Neon DB Snapshot: ${JSON.stringify(params.dbContext)}
- Pending Action Draft: ${params.pending ? JSON.stringify({ type: params.pending.type, stage: params.pending.stage, slots: params.pending.slots, missingFields: params.pending.missingFields }) : 'null'}

Return ONLY strict JSON matching:
{
  "reply": "Warm simple explanation or confirmation summary in user language (mention estimated tonnes and Rs if helpful; note exact math card is rendered on server)",
  "intent": "EXPLAIN | CREATE_LISTING | RESPOND_TO_ORDER | UPDATE_PAYOUT_UPI | CREATE_PURCHASE_REQUEST | SETTLE_ESCROW_PAYMENT | LOGISTICS_UPDATE | RUN_AND_SAVE_CALCULATION | LIVE_QUERY | NAVIGATE | CONFIRM_PERMISSION | CANCEL_ACTION",
  "extractedSlots": {
    "cropType": "paddy|wheat|mustard|sugarcane|cotton|maize|vegetables|fruits|orchard|agri_waste (optional)",
    "quantity": "number (optional)",
    "weightUnit": "kg|quintal|tonne (optional)",
    "pricePerUnit": "number (optional)",
    "landArea": "number (optional)",
    "landUnit": "acre|bigha|hectare|kanal|guntha (optional)",
    "location": "string city/village (optional)",
    "upiId": "string (optional)",
    "decision": "accept|reject (optional)",
    "mode": "gps|deliver (optional)"
  },
  "missingField": null,
  "navigateTo": null
}
Rules:
- Crop mapping guide: parali/dhan/paddy/rice straw -> "paddy", bhusa/bhusi/turi/gehun/wheat -> "wheat", ganna/bagasse -> "sugarcane", sarson/mustard -> "mustard", kapas/cotton -> "cotton", makka/maize -> "maize", sabzi -> "vegetables", fal -> "fruits".
- PRIORITY: If a farmer says "bechni hai", "bechna hai", "sell", or "list" while providing crop, quantity, and price — even if they ALSO ask "kitne paise banenge" or "list kaise hogi" — ALWAYS pick intent "CREATE_LISTING" (NOT RUN_AND_SAVE_CALCULATION), extract all slots, and explain the estimated payout and listing flow in "reply".
- Never confirm DB writes unless Pending Action Draft stage is "awaiting_permission" and user explicitly agrees ("Haan", "Yes", "Confirm", "Kar do").
- Keep valid navigateTo paths inside: /, /login, /register, /farmer/dashboard, /farmer/listings, /farmer/orders, /buyer/dashboard, /buyer/marketplace, /buyer/orders, /logistics/dashboard, /admin/dashboard.`;

  try {
    if (provider === 'gemini') {
      for (const model of ['gemini-3-flash-preview', 'gemini-2.5-flash']) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(8000),
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: params.message }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            }),
          }
        );
        if (res.status === 404) continue;
        if (res.ok) {
          const data = await res.json();
          const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = parseJsonSafe(raw);
          if (parsed) return { plan: parsed, aiProvider: 'gemini' };
        }
        break;
      }
    }

    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: params.message },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const raw = data?.choices?.[0]?.message?.content || '';
        const parsed = parseJsonSafe(raw);
        if (parsed) return { plan: parsed, aiProvider: 'groq' };
      }
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: params.message },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const raw = data?.choices?.[0]?.message?.content || '';
        const parsed = parseJsonSafe(raw);
        if (parsed) return { plan: parsed, aiProvider: 'openai' };
      }
    }
  } catch {
    // Seamless deterministic NLU fallback when LLM times out or fails
  }

  return { plan: null, aiProvider: 'built-in' };
}

function buildMissingFieldPrompt(field: string, lang: 'en' | 'hi', defaultLocation?: string): string {
  if (lang === 'hi') {
    if (field === 'cropType') return 'Aap kaunsi fasal ya parali list karna chahte hain? (jaise Dhan ki Parali, Gehun ka Bhusa, Ganna, ya Sabzi)';
    if (field === 'quantity') return 'Aapke paas kitni matra hai? (jaise 45 quintal, 5 tonne, ya 500 kg)';
    if (field === 'pricePerUnit') return 'Aap kis bhav (rupaye per unit) par bechna chahte hain? (jaise 1650 rupaye quintal)';
    return defaultLocation
      ? `Kis gaon ya shahar se pickup hoga? (Ya "mere gaon" kahein: ${defaultLocation})`
      : 'Kis gaon, jile ya shahar se pickup hoga? (jaise Ghaziabad, Karnal, ya Sangrur)';
  }
  if (field === 'cropType') return 'Which crop residue or farm produce would you like to list? (e.g., Paddy Straw, Wheat Straw, Bagasse, Vegetables)';
  if (field === 'quantity') return 'What quantity is available? (e.g., 45 quintals, 5 tonnes, or 500 kg)';
  if (field === 'pricePerUnit') return 'What expected rate per unit would you like? (e.g., ₹1,650 per quintal)';
  return defaultLocation
    ? `Which village or city is the farmgate pickup? (Or say "my location" for ${defaultLocation})`
    : 'Which village, district, or city is the farmgate pickup located in?';
}

function replyJson(payload: {
  reply: string;
  stage: 'idle' | 'collecting' | 'awaiting_permission' | 'executed';
  pendingAction?: PendingAssistantAction | null;
  executionReceipt?: ExecutionReceipt | null;
  navigateTo?: string;
  refreshBootstrap?: boolean;
  aiProvider?: AiProvider;
}) {
  return NextResponse.json({
    reply: payload.reply,
    stage: payload.stage,
    pendingAction: payload.pendingAction ?? null,
    executionReceipt: payload.executionReceipt ?? null,
    navigateTo: payload.navigateTo ?? null,
    refreshBootstrap: Boolean(payload.refreshBootstrap),
    aiProvider: payload.aiProvider ?? resolveConfiguredProvider().provider,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AssistantRequestPayload;
    const message = String(body.message || '').trim();
    const lang: 'en' | 'hi' = body.lang === 'hi' ? 'hi' : 'en';
    const pending = body.pendingAction || null;

    if (body.cancelExecution || (pending && isCancellationMessage(message))) {
      return replyJson({
        reply:
          lang === 'hi'
            ? 'Theek hai, maine yeh kaam radd kar diya hai. Aap koi naya aadesh de sakte hain.'
            : 'Understood, I cancelled that pending action. Let me know what you need next.',
        stage: 'idle',
        pendingAction: null,
      });
    }

    if (!isDatabaseConfigured()) {
      const topic = detectExplainTopic(message);
      if (topic) {
        return replyJson({ reply: buildExplanationReply(topic, lang), stage: 'idle' });
      }
      return replyJson({
        reply:
          lang === 'hi'
            ? 'Neon PostgreSQL database abhi connect nahi hai (.env.local mein DATABASE_URL check karein).'
            : 'Neon PostgreSQL database is not configured on the server yet.',
        stage: 'idle',
      });
    }

    await ensureDbInitialized();
    const user = await getServerUser(req);
    const sql = getSql();
    const normalized = normalizeSpokenNumbers(message);

    // ------------------------------------------------------------------
    // 1. EXPLICIT PERMISSION EXECUTION PATH (ONLY when awaiting_permission)
    // ------------------------------------------------------------------
    const hasSlotEditIntent =
      pending?.stage === 'awaiting_permission' &&
      !body.confirmExecution &&
      /(price|rate|daam|bhav|qty|quantity|matra|kg|quintal|tonne|ton|location|gaon|city|bigha|acre|hectare|kanal|guntha|reject|decline|upi)/i.test(
        normalized
      );

    // ------------------------------------------------------------------
    // 1B. LOAD DB CONTEXT & OPTIONAL LIVE LLM PLAN BEFORE EXECUTION/NLU
    // ------------------------------------------------------------------
    let llmPlan: LlmNluHint | null = null;
    let activeProvider: AiProvider = resolveConfiguredProvider().provider;

    const alreadyConfirmed =
      pending &&
      pending.stage === 'awaiting_permission' &&
      !hasSlotEditIntent &&
      (body.confirmExecution === true || isConfirmationMessage(message));

    if (!alreadyConfirmed) {
      let dbContext: Record<string, any> = { activeMarketplaceListings: 0 };
      try {
        if (user) {
          const [lRows, oRows] = await Promise.all([
            sql`SELECT COUNT(*)::int AS cnt FROM farmer_listings WHERE farmer_id = ${user.id} AND quantity_tonnes > 0`,
            sql`SELECT COUNT(*)::int AS pending_cnt FROM orders WHERE (farmer_id = ${user.id} OR buyer_id = ${user.id}) AND status IN ('requested','pending_farmer','accepted','logistics_assigned','delivered')`,
          ]);
          dbContext = {
            myActiveListings: Number(lRows[0]?.cnt ?? 0),
            myActiveOrders: Number(oRows[0]?.pending_cnt ?? 0),
            savedUpiId: user.upiId || null,
          };
        } else {
          const lRows = await sql`SELECT COUNT(*)::int AS cnt FROM farmer_listings WHERE status IN ('verified','active') AND quantity_tonnes > 0`;
          dbContext = { activeMarketplaceListings: Number(lRows[0]?.cnt ?? 0) };
        }
      } catch {
        // context is best-effort
      }

      const llmRes = await tryLiveLlmPlan({
        message,
        lang,
        user,
        pending,
        dbContext,
      });
      llmPlan = llmRes.plan;
      activeProvider = llmRes.aiProvider;
    }

    if (llmPlan?.intent === 'CANCEL_ACTION' && pending) {
      return replyJson({
        reply:
          lang === 'hi'
            ? 'Theek hai, maine yeh kaam radd kar diya hai. Aap koi naya aadesh de sakte hain.'
            : 'Understood, I cancelled that pending action. Let me know what you need next.',
        stage: 'idle',
        pendingAction: null,
        aiProvider: activeProvider,
      });
    }

    if (
      pending &&
      pending.stage === 'awaiting_permission' &&
      !hasSlotEditIntent &&
      (body.confirmExecution === true ||
        isConfirmationMessage(message) ||
        llmPlan?.intent === 'CONFIRM_PERMISSION')
    ) {
      // Security: verify authenticated user and role before writing to Neon
      if (pending.type !== 'RUN_AND_SAVE_CALCULATION' && !user) {
        return replyJson({
          reply:
            lang === 'hi'
              ? 'Kripya pehle StrawSync mein Sign In karein taaki main aapke account par yeh action save kar sakun.'
              : 'Please sign in first so I can execute this database action under your verified account.',
          stage: 'idle',
          navigateTo: '/login',
        });
      }

      if (pending.type === 'CREATE_LISTING') {
        if (!user || (user.role !== 'farmer' && user.role !== 'admin')) {
          return replyJson({
            reply:
              lang === 'hi'
                ? 'Fasal list karne ke liye Farmer account zaroori hai.'
                : 'A Farmer account is required to publish residue listings.',
            stage: 'idle',
          });
        }

        const { tonnes, pricePerTonne, totalAmount, acres } = buildCreateListingSummary(pending.slots);
        if (tonnes <= 0 || pricePerTonne <= 0) {
          return replyJson({
            reply:
              lang === 'hi'
                ? 'Kripya 0 se adhik matra aur bhav darj karein.'
                : 'Quantity and rate must both be greater than zero.',
            stage: 'idle',
          });
        }

        const cropType = (pending.slots.cropType || 'paddy') as CropType;
        const coeff = CROP_COEFFICIENTS[cropType] || CROP_COEFFICIENTS.paddy;
        const unit = (pending.slots.weightUnit || 'tonne') as WeightUnit;
        const qty = Number(pending.slots.quantity) || tonnes;
        const pricePerUnit = Number(pending.slots.pricePerUnit) || pricePerTonne;
        const landVal = Number(pending.slots.landArea ?? 0);
        const landUnit = (pending.slots.landUnit || 'acre') as LandAreaUnit;
        const location = String(pending.slots.location || user.location || 'Punjab');
        const district = location.split(',')[0].trim();
        const listId = `list-${Date.now()}`;

        await sql`
          INSERT INTO farmer_listings (
            id, farmer_id, farmer_name, farmer_phone, crop_type, crop_name, category,
            original_quantity, weight_unit, quantity_tonnes, estimated_gross_tonnes,
            price_per_unit, price_per_tonne, land_area, land_unit, land_area_acres,
            moisture_percentage, bale_type, quality_score, location, district, state,
            lat, lng, status, harvest_date, collection_start_date, pickup_deadline, instructions
          ) VALUES (
            ${listId},
            ${user.id},
            ${user.name},
            ${user.phone || ''},
            ${cropType},
            ${coeff.cropName},
            ${coeff.category},
            ${qty},
            ${unit},
            ${tonnes},
            ${Number((tonnes * 1.1).toFixed(2))},
            ${pricePerUnit},
            ${pricePerTonne},
            ${landVal},
            ${landUnit},
            ${acres},
            ${coeff.typicalMoisturePercent},
            'baled',
            'A',
            ${location},
            ${district},
            ${location.includes(',') ? location.split(',').slice(1).join(',').trim() : ''},
            ${user.coordinates?.lat ?? 30.3742},
            ${user.coordinates?.lng ?? 75.8712},
            'verified',
            ${new Date().toISOString().split('T')[0]},
            ${new Date().toISOString().split('T')[0]},
            ${new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]},
            'Registered hands-free via Kisan AI Copilot'
          )
          RETURNING id
        `;

        return replyJson({
          reply:
            lang === 'hi'
              ? `Badhai ho! Aapki **${coeff.cropName}** (${formatWeightLabel(qty, unit)} = ${tonnes.toFixed(2)} Tonnes, kul mulya ${formatInr(totalAmount)}) ${location} se Neon database mein live ho gayi hai.`
              : `Done! Your **${coeff.cropName}** lot (${formatWeightLabel(qty, unit)} = ${tonnes.toFixed(2)} Tonnes, ${formatInr(totalAmount)}) from ${location} is now live in Neon PostgreSQL.`,
          stage: 'executed',
          refreshBootstrap: true,
          executionReceipt: {
            actionType: 'CREATE_LISTING',
            referenceId: listId,
            summary: `${coeff.cropName} published to Farmer Exchange`,
            fields: [
              { label: 'Quantity', value: `${formatWeightLabel(qty, unit)} (${tonnes.toFixed(2)}t)` },
              { label: 'Expected Value', value: formatInr(totalAmount) },
              { label: 'Location', value: location },
            ],
            navigateTo: '/farmer/listings',
            executedAt: new Date().toISOString(),
          },
        });
      }

      if (pending.type === 'UPDATE_PAYOUT_UPI') {
        const upi = String(pending.slots.upiId || '').trim().toLowerCase();
        if (!user || !extractUpiId(upi)) {
          return replyJson({ reply: 'Valid UPI ID and login required.', stage: 'idle' });
        }
        await sql`UPDATE users SET upi_id = ${upi} WHERE id = ${user.id}`;
        return replyJson({
          reply:
            lang === 'hi'
              ? `Aapka payout UPI ID **${upi}** surakshit tarike se save ho gaya hai. Agle sabhi escrow bhugtan isi par aayenge.`
              : `Saved **${upi}** as your verified payout UPI ID in Neon PostgreSQL.`,
          stage: 'executed',
          refreshBootstrap: true,
          executionReceipt: {
            actionType: 'UPDATE_PAYOUT_UPI',
            referenceId: user.id,
            summary: 'Farmer Escrow UPI Payout Updated',
            fields: [
              { label: 'Account', value: user.name },
              { label: 'Active UPI ID', value: upi },
            ],
            navigateTo: '/farmer/dashboard',
            executedAt: new Date().toISOString(),
          },
        });
      }

      if (pending.type === 'RESPOND_TO_ORDER') {
        if (!user || (user.role !== 'farmer' && user.role !== 'admin')) {
          return replyJson({ reply: 'Farmer authorization required.', stage: 'idle' });
        }
        const orderId = String(pending.slots.orderId || '');
        const decision = pending.slots.decision === 'reject' ? 'reject' : 'accept';
        const rows = await sql`SELECT * FROM orders WHERE id = ${orderId} LIMIT 1`;
        const ord = rows[0];
        if (!ord || (user.role !== 'admin' && ord.farmer_id !== user.id)) {
          return replyJson({ reply: 'Order no longer available or unauthorized.', stage: 'idle' });
        }

        if (decision === 'accept') {
          if (ord.listing_id) {
            await sql`
              UPDATE farmer_listings
              SET
                quantity_tonnes = GREATEST(0, quantity_tonnes - ${Number(ord.quantity_tonnes)}),
                status = CASE WHEN quantity_tonnes - ${Number(ord.quantity_tonnes)} <= 0 THEN 'sold' ELSE 'matched' END
              WHERE id = ${ord.listing_id}
            `;
          }
          await sql`UPDATE orders SET status = 'accepted' WHERE id = ${orderId}`;
          await insertNotification(sql, {
            userId: String(ord.buyer_id),
            title: `Request Accepted (#${ord.order_number})`,
            message: `${user.name} accepted your request for ${ord.quantity_tonnes}t ${String(ord.crop_type).toUpperCase()} via AI Copilot.`,
            type: 'success',
            orderId,
          });
        } else {
          await sql`UPDATE orders SET status = 'cancelled', cancelled_reason = 'Declined by Farmer via AI Copilot' WHERE id = ${orderId}`;
          await insertNotification(sql, {
            userId: String(ord.buyer_id),
            title: `Request Declined (#${ord.order_number})`,
            message: `${user.name} declined your purchase request.`,
            type: 'warning',
            orderId,
          });
        }

        return replyJson({
          reply:
            lang === 'hi'
              ? decision === 'accept'
                ? `Order **#${ord.order_number}** sweekar kar liya gaya hai! Khareedar (${ord.buyer_name}) ko soochna bhej di gayi hai.`
                : `Order **#${ord.order_number}** radd kar diya gaya hai.`
              : `Order **#${ord.order_number}** has been ${decision === 'accept' ? 'accepted' : 'declined'} and ${ord.buyer_name} was notified.`,
          stage: 'executed',
          refreshBootstrap: true,
          executionReceipt: {
            actionType: 'RESPOND_TO_ORDER',
            referenceId: String(ord.order_number || orderId),
            summary: decision === 'accept' ? 'Purchase Request Accepted' : 'Purchase Request Declined',
            fields: [
              { label: 'Buyer', value: String(ord.buyer_name) },
              { label: 'Payout', value: formatInr(Number(ord.farmer_total_payout || 0)) },
            ],
            navigateTo: '/farmer/orders',
            executedAt: new Date().toISOString(),
          },
        });
      }

      if (pending.type === 'CREATE_PURCHASE_REQUEST') {
        if (!user || (user.role !== 'buyer' && user.role !== 'admin')) {
          return replyJson({ reply: 'Buyer authorization required.', stage: 'idle' });
        }
        const listingId = String(pending.slots.listingId || '');
        const rows = await sql`SELECT * FROM farmer_listings WHERE id = ${listingId} LIMIT 1`;
        const listing = rows[0];
        if (!listing || Number(listing.quantity_tonnes) <= 0) {
          return replyJson({ reply: 'Selected listing is no longer available.', stage: 'idle' });
        }

        const qty = Math.min(Number(listing.quantity_tonnes), Number(pending.slots.quantityTonnes) || Number(listing.quantity_tonnes));
        const farmgateRate = Number(listing.price_per_tonne);
        const freightRate = Number(pending.slots.freightRate || 400);
        const deliveredRate = farmgateRate + freightRate;
        const farmerPayout = Math.round(qty * farmgateRate);
        const freightTotal = Math.round(qty * freightRate);
        const totalBill = farmerPayout + freightTotal;
        const orderId = `ord-${Date.now()}`;
        const orderNumber = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const pickupCoords = [Number(listing.lat ?? 30.3742), Number(listing.lng ?? 75.8712)];
        const dropCoords = [user.coordinates?.lat ?? 29.3909, user.coordinates?.lng ?? 76.9635];
        const timeline = [
          {
            step: 'Purchase Request Submitted by Buyer',
            timestamp: new Date().toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            completed: true,
            notes: `Submitted via Kisan AI Copilot. Awaiting ${listing.farmer_name}.`,
          },
          { step: 'Farmer Confirmation & Vehicle Dispatch', timestamp: 'Pending Farmer Approval', completed: false },
          { step: 'Loaded & Weighed on Certified Weighbridge', timestamp: 'Pending Arrival', completed: false },
          { step: 'In Transit to Buyer Facility', timestamp: 'Pending Transit', completed: false },
          { step: 'Gate Entry & Unloading', timestamp: 'Pending Delivery', completed: false },
          { step: 'Quality Test & Payout Settlement', timestamp: 'Pending Settlement', completed: false },
        ];

        await sql`
          INSERT INTO orders (
            id, order_number, listing_id, farmer_id, farmer_name, farmer_phone,
            buyer_id, buyer_name, crop_type, quantity_tonnes, display_quantity, weight_unit,
            price_per_tonne, farmgate_rate, freight_rate, total_delivered_rate,
            farmer_total_payout, logistics_total_payout, total_amount,
            delivery_location, pickup_location, distance_km, vehicle_type,
            status, payment_status, pickup_coords, drop_coords, current_truck_coords, gps_progress_percent, tracking_timeline
          ) VALUES (
            ${orderId}, ${orderNumber}, ${listingId},
            ${String(listing.farmer_id)}, ${String(listing.farmer_name)}, ${String(listing.farmer_phone || '')},
            ${user.id}, ${user.organization || user.name},
            ${String(listing.crop_type)}, ${qty}, ${qty}, 'tonne',
            ${deliveredRate}, ${farmgateRate}, ${freightRate}, ${deliveredRate},
            ${farmerPayout}, ${freightTotal}, ${totalBill},
            ${user.location || 'Plant Gate'}, ${String(listing.location || '')},
            ${Number(pending.slots.distanceKm || 50)}, ${String(pending.slots.vehicleName || 'Standard Haulage Truck')},
            'requested', 'awaiting_logistics',
            ${JSON.stringify(pickupCoords)}::jsonb, ${JSON.stringify(dropCoords)}::jsonb, ${JSON.stringify(pickupCoords)}::jsonb, 0, ${JSON.stringify(timeline)}::jsonb
          )
        `;

        await insertNotification(sql, {
          userId: String(listing.farmer_id),
          title: `New Purchase Request #${orderNumber}`,
          message: `${user.organization || user.name} requested ${qty}t of ${listing.crop_name} (${formatInr(farmerPayout)}).`,
          type: 'order',
          orderId,
        });

        return replyJson({
          reply:
            lang === 'hi'
              ? `Purchase Request **#${orderNumber}** bhej diya gaya hai! Farmer (${listing.farmer_name}) ko notification mil gaya hai.`
              : `Purchase request **#${orderNumber}** submitted to **${listing.farmer_name}**! Escrow checkout activates once logistics is assigned.`,
          stage: 'executed',
          refreshBootstrap: true,
          executionReceipt: {
            actionType: 'CREATE_PURCHASE_REQUEST',
            referenceId: orderNumber,
            summary: 'Buyer Purchase Request Created',
            fields: [
              { label: 'Farmer', value: String(listing.farmer_name) },
              { label: 'Total Landed Bill', value: formatInr(totalBill) },
            ],
            navigateTo: '/buyer/orders',
            executedAt: new Date().toISOString(),
          },
        });
      }

      if (pending.type === 'SETTLE_ESCROW_PAYMENT') {
        if (!user || (user.role !== 'buyer' && user.role !== 'admin')) {
          return replyJson({ reply: 'Buyer authorization required.', stage: 'idle' });
        }
        const orderId = String(pending.slots.orderId || '');
        const rows = await sql`SELECT * FROM orders WHERE id = ${orderId} LIMIT 1`;
        const ord = rows[0];
        if (!ord || (user.role !== 'admin' && ord.buyer_id !== user.id) || ord.payment_status === 'settled') {
          return replyJson({ reply: 'Order ineligible or already settled.', stage: 'idle' });
        }

        const fRows = await sql`SELECT upi_id, bank_account_number, ifsc_code FROM users WHERE id = ${ord.farmer_id} LIMIT 1`;
        const f = fRows[0];
        const target = f?.upi_id
          ? String(f.upi_id)
          : f?.bank_account_number
            ? `A/C ${f.bank_account_number} (${f.ifsc_code || 'IFSC'})`
            : 'Verified Kisan Bank Escrow';
        const utr = `UTR${Date.now().toString().slice(-10)}`;

        await sql`
          UPDATE orders
          SET
            status = CASE WHEN status = 'delivered' THEN 'settled' ELSE status END,
            payment_status = 'settled',
            payment_method = 'UPI',
            settled_payout_target = ${target},
            utr_number = ${utr},
            buyer_confirmed_at = NOW(),
            settled_at = NOW(),
            delivered_at = COALESCE(delivered_at, NOW())
          WHERE id = ${orderId}
        `;

        await insertNotification(sql, {
          userId: String(ord.farmer_id),
          title: `Payment Credited: ${formatInr(Number(ord.farmer_total_payout))}`,
          message: `Payment Credited: ${formatInr(Number(ord.farmer_total_payout))} settled to ${target} for Order #${ord.order_number} (UTR: ${utr}).`,
          type: 'payment',
          orderId,
        });

        return replyJson({
          reply:
            lang === 'hi'
              ? `Order **#${ord.order_number}** ka Escrow bhugtan safaltapoorvak settle ho gaya! UTR: **${utr}**`
              : `Escrow settled for **#${ord.order_number}**! **${formatInr(Number(ord.farmer_total_payout))}** credited to ${target} (UTR: **${utr}**).`,
          stage: 'executed',
          refreshBootstrap: true,
          executionReceipt: {
            actionType: 'SETTLE_ESCROW_PAYMENT',
            referenceId: utr,
            summary: 'Escrow Payment Settled',
            fields: [
              { label: 'Order #', value: String(ord.order_number) },
              { label: 'Settled Target', value: target },
              { label: 'UTR Reference', value: utr },
            ],
            navigateTo: '/buyer/orders',
            executedAt: new Date().toISOString(),
          },
        });
      }

      if (pending.type === 'LOGISTICS_UPDATE') {
        if (!user || (user.role !== 'logistics' && user.role !== 'admin')) {
          return replyJson({ reply: 'Logistics Partner authorization required.', stage: 'idle' });
        }
        const orderId = String(pending.slots.orderId || '');
        const mode = String(pending.slots.mode || 'gps');
        const rows = await sql`SELECT * FROM orders WHERE id = ${orderId} LIMIT 1`;
        const ord = rows[0];
        if (!ord) return replyJson({ reply: 'Order not found.', stage: 'idle' });

        if (mode === 'deliver') {
          const slipId = `WB-${String(ord.order_number || '1001').slice(-4)}`;
          await sql`
            UPDATE orders
            SET
              status = CASE WHEN payment_status = 'settled' THEN 'settled' ELSE 'delivered' END,
              payment_status = CASE WHEN payment_status = 'settled' THEN 'settled' ELSE 'pending_release' END,
              delivered_at = NOW(),
              weighbridge_slip_id = ${slipId},
              weighbridge_net_tonnes = ${Number(ord.quantity_tonnes)},
              gps_progress_percent = 100,
              current_truck_coords = drop_coords,
              last_gps_updated_at = NOW(),
              logistics_partner_id = COALESCE(logistics_partner_id, ${user.id}),
              logistics_partner_name = COALESCE(logistics_partner_name, ${user.organization || user.name})
            WHERE id = ${orderId}
          `;
          await insertNotification(sql, {
            userId: String(ord.farmer_id),
            title: `Shipment Delivered! Order #${ord.order_number}`,
            message: `Shipment Delivered! Order #${ord.order_number} arrived at ${ord.buyer_name} via Slip #${slipId}.`,
            type: 'delivery',
            orderId,
          });
          await insertNotification(sql, {
            userId: String(ord.buyer_id),
            title: `Cargo Arrived (#${ord.order_number})`,
            message: `${ord.quantity_tonnes}t delivered at plant gate (Slip #${slipId}). Ready to settle Escrow.`,
            type: 'delivery',
            orderId,
          });
        } else {
          const nextPct = Math.min(100, (Number(ord.gps_progress_percent) || 0) + 25);
          const nextStatus: OrderStatus =
            ord.status === 'accepted' ? 'logistics_assigned' : (ord.status as OrderStatus);
          await sql`
            UPDATE orders
            SET
              status = ${nextStatus},
              gps_progress_percent = ${nextPct},
              last_gps_updated_at = NOW(),
              logistics_partner_id = COALESCE(logistics_partner_id, ${user.id}),
              logistics_partner_name = COALESCE(logistics_partner_name, ${user.organization || user.name})
            WHERE id = ${orderId}
          `;
        }

        return replyJson({
          reply:
            lang === 'hi'
              ? `Order **#${ord.order_number}** ${mode === 'deliver' ? 'Delivered mark kar diya gaya hai' : 'ka Live GPS update ho gaya hai'}!`
              : `Order **#${ord.order_number}** ${mode === 'deliver' ? 'marked Delivered with weighbridge verification' : 'live GPS updated'}!`,
          stage: 'executed',
          refreshBootstrap: true,
          executionReceipt: {
            actionType: 'LOGISTICS_UPDATE',
            referenceId: String(ord.order_number || orderId),
            summary: mode === 'deliver' ? 'Marked Delivered' : 'Live GPS Updated',
            fields: [
              { label: 'Order #', value: String(ord.order_number) },
              { label: 'Action', value: mode === 'deliver' ? 'Delivered (100%)' : 'GPS Progress +25%' },
            ],
            navigateTo: '/logistics/dashboard',
            executedAt: new Date().toISOString(),
          },
        });
      }

      if (pending.type === 'RUN_AND_SAVE_CALCULATION') {
        const calcId = `calc-${Date.now()}`;
        const cropType = (pending.slots.cropType || 'paddy') as CropType;
        const coeff = CROP_COEFFICIENTS[cropType] || CROP_COEFFICIENTS.paddy;
        await sql`
          INSERT INTO saved_calculations (
            id, user_id, mode, crop_type, crop_name, land_area, land_unit, land_area_acres,
            quantity_value, weight_unit, recoverable_tonnes, price_per_unit, price_per_tonne,
            estimated_value, co2_saved_tonnes
          ) VALUES (
            ${calcId},
            ${user ? user.id : null},
            'farmer',
            ${cropType},
            ${coeff.cropName},
            ${Number(pending.slots.landArea || 0)},
            ${String(pending.slots.landUnit || 'acre')},
            ${Number(pending.slots.acres || 0)},
            ${Number(pending.slots.tonnes || 0)},
            'tonne',
            ${Number(pending.slots.tonnes || 0)},
            ${Number(pending.slots.pricePerTonne || 1700)},
            ${Number(pending.slots.pricePerTonne || 1700)},
            ${Number(pending.slots.estimatedValue || 0)},
            ${Number(pending.slots.co2Saved || 0)}
          )
        `;
        return replyJson({
          reply:
            lang === 'hi'
              ? `Aapki upaj ki ganana (${pending.slots.tonnes} Tonnes, ${formatInr(pending.slots.estimatedValue)}) Neon DB mein save ho gayi hai!`
              : `Calculation saved to Neon DB (${pending.slots.tonnes} Tonnes, est. ${formatInr(pending.slots.estimatedValue)}).`,
          stage: 'executed',
          refreshBootstrap: true,
          executionReceipt: {
            actionType: 'RUN_AND_SAVE_CALCULATION',
            referenceId: calcId,
            summary: 'Saved Calculation Snapshot',
            fields: [
              { label: 'Crop', value: coeff.cropName },
              { label: 'Est. Value', value: formatInr(Number(pending.slots.estimatedValue || 0)) },
            ],
            executedAt: new Date().toISOString(),
          },
        });
      }
    }

    // ------------------------------------------------------------------
    // 2. SLOT COLLECTION OR LIVE SLOT MODIFICATION WHILE PENDING
    // ------------------------------------------------------------------
    const llmSlots = llmPlan?.extractedSlots;
    const respond = (p: Omit<Parameters<typeof replyJson>[0], 'aiProvider'>) =>
      replyJson({ ...p, aiProvider: activeProvider });

    if (pending && (pending.stage === 'collecting' || hasSlotEditIntent)) {
      if (pending.type === 'CREATE_LISTING') {
        const nextSlots = { ...pending.slots };
        const extractedCrop = extractCropType(normalized) || llmSlots?.cropType;
        if (extractedCrop) nextSlots.cropType = extractedCrop;

        const w = extractWeightAndUnit(normalized);
        if (llmSlots?.quantity && llmSlots.weightUnit) {
          nextSlots.quantity = Number(llmSlots.quantity);
          nextSlots.weightUnit = llmSlots.weightUnit;
        } else if (w.quantity !== undefined) {
          nextSlots.quantity = w.quantity;
          if (w.weightUnit) nextSlots.weightUnit = w.weightUnit;
        } else if (pending.missingFields[0] === 'quantity') {
          const bareNum = normalized.match(/\b(\d+(?:\.\d+)?)\b/);
          if (bareNum) {
            nextSlots.quantity = Number(bareNum[1]);
            if (!nextSlots.weightUnit) nextSlots.weightUnit = 'tonne';
          }
        }

        const price = llmSlots?.pricePerUnit || extractPricePerUnit(normalized);
        if (price !== undefined && Number(price) > 0) {
          nextSlots.pricePerUnit = Number(price);
        } else if (pending.missingFields[0] === 'pricePerUnit') {
          const bareNum = normalized.match(/\b(\d+(?:\.\d+)?)\b/);
          if (bareNum) nextSlots.pricePerUnit = Number(bareNum[1]);
        }

        const land = extractLandAreaAndUnit(normalized);
        if (land.landArea !== undefined) {
          nextSlots.landArea = land.landArea;
          nextSlots.landUnit = land.landUnit || 'acre';
        } else if (llmSlots?.landArea !== undefined) {
          nextSlots.landArea = Number(llmSlots.landArea);
          nextSlots.landUnit = llmSlots.landUnit || 'acre';
        }

        const loc = llmSlots?.location || extractLocation(message, user?.location);
        if (loc) {
          nextSlots.location = loc;
        } else if (pending.missingFields[0] === 'location' && message.trim().length >= 3) {
          nextSlots.location = message.trim();
        }

        const missing: string[] = [];
        if (!nextSlots.cropType) missing.push('cropType');
        if (!nextSlots.quantity || Number(nextSlots.quantity) <= 0) missing.push('quantity');
        if (!nextSlots.pricePerUnit || Number(nextSlots.pricePerUnit) <= 0) missing.push('pricePerUnit');
        if (!nextSlots.location) missing.push('location');

        if (missing.length > 0) {
          return respond({
            reply: buildMissingFieldPrompt(missing[0], lang, user?.location),
            stage: 'collecting',
            pendingAction: {
              ...pending,
              stage: 'collecting',
              missingFields: missing,
              slots: nextSlots,
            },
          });
        }

        const { summaryFields, tonnes, totalAmount } = buildCreateListingSummary(nextSlots);
        const coeff = CROP_COEFFICIENTS[(nextSlots.cropType || 'paddy') as CropType];
        const qtyStr = formatWeightLabel(nextSlots.quantity, nextSlots.weightUnit || 'tonne');

        return respond({
          reply:
            lang === 'hi'
              ? `Dhanyavaad! Maine aapki listing update kar di hai: **${coeff.cropName}**, **${qtyStr}** (= **${tonnes.toFixed(2)} Tonnes**), kul anumanit bhugtan **${formatInr(totalAmount)}** (${nextSlots.location}). Kya main ise live kar doon? ("Haan kar do" kahein ya "Confirm" dabayein)`
              : `Updated your listing card: **${coeff.cropName}**, **${qtyStr}** (**${tonnes.toFixed(2)} Tonnes**), total value **${formatInr(totalAmount)}** in ${nextSlots.location}. Say **"Yes, confirm"** or click Confirm below.`,
          stage: 'awaiting_permission',
          pendingAction: {
            type: 'CREATE_LISTING',
            stage: 'awaiting_permission',
            missingFields: [],
            slots: nextSlots,
            title: `Publish ${coeff.cropName} Listing`,
            summaryFields,
          },
        });
      }

      if (pending.type === 'RESPOND_TO_ORDER' && /(reject|decline)/i.test(normalized)) {
        const nextSlots = { ...pending.slots, decision: 'reject' };
        return replyJson({
          reply:
            lang === 'hi'
              ? `Order **#${pending.slots.orderNumber}** ko **Reject** karne ki pushti karein.`
              : `Please confirm rejecting order **#${pending.slots.orderNumber}**.`,
          stage: 'awaiting_permission',
          pendingAction: {
            ...pending,
            slots: nextSlots,
            title: `Reject Order #${pending.slots.orderNumber}`,
            summaryFields: pending.summaryFields.map((f) =>
              f.label === 'Action' ? { ...f, value: 'Reject Purchase Request' } : f
            ),
          },
        });
      }

      if (pending.type === 'UPDATE_PAYOUT_UPI') {
        const newUpi = extractUpiId(message);
        if (newUpi) {
          return replyJson({
            reply:
              lang === 'hi'
                ? `Naya UPI ID **${newUpi}** update kiya hai. Kya main ise save kar doon?`
                : `Updated UPI ID to **${newUpi}**. Shall I save this now?`,
            stage: 'awaiting_permission',
            pendingAction: {
              ...pending,
              slots: { upiId: newUpi },
              summaryFields: [
                { label: 'Account Holder', value: user?.name || 'Farmer' },
                { label: 'New UPI ID', value: newUpi },
              ],
            },
          });
        }
      }
    }

    // ------------------------------------------------------------------
    // 3. FRESH INTENT DETECTION + SLOT EXTRACTION + READ QUERIES
    // ------------------------------------------------------------------
    const rawLlmIntent = llmPlan?.intent || '';
    const mappedLlmIntent =
      rawLlmIntent === 'EXPLAIN'
        ? 'EXPLAIN_PLATFORM'
        : rawLlmIntent === 'LIVE_QUERY' || rawLlmIntent === 'NAVIGATE'
          ? 'LIVE_QUERY_AND_NAVIGATE'
          : rawLlmIntent;

    let intent =
      mappedLlmIntent &&
        mappedLlmIntent !== 'CONFIRM_PERMISSION' &&
        mappedLlmIntent !== 'CANCEL_ACTION'
        ? mappedLlmIntent
        : detectIntent(normalized, user?.role);

    if (
      intent === 'RUN_AND_SAVE_CALCULATION' &&
      (user?.role === 'farmer' || user?.role === 'admin') &&
      /\b(bech|bechni|bechna|sell|list)\b/i.test(normalized) &&
      (llmSlots?.pricePerUnit || extractPricePerUnit(normalized))
    ) {
      intent = 'CREATE_LISTING';
    }

    if (intent === 'EXPLAIN_PLATFORM') {
      const topic = detectExplainTopic(message) || 'general';
      return respond({
        reply: llmPlan?.reply?.trim() || buildExplanationReply(topic, lang),
        stage: 'idle',
      });
    }

    if (intent === 'LIVE_QUERY_AND_NAVIGATE') {
      const llmRoute =
        llmPlan?.navigateTo && VALID_APP_ROUTES.has(llmPlan.navigateTo)
          ? { path: llmPlan.navigateTo, label: llmPlan.navigateTo }
          : null;
      const route = llmRoute || detectRouteTarget(message);
      if (route && (rawLlmIntent === 'NAVIGATE' || /(open|go\s*to|le\s*chalo|khol|navigate)/i.test(normalized))) {
        return respond({
          reply:
            llmPlan?.reply?.trim() ||
            (lang === 'hi'
              ? `Aapko **${route.label}** par le ja raha hoon...`
              : `Navigating you to **${route.label}**...`),
          stage: 'idle',
          navigateTo: route.path,
        });
      }

      if (!user) {
        const cntRows = await sql`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(quantity_tonnes),0)::numeric AS tonnes FROM farmer_listings WHERE status IN ('verified','active') AND quantity_tonnes > 0`;
        const cnt = Number(cntRows[0]?.cnt ?? 0);
        const t = Number(cntRows[0]?.tonnes ?? 0).toFixed(1);
        return replyJson({
          reply:
            lang === 'hi'
              ? `Is samay StrawSync par **${cnt} sakriya fasal suchiyan** (${t} Tonnes) upalabdh hain. Apne orders aur kamai dekhne ke liye kripya Sign In karein.`
              : `There are currently **${cnt} active listings** (${t} Tonnes) on StrawSync. Please sign in to check personal orders or earnings.`,
          stage: 'idle',
          navigateTo: route?.path,
        });
      }

      const [orderRows, listRows] = await Promise.all([
        sql`
          SELECT order_number, status, payment_status, gps_progress_percent, farmer_total_payout, buyer_total_bill, crop_type
          FROM orders
          WHERE farmer_id = ${user.id} OR buyer_id = ${user.id} OR logistics_partner_id = ${user.id}
          ORDER BY created_at DESC LIMIT 10
        `,
        sql`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(quantity_tonnes),0)::numeric AS tonnes FROM farmer_listings WHERE status IN ('verified','active') AND quantity_tonnes > 0`,
      ]);

      const settledSum = orderRows
        .filter((o) => o.payment_status === 'settled')
        .reduce((s, o) => s + Number(o.farmer_total_payout || 0), 0);
      const latest = orderRows[0];
      const activeListingsCount = Number(listRows[0]?.cnt ?? 0);

      if (/(kamai|earning|income|payout)/i.test(normalized)) {
        return replyJson({
          reply:
            lang === 'hi'
              ? `Aapki kul settled kamai **${formatInr(settledSum)}** hai (${orderRows.length} kul orders mein se).`
              : `Your total settled payout is **${formatInr(settledSum)}** across **${orderRows.length}** order(s).`,
          stage: 'idle',
        });
      }

      if (/(kahan\s*pahuncha|order\s*status|where.*order)/i.test(normalized) && latest) {
        return replyJson({
          reply:
            lang === 'hi'
              ? `Aapka navin order **#${latest.order_number}** abhi **"${String(latest.status).replace(/_/g, ' ')}"** stage par hai (GPS yatra **${latest.gps_progress_percent ?? 0}%** poori ho chuki hai).`
              : `Your latest order **#${latest.order_number}** is currently **${String(latest.status).replace(/_/g, ' ')}** (**${latest.gps_progress_percent ?? 0}%** GPS route complete).`,
          stage: 'idle',
          navigateTo: user.role === 'buyer' ? '/buyer/orders' : '/farmer/orders',
        });
      }

      return replyJson({
        reply:
          lang === 'hi'
            ? `Abhi platform par **${activeListingsCount} active listings** hain. Aapke khate mein **${orderRows.length} orders** aur **${formatInr(settledSum)}** settled bhugtan darj hai.`
            : `Live Neon snapshot: **${activeListingsCount} active listings** platform-wide, **${orderRows.length} order(s)** on your account, and **${formatInr(settledSum)}** settled.`,
        stage: 'idle',
      });
    }

    if (intent === 'CREATE_LISTING') {
      if (!user) {
        return replyJson({
          reply:
            lang === 'hi'
              ? 'Fasal list karne ke liye kripya pehle Farmer account se Sign In karein.'
              : 'Please sign in as a Farmer first to list residue on StrawSync.',
          stage: 'idle',
          navigateTo: '/login',
        });
      }
      if (user.role !== 'farmer' && user.role !== 'admin') {
        return replyJson({
          reply:
            lang === 'hi'
              ? `Aap abhi ${user.role} ke roop mein logged in hain. Nayi listing keval Farmer role se banayi ja sakti hai.`
              : `You are signed in as **${user.role}**. Only Farmers or Admins can publish listings.`,
          stage: 'idle',
        });
      }

      const cropType = extractCropType(normalized) || llmSlots?.cropType;
      const w = extractWeightAndUnit(normalized);
      const qty = llmSlots?.quantity ?? w.quantity;
      const unit: WeightUnit = llmSlots?.weightUnit ?? w.weightUnit ?? 'tonne';
      const pricePerUnit = llmSlots?.pricePerUnit ?? extractPricePerUnit(normalized);
      const land = extractLandAreaAndUnit(normalized);
      const location = llmSlots?.location || extractLocation(message, user.location);

      const slots: Record<string, any> = {
        cropType: cropType || undefined,
        quantity: qty,
        weightUnit: unit,
        pricePerUnit,
        landArea:
          land.landArea ??
          (typeof llmSlots?.landArea === 'number' ? llmSlots.landArea : undefined),
        landUnit: land.landUnit || llmSlots?.landUnit || 'acre',
        location,
      };

      const missing: string[] = [];
      if (!slots.cropType) missing.push('cropType');
      if (!slots.quantity || Number(slots.quantity) <= 0) missing.push('quantity');
      if (!slots.pricePerUnit || Number(slots.pricePerUnit) <= 0) missing.push('pricePerUnit');
      if (!slots.location) missing.push('location');

      if (missing.length > 0) {
        return respond({
          reply: buildMissingFieldPrompt(missing[0], lang, user.location),
          stage: 'collecting',
          pendingAction: {
            type: 'CREATE_LISTING',
            stage: 'collecting',
            missingFields: missing,
            slots,
            title: 'Create Crop Residue Listing',
            summaryFields: [],
          },
        });
      }

      const { summaryFields, tonnes, totalAmount } = buildCreateListingSummary(slots);
      const coeff = CROP_COEFFICIENTS[slots.cropType as CropType];
      const qtyLabel = formatWeightLabel(slots.quantity, slots.weightUnit);
      const verifiedFact =
        lang === 'hi'
          ? `**Verified Calculation:** ${coeff.cropName} — **${qtyLabel} (= ${tonnes.toFixed(2)} Tonnes)** @ **${slots.location}**, kul kamai **${formatInr(totalAmount)}**। Publish karne ke liye **"Haan kar do"** kahein ya Confirm dabayein.`
          : `**Verified Summary:** ${coeff.cropName} — **${qtyLabel} (= ${tonnes.toFixed(2)} Tonnes)** from **${slots.location}**, total value **${formatInr(totalAmount)}**. Say **"Yes, confirm"** or click Confirm below.`;

      return respond({
        reply: llmPlan?.reply?.trim()
          ? `${llmPlan.reply.trim()}\n\n${verifiedFact}`
          : verifiedFact,
        stage: 'awaiting_permission',
        pendingAction: {
          type: 'CREATE_LISTING',
          stage: 'awaiting_permission',
          missingFields: [],
          slots,
          title: `Publish ${coeff.cropName}`,
          summaryFields,
        },
      });
    }

    if (intent === 'UPDATE_PAYOUT_UPI') {
      if (!user) {
        return respond({
          reply: 'Please sign in first to update your Farmer UPI payout ID.',
          stage: 'idle',
          navigateTo: '/login',
        });
      }
      const upiId = llmSlots?.upiId || extractUpiId(message);
      if (!upiId) {
        return replyJson({
          reply:
            lang === 'hi'
              ? 'Kripya apna sahi UPI ID batayein (jaise `himanshu@okaxis` ya `9417885574@upi`).'
              : 'Please specify a valid UPI ID (e.g., `himanshu@okaxis`).',
          stage: 'collecting',
          pendingAction: {
            type: 'UPDATE_PAYOUT_UPI',
            stage: 'collecting',
            missingFields: ['upiId'],
            slots: {},
            title: 'Update Farmer Payout UPI',
            summaryFields: [],
          },
        });
      }
      return replyJson({
        reply:
          lang === 'hi'
            ? `Kya main aapka UPI ID **${upiId}** aapke StrawSync khate mein save kar doon?`
            : `Shall I save **${upiId}** as your primary escrow payout UPI ID in Neon DB?`,
        stage: 'awaiting_permission',
        pendingAction: {
          type: 'UPDATE_PAYOUT_UPI',
          stage: 'awaiting_permission',
          missingFields: [],
          slots: { upiId },
          title: 'Save Farmer UPI Payout ID',
          summaryFields: [
            { label: 'Farmer', value: user.name },
            { label: 'New UPI ID', value: upiId },
          ],
        },
      });
    }

    if (intent === 'RESPOND_TO_ORDER') {
      if (!user || (user.role !== 'farmer' && user.role !== 'admin')) {
        return replyJson({
          reply: 'Please sign in as a Farmer to accept or decline incoming orders.',
          stage: 'idle',
        });
      }
      const rows = await sql`
        SELECT * FROM orders
        WHERE (farmer_id = ${user.id} OR ${user.role === 'admin'})
          AND status IN ('requested', 'pending_farmer')
        ORDER BY created_at DESC LIMIT 1
      `;
      const ord = rows[0];
      if (!ord) {
        return replyJson({
          reply:
            lang === 'hi'
              ? 'Is samay aapke paas koi pending purchase request nahi hai.'
              : 'You have no pending buyer purchase requests awaiting confirmation.',
          stage: 'idle',
        });
      }
      const decision = /(reject|decline|nahi)/i.test(normalized) ? 'reject' : 'accept';
      return replyJson({
        reply:
          lang === 'hi'
            ? `${ord.buyer_name} ne **${ord.quantity_tonnes}t ${String(ord.crop_type).toUpperCase()}** ke liye **${formatInr(Number(ord.farmer_total_payout))}** ka order bheja hai (#${ord.order_number}). Kya main ise **${decision === 'accept' ? 'Accept' : 'Reject'}** kar doon?`
            : `Order **#${ord.order_number}** from **${ord.buyer_name}** for **${ord.quantity_tonnes}t ${String(ord.crop_type).toUpperCase()}** (**${formatInr(Number(ord.farmer_total_payout))}**). Confirm **${decision === 'accept' ? 'Accepting' : 'Rejecting'}** it?`,
        stage: 'awaiting_permission',
        pendingAction: {
          type: 'RESPOND_TO_ORDER',
          stage: 'awaiting_permission',
          missingFields: [],
          slots: { orderId: ord.id, orderNumber: ord.order_number, decision },
          title: `${decision === 'accept' ? 'Accept' : 'Reject'} Order #${ord.order_number}`,
          summaryFields: [
            { label: 'Action', value: decision === 'accept' ? 'Accept Purchase Request' : 'Reject Purchase Request' },
            { label: 'Buyer', value: String(ord.buyer_name) },
            { label: 'Crop & Qty', value: `${ord.quantity_tonnes}t ${String(ord.crop_type).toUpperCase()}` },
            { label: 'Farmer Payout', value: formatInr(Number(ord.farmer_total_payout)) },
          ],
        },
      });
    }

    if (intent === 'CREATE_PURCHASE_REQUEST') {
      if (!user || (user.role !== 'buyer' && user.role !== 'admin')) {
        return replyJson({
          reply:
            lang === 'hi'
              ? 'Kharidari request bhejne ke liye Buyer account se Sign In karein.'
              : 'Please sign in as a Buyer to submit a biomass purchase request.',
          stage: 'idle',
          navigateTo: '/login',
        });
      }
      const crop = extractCropType(normalized) || llmSlots?.cropType;
      const rows = crop
        ? await sql`
            SELECT * FROM farmer_listings
            WHERE status IN ('verified', 'active') AND quantity_tonnes > 0 AND crop_type = ${crop}
            ORDER BY created_at DESC LIMIT 1
          `
        : await sql`
            SELECT * FROM farmer_listings
            WHERE status IN ('verified', 'active') AND quantity_tonnes > 0
            ORDER BY created_at DESC LIMIT 1
          `;
      const best = rows[0];
      if (!best) {
        return replyJson({
          reply:
            lang === 'hi'
              ? 'Abhi is crop ke liye koi active listing upalabdh nahi hai.'
              : 'No matching active farmer listings are currently available.',
          stage: 'idle',
        });
      }

      const w = extractWeightAndUnit(normalized);
      const reqTonnes = w.quantity
        ? Math.min(Number(best.quantity_tonnes), w.weightUnit === 'kg' ? w.quantity / 1000 : w.weightUnit === 'quintal' ? w.quantity / 10 : w.quantity)
        : Math.min(Number(best.quantity_tonnes), 20);
      const safeTonnes = Math.max(0.1, Number(reqTonnes.toFixed(2)));
      const distKm = calculateRoadDistanceKm(
        { lat: Number(best.lat ?? 30.3742), lng: Number(best.lng ?? 75.8712) },
        user.coordinates || { lat: 29.3909, lng: 76.9635 }
      );
      const vehicle = recommendVehicle(safeTonnes, distKm);
      const cost = calculateDeliveredCost(Number(best.price_per_tonne), safeTonnes, distKm, vehicle);
      const totalBill = Math.round(safeTonnes * cost.deliveredPricePerTonne);

      return replyJson({
        reply:
          lang === 'hi'
            ? `Sabse accha match mila: **${best.farmer_name}** (${best.location}) — **${safeTonnes}t ${best.crop_name}**, kul landed mulya **${formatInr(totalBill)}**. Kya main Purchase Request bhej doon?`
            : `Found top match from **${best.farmer_name}** (${best.location}): **${safeTonnes}t ${best.crop_name}**, estimated landed total **${formatInr(totalBill)}**. Send Purchase Request?`,
        stage: 'awaiting_permission',
        pendingAction: {
          type: 'CREATE_PURCHASE_REQUEST',
          stage: 'awaiting_permission',
          missingFields: [],
          slots: {
            listingId: best.id,
            quantityTonnes: safeTonnes,
            freightRate: cost.freightPerTonne,
            distanceKm: distKm,
            vehicleName: vehicle.name,
          },
          title: 'Submit Buyer Purchase Request',
          summaryFields: [
            { label: 'Farmer Source', value: `${best.farmer_name} (${best.location})` },
            { label: 'Crop & Qty', value: `${safeTonnes}t ${best.crop_name}` },
            { label: 'Landed Total', value: formatInr(totalBill) },
          ],
        },
      });
    }

    if (intent === 'SETTLE_ESCROW_PAYMENT') {
      if (!user || (user.role !== 'buyer' && user.role !== 'admin')) {
        return replyJson({ reply: 'Please sign in as a Buyer to settle Escrow payments.', stage: 'idle' });
      }
      const rows = await sql`
        SELECT * FROM orders
        WHERE (buyer_id = ${user.id} OR ${user.role === 'admin'})
          AND payment_status <> 'settled'
          AND status IN ('logistics_assigned', 'pickup_en_route', 'loaded_and_weighed', 'in_transit', 'delivered')
        ORDER BY created_at DESC LIMIT 1
      `;
      const ord = rows[0];
      if (!ord) {
        return replyJson({
          reply:
            lang === 'hi'
              ? 'Abhi koi logistics-assigned ya delivered unpaid order escrow settlement ke liye pending nahi hai.'
              : 'You have no logistics-assigned or delivered orders awaiting Escrow settlement.',
          stage: 'idle',
        });
      }
      return replyJson({
        reply:
          lang === 'hi'
            ? `Order **#${ord.order_number}** (${ord.farmer_name}) ka **${formatInr(Number(ord.buyer_total_bill))}** escrow bhugtan settle karne ke liye ready hai. Kya main UTR ke saath bhugtan poora kar doon?`
            : `Order **#${ord.order_number}** (${ord.farmer_name}) is ready for Escrow settlement (**${formatInr(Number(ord.buyer_total_bill))}**). Confirm generating UTR payout?`,
        stage: 'awaiting_permission',
        pendingAction: {
          type: 'SETTLE_ESCROW_PAYMENT',
          stage: 'awaiting_permission',
          missingFields: [],
          slots: { orderId: ord.id },
          title: `Settle Escrow #${ord.order_number}`,
          summaryFields: [
            { label: 'Farmer Payout', value: `${ord.farmer_name} (${formatInr(Number(ord.farmer_total_payout))})` },
            { label: 'Total Escrow Bill', value: formatInr(Number(ord.buyer_total_bill)) },
            { label: 'Method', value: 'UPI Instant Escrow Settlement' },
          ],
        },
      });
    }

    if (intent === 'LOGISTICS_UPDATE') {
      if (!user || (user.role !== 'logistics' && user.role !== 'admin')) {
        return replyJson({ reply: 'Logistics Partner role required for fleet updates.', stage: 'idle' });
      }
      const mode = /deliver/i.test(normalized) ? 'deliver' : 'gps';
      const rows = await sql`
        SELECT * FROM orders
        WHERE (logistics_partner_id = ${user.id} OR logistics_partner_id IS NULL OR ${user.role === 'admin'})
          AND status IN ('accepted', 'logistics_assigned', 'pickup_en_route', 'loaded_and_weighed', 'in_transit')
        ORDER BY created_at DESC LIMIT 1
      `;
      const ord = rows[0];
      if (!ord) {
        return replyJson({ reply: 'No active dispatchable orders found in fleet queue.', stage: 'idle' });
      }
      return replyJson({
        reply:
          lang === 'hi'
            ? `Order **#${ord.order_number}** ko **${mode === 'deliver' ? 'Delivered' : 'Live GPS +25%'}** update karne ki pushti karein.`
            : `Confirm updating Order **#${ord.order_number}** (${mode === 'deliver' ? 'Mark Delivered + Weighbridge' : 'Broadcast Live GPS +25%'}).`,
        stage: 'awaiting_permission',
        pendingAction: {
          type: 'LOGISTICS_UPDATE',
          stage: 'awaiting_permission',
          missingFields: [],
          slots: { orderId: ord.id, mode },
          title: mode === 'deliver' ? `Mark Delivered #${ord.order_number}` : `Update Live GPS #${ord.order_number}`,
          summaryFields: [
            { label: 'Order #', value: String(ord.order_number) },
            { label: 'Route', value: `${ord.pickup_location} → ${ord.delivery_location}` },
            { label: 'Action', value: mode === 'deliver' ? 'Mark Delivered & Notify' : 'Broadcast GPS +25%' },
          ],
        },
      });
    }

    // Fallback: RUN_AND_SAVE_CALCULATION
    const crop = extractCropType(normalized) || llmSlots?.cropType || 'paddy';
    const coeff = CROP_COEFFICIENTS[crop] || CROP_COEFFICIENTS.paddy;
    const land = extractLandAreaAndUnit(normalized);
    const areaVal = land.landArea ?? 5;
    const areaUnit = land.landUnit || 'acre';
    const acres = toAcresNlu(areaVal, areaUnit);
    const est = estimateResidue(crop, acres, 'baled');
    const rate = Math.round((coeff.marketBaseRateMin + coeff.marketBaseRateMax) / 2);
    const value = Math.round(est.recoverableTonnes * rate);
    const co2 = Number((est.recoverableTonnes * coeff.co2AbatementTonnesPerTonne).toFixed(1));

    return replyJson({
      reply:
        lang === 'hi'
          ? `${areaVal} ${areaUnit} (${acres} Acres) mein **${coeff.cropName}** se lagbhag **${est.recoverableTonnes} Tonnes** upaj aur **${formatInr(value)}** kamai hogi. Kya main yeh hisaab Neon DB mein save kar doon?`
          : `${areaVal} ${areaUnit} (${acres} Acres) of **${coeff.cropName}** yields approx. **${est.recoverableTonnes} Tonnes** worth **${formatInr(value)}**. Save this calculation to Neon DB?`,
      stage: 'awaiting_permission',
      pendingAction: {
        type: 'RUN_AND_SAVE_CALCULATION',
        stage: 'awaiting_permission',
        missingFields: [],
        slots: {
          cropType: crop,
          landArea: areaVal,
          landUnit: areaUnit,
          acres,
          tonnes: est.recoverableTonnes,
          pricePerTonne: rate,
          estimatedValue: value,
          co2Saved: co2,
        },
        title: 'Save Yield & Value Calculation',
        summaryFields: [
          { label: 'Crop', value: coeff.cropName },
          { label: 'Land Area', value: `${areaVal} ${areaUnit} (${acres} Acres)` },
          { label: 'Est. Yield', value: `${est.recoverableTonnes} Tonnes` },
          { label: 'Est. Value', value: formatInr(value) },
        ],
      },
    });
  } catch (err) {
    console.error('[api/assistant POST]', err);
    return NextResponse.json(
      {
        reply: 'Something went wrong processing your request. Please try again.',
        stage: 'idle',
        pendingAction: null,
      },
      { status: 500 }
    );
  }
}
