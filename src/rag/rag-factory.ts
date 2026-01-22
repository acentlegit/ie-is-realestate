/**
 * RAG Factory
 * 
 * Creates appropriate RAG adapter based on country/intent context.
 * This is the entry point for RAG integration.
 */

import { RAGAdapter, RAGQuery, RAGResponse } from "./interfaces";
import { IndiaRAGAdapter } from "./adapters/india-adapter";
import { USRAGAdapter } from "./adapters/us-adapter";
import { OllamaConfig } from "./ollama-client";

export class RAGFactory {
  private adapters: Map<string, RAGAdapter> = new Map();
  private defaultConfig?: OllamaConfig;

  constructor(ollamaConfig?: OllamaConfig) {
    this.defaultConfig = ollamaConfig;
    this.initializeAdapters();
  }

  private initializeAdapters() {
    // Initialize India adapter
    const indiaAdapter = new IndiaRAGAdapter(this.defaultConfig);
    this.adapters.set("IN", indiaAdapter);
    this.adapters.set("INDIA", indiaAdapter);

    // Initialize US adapter
    const usAdapter = new USRAGAdapter(this.defaultConfig);
    this.adapters.set("US", usAdapter);
    this.adapters.set("USA", usAdapter);
  }

  /**
   * Get RAG adapter for a country
   */
  getAdapter(country: string): RAGAdapter | null {
    const normalizedCountry = country.toUpperCase();
    return this.adapters.get(normalizedCountry) || null;
  }

  /**
   * Query RAG for a given country and intent
   */
  async query(query: RAGQuery): Promise<RAGResponse | null> {
    const adapter = this.getAdapter(query.country);
    
    if (!adapter) {
      console.warn(`[RAG Factory] No adapter found for country: ${query.country}`);
      return null;
    }

    try {
      return await adapter.query(query);
    } catch (error: any) {
      console.error(`[RAG Factory] Query failed:`, error);
      return null;
    }
  }

  /**
   * Get all available adapters
   */
  getAvailableAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if adapter exists for country
   */
  hasAdapter(country: string): boolean {
    return this.getAdapter(country) !== null;
  }
}

// Singleton instance (can be configured per application)
let ragFactoryInstance: RAGFactory | null = null;

export function getRAGFactory(config?: OllamaConfig): RAGFactory {
  if (!ragFactoryInstance) {
    ragFactoryInstance = new RAGFactory(config);
  }
  return ragFactoryInstance;
}

export function resetRAGFactory() {
  ragFactoryInstance = null;
}
