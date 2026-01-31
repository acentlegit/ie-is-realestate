/**
 * Confidence Calibration + Fallback
 * From intent-ai-nextjs-v2 – score 0–100 from intent completeness
 */

/**
 * Calibrate confidence score (0–100) from intent fields
 * @param {object} intent - Intent or LLaMA-parsed shape
 * @returns {number} 0–100
 */
export function calibrateConfidence(intent) {
  if (!intent) return 0;
  const p = intent.payload || intent;
  let score = 40;
  if (p.location || intent.extractedInfo?.location || intent.location) score += 20;
  if (p.budget || intent.extractedInfo?.budget || intent.budget) score += 25;
  if (p.bedrooms || p.preferences?.length) score += 15;
  return Math.min(100, score);
}
