/**
 * Vector Store for RAG Knowledge Base
 * 
 * Based on pattern from real-estate-intent-rag-platform-v3/retrieval/vector_store.py
 * 
 * This can be implemented in two ways:
 * 1. Frontend: Use ChromaDB JS client (if available)
 * 2. Backend: Call backend service that uses ChromaDB
 * 
 * For now, we'll create a service interface that can work with either.
 */

export interface VectorStoreDocument {
  id: string;
  text: string;
  metadata?: {
    country?: string;
    source?: string;
    type?: string;
    date?: string;
    [key: string]: any;
  };
}

export interface VectorStoreSearchResult {
  ids: string[][];
  documents: string[][];
  metadatas?: any[][];
  distances?: number[][];
}

export interface VectorStoreConfig {
  // For direct ChromaDB connection
  persistDirectory?: string;
  collectionName?: string;
  
  // For backend service
  backendUrl?: string;
  apiKey?: string;
}

/**
 * Vector Store Interface
 * 
 * Abstracts knowledge base storage for RAG.
 * Can be implemented with ChromaDB, Pinecone, or backend service.
 */
export interface IVectorStore {
  /**
   * Add documents to knowledge base
   */
  add(documents: VectorStoreDocument[]): Promise<void>;
  
  /**
   * Search for relevant documents
   * @param query - Search query text
   * @param k - Number of results to return
   * @param filter - Optional metadata filter
   */
  search(
    query: string,
    k?: number,
    filter?: Record<string, any>
  ): Promise<VectorStoreSearchResult>;
  
  /**
   * Delete documents by IDs
   */
  delete(ids: string[]): Promise<void>;
  
  /**
   * Get collection stats
   */
  getStats(): Promise<{ count: number }>;
}

/**
 * Backend Vector Store Implementation
 * 
 * Calls backend service that handles ChromaDB.
 * This is the recommended approach for production.
 */
export class BackendVectorStore implements IVectorStore {
  private backendUrl: string;
  private apiKey?: string;

  constructor(config: VectorStoreConfig) {
    if (!config.backendUrl) {
      throw new Error("BackendVectorStore requires backendUrl");
    }
    this.backendUrl = config.backendUrl;
    this.apiKey = config.apiKey;
  }

  async add(documents: VectorStoreDocument[]): Promise<void> {
    const response = await fetch(`${this.backendUrl}/api/v1/vector-store/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify({ documents }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add documents: ${response.statusText}`);
    }
  }

  async search(
    query: string,
    k: number = 5,
    filter?: Record<string, any>
  ): Promise<VectorStoreSearchResult> {
    const response = await fetch(`${this.backendUrl}/api/v1/vector-store/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify({ query, k, filter }),
    });

    if (!response.ok) {
      throw new Error(`Failed to search: ${response.statusText}`);
    }

    return await response.json();
  }

  async delete(ids: string[]): Promise<void> {
    const response = await fetch(`${this.backendUrl}/api/v1/vector-store/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete documents: ${response.statusText}`);
    }
  }

  async getStats(): Promise<{ count: number }> {
    const response = await fetch(`${this.backendUrl}/api/v1/vector-store/stats`, {
      method: "GET",
      headers: {
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get stats: ${response.statusText}`);
    }

    return await response.json();
  }
}

/**
 * Mock Vector Store (for development/testing)
 * 
 * Returns mock results when backend is not available.
 */
export class MockVectorStore implements IVectorStore {
  private documents: Map<string, VectorStoreDocument> = new Map();

  async add(documents: VectorStoreDocument[]): Promise<void> {
    documents.forEach((doc) => {
      this.documents.set(doc.id, doc);
    });
  }

  async search(
    query: string,
    k: number = 5,
    filter?: Record<string, any>
  ): Promise<VectorStoreSearchResult> {
    // Simple text matching for mock
    const results = Array.from(this.documents.values())
      .filter((doc) => {
        if (filter) {
          return Object.entries(filter).every(([key, value]) => {
            return doc.metadata?.[key] === value;
          });
        }
        return true;
      })
      .filter((doc) => doc.text.toLowerCase().includes(query.toLowerCase()))
      .slice(0, k);

    return {
      ids: [results.map((r) => r.id)],
      documents: [results.map((r) => r.text)],
      metadatas: [results.map((r) => r.metadata)],
      distances: [results.map(() => 0.5)], // Mock distance
    };
  }

  async delete(ids: string[]): Promise<void> {
    ids.forEach((id) => this.documents.delete(id));
  }

  async getStats(): Promise<{ count: number }> {
    return { count: this.documents.size };
  }
}

/**
 * Vector Store Factory
 * 
 * Creates appropriate vector store based on configuration.
 */
export class VectorStoreFactory {
  static create(config: VectorStoreConfig): IVectorStore {
    if (config.backendUrl) {
      return new BackendVectorStore(config);
    }
    
    // Default to mock for development
    console.warn("[VectorStore] No backendUrl provided, using MockVectorStore");
    return new MockVectorStore();
  }
}
