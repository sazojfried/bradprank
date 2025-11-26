// Cloudflare Worker: grocery-sorter
// Handles POST /api/grocery-sort with { store, raw_text }

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
You will receive a JSON object with:
{
  "store": "<store_id>",
  "raw_text": "<full messy text the user pasted>"
}

Valid store_ids and profiles:

- "decicco_brewster"
    → DeCicco & Sons, Brewster NY.
      Upscale supermarket with excellent bakery, great cheese section, gourmet imports,
      specialty items, and craft beer. Does NOT sell spirits.

- "shoprite_carmel"
    → ShopRite, Carmel NY.
      Large traditional supermarket. Very good for basics, pantry items, household goods,
      deli, and frozen foods. Fewer high-end gourmet imports. No spirits.

- "tops_carmel"
    → Tops Friendly Markets, Carmel NY.
      Strong for mainstream groceries, snacks, pantry staples, dairy, and produce.
      Weaker for specialty cheeses, upscale bakery, and international gourmet imports.
      No spirits.

- "trader_joes"
    → Trader Joe’s (generic U.S. profile).
      Inventory is mostly Trader Joe’s private-label.
      GREAT at prepared foods, snacks, frozen meals, and produce.
      WEAK at:
        - branded mainstream products (e.g. Hellmann's mayo, Cheerios),
        - very specific brand requests,
        - large spice selection.
      Alcohol selection depends on state; NO spirits in NY.

- "whole_foods"
    → Whole Foods Market (generic U.S. profile).
      Strong organic produce, specialty and imported products, natural/organic brands,
      large cheese section, many gluten-free/vegan options.
      Middle or weak for cheap mainstream brands and bulk non-organic items.
      Beer and wine in some states; NO spirits in NY.

- "hmart"
    → H-Mart (Korean / pan-Asian supermarket).
      Extremely strong for Asian produce, noodles, sauces, spices, dumplings,
      frozen Asian foods, seafood, and specialty Asian snacks.
      Weak for mainstream U.S. brands and classic American products
      (e.g. many breakfast cereals, brand-specific U.S. snacks, some household items).

- "walmart"
    → Walmart Supercenter (generic U.S. profile).
      Very strong for mainstream grocery brands, snacks, pantry goods, frozen foods,
      general household items, and non-food merchandise.
      Weaker for high-end gourmet cheeses, artisanal bakery, and very niche imports.
      Alcohol selection depends on state; NO spirits in NY.

- "generic_us"
    → A typical U.S. supermarket (balanced profile).

Split raw_text into distinct grocery items. Use sensible boundaries: newlines, commas, semicolons, slashes, or natural breaks (including the word "and" when appropriate). Treat "potato lemon whisky" as three separate items unless it is obviously a single product. Preserve multi-word products like "di bruno bros cheese", "vanilla greek yogurt", or "frozen chicken thighs". Do NOT invent items not present in raw_text.

For each item, you must output:
- "raw": the original string.
- "name": a short cleaned name.
- "section": one of:
  ["Produce","Meat","Seafood","Bakery","Deli","Cheese","Dairy & Eggs",
   "Frozen","Pantry","Spices & Seasonings","Beverages","Alcohol",
   "Household","Other"]

- "likely_available": true or false based on the SELECTED store.
- "notes": only if likely_available is false or uncertain.
- "tags": optional tags such as:
    ["gourmet","asian-specialty","imported","trader-joes-incompatible",
     "spirits","brand-specific","organic","budget","mainstream"]

Guidance:

• Spirits (hard liquor):
    - In NY, grocery stores (including DeCicco, ShopRite, Tops, Trader Joe's,
      Whole Foods, H-Mart, Walmart) do NOT sell spirits.
    - Mark items clearly referring to whiskey, vodka, rum, gin, tequila, etc.
      as likely_available = false and notes like:
      "Spirits require a separate liquor store in NY."
      Tag them with ["spirits"].

• Trader Joe’s:
    - Branded mainstream products are often unavailable.
      Example: "Rao’s marinara", "Coca-Cola", "Cheerios".
      Mark as unlikely and note that Trader Joe’s mainly sells its own brands.
    - Many cheeses and specialty snacks are available.
    - Excellent frozen prepared foods.

• Tops vs ShopRite:
    - Both good for basics.
    - ShopRite usually has slightly better variety in specialty items.
    - Tops has more limited gourmet imports and cheese, so treat rare imports as uncertain.

• Whole Foods:
    - Strong assumption of organic/natural brands.
    - Excellent for organic produce, specialty flours, plant milks, fancy cheeses, etc.
    - Weak for cheap mainstream brands or bulk non-organic items.
    - Many conventional items are still present; use reasonable judgment.

• H-Mart:
    - Very strong for Asian sauces (soy sauce, gochujang, fish sauce, etc.),
      rice, noodles, tofu, Asian vegetables, dumplings, seafood.
    - Weak for non-Asian mainstream brands (e.g. specific American cereals, snacks).
    - Many American basics (milk, eggs, some produce) are still available.

• Walmart:
    - Assume most mainstream U.S. groceries and snacks are available.
    - Fewer fancy imports and high-end artisanal products.

Output:

A single JSON object:
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
Respond with ONE raw JSON object only.
Do NOT include backticks, code fences, or any explanatory text.
`;

const JSON_HEADERS = {
  "Content-Type": "application/json;charset=UTF-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

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

    const { store, raw_text } = body || {};

    if (!ALLOWED_STORES.has(store) || typeof raw_text !== "string" || !raw_text.trim()) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (!env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing GROQ_API_KEY in Worker environment" }),
        { status: 500, headers: JSON_HEADERS }
      );
    }

    const payload = {
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ store, raw_text }) },
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
      const text = await groqResponse.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "LLM service error", details: text }),
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
        JSON.stringify({ error: "LLM response parse error (no content)" }),
        { status: 500, headers: JSON_HEADERS }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "LLM response parse error (bad JSON)" }),
        { status: 500, headers: JSON_HEADERS }
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: JSON_HEADERS,
    });
  },
};
