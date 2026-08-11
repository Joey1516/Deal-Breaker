import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = 'johnvc~google-shopping-api-google-shopping-products-prices-deals';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;
// Haiku by default — this is a chatty, high-frequency feature, so cost-per-turn matters.
// Override with ANTHROPIC_MODEL in .env for higher quality (e.g. claude-sonnet-5).
const BROOK_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

function computeMedian(numbers) {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// The Apify actor only returns a Google Shopping redirect link, not the merchant's
// own page. For well-known retailers we can send the user straight to that store's
// own search results for the product instead of via Google — free, no extra API calls.
const STORE_SEARCH_URLS = [
  { match: /amazon/i, url: (q) => `https://www.amazon.com/s?k=${q}` },
  { match: /walmart/i, url: (q) => `https://www.walmart.com/search?q=${q}` },
  { match: /\btarget\b/i, url: (q) => `https://www.target.com/s?searchTerm=${q}` },
  { match: /best ?buy/i, url: (q) => `https://www.bestbuy.com/site/searchpage.jsp?st=${q}` },
  { match: /\bebay\b/i, url: (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}` },
  { match: /costco/i, url: (q) => `https://www.costco.com/CatalogSearch?keyword=${q}` },
  { match: /home ?depot/i, url: (q) => `https://www.homedepot.com/s/${q}` },
  { match: /lowe'?s/i, url: (q) => `https://www.lowes.com/search?searchTerm=${q}` },
  { match: /macy'?s/i, url: (q) => `https://www.macys.com/shop/search?keyword=${q}` },
  { match: /kohl'?s/i, url: (q) => `https://www.kohls.com/search.jsp?search=${q}` },
  { match: /newegg/i, url: (q) => `https://www.newegg.com/p/pl?d=${q}` },
  { match: /\betsy\b/i, url: (q) => `https://www.etsy.com/search?q=${q}` },
  { match: /sam'?s club/i, url: (q) => `https://www.samsclub.com/s/${q}` },
  { match: /wayfair/i, url: (q) => `https://www.wayfair.com/keyword.php?keyword=${q}` },
  { match: /\bibq\b|ikea/i, url: (q) => `https://www.ikea.com/us/en/search/?q=${q}` },
];

function resolveLink(storeName, title, fallbackLink) {
  const rule = STORE_SEARCH_URLS.find((r) => r.match.test(storeName));
  if (!rule) return { link: fallbackLink, linkType: 'google' };
  return { link: rule.url(encodeURIComponent(title)), linkType: 'store' };
}

// Cache identical (query, country) searches briefly so repeat lookups skip the
// ~20-30s Apify run entirely instead of paying that latency and cost again.
const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();

function getCached(store, key, ttl) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > ttl) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

async function fetchComparison(query, country, language) {
  const apifyUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;
  const apifyRes = await fetch(apifyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, gl: country, hl: language }),
  });

  if (!apifyRes.ok) {
    const text = await apifyRes.text();
    throw new Error(`Price lookup failed: ${text.slice(0, 200)}`);
  }

  const items = await apifyRes.json();
  const raw = items[0]?.shopping_results ?? [];

  const parsed = raw
    .filter((r) => typeof r.extracted_price === 'number' && r.extracted_price > 0 && r.source && r.title)
    .map((r) => {
      const { link, linkType } = resolveLink(r.source, r.title, r.product_link);
      return {
        title: r.title,
        store: r.source,
        price: r.extracted_price,
        displayPrice: r.price,
        oldPrice: r.extracted_old_price ?? null,
        rating: r.rating ?? null,
        reviews: r.reviews ?? null,
        delivery: r.delivery ?? null,
        link,
        linkType,
        thumbnail: r.thumbnail ?? null,
      };
    });

  // Google Shopping mixes in mismatched/junk listings (e.g. a $20 "offer" for a
  // $250 product from an obscure domain). Those aren't real deals, so drop prices
  // far below the median before ranking — a genuine best deal stays within a
  // plausible range of the pack, it doesn't undercut it by 5-10x.
  const median = computeMedian(parsed.map((r) => r.price));
  const results = (median ? parsed.filter((r) => r.price >= median * 0.5) : parsed).sort(
    (a, b) => a.price - b.price
  );

  const bestDeal = results[0] ?? null;
  return { query, country, resultCount: results.length, bestDeal, results };
}

// Product listings only ever come with a store *name* (e.g. "PayMore Northgate"),
// never a real address, so "distance" is inherently a best-effort guess: we geocode
// the seller name itself and hope it resolves to their actual location. National
// chains (Amazon, Walmart, Best Buy...) are skipped entirely — there's no single
// meaningful "distance" to an online retailer with thousands of locations/warehouses.
const EARTH_RADIUS_MILES = 3958.8;
const NEARBY_MILES = 15;
const MAX_GEOCODE_ATTEMPTS_PER_REQUEST = 8;
const storeGeocodeCache = new Map(); // lowercased store name -> {lat, lon} | null

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isKnownChain(storeName) {
  return STORE_SEARCH_URLS.some((r) => r.match.test(storeName));
}

async function geocodeStoreName(storeName) {
  const key = storeName.trim().toLowerCase();
  if (storeGeocodeCache.has(key)) return storeGeocodeCache.get(key);
  try {
    const data = await nominatimFetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(storeName)}`
    );
    const hit = data[0]
      ? { lat: Number(data[0].lat), lon: Number(data[0].lon), countryCode: data[0].address?.country_code ?? null }
      : null;
    storeGeocodeCache.set(key, hit);
    return hit;
  } catch {
    storeGeocodeCache.set(key, null);
    return null;
  }
}

async function annotateWithDistance(payload, userLat, userLon, userCountry) {
  if (userLat == null || userLon == null) return payload;

  const uniqueStores = [...new Set(payload.results.map((r) => r.store))].filter(
    (name) => !isKnownChain(name)
  );

  const locationByStore = new Map();
  let attempts = 0;
  for (const name of uniqueStores) {
    const key = name.trim().toLowerCase();
    if (storeGeocodeCache.has(key)) {
      locationByStore.set(name, storeGeocodeCache.get(key));
      continue;
    }
    if (attempts >= MAX_GEOCODE_ATTEMPTS_PER_REQUEST) break;
    attempts++;
    locationByStore.set(name, await geocodeStoreName(name));
  }

  // A bare store name is a weak search query — it can match a same-named place on
  // the other side of the world (e.g. "Woot" resolved to a village in Germany for
  // a US search). Discarding any match outside the user's own search country is a
  // cheap, effective filter against that class of false positive.
  const withDistance = payload.results.map((r) => {
    const loc = locationByStore.get(r.store);
    const countryOk = !userCountry || !loc?.countryCode || loc.countryCode.toLowerCase() === userCountry.toLowerCase();
    if (!loc || !countryOk) return { ...r, distanceMiles: null };
    return { ...r, distanceMiles: Math.round(haversineMiles(userLat, userLon, loc.lat, loc.lon) * 10) / 10 };
  });

  const nearby = withDistance
    .filter((r) => r.distanceMiles != null && r.distanceMiles <= NEARBY_MILES)
    .sort((a, b) => a.price - b.price);
  const rest = withDistance
    .filter((r) => !(r.distanceMiles != null && r.distanceMiles <= NEARBY_MILES))
    .sort((a, b) => a.price - b.price);

  const results = [...nearby, ...rest];
  return { ...payload, results, bestDeal: results[0] ?? null, nearbyCount: nearby.length };
}

// Shared by /api/compare and Brook's search_prices tool, so an identical query is
// only ever a fresh Apify run once per 15-minute window — regardless of whether it
// came from the search bar or from a conversation, and regardless of which one asked first.
async function getComparisonCached(query, country, language) {
  const cacheKey = `${query.trim().toLowerCase()}|${country}`;
  const cached = getCached(cache, cacheKey, CACHE_TTL_MS);
  if (cached) return { payload: cached, cached: true };

  const payload = await fetchComparison(query, country, language);
  cache.set(cacheKey, { data: payload, time: Date.now() });
  return { payload, cached: false };
}

app.post('/api/compare', async (req, res) => {
  const { query, country = 'us', language = 'en', lat, lon } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'query is required' });
  }
  if (!APIFY_TOKEN) {
    return res.status(500).json({ error: 'Server is missing APIFY_TOKEN. Add it to backend/.env' });
  }

  try {
    const { payload, cached } = await getComparisonCached(query, country, language);
    const annotated = await annotateWithDistance(payload, lat, lon, country);
    res.json({ ...annotated, cached });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Price lookup failed', detail: err.message });
  }
});

// A handful of popular searches used to surface a "what's trending right now"
// grid on the home screen. Each one is a real, live Apify/Google Shopping lookup —
// but running all of them is expensive (~20-30s and a paid run each), so results
// are cached far longer than a single product search.
const TRENDING_QUERIES = [
  'wireless earbuds',
  'running shoes',
  'smart watch',
  'air fryer',
  'gaming headset',
  'coffee maker',
];
const TRENDING_CACHE_TTL_MS = 45 * 60 * 1000;
const trendingCache = new Map();

app.get('/api/trending', async (req, res) => {
  const country = req.query.country || 'us';
  const language = req.query.language || 'en';

  if (!APIFY_TOKEN) {
    return res.status(500).json({ error: 'Server is missing APIFY_TOKEN. Add it to backend/.env' });
  }

  const cacheKey = country;
  const cached = getCached(trendingCache, cacheKey, TRENDING_CACHE_TTL_MS);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    const settled = await Promise.allSettled(
      TRENDING_QUERIES.map((q) => fetchComparison(q, country, language))
    );

    const deals = settled
      .map((r, i) => (r.status === 'fulfilled' && r.value.bestDeal ? { query: TRENDING_QUERIES[i], bestDeal: r.value.bestDeal } : null))
      .filter(Boolean);

    const payload = { country, deals };
    trendingCache.set(cacheKey, { data: payload, time: Date.now() });
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Trending deals lookup failed', detail: err.message });
  }
});

// Nominatim (OpenStreetMap) requires a real User-Agent identifying the app and asks
// for at most ~1 request/sec — browsers can't set a custom User-Agent from JS, and a
// shared client-side rate limit isn't enforceable across multiple users anyway, so
// both geocoding calls are proxied through here instead of hit directly from the browser.
const NOMINATIM_USER_AGENT = 'DealBreakerApp/1.0 (best-deal-agent price comparison app)';
let lastNominatimCallAt = 0;

async function nominatimFetch(url) {
  const wait = Math.max(0, 1100 - (Date.now() - lastNominatimCallAt));
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastNominatimCallAt = Date.now();

  const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim request failed: ${res.status}`);
  return res.json();
}

app.get('/api/geocode/reverse', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }
  try {
    const data = await nominatimFetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`
    );
    const address = data.address ?? {};
    res.json({
      displayName: data.display_name ?? null,
      countryCode: address.country_code ?? null,
      countryName: address.country ?? null,
      city: address.city || address.town || address.village || address.suburb || null,
      region: address.state ?? null,
      postcode: address.postcode ?? null,
      road: address.road ?? null,
      houseNumber: address.house_number ?? null,
    });
  } catch (err) {
    res.status(502).json({ error: 'Reverse geocoding failed', detail: err.message });
  }
});

app.get('/api/geocode/search', async (req, res) => {
  const q = req.query.q;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'q is required' });
  }
  try {
    const data = await nominatimFetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`
    );
    res.json({
      suggestions: data.map((d) => ({
        displayName: d.display_name,
        lat: d.lat,
        lon: d.lon,
        countryCode: d.address?.country_code ?? null,
      })),
    });
  } catch (err) {
    res.status(502).json({ error: 'Address search failed', detail: err.message });
  }
});

// ---------- Brook: conversational shopping assistant ----------

const BROOK_SYSTEM_PROMPT = `You are Brook, a friendly, conversational shopping assistant built into the Deal Breaker app.

Personality: warm, concise, and natural — talk like a helpful friend who's good with deals, not a search engine reading out results. Keep replies short and spoken-friendly (this gets read aloud by text-to-speech), usually 1-3 sentences unless the user asks for a full list.

You have a tool called search_prices that searches real e-commerce stores and returns actual current prices, ratings, and store links for a product. Use it whenever the user wants to find, compare, or check the price of something new. Do NOT call it again for a pure follow-up you can already answer from results you already have in this conversation (e.g. "which one was cheapest" once you've already searched).

Ground every price, store name, or product fact you say in real search_prices results — never invent or guess a number or store you haven't actually retrieved. If a search comes back empty or fails, say so honestly instead of making something up.

When a search_prices call finds results, don't just recite raw data — introduce it naturally first (e.g. "Here are the deals I found for that" or "Got it, here's the best one I found"), then mention the standout price/store conversationally. The full result list is shown visually in the app, so you don't need to read out every option — just talk about the highlight.

Remember what the user has told you earlier in this conversation (their preferences, past searches, budget mentioned, etc.) and use it to make your suggestions feel personal — proactively recommend or follow up when it's natural to ("since you were looking at headphones earlier, want me to check earbuds too?").`;

const SEARCH_PRICES_TOOL = {
  name: 'search_prices',
  description:
    'Search real e-commerce stores for a product and return current prices, ratings, delivery info, and store links. Use this whenever the user wants to find or compare prices for a product.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The product to search for, e.g. "Sony WH-1000XM5 headphones"' },
    },
    required: ['query'],
  },
};

const MAX_TOOL_ROUNDS = 4;

app.post('/api/brook/chat', async (req, res) => {
  const { messages, country = 'us', language = 'en', lat, lon, savedDealsSummary } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }
  if (!anthropic) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it to backend/.env' });
  }

  let systemPrompt = BROOK_SYSTEM_PROMPT + `\n\nThe user's current region is "${country}".`;
  if (savedDealsSummary) {
    systemPrompt += `\n\nThe user's saved deals so far: ${savedDealsSummary}`;
  }

  try {
    const conversation = [...messages];
    let searchResults = null;
    let finalReply = null;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: BROOK_MODEL,
        max_tokens: 700,
        system: systemPrompt,
        tools: [SEARCH_PRICES_TOOL],
        messages: conversation,
      });

      const toolUse = response.content.find((b) => b.type === 'tool_use');

      if (response.stop_reason === 'tool_use' && toolUse) {
        conversation.push({ role: 'assistant', content: response.content });

        let toolResultPayload;
        try {
          const { payload } = await getComparisonCached(toolUse.input.query, country, language);
          const annotated = await annotateWithDistance(payload, lat, lon, country);
          searchResults = annotated;
          toolResultPayload = {
            resultCount: annotated.resultCount,
            bestDeal: annotated.bestDeal,
            topResults: annotated.results.slice(0, 8),
          };
        } catch (err) {
          toolResultPayload = { error: `Search failed: ${err.message}` };
        }

        conversation.push({
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(toolResultPayload) }],
        });
        continue;
      }

      const textBlock = response.content.find((b) => b.type === 'text');
      finalReply = textBlock ? textBlock.text : "I'm not sure how to respond to that.";
      break;
    }

    res.json({
      reply: finalReply ?? "Sorry, I got a bit stuck there — could you try asking that again?",
      results: searchResults?.results ?? null,
      bestDeal: searchResults?.bestDeal ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Brook is having trouble responding', detail: err.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
