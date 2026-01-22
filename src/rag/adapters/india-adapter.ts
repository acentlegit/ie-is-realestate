/**
 * India RAG Adapter
 * 
 * Provides India-specific knowledge retrieval for UIP.
 * Uses Indian property databases, RERA data, and market sources.
 */

import { BaseRAGAdapter } from "../base-adapter";
import { RAGQuery, RAGResponse } from "../interfaces";
import { OllamaConfig } from "../ollama-client";
import { VectorStoreConfig } from "../vector-store";

export class IndiaRAGAdapter extends BaseRAGAdapter {
  constructor(ollamaConfig?: OllamaConfig, vectorStoreConfig?: VectorStoreConfig) {
    super("IN", "India RAG Adapter", "1.0.0", ollamaConfig, vectorStoreConfig);
  }

  protected getSupportedIntentTypes(): string[] {
    return ["BUY_PROPERTY", "SELL_PROPERTY", "RENT_PROPERTY", "VALUATION"];
  }

  protected buildSystemPrompt(): string {
    return `You are a knowledge retrieval assistant for the Universal Intent Platform, specialized in Indian real estate.

Country-Specific Context:
- Use Indian property databases and government sources
- Reference RERA (Real Estate Regulatory Authority) regulations
- Use INR (₹) currency format
- Consider Indian market trends and city-specific data
- Reference Indian legal frameworks (RERA, FEMA, state-specific laws)

Data Sources Priority:
1. RERA state portals (e.g., RERA Andhra Pradesh, RERA Maharashtra)
2. Municipal corporation records
3. NHB (National Housing Bank) indices
4. Local market reports and property portals (99acres, MagicBricks)
5. Government land registry information

Output Requirements:
- All prices in INR (lakhs/crores format)
- Reference Indian cities and states correctly
- Cite RERA registration when relevant
- Include Indian market trends (tier-1, tier-2, tier-3 cities)
- Use Indian date formats and legal terminology

Remember:
- You provide ADVISORY information only
- You do NOT make compliance decisions (Compliance Engine does)
- You do NOT select agents (Decision Engine does)
- All information must be factual and source-cited`;
  }

  async query(query: RAGQuery): Promise<RAGResponse> {
    // Validate country
    if (query.country !== "IN" && query.country !== "INDIA") {
      throw new Error(`India RAG Adapter only supports country "IN", got "${query.country}"`);
    }

    // Execute query using base class method
    return await this.executeQuery(query);
  }
}
