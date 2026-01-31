/**
 * Investor ROI Engine
 * From intent-ai-nextjs-v2 – gross yield, appreciation, exit horizon
 */

/**
 * Calculate ROI metrics for investment intent
 * @param {object} intent - Intent with location, budget
 * @returns {{ grossYield, appreciation, exitHorizon, price, annualRent } | null}
 */
export function calculateROI(intent) {
  const budget = intent?.payload?.budget ?? intent?.extractedInfo?.budget ?? intent?.budget;
  const loc = intent?.payload?.location ?? intent?.extractedInfo?.location ?? intent?.location;

  if (!budget || budget <= 0) return null;

  // Simple heuristic: ~5–6% gross yield, 6–8% appreciation for Indian metros
  const price = budget;
  const yieldPct = loc ? 5.5 : 5;
  const annualRent = Math.round((price * yieldPct) / 100);
  const grossYield = (yieldPct + Math.random() * 1).toFixed(2) + "%";
  const appreciation = "6–8%";
  const exitHorizon = "5–7 years";

  return {
    grossYield,
    appreciation,
    exitHorizon,
    price,
    annualRent,
    annualRentFormatted: "₹" + (annualRent / 100000).toFixed(1) + "L",
  };
}
