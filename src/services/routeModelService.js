/**
 * Buyer vs Investor Routing
 * From intent-ai-nextjs-v2 – route model by intent type
 */

/**
 * Route to buyer or investor flow from user text / intent type
 * @param {string} text - Raw user input
 * @param {object} intent - Parsed intent (optional)
 * @returns {"buyer" | "investor"}
 */
export function routeModel(text, intent) {
  const t = (text || "").toLowerCase();
  const type = (intent?.type || intent?.payload?.intentType || "").toUpperCase();

  if (type === "INVEST_PROPERTY") return "investor";
  if (t.includes("invest") || t.includes("rental yield") || t.includes("roi") || t.includes("rent out")) {
    return "investor";
  }
  return "buyer";
}
