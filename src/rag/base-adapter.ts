/**
 * Base RAG Adapter
 * 
 * Abstract base class for all RAG adapters.
 * Provides common functionality and enforces interface.
 */

import { RAGAdapter, RAGQuery, RAGResponse } from "./interfaces";
import { OllamaClient, OllamaConfig } from "./ollama-client";
import { IVectorStore, VectorStoreFactory, VectorStoreConfig } from "./vector-store";

export abstract class BaseRAGAdapter implements RAGAdapter {
  protected ollamaClient: OllamaClient;
  protected vectorStore: IVectorStore;
  protected country: string;
  protected name: string;
  protected version: string;

  constructor(
    country: string,
    name: string,
    version: string,
    ollamaConfig?: OllamaConfig,
    vectorStoreConfig?: VectorStoreConfig
  ) {
    this.country = country;
    this.name = name;
    this.version = version;
    this.ollamaClient = new OllamaClient(ollamaConfig);
    this.vectorStore = VectorStoreFactory.create(
      vectorStoreConfig || { backendUrl: import.meta.env.VITE_VECTOR_STORE_URL }
    );
  }

  /**
   * Query RAG - must be implemented by subclasses
   */
  abstract query(query: RAGQuery): Promise<RAGResponse>;

  /**
   * Get adapter metadata
   */
  getMetadata() {
    return {
      country: this.country,
      name: this.name,
      version: this.version,
      supported_intent_types: this.getSupportedIntentTypes(),
    };
  }

  /**
   * Get supported intent types - override in subclasses
   */
  protected abstract getSupportedIntentTypes(): string[];

  /**
   * Build system prompt - override in subclasses for country-specific context
   */
  protected abstract buildSystemPrompt(): string;

  /**
   * Build user prompt from query with retrieved context
   */
  protected buildUserPrompt(query: RAGQuery, relevantDocs: string[] = []): string {
    const contextSection = relevantDocs.length > 0
      ? `\n\nRelevant Knowledge Base Context:\n${relevantDocs.map((doc, idx) => `${idx + 1}. ${doc}`).join("\n")}`
      : "\n\nNote: No relevant documents found in knowledge base. Proceed with general knowledge.";

    return `
Intent Type: ${query.intent_type}
Extracted Entities: ${JSON.stringify(query.extracted_entities, null, 2)}
Country: ${query.country}
${query.context ? `Additional Context: ${JSON.stringify(query.context, null, 2)}` : ""}

Task:
1. Retrieve relevant knowledge from the knowledge base
2. Provide market context
3. Identify risk signals (advisory only)
4. Suggest valuation hints (advisory only)
5. Cite all sources

Important:
- You provide ADVISORY information only
- You do NOT make decisions
- You do NOT execute actions
- All outputs must be factual and source-cited

Output Format: Return a valid JSON object matching this schema:
{
  "summary": "string",
  "market_context": {
    "location_insights": "string",
    "price_trends": "string",
    "market_conditions": "string",
    "comparable_properties": "string (optional)"
  },
  "risk_signals": [
    {
      "type": "PRICE" | "LOCATION" | "LEGAL" | "MARKET",
      "severity": "LOW" | "MEDIUM" | "HIGH",
      "description": "string",
      "source": "string"
    }
  ],
  "valuation_hint": {
    "estimated_range": "string (optional)",
    "factors": ["string"],
    "methodology": "string",
    "confidence": 0.0-1.0
  },
  "sources": [
    {
      "type": "GOVERNMENT" | "MARKET_DATA" | "REGULATORY" | "THIRD_PARTY",
      "name": "string",
      "url": "string (optional)",
      "date": "ISO 8601 string"
    }
  ],
  "country": "${this.country}",
  "confidence": 0.0-1.0,
  "retrieval_timestamp": "ISO 8601 string",
  "model_version": "string"
}
${contextSection}`;
  }

  /**
   * Confidence threshold for advisory flagging
   * RAG responses below this threshold are marked as low-confidence
   */
  private readonly ADVISORY_THRESHOLD = 0.7;

  /**
   * Parse Ollama response to RAGResponse
   * Handles JSON extraction from Ollama's text response
   * Applies confidence threshold and advisory flagging
   */
  protected parseOllamaResponse(
    ollamaResponse: any,
    query: RAGQuery,
    relevantDocs: string[] = []
  ): RAGResponse {
    try {
      // Extract JSON from response (Ollama may return text with JSON)
      const responseText = ollamaResponse.response || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error("No JSON found in Ollama response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and construct RAGResponse
      const confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));
      
      const ragResponse: RAGResponse = {
        summary: parsed.summary || "No summary available",
        market_context: {
          location_insights: parsed.market_context?.location_insights || "",
          price_trends: parsed.market_context?.price_trends || "",
          market_conditions: parsed.market_context?.market_conditions || "",
          comparable_properties: parsed.market_context?.comparable_properties,
        },
        risk_signals: parsed.risk_signals || [],
        valuation_hint: {
          estimated_range: parsed.valuation_hint?.estimated_range,
          factors: parsed.valuation_hint?.factors || [],
          methodology: parsed.valuation_hint?.methodology || "",
          confidence: Math.max(0, Math.min(1, parsed.valuation_hint?.confidence || 0.5)),
        },
        sources: parsed.sources || this.extractSourcesFromDocuments(relevantDocs),
        country: parsed.country || this.country,
        confidence: confidence,
        retrieval_timestamp: parsed.retrieval_timestamp || new Date().toISOString(),
        model_version: parsed.model_version || ollamaResponse.model || "unknown",
      };

      // Apply confidence threshold - mark as advisory if below threshold
      if (confidence < this.ADVISORY_THRESHOLD) {
        // Add advisory flag (if RAGResponse interface supports it)
        // For now, we'll log and ensure engines handle low confidence
        console.warn(
          `[RAG Adapter ${this.name}] Low confidence response (${confidence.toFixed(2)} < ${this.ADVISORY_THRESHOLD}). Marking as advisory-only.`
        );
      }

      return ragResponse;
    } catch (error: any) {
      throw new Error(`Failed to parse Ollama response: ${error.message}`);
    }
  }

  /**
   * Retrieve relevant documents from knowledge base
   */
  protected async retrieveRelevantDocuments(query: RAGQuery): Promise<string[]> {
    try {
      // Build search query from intent
      const searchQuery = this.buildSearchQuery(query);
      
      // Search vector store with country filter
      const results = await this.vectorStore.search(
        searchQuery,
        5, // Top 5 results
        { country: this.country } // Filter by country
      );

      // Extract document texts
      const documents = results.documents[0] || [];
      return documents;
    } catch (error: any) {
      console.warn(`[RAG Adapter ${this.name}] Vector store retrieval failed:`, error);
      return []; // Return empty if retrieval fails
    }
  }

  /**
   * Build search query from RAG query
   * Override in subclasses for country-specific search strategies
   */
  protected buildSearchQuery(query: RAGQuery): string {
    // Default: combine intent type and key entities
    const entities = Object.entries(query.extracted_entities || {})
      .filter(([key, value]) => 
        key !== "country" && 
        value && 
        typeof value === "string" && 
        value.length > 0
      )
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    return `${query.intent_type} ${entities}`.trim();
  }

  /**
   * Execute RAG query with error handling
   */
  protected async executeQuery(query: RAGQuery): Promise<RAGResponse> {
    try {
      // Step 1: Retrieve relevant documents from knowledge base
      const relevantDocs = await this.retrieveRelevantDocuments(query);
      
      // Step 2: Check Ollama health
      const isHealthy = await this.ollamaClient.healthCheck();
      if (!isHealthy) {
        throw new Error("Ollama service is not available");
      }

      // Step 3: Build prompts with retrieved context
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(query, relevantDocs);

      // Step 4: Query Ollama with context
      const ollamaResponse = await this.ollamaClient.generate(
        userPrompt,
        systemPrompt
      );

      // Step 5: Parse response
      const ragResponse = this.parseOllamaResponse(ollamaResponse, query, relevantDocs);

      return ragResponse;
    } catch (error: any) {
      // Return error response instead of throwing
      // This allows engines to continue even if RAG fails
      console.error(`[RAG Adapter ${this.name}] Query failed:`, error);
      
      // Return error response with confidence 0.0 (will be flagged as advisory)
      return {
        summary: `RAG query failed: ${error.message}. Please proceed with engine-only analysis.`,
        market_context: {
          location_insights: "",
          price_trends: "",
          market_conditions: "",
        },
        risk_signals: [],
        valuation_hint: {
          factors: [],
          methodology: "Engine-only (RAG unavailable)",
          confidence: 0.0,
        },
        sources: [],
        country: this.country,
        confidence: 0.0, // Zero confidence = advisory-only, do not use
        retrieval_timestamp: new Date().toISOString(),
        model_version: "error",
      };
    }
  }

  /**
   * Check if RAG response should be used (confidence threshold)
   * Returns true if confidence >= threshold, false otherwise
   */
  protected shouldUseRAGResponse(ragResponse: RAGResponse): boolean {
    return ragResponse.confidence >= this.ADVISORY_THRESHOLD;
  }

  /**
   * Get advisory flag for RAG response
   * Returns advisory status based on confidence
   */
  protected getAdvisoryFlag(ragResponse: RAGResponse): "HIGH_CONFIDENCE" | "MEDIUM_CONFIDENCE" | "LOW_CONFIDENCE" {
    if (ragResponse.confidence >= 0.9) {
      return "HIGH_CONFIDENCE";
    } else if (ragResponse.confidence >= this.ADVISORY_THRESHOLD) {
      return "MEDIUM_CONFIDENCE";
    } else {
      return "LOW_CONFIDENCE";
    }
  }

  /**
   * Extract sources from retrieved documents
   * Override in subclasses for country-specific source extraction
   */
  protected extractSourcesFromDocuments(documents: string[]): any[] {
    // Default: Create generic sources from document count
    if (documents.length === 0) return [];

    return [
      {
        type: "MARKET_DATA",
        name: `${this.country} Knowledge Base`,
        date: new Date().toISOString().split("T")[0],
      },
    ];
  }
}
