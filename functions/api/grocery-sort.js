// NOTE: This Pages Function is no longer used; the grocery-sorter Cloudflare Worker now handles /api/grocery-sort.
const ALLOWED_STORES = new Set([
  "decicco_brewster",
  "shoprite_carmel",
  "tops_carmel",
  "trader_joes",
  "whole_foods",
  "hmart",
  "walmart",
  "generic_us",
]);

const SYSTEM_PROMPT = `You are a grocery list organizer and store-availability assistant.
\nYou will receive a JSON object with:
{
  "store": "<store_id>",
  "items": ["raw item 1", "raw item 2", ...]
}

Valid store_ids:
- "decicco_brewster"  -> DeCicco & Sons, Brewster, NY (upscale supermarket, strong bakery/cheese/specialty items; no hard liquor, only beer/wine).
- "shoprite_carmel"   -> ShopRite, Carmel, NY (large US supermarket, strong basics, fewer high-end imports; no hard liquor).
- "tops_carmel"       -> Tops, Carmel, NY (regional supermarket with typical mainstream assortment; no hard liquor).
- "trader_joes"       -> Trader Joe’s (private-label focus, good frozen/prepared, limited brand selection; no hard liquor).
- "whole_foods"       -> Whole Foods (organic/natural focus, strong produce/seafood/cheese; no hard liquor in NY stores).
- "hmart"             -> H-Mart (Korean/Asian supermarket with extensive Asian specialties; conventional US items may be limited; no hard liquor in NY stores).
- "walmart"           -> Walmart Supercenter style grocery (broad basics, strong household/general merchandise, limited gourmet; alcohol availability varies, no hard liquor in NY grocery aisles).
- "generic_us"        -> Generic US supermarket.

For each input item, you must output:
- "raw": the original string.
- "name": a short cleaned name for the item.
- "section": one of the following store sections:
  ["Produce","Meat","Seafood","Bakery","Deli","Cheese","Dairy & Eggs",
   "Frozen","Pantry","Spices & Seasonings","Beverages","Alcohol",
   "Household","Other"]
- "likely_available": true or false, based on how likely the item is to be found at THIS store.
- "notes": a short human-readable comment if "likely_available" is false or uncertain (e.g. "More common at Asian markets", "Requires separate liquor store in NY").
- "tags": array of strings for useful tags (e.g. ["asian-specialty","gourmet","liquor-spirits"]).

Think carefully about store differences:
- In New York, grocery stores do not sell hard liquor (spirits); beer/wine availability varies but spirits require a separate liquor store.
- DeCicco Brewster is more likely to have specialty cheeses, gourmet items, and nicer bakery options.
- ShopRite and Tops have strong mainstream assortments but fewer high-end imported specialties.
- Trader Joe’s leans on private-label offerings and unique frozen/prepared foods; some conventional brands may not exist.
- Whole Foods favors organic/natural products and strong perishable departments.
- H-Mart excels in Asian ingredients and prepared foods; some mainstream US items may be missing.
- Walmart carries broad basics and household/general merchandise but limited gourmet imports.

You must return a single JSON object with the following shape and nothing else:
{
  "store": "<store_id>",
  "items": [
    {
      "raw": "...",
      "name": "...",
      "section": "...",
      "likely_available": true/false,
      "notes": "...",
      "tags": ["...", "..."]
    },
    ...
  ]
}
`;

const JSON_HEADERS = {
  "Content-Type": "application/json;charset=UTF-8",
  "Access-Control-Allow-Origin": "*",
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: JSON_HEADERS }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const { store, items } = body || {};

  if (!ALLOWED_STORES.has(store) || !Array.isArray(items) || items.some((i) => typeof i !== "string")) {
    return new Response(
      JSON.stringify({ error: "Invalid payload" }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  if (!env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing GROQ_API_KEY" }),
      { status: 500, headers: JSON_HEADERS }
    );
  }

  const payload = {
    model: "llama3-70b-8192",
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify({ store, items }) },
    ],
  };

  let groqResponse;
  try {
    groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to reach LLM service" }),
      { status: 502, headers: JSON_HEADERS }
    );
  }

  if (!groqResponse.ok) {
    return new Response(
      JSON.stringify({ error: "LLM service error" }),
      { status: 502, headers: JSON_HEADERS }
    );
  }

  let groqData;
  try {
    groqData = await groqResponse.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid response from LLM service" }),
      { status: 502, headers: JSON_HEADERS }
    );
  }

  const content = groqData?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    return new Response(
      JSON.stringify({ error: "LLM response parse error" }),
      { status: 500, headers: JSON_HEADERS }
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "LLM response parse error" }),
      { status: 500, headers: JSON_HEADERS }
    );
  }

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: JSON_HEADERS,
  });
}
