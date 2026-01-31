/**
 * LLaMA / OpenAI-compatible Intent Parsing
 * From intent-ai-llama + intent-ai-nextjs-v2
 * Use when VITE_USE_LLAMA=true or as fallback when Intent Engine is unavailable
 */

const LLAMA_ENDPOINT = import.meta.env.VITE_LLAMA_ENDPOINT || "https://api.groq.com/openai/v1/chat/completions";
const LLAMA_API_KEY = import.meta.env.VITE_LLAMA_API_KEY || "";
const USE_LLAMA = import.meta.env.VITE_USE_LLAMA === "true";

const SYSTEM_PROMPT = `Extract real estate intent as strict JSON with these keys only:
{
  "type": "BUY_PROPERTY" | "SELL_PROPERTY" | "RENT_PROPERTY" | "INVEST_PROPERTY" | "VERIFY_PROPERTY",
  "location": "city or area name",
  "budget": number in rupees,
  "bedrooms": number or null,
  "preferences": ["metro", "schools", "commercial"] or []
}
Return only valid JSON, no other text.`;

/**
 * Parse intent using LLaMA/Groq (OpenAI-compatible) API
 * @param {string} text - User input
 * @returns {Promise<{type, location, budget, bedrooms, preferences}>}
 */
export async function parseIntentWithLLaMA(text) {
  if (!USE_LLAMA || !LLAMA_API_KEY) {
    return null;
  }
  try {
    const res = await fetch(LLAMA_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LLAMA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_LLAMA_MODEL || "llama3-70b-8192",
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "{}";
    // Handle markdown code blocks
    const jsonStr = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn("[LLaMA Intent] Parse failed:", e);
    return null;
  }
}

export { USE_LLAMA };
