import { CROP_COEFFICIENTS } from './engine';
import type { CropType, LandAreaUnit, UserRole, WeightUnit } from '../types';

export type AssistantStage = 'idle' | 'collecting' | 'awaiting_permission' | 'executed';

export type AssistantActionType =
  | 'CREATE_LISTING'
  | 'RESPOND_TO_ORDER'
  | 'UPDATE_PAYOUT_UPI'
  | 'CREATE_PURCHASE_REQUEST'
  | 'SETTLE_ESCROW_PAYMENT'
  | 'LOGISTICS_UPDATE'
  | 'RUN_AND_SAVE_CALCULATION'
  | 'LIVE_QUERY_AND_NAVIGATE'
  | 'EXPLAIN_PLATFORM';

export interface PreviewField {
  label: string;
  value: string;
}

export interface PendingAssistantAction {
  type: Exclude<AssistantActionType, 'LIVE_QUERY_AND_NAVIGATE' | 'EXPLAIN_PLATFORM'>;
  stage: 'collecting' | 'awaiting_permission';
  missingFields: string[];
  slots: Record<string, any>;
  title: string;
  summaryFields: PreviewField[];
  navigateTo?: string;
}

export interface ExecutionReceipt {
  actionType: string;
  referenceId: string;
  summary: string;
  fields: PreviewField[];
  navigateTo?: string;
  executedAt: string;
}

export interface AssistantRequestPayload {
  message: string;
  lang?: 'en' | 'hi';
  pendingAction?: PendingAssistantAction | null;
  confirmExecution?: boolean;
  cancelExecution?: boolean;
}

const LAND_MULTIPLIERS: Record<LandAreaUnit, number> = {
  acre: 1,
  bigha: 0.625,
  hectare: 2.47105,
  kanal: 0.125,
  guntha: 0.025,
};

export function toTonnesNlu(quantity: number, unit: WeightUnit = 'tonne'): number {
  const safe = Math.max(0, Number(quantity) || 0);
  if (unit === 'kg') return Number((safe / 1000).toFixed(3));
  if (unit === 'quintal') return Number((safe / 10).toFixed(2));
  return Number(safe.toFixed(2));
}

export function pricePerUnitToPerTonneNlu(pricePerUnit: number, unit: WeightUnit = 'tonne'): number {
  const safe = Math.max(0, Number(pricePerUnit) || 0);
  if (unit === 'kg') return Math.round(safe * 1000);
  if (unit === 'quintal') return Math.round(safe * 10);
  return Math.round(safe);
}

export function toAcresNlu(value: number, unit: LandAreaUnit = 'acre'): number {
  const safe = Math.max(0, Number(value) || 0);
  return Number((safe * (LAND_MULTIPLIERS[unit] ?? 1)).toFixed(4));
}

export function formatWeightLabel(qty: number, unit: WeightUnit = 'tonne'): string {
  const q = Number(qty) || 0;
  if (unit === 'kg') return `${q.toLocaleString('en-IN')} Kg`;
  if (unit === 'quintal') return `${q.toLocaleString('en-IN')} ${q === 1 ? 'Quintal' : 'Quintals'}`;
  return `${q.toLocaleString('en-IN')} ${q === 1 ? 'Tonne' : 'Tonnes'}`;
}

export function formatInr(amount: number): string {
  return `₹${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
}

const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

const WORD_NUMBERS: Record<string, number> = {
  shunya: 0, zero: 0,
  ek: 1, one: 1, एक: 1,
  do: 2, two: 2, दो: 2,
  teen: 3, three: 3, तीन: 3,
  char: 4, chaar: 4, four: 4, चार: 4,
  paanch: 5, panch: 5, five: 5, पांच: 5, पाँच: 5,
  chhe: 6, chhah: 6, six: 6, छह: 6,
  saat: 7, sat: 7, seven: 7, सात: 7,
  aath: 8, eight: 8, आठ: 8,
  nau: 9, nine: 9, नौ: 9,
  das: 10, ten: 10, दस: 10,
  gyarah: 11, barah: 12, terah: 13, chaudah: 14,
  pandrah: 15, fifteen: 15, पंद्रह: 15,
  solah: 16, satrah: 17, atharah: 18, unnees: 19,
  bees: 20, twenty: 20, बीस: 20,
  pachees: 25, pachis: 25, पच्चीस: 25,
  tees: 30, thirty: 30, तीस: 30,
  chalis: 40, chaalis: 40, forty: 40, चालीस: 40,
  paintalis: 45, पैंतालीस: 45,
  pachas: 50, pachaas: 50, fifty: 50, पचास: 50,
  saath: 60, sixty: 60, साठ: 60,
  sattar: 70, seventy: 70, सत्तर: 70,
  assi: 80, eighty: 80, अस्सी: 80,
  nabbe: 90, ninety: 90, नब्बे: 90,
  aadha: 0.5, half: 0.5, आधा: 0.5,
  dedh: 1.5, डेढ़: 1.5,
  dhai: 2.5, ढाई: 2.5,
};

export function normalizeSpokenNumbers(input: string): string {
  let out = (input || '').replace(/[०-९]/g, (ch) => DEVANAGARI_DIGITS[ch] ?? ch);

  // Convert compound Hindi/English multipliers like "ek hazar paanch sau" or "17 sau" or "2 hazar"
  out = out.replace(
    /\b([a-zA-Z\u0900-\u097F0-9]+)\s+(hazar|hazaar|thousand|हजार)\b/gi,
    (_, nWord) => {
      const n = /^\d+(\.\d+)?$/.test(nWord) ? Number(nWord) : WORD_NUMBERS[nWord.toLowerCase()];
      return Number.isFinite(n) ? String(Math.round(n * 1000)) : _;
    }
  );
  out = out.replace(
    /\b([a-zA-Z\u0900-\u097F0-9]+)\s+(sau|hundred|सौ)\b/gi,
    (_, nWord) => {
      const n = /^\d+(\.\d+)?$/.test(nWord) ? Number(nWord) : WORD_NUMBERS[nWord.toLowerCase()];
      return Number.isFinite(n) ? String(Math.round(n * 100)) : _;
    }
  );

  // Convert standalone word numbers
  out = out.replace(/\b[a-zA-Z\u0900-\u097F]+\b/g, (tok) => {
    const val = WORD_NUMBERS[tok.toLowerCase()];
    return val !== undefined ? String(val) : tok;
  });

  // Merge adjacent converted thousands + hundreds (e.g., "1000 500" -> "1500")
  out = out.replace(/\b(\d*000)\s+(\d{1,3})\b/g, (_, thousands, rest) =>
    String(Number(thousands) + Number(rest))
  );

  return out;
}

const CROP_PATTERNS: Array<{ crop: CropType; patterns: RegExp[] }> = [
  { crop: 'paddy', patterns: [/\b(parali|paraali|paddy|rice\s*straw|dhan|dhaan|pual)\b/i, /पराली|धान|पुआल/] },
  { crop: 'wheat', patterns: [/\b(wheat|bhusa|bhusi|bhoosa|bhoosi|turi|toosa|gehu|gehun)\b/i, /गेहूं|गेहूँ|भूसा|भूसी|तूड़ी/] },
  { crop: 'sugarcane', patterns: [/\b(sugarcane|bagasse|ganna|khoi|trash)\b/i, /गन्ना|खोई/] },
  { crop: 'mustard', patterns: [/\b(mustard|sarson|toria|sarso)\b/i, /सरसों/] },
  { crop: 'cotton', patterns: [/\b(cotton|kapas|narma)\b/i, /कपास|नरमा/] },
  { crop: 'maize', patterns: [/\b(maize|makka|bhutta|stover|corn)\b/i, /मक्का|भुट्टा/] },
  { crop: 'vegetables', patterns: [/\b(vegetables?|sabzi|sabji|aloo|tomato|tamatar|onion|pyaz|pyaj)\b/i, /सब्जी|सब्जियां|आलू|टमाटर/] },
  { crop: 'fruits', patterns: [/\b(fruits?|fal|mango|aam|apple|seb|banana|kela|citrus)\b/i, /फल|आम|सेब/] },
  { crop: 'orchard', patterns: [/\b(orchard|horticultur\w*|bagwani|bagicha)\b/i, /बागवानी|बगीचा/] },
  { crop: 'agri_waste', patterns: [/\b(agri[\s-]*waste|organic\s*waste|krishi\s*avshesh)\b/i, /अवशेष/] },
];

export function extractCropType(text: string): CropType | null {
  for (const entry of CROP_PATTERNS) {
    if (entry.patterns.some((p) => p.test(text))) {
      return entry.crop;
    }
  }
  return null;
}

export function extractWeightAndUnit(normalized: string): {
  quantity?: number;
  weightUnit?: WeightUnit;
} {
  const m = normalized.match(
    /(\d+(?:\.\d+)?)\s*(kg|kilo|kilogram|kilograms|quintals?|quintels?|kwintals?|qtl|tonnes?|tons?|mt|किलो|क्विंटल|टन)\b/i
  );
  if (!m) return {};
  const qty = Number(m[1]);
  const rawUnit = m[2].toLowerCase();
  const weightUnit: WeightUnit =
    rawUnit.startsWith('k') || rawUnit === 'किलो'
      ? 'kg'
      : rawUnit.startsWith('q') || rawUnit === 'क्विंटल'
      ? 'quintal'
      : 'tonne';
  return { quantity: qty, weightUnit };
}

export function extractLandAreaAndUnit(normalized: string): {
  landArea?: number;
  landUnit?: LandAreaUnit;
} {
  const m = normalized.match(
    /(\d+(?:\.\d+)?)\s*(acres?|bigha|bighe|hectares?|ha|kanals?|gunthas?|एकड़|बीघा|हेक्टेयर|कनाल|गुंठा)\b/i
  );
  if (!m) return {};
  const val = Number(m[1]);
  const u = m[2].toLowerCase();
  const landUnit: LandAreaUnit = u.startsWith('bigh') || u === 'बीघा'
    ? 'bigha'
    : u.startsWith('hect') || u === 'ha' || u === 'हेक्टेयर'
    ? 'hectare'
    : u.startsWith('kanal') || u === 'कनाल'
    ? 'kanal'
    : u.startsWith('gunth') || u === 'गुंठा'
    ? 'guntha'
    : 'acre';
  return { landArea: val, landUnit };
}

export function extractPricePerUnit(normalized: string): number | undefined {
  // Prefer explicit currency/price markers: "1650 rupaye", "₹1700", "price 1700", "rate 1800", "@ 1700"
  const afterUnitPrice = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:₹|rs\.?|rupaye|rupees|rupaiye|रुपये|रुपए|per\s*(?:kg|quintal|tonne|ton|t)|\/\s*(?:kg|quintal|qtl|tonne|ton|t))\b/i
  );
  if (afterUnitPrice) return Number(afterUnitPrice[1]);

  const labeledPrice = normalized.match(
    /(?:price|rate|daam|bhav|kimat|₹|@|दाम|भाव|कीमत)\s*(?:is|hai|ko|se|:|=)?\s*(\d+(?:\.\d+)?)/i
  );
  if (labeledPrice) return Number(labeledPrice[1]);

  return undefined;
}

export function extractUpiId(text: string): string | undefined {
  const m = text.match(/\b([a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}(?:[a-zA-Z0-9]{0,8})?)\b/);
  return m ? m[1].toLowerCase() : undefined;
}

const KNOWN_LOCATIONS = [
  'Ghaziabad', 'Noida', 'Greater Noida', 'Meerut', 'Sangrur', 'Dhuri', 'Karnal',
  'Panipat', 'Ludhiana', 'Patiala', 'Hisar', 'Rohtak', 'Sonipat', 'Ambala',
  'Kurukshetra', 'Bathinda', 'Moga', 'Jalandhar', 'Amritsar', 'Muzaffarnagar',
  'Saharanpur', 'Bulandshahr', 'Hapur', 'Aligarh', 'Agra', 'Mathura', 'Lucknow',
  'Kanpur', 'Jaipur', 'Indore', 'Bhopal', 'Delhi', 'New Delhi', 'Faridabad', 'Gurugram',
];

export function extractLocation(text: string, userLocation?: string): string | undefined {
  if (/\b(my location|mere gaon|mera gaon|same location|profile location|mere shahar|apna gaon)\b/i.test(text)) {
    return userLocation || undefined;
  }

  for (const city of KNOWN_LOCATIONS) {
    if (new RegExp(`\\b${city}\\b`, 'i').test(text)) {
      return city;
    }
  }

  // Hindi/English postposition: "Ghaziabad se", "in Ghaziabad", "location Karnal"
  const preMatch = text.match(
    /(?:location|city|district|gaon|village|in|from|at|near|मेरा\s*गांव|से)\s+([a-zA-Z][a-zA-Z\s]{2,24})/i
  );
  if (preMatch) {
    const candidate = preMatch[1]
      .replace(/\b(mein|me|se|par|kar|do|hai|list|karni|bechna|rupaye|quintal|kg|tonne)\b.*/i, '')
      .trim();
    if (candidate.length >= 3) return candidate;
  }

  const postMatch = text.match(/\b([A-Z][a-zA-Z]{2,20})\s+(?:se|mein|me|district|village|city)\b/);
  if (postMatch && !/^(Meri|Mera|Mujhe|Price|Rate|Haan|Crop|Paddy|Wheat|Kar|Quintal|Kg|Tonne)$/i.test(postMatch[1])) {
    return postMatch[1];
  }

  return undefined;
}

export function isConfirmationMessage(text: string): boolean {
  const clean = text.trim().toLowerCase();
  if (!clean) return false;
  return /^(haan|han|ha|haan\s*ji|hanji|yes|yep|yeah|ok|okay|theek\s*hai|thik\s*hai|kar\s*do|kardo|haan\s*kar\s*do|haan\s*kardo|yes\s*confirm|confirm|proceed|approve|chalo|done|बिलकुल|हां|हाँ|जी|कर\s*दो|सही\s*है)[!.,\s]*$/i.test(clean)
    || /\b(haan\s*kar\s*do|confirm\s*&?\s*execute|yes\s*proceed|do\s*it\s*now)\b/i.test(clean);
}

export function isCancellationMessage(text: string): boolean {
  const clean = text.trim().toLowerCase();
  return /^(nahi|na|naa|no|cancel|mat\s*karo|ruko|chhodo|stop|band\s*karo|नहीं|मत\s*करो|रद्द)[!.,\s]*$/i.test(clean);
}

export function detectExplainTopic(text: string): 'payment_and_gps' | 'payment' | 'gps' | 'listing' | 'units' | 'general' | null {
  const isQuestion = /\b(kaise|kya|how|what|why|explain|samjhao|batao|bataiye|works|kaam|karti)\b/i.test(text);
  if (!isQuestion) return null;
  const hasPay = /(payment|escrow|paise|paisa|utr|upi|bank|kamai|settle)/i.test(text);
  const hasGps = /(gps|track|location|map|truck\s*kahan)/i.test(text);
  if (hasPay && hasGps) return 'payment_and_gps';
  if (hasPay) return 'payment';
  if (hasGps) return 'gps';
  if (/(bigha|quintal|kg|tonne|hectare|kanal|guntha|unit|tol)/i.test(text)) return 'units';
  if (/(list|sell|bech|buy|kharid|platform|strawsync|feature|madad|help)/i.test(text)) return 'general';
  return null;
}

export function buildExplanationReply(topic: string, lang: 'en' | 'hi'): string {
  if (topic === 'payment_and_gps') {
    return lang === 'hi'
      ? '1️⃣ **पेमेंट (Escrow Settlement):** खरीदार के ऑर्डर और ट्रक असाइन होने के बाद पैसा सुरक्षित एस्क्रो में लॉक होता है। डिलीवरी और तौल की पुष्टि होते ही **अधिकृत UTR नंबर** के साथ रकम सीधे किसान के **UPI ID या बैंक खाते** में क्रेडिट हो जाती है।\n2️⃣ **लाइव GPS ट्रैकिंग:** लॉजिस्टिक्स पार्टनर खेत से फैक्ट्री तक ट्रक की लाइव लोकेशन और `% रूट` अपडेट करते हैं, जिसे किसान और खरीदार दोनों **Leaflet नक्शे** पर रियल-टाइम देख सकते हैं।'
      : '1️⃣ **Payments (Escrow Settlement):** Once an order is accepted and assigned a truck, funds are protected via Escrow. Upon weighbridge delivery confirmation, an official **UTR receipt** is generated and payout credits directly to the Farmer\'s saved **UPI ID or Bank Account**.\n2️⃣ **Live GPS Tracking:** Logistics Partners broadcast real-time truck progress (`%`) and coordinates on an interactive **Leaflet OpenStreetMap** route visible to both Farmer and Buyer.';
  }
  if (lang === 'hi') {
    if (topic === 'payment') {
      return 'StrawSync में आपका पैसा **सुरक्षित एस्क्रो सिस्टम** से मिलता है: खरीदार के अनुरोध स्वीकार करने और ट्रक असाइन होने के बाद, खरीदार UPI या बैंक से एस्क्रो भुगतान करते हैं। डिलीवरी व तौल की पुष्टि होते ही **अधिकृत UTR नंबर** के साथ रकम सीधे किसान के सेव किए गए **UPI ID या बैंक खाते** में क्रेडिट हो जाती है। और यदि आप कहें *"Mera UPI ID save kar do"*, तो मैं अभी इसे अपडेट कर सकता हूँ।';
    }
    if (topic === 'gps') {
      return 'StrawSync में **लाइव GPS ट्रैकिंग** खेत से फैक्ट्री तक हर चरण दिखाती है: लॉजिस्टिक्स पार्टनर ट्रक नंबर के साथ लाइव लोकेशन और प्रगति (% रूट) ब्रॉडकास्ट करते हैं, जिसे किसान और खरीदार दोनों **Leaflet नक्शे** पर रियल-टाइम देख सकते हैं।';
    }
    if (topic === 'units') {
      return 'आप किसी भी भारतीय इकाई में फसल सूचीबद्ध कर सकते हैं — **Kg, Quintal (100 Kg) या Tonne (1,000 Kg)** में मात्रा दर्ज करें, और जमीन के लिए **Bigha, Acre, Hectare, Kanal, Guntha** (या **0**) चुनें। सिस्टम खुद ही सही टन और कुल रुपये जोड़ देता है।';
    }
    return 'मैं आपका **Kisan AI Copilot** हूँ! मैं आपकी फसल/पराली सूचीबद्ध करने (`CREATE_LISTING`), खरीदार के ऑर्डर स्वीकार करने, UPI ID सेव करने, खरीदारी अनुरोध भेजने, एस्क्रो पेमेंट सेटल करने, GPS स्थिति जांचने और उपज की गणना सहेजने में मदद कर सकता हूँ। कोई भी बदलाव करने से पहले मैं आपसे स्पष्ट अनुमति ज़रूर लूँगा।';
  }

  if (topic === 'payment') {
    return 'StrawSync uses a protected **Escrow Settlement** flow: once a Farmer accepts an order and Logistics assigns a truck, the Buyer funds Escrow via UPI, NetBanking, or NEFT/RTGS. On delivery & weighbridge verification, an official **UTR reference** is generated and funds credit directly to your saved **UPI ID or Bank Account**. Want me to save your UPI ID now?';
  }
  if (topic === 'gps') {
    return 'With **Live GPS Order Tracking**, Logistics Partners broadcast route progress (`%`) and live coordinates on an interactive **Leaflet OpenStreetMap** corridor from farmgate pickup to buyer plant gate, visible in real time to both Farmer and Buyer.';
  }
  if (topic === 'units') {
    return 'StrawSync supports **Kg, Quintal (100 Kg), and Metric Tonne** weights alongside Indian land units (**Acres, Bigha, Hectare, Kanal, Guntha**, including `0`), automatically normalizing tonnage and total `₹` payout.';
  }
  return 'I am your **StrawSync AI Copilot**! I can help Farmers list residue/produce, accept buyer requests, or save UPI payout details; help Buyers source biomass or settle Escrow; help Logistics update GPS & delivery; and calculate yields. Every Neon DB write shows a Permission Preview Card first before executing.';
}

export function detectRouteTarget(text: string): { path: string; label: string } | null {
  if (/(marketplace|baazaar|bazaar|mandi|browse supply)/i.test(text)) {
    return { path: '/buyer/marketplace', label: 'Buyer Marketplace' };
  }
  if (/(my\s*listings?|meri\s*listing|listings\s*page|fasal\s*suchi)/i.test(text)) {
    return { path: '/farmer/listings', label: 'Farmer Listings' };
  }
  if (/(farmer\s*orders|dispatch|mere\s*order)/i.test(text)) {
    return { path: '/farmer/orders', label: 'Farmer Orders' };
  }
  if (/(buyer\s*orders|purchase\s*orders)/i.test(text)) {
    return { path: '/buyer/orders', label: 'Buyer Orders' };
  }
  if (/(logistics|fleet|truck\s*dashboard)/i.test(text)) {
    return { path: '/logistics/dashboard', label: 'Logistics Dashboard' };
  }
  if (/(admin|oversight)/i.test(text)) {
    return { path: '/admin/dashboard', label: 'Admin Dashboard' };
  }
  if (/(dashboard|home|hub)/i.test(text)) {
    return { path: '/', label: 'Platform Overview' };
  }
  return null;
}

export function detectIntent(
  normalized: string,
  role?: UserRole
): AssistantActionType {
  if (
    /(payment\s*kaise|paise\s*kaise|how.*pay|how.*escrow|gps.*kaise|how.*gps|units?\s*kaise|kya\s*kar\s*sakte|help\s*me|madad)/i.test(
      normalized
    ) &&
    !/(settle|kar\s*do|bhej\s*do|save|update)/i.test(normalized)
  ) {
    return 'EXPLAIN_PLATFORM';
  }

  if (extractUpiId(normalized) || (/\bupi\b/i.test(normalized) && /(save|update|set|add|kar\s*do|badal)/i.test(normalized))) {
    return 'UPDATE_PAYOUT_UPI';
  }

  if (
    /(accept|reject|approve|decline|svikar|manjoor)/i.test(normalized) &&
    /(order|request|anurodh|offer|buyers?)/i.test(normalized)
  ) {
    return 'RESPOND_TO_ORDER';
  }

  if (
    /(settle|pay\s*&?\s*settle|release\s*(?:escrow|payment)|escrow\s*(?:pay|settle)|bhugtan|payment\s*kar)/i.test(
      normalized
    )
  ) {
    return 'SETTLE_ESCROW_PAYMENT';
  }

  if (
    role === 'logistics' ||
    (/\b(mark\s*deliver|deliver\s*kar|gps\s*(?:update|broadcast|advance|badha)|pickup\s*accept)\b/i.test(normalized) &&
      role !== 'farmer' &&
      role !== 'buyer')
  ) {
    if (/(deliver|gps|truck|assign|weighbridge|dispatch)/i.test(normalized) && !/(kahan|where|status|kaise)/i.test(normalized)) {
      return 'LOGISTICS_UPDATE';
    }
  }

  if (
    /\b(kahan\s*pahuncha|kahan\s*hai|where\s*is\s*my\s*order|order\s*status|meri\s*kamai|total\s*kamai|earnings|active\s*listings|kitni\s*listings|open\s+|go\s*to\s+|le\s*chalo|dikhao|navigate)\b/i.test(
      normalized
    )
  ) {
    return 'LIVE_QUERY_AND_NAVIGATE';
  }

  if (/(calculat|hisaab|hisab|estimat|kitne\s*paise\s*banenge|yield\s*estimate|save\s*calc)/i.test(normalized)) {
    return 'RUN_AND_SAVE_CALCULATION';
  }

  if (
    /(buy|purchase|kharid|kharidna|source|book\s*order|chahiye)/i.test(normalized) ||
    (role === 'buyer' && extractCropType(normalized) !== null && !/explain/i.test(normalized))
  ) {
    return 'CREATE_PURCHASE_REQUEST';
  }

  if (
    /(list|listing|sell|bech|bechna|बेच|सूची|लगाना|कमानी|karni\s*hai)/i.test(normalized) ||
    (extractCropType(normalized) !== null && (role === 'farmer' || role === 'admin' || !role))
  ) {
    return 'CREATE_LISTING';
  }

  return detectExplainTopic(normalized) ? 'EXPLAIN_PLATFORM' : 'LIVE_QUERY_AND_NAVIGATE';
}

export function buildCreateListingSummary(slots: Record<string, any>): {
  summaryFields: PreviewField[];
  tonnes: number;
  pricePerTonne: number;
  totalAmount: number;
  acres: number;
} {
  const cropType = (slots.cropType || 'paddy') as CropType;
  const coeff = CROP_COEFFICIENTS[cropType] || CROP_COEFFICIENTS.paddy;
  const qty = Number(slots.quantity) || 0;
  const unit = (slots.weightUnit || 'tonne') as WeightUnit;
  const pricePerUnit = Number(slots.pricePerUnit) || 0;
  const tonnes = toTonnesNlu(qty, unit);
  const pricePerTonne = pricePerUnitToPerTonneNlu(pricePerUnit, unit);
  const totalAmount = Math.round(qty * pricePerUnit);
  const landVal = Number(slots.landArea ?? 0);
  const landUnit = (slots.landUnit || 'acre') as LandAreaUnit;
  const acres = toAcresNlu(landVal, landUnit);

  const unitShort = unit === 'tonne' ? 't' : unit;
  const fields: PreviewField[] = [
    { label: 'Crop / Produce', value: coeff.cropName },
    { label: 'Quantity', value: `${formatWeightLabel(qty, unit)} (= ${tonnes.toFixed(2)} Tonnes)` },
    { label: 'Expected Rate', value: `${formatInr(pricePerUnit)}/${unitShort} (${formatInr(pricePerTonne)}/t)` },
    { label: 'Total Payout', value: formatInr(totalAmount) },
    { label: 'Location', value: String(slots.location || 'Farm Location') },
  ];
  if (landVal > 0 || slots.landArea !== undefined) {
    fields.push({ label: 'Land Area', value: `${landVal} ${landUnit} (${acres} Acres)` });
  }
  return { summaryFields: fields, tonnes, pricePerTonne, totalAmount, acres };
}
