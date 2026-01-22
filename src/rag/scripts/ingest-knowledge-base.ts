/**
 * Knowledge Base Ingestion Script
 * 
 * Loads India/US .docx files into vector store using:
 * - Document parsing (from RAG sample)
 * - Semantic chunking (from RAG sample)
 * - Vector storage
 * 
 * Usage:
 * 1. Place .docx files in public/knowledge-base/
 * 2. Run this script (or call from UI)
 * 3. Verify chunks are stored
 */

import { DocumentIngestionService } from '../services/document-ingestion';
import { VectorStoreFactory } from '../vector-store';
import { OllamaClient } from '../ollama-client';

/**
 * Load India Knowledge Base
 */
export async function loadIndiaKnowledgeBase(): Promise<void> {
  console.log('[KnowledgeBase] Loading India knowledge base...');

  const vectorStore = VectorStoreFactory.create({
    backendUrl: import.meta.env.VITE_VECTOR_STORE_URL,
  });

  const ollamaClient = new OllamaClient();
  const ingestionService = new DocumentIngestionService(vectorStore, ollamaClient);

  try {
    // Load India document
    const response = await fetch('/knowledge-base/India_Real_Estate_RAG_and_Valuation.docx');
    if (!response.ok) {
      throw new Error(`Failed to fetch India document: ${response.statusText}`);
    }

    const fileBytes = await response.arrayBuffer();
    const result = await ingestionService.ingestDocument(
      'India_Real_Estate_RAG_and_Valuation.docx',
      fileBytes,
      {
        country: 'IN',
        source: 'India Knowledge Base',
        documentType: 'market_data',
        metadata: {
          region: 'India',
          currency: 'INR',
          regulatory: 'RERA',
        },
      }
    );

    console.log(`[KnowledgeBase] ✅ India loaded: ${result.chunksCreated} chunks, ${result.totalChars} chars`);
  } catch (error: any) {
    console.error('[KnowledgeBase] ❌ Failed to load India knowledge base:', error);
    throw error;
  }
}

/**
 * Load US Knowledge Base
 */
export async function loadUSKnowledgeBase(): Promise<void> {
  console.log('[KnowledgeBase] Loading US knowledge base...');

  const vectorStore = VectorStoreFactory.create({
    backendUrl: import.meta.env.VITE_VECTOR_STORE_URL,
  });

  const ollamaClient = new OllamaClient();
  const ingestionService = new DocumentIngestionService(vectorStore, ollamaClient);

  try {
    // Load US document
    const response = await fetch('/knowledge-base/US_Real_Estate_RAG_and_Valuation.docx');
    if (!response.ok) {
      throw new Error(`Failed to fetch US document: ${response.statusText}`);
    }

    const fileBytes = await response.arrayBuffer();
    const result = await ingestionService.ingestDocument(
      'US_Real_Estate_RAG_and_Valuation.docx',
      fileBytes,
      {
        country: 'US',
        source: 'US Knowledge Base',
        documentType: 'market_data',
        metadata: {
          region: 'United States',
          currency: 'USD',
          regulatory: 'State-specific',
        },
      }
    );

    console.log(`[KnowledgeBase] ✅ US loaded: ${result.chunksCreated} chunks, ${result.totalChars} chars`);
  } catch (error: any) {
    console.error('[KnowledgeBase] ❌ Failed to load US knowledge base:', error);
    throw error;
  }
}

/**
 * Load All Knowledge Bases
 */
export async function loadAllKnowledgeBases(): Promise<void> {
  console.log('[KnowledgeBase] Loading all knowledge bases...');

  try {
    await Promise.all([
      loadIndiaKnowledgeBase(),
      loadUSKnowledgeBase(),
    ]);

    console.log('[KnowledgeBase] ✅ All knowledge bases loaded successfully');
  } catch (error: any) {
    console.error('[KnowledgeBase] ❌ Failed to load knowledge bases:', error);
    throw error;
  }
}

/**
 * Check if knowledge base is loaded
 */
export async function checkKnowledgeBaseStatus(): Promise<{
  india: boolean;
  us: boolean;
  totalChunks: number;
}> {
  const vectorStore = VectorStoreFactory.create({
    backendUrl: import.meta.env.VITE_VECTOR_STORE_URL,
  });

  try {
    const stats = await vectorStore.getStats();
    
    // Check for country-specific chunks
    const indiaResults = await vectorStore.search('India RERA property', 1, { country: 'IN' });
    const usResults = await vectorStore.search('US property market', 1, { country: 'US' });

    return {
      india: indiaResults.documents[0]?.length > 0,
      us: usResults.documents[0]?.length > 0,
      totalChunks: stats.count,
    };
  } catch (error: any) {
    console.warn('[KnowledgeBase] Status check failed:', error);
    return {
      india: false,
      us: false,
      totalChunks: 0,
    };
  }
}
