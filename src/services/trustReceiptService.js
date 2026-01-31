/**
 * Trust Receipt (Certification Gate)
 * From intent-ai-nextjs-v2 – generate trust receipt from intent + compliance
 */

/**
 * Build Trust Receipt for board-room / certification gate
 * @param {object} intent - Current intent
 * @param {object} compliance - Compliance result (decision, reason, checks)
 * @param {object} opts - { loans, roi, routeModel }
 * @returns {object} Trust receipt payload
 */
export function generateTrustReceipt(intent, compliance, opts = {}) {
  const ts = new Date().toISOString();
  const payload = intent?.payload || {};
  const loc = payload.location ?? intent?.extractedInfo?.location ?? "—";
  const budget = payload.budget
    ? "₹" + (payload.budget / 100000).toFixed(0) + "L"
    : "—";

  const checks = [
    { id: "intent", label: "Intent Captured", status: intent ? "OK" : "PENDING" },
    { id: "rera", label: "RERA / Regulatory", status: compliance?.decision === "ALLOW" ? "OK" : compliance ? "REVIEW" : "PENDING" },
    { id: "ec", label: "Encumbrance / Title", status: compliance?.decision === "ALLOW" ? "OK" : "PENDING" },
  ];
  if (opts.loans?.length) {
    checks.push({ id: "loan", label: "Bank / Loan Match", status: "OK" });
  }
  if (opts.roi) {
    checks.push({ id: "roi", label: "Investor ROI", status: "OK" });
  }

  return {
    generatedAt: ts,
    intentType: intent?.type || "BUY_PROPERTY",
    location: loc,
    budget,
    checks,
    complianceDecision: compliance?.decision ?? "PENDING",
    complianceReason: compliance?.reason ?? null,
    routeModel: opts.routeModel || "buyer",
  };
}
