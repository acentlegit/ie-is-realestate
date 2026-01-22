/**
 * Document Ingestion Service
 * 
 * Integrates document parsing + semantic chunking + vector store
 * 
 * This service orchestrates the full pipeline from the RAG sample:
 * 1. Parse document (PDF/DOCX/TXT)
 * 2. Chunk semantically using LLM
 * 3. Generate embeddings
 * 4. Store in vector database
 * 
 * This is the key integration point for loading India/US .docx files
 * into the knowledge base.
 */

import { extractText, ParsedDocument } from './document-parser';
import { SemanticChunker, Chunk } from './semantic-chunker';
import { IVectorStore, VectorStoreDocument } from '../vector-store';
import { OllamaClient } from '../ollama-client';

export interface IngestionOptions {
  country?: string;
  source?: string;
  documentType?: string;
  metadata?: Record<string, any>;
  chunkingOptions?: {
    maxChunkChars?: number;
    overlapChars?: number;
  };
}

export interface IngestionResult {
  documentId: string;
  chunksCreated: number;
  totalChars: number;
  metadata: ParsedDocument['metadata'];
}

/**
 * Document Ingestion Service
 * 
 * Main service for ingesting knowledge base documents
 */
export class DocumentIngestionService {
  private vectorStore: IVectorStore;
  private chunker: SemanticChunker;
  private ollamaClient: OllamaClient;

  constructor(
    vectorStore: IVectorStore,
    ollamaClient: OllamaClient
  ) {
    this.vectorStore = vectorStore;
    this.ollamaClient = ollamaClient;
    this.chunker = new SemanticChunker(ollamaClient);
  }

  /**
   * Ingest a document file
   * 
   * Full pipeline:
   * 1. Parse file → extract text
   * 2. Chunk semantically → preserve context
   * 3. Create embeddings → store in vector DB
   */
  async ingestDocument(
    filename: string,
    fileBytes: Uint8Array | ArrayBuffer,
    options: IngestionOptions = {}
  ): Promise<IngestionResult> {
    console.log(`[DocumentIngestion] Starting ingestion: ${filename}`);

    // Step 1: Parse document
    const parsed = await extractText(filename, fileBytes);
    console.log(`[DocumentIngestion] Parsed ${parsed.text.length} characters`);

    // Step 2: Chunk semantically
    const chunks = await this.chunker.chunkWithMetadata(
      parsed.text,
      {
        country: options.country,
        source: options.source || filename,
        documentType: options.documentType || 'knowledge_base',
        filename: parsed.metadata.filename,
        fileType: parsed.metadata.fileType,
        ...options.metadata,
      },
      options.chunkingOptions
    );
    console.log(`[DocumentIngestion] Created ${chunks.length} semantic chunks`);

    // Step 3: Prepare vector store documents
    const vectorDocs: VectorStoreDocument[] = chunks.map((chunk, index) => ({
      id: `${filename}_chunk_${index}_${Date.now()}`,
      text: chunk.text,
      metadata: {
        ...chunk.metadata,
        chunkIndex: index,
        totalChunks: chunks.length,
      },
    }));

    // Step 4: Store in vector database
    await this.vectorStore.add(vectorDocs);
    console.log(`[DocumentIngestion] Stored ${vectorDocs.length} chunks in vector store`);

    return {
      documentId: filename,
      chunksCreated: chunks.length,
      totalChars: parsed.text.length,
      metadata: parsed.metadata,
    };
  }

  /**
   * Ingest multiple documents
   * 
   * Useful for batch loading knowledge base files
   */
  async ingestDocuments(
    files: Array<{ filename: string; bytes: Uint8Array | ArrayBuffer }>,
    options: IngestionOptions = {}
  ): Promise<IngestionResult[]> {
    const results: IngestionResult[] = [];

    for (const file of files) {
      try {
        const result = await this.ingestDocument(file.filename, file.bytes, options);
        results.push(result);
      } catch (error: any) {
        console.error(`[DocumentIngestion] Failed to ingest ${file.filename}:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  /**
   * Ingest from file path (for Node.js backend)
   * 
   * This would be used in a backend service
   */
  async ingestFromPath(
    filePath: string,
    options: IngestionOptions = {}
  ): Promise<IngestionResult> {
    // In Node.js, read file
    // const fs = require('fs').promises;
    // const bytes = await fs.readFile(filePath);
    // return this.ingestDocument(path.basename(filePath), bytes, options);
    
    throw new Error('ingestFromPath requires Node.js backend - use ingestDocument with file bytes instead');
  }
}
