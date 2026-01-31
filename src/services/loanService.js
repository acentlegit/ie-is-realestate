/**
 * Bank & Loan Matching
 * From intent-ai-nextjs-v2 – match banks/loans to intent budget
 */

/**
 * Match banks/loan options to intent (budget-driven)
 * @param {object} intent - Intent with payload.budget or extractedInfo.budget
 * @returns {Array<{bank, rate, maxTenure, maxAmount}>}
 */
export function matchBanks(intent) {
  const budget = intent?.payload?.budget ?? intent?.extractedInfo?.budget ?? intent?.budget;
  if (!budget || budget <= 0) return [];

  const base = [
    { bank: "SBI", rate: "8.4%", maxTenure: "30Y", maxAmount: Math.min(budget * 0.9, 50000000) },
    { bank: "HDFC", rate: "8.6%", maxTenure: "25Y", maxAmount: Math.min(budget * 0.85, 45000000) },
    { bank: "ICICI", rate: "8.5%", maxTenure: "25Y", maxAmount: Math.min(budget * 0.88, 48000000) },
  ];
  return base.map((b) => ({
    ...b,
    maxAmountL: (b.maxAmount / 100000).toFixed(0) + "L",
  }));
}
