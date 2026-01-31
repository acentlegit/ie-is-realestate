/**
 * Intent Refinement Prompts
 * From intent-ai-nextjs-v2 – ask user for more detail when confidence is low
 */

/**
 * Suggest a refinement question based on missing or weak intent fields
 * @param {object} intent - Intent object (engine or LLaMA shape)
 * @returns {string|null} - Prompt to show user, or null if intent is complete enough
 */
export function getRefinementPrompt(intent) {
  const payload = intent?.payload || intent || {};
  const loc = payload.location ?? intent?.extractedInfo?.location ?? intent?.location;
  const budget = payload.budget ?? intent?.extractedInfo?.budget ?? intent?.budget;
  const prefs = payload.preferences ?? intent?.preferences;

  if (!budget) return "What is your approximate budget? (e.g. 50L, 1 crore)";
  if (!loc || (typeof loc === "string" && loc.toLowerCase().includes("unknown"))) {
    return "Which city or locality are you looking at? (e.g. Vizag, Mumbai, Vijayawada)";
  }
  if (!prefs || (Array.isArray(prefs) && prefs.length === 0)) {
    return "Could you share one more preference? (e.g. near metro, schools, rental yield for investment)";
  }
  return null;
}
