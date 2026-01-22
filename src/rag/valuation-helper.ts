/**
 * Valuation Helper
 * 
 * Based on pattern from real-estate-intent-rag-platform-v3/core/valuation_engine.py
 * 
 * Provides statistical calculations for valuation hints in RAG responses.
 */

export interface ComparableProperty {
  price_psf?: number;      // Price per square foot
  price?: number;          // Total price
  area?: number;           // Area in square feet
  location?: string;
  [key: string]: any;
}

export interface ValuationResult {
  estimate: number;
  confidence_low: number;
  confidence_high: number;
  median: number;
  std_dev: number;
  sample_size: number;
}

/**
 * Calculate valuation from comparable properties
 * 
 * Uses median and standard deviation for robust estimation.
 * Based on Python valuation_engine.py pattern.
 */
export class ValuationHelper {
  /**
   * Estimate property value from comparables
   */
  static estimate(comps: ComparableProperty[]): ValuationResult {
    if (comps.length === 0) {
      throw new Error("No comparable properties provided");
    }

    // Extract prices (prefer price_psf if available, otherwise total price)
    const prices = comps
      .map((comp) => {
        if (comp.price_psf) {
          return comp.price_psf;
        }
        if (comp.price && comp.area) {
          return comp.price / comp.area;
        }
        return comp.price;
      })
      .filter((price): price is number => price !== undefined && !isNaN(price));

    if (prices.length === 0) {
      throw new Error("No valid prices found in comparables");
    }

    // Calculate statistics
    const sorted = [...prices].sort((a, b) => a - b);
    const median = this.median(sorted);
    const stdDev = this.standardDeviation(prices, median);
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    return {
      estimate: median, // Use median as estimate (more robust than mean)
      confidence_low: Math.max(0, median - stdDev),
      confidence_high: median + stdDev,
      median: median,
      std_dev: stdDev,
      sample_size: prices.length,
    };
  }

  /**
   * Calculate median
   */
  private static median(sorted: number[]): number {
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Calculate standard deviation
   */
  private static standardDeviation(values: number[], mean: number): number {
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Format valuation result for RAG response
   */
  static formatForRAG(
    result: ValuationResult,
    currency: string = "USD",
    unit: string = "sqft"
  ): {
    estimated_range: string;
    factors: string[];
    methodology: string;
    confidence: number;
  } {
    const formatCurrency = (amount: number) => {
      if (currency === "INR") {
        if (amount >= 10000000) {
          return `₹${(amount / 10000000).toFixed(2)} crores/${unit}`;
        }
        return `₹${(amount / 100000).toFixed(2)} lakhs/${unit}`;
      }
      return `$${amount.toLocaleString()}/${unit}`;
    };

    const confidence = Math.min(
      1.0,
      Math.max(0.0, 1.0 - result.std_dev / result.median)
    );

    return {
      estimated_range: `${formatCurrency(
        result.confidence_low
      )} - ${formatCurrency(result.confidence_high)}`,
      factors: [
        `Based on ${result.sample_size} comparable properties`,
        `Median price: ${formatCurrency(result.median)}`,
        `Standard deviation: ${formatCurrency(result.std_dev)}`,
      ],
      methodology: "Comparable sales analysis using median and standard deviation",
      confidence: confidence,
    };
  }
}
