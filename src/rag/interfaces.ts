/**
 * Universal RAG Adapter Interface
 * 
 * All RAG adapters (India, US, etc.) must implement this interface.
 * This ensures universality - same structure, different data sources.
 */

export interface RAGResponse {
  // Core fields (always present)
  summary: string;                    // Human-readable summary
  market_context: MarketContext;      // Market-specific insights
  risk_signals: RiskSignal[];         // Risk indicators (advisory only)
  valuation_hint: ValuationHint;       // Valuation guidance (advisory only)
  sources: Source[];                   // Data source references
  
  // Metadata
  country: string;                     // "IN" | "US" | etc.
  confidence: number;                  // 0-1 confidence score
  retrieval_timestamp: string;         // ISO 8601
  model_version: string;               // Ollama model version
}

export interface MarketContext {
  location_insights: string;
  price_trends: string;
  market_conditions: string;
  comparable_properties?: string;
}

export interface RiskSignal {
  type: "PRICE" | "LOCATION" | "LEGAL" | "MARKET";
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  source: string;
}

export interface ValuationHint {
  estimated_range?: string;
  factors: string[];
  methodology: string;
  confidence: number;
}

export interface Source {
  type: "GOVERNMENT" | "MARKET_DATA" | "REGULATORY" | "THIRD_PARTY";
  name: string;
  url?: string;
  date: string;
}

/**
 * RAG Query Input
 * Standardized input for all RAG adapters
 */
export interface RAGQuery {
  intent_type: string;
  extracted_entities: Record<string, any>;
  country: string;
  context?: Record<string, any>;
}

/**
 * Base RAG Adapter Interface
 * All country-specific adapters must implement this
 */
export interface RAGAdapter {
  /**
   * Query RAG for knowledge retrieval
   * @param query - Standardized RAG query
   * @returns RAG response with country-specific knowledge
   */
  query(query: RAGQuery): Promise<RAGResponse>;
  
  /**
   * Get adapter metadata
   */
  getMetadata(): {
    country: string;
    name: string;
    version: string;
    supported_intent_types: string[];
  };
}
