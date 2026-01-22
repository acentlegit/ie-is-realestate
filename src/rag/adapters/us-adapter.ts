/**
 * US RAG Adapter
 * 
 * Provides US-specific knowledge retrieval for UIP.
 * Uses US property databases, MLS data, and county records.
 */

import { BaseRAGAdapter } from "../base-adapter";
import { RAGQuery, RAGResponse } from "../interfaces";
import { OllamaConfig } from "../ollama-client";
import { VectorStoreConfig } from "../vector-store";

export class USRAGAdapter extends BaseRAGAdapter {
  constructor(ollamaConfig?: OllamaConfig, vectorStoreConfig?: VectorStoreConfig) {
    super("US", "US RAG Adapter", "1.0.0", ollamaConfig, vectorStoreConfig);
  }

  protected getSupportedIntentTypes(): string[] {
    return ["BUY_PROPERTY", "SELL_PROPERTY", "RENT_PROPERTY", "VALUATION"];
  }

  protected buildSystemPrompt(): string {
    return `You are a knowledge retrieval assistant for the Universal Intent Platform, specialized in US real estate.

Country-Specific Context:
- Use US property databases (MLS, Zillow, Redfin)
- Reference county assessor records
- Use USD ($) currency format
- Consider US market trends and city-specific data
- Reference US legal frameworks (state-specific real estate laws)

Data Sources Priority:
1. MLS (Multiple Listing Service) data
2. County assessor records
3. Zillow/Redfin APIs and market data
4. Census data and demographic information
5. Local market reports and real estate portals

Output Requirements:
- All prices in USD ($)
- Reference US cities and states correctly
- Cite MLS listings when relevant
- Include US market trends (metro areas, suburbs, rural)
- Use US date formats and legal terminology
- Reference school districts, property taxes, HOA fees when relevant

Remember:
- You provide ADVISORY information only
- You do NOT make compliance decisions (Compliance Engine does)
- You do NOT select agents (Decision Engine does)
- All information must be factual and source-cited`;
  }

  async query(query: RAGQuery): Promise<RAGResponse> {
    // Validate country
    if (query.country !== "US" && query.country !== "USA") {
      throw new Error(`US RAG Adapter only supports country "US", got "${query.country}"`);
    }

    // Execute query using base class method
    return await this.executeQuery(query);
  }
}
