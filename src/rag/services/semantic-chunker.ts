/**
 * Semantic Chunker Service
 * 
 * Extracted from RAG Sample - LLM chunk processing
 * Uses LLM to split text into semantically coherent chunks
 * 
 * This ensures chunks preserve meaning and context,
 * which is critical for RAG retrieval quality.
 */

import { OllamaClient } from '../ollama-client';

export interface Chunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
}

export interface ChunkingOptions {
  maxChunkChars?: number;
  preserveContext?: boolean;
  overlapChars?: number;
}

/**
 * Semantic chunking using LLM
 * 
 * This is the key improvement from the RAG sample:
 * Instead of simple character/sentence splitting,
 * we use LLM to understand semantic boundaries.
 */
export class SemanticChunker {
  private ollamaClient: OllamaClient;
  private defaultMaxChars: number = 1200;
  private defaultOverlap: number = 100;

  constructor(ollamaClient: OllamaClient) {
    this.ollamaClient = ollamaClient;
  }

  /**
   * Chunk text semantically using LLM
   * 
   * This method uses the pattern from semantic_chunker.py:
   * - LLM analyzes text for semantic boundaries
   * - Returns JSON array of coherent chunks
   * - Preserves context and meaning
   */
  async chunkSemantically(
    text: string,
    options: ChunkingOptions = {}
  ): Promise<Chunk[]> {
    const maxChars = options.maxChunkChars || this.defaultMaxChars;
    const overlap = options.overlapChars || this.defaultOverlap;

    // For very short text, return as single chunk
    if (text.length <= maxChars) {
      return [
        {
          text,
          index: 0,
          startChar: 0,
          endChar: text.length,
        },
      ];
    }

    // Build prompt (matching semantic_chunker.py pattern)
    const prompt = `
Split the following text into semantically coherent chunks.
Rules:
- Preserve meaning and context
- Each chunk <= ${maxChars} characters
- Return chunks as a JSON array of strings only (no extra text)

TEXT:
${text}
`;

    try {
      // Call Ollama with low temperature for deterministic output
      const response = await this.ollamaClient.generate(prompt, '', {
        temperature: 0.2, // Low temperature for consistency
      });

      // Extract JSON from response
      const responseText = response.response || '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
        // Fallback to simple splitting if LLM fails
        return this.fallbackChunk(text, maxChars, overlap);
      }

      const chunks: string[] = JSON.parse(jsonMatch[0]);
      
      // Convert to Chunk objects with positions
      let currentPos = 0;
      return chunks.map((chunkText, index) => {
        const startChar = currentPos;
        const endChar = startChar + chunkText.length;
        currentPos = endChar;
        
        return {
          text: chunkText.trim(),
          index,
          startChar,
          endChar,
        };
      });
    } catch (error: any) {
      console.warn('[SemanticChunker] LLM chunking failed, using fallback:', error);
      return this.fallbackChunk(text, maxChars, overlap);
    }
  }

  /**
   * Fallback chunking method
   * 
   * Used when LLM chunking fails or is unavailable
   * Uses simple character-based splitting with overlap
   */
  private fallbackChunk(
    text: string,
    maxChars: number,
    overlap: number
  ): Chunk[] {
    const chunks: Chunk[] = [];
    let currentPos = 0;
    let index = 0;

    while (currentPos < text.length) {
      const endPos = Math.min(currentPos + maxChars, text.length);
      let chunkText = text.slice(currentPos, endPos);

      // Try to break at sentence boundary
      if (endPos < text.length) {
        const lastPeriod = chunkText.lastIndexOf('.');
        const lastNewline = chunkText.lastIndexOf('\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > maxChars * 0.5) {
          // Break at sentence if it's not too early
          chunkText = chunkText.slice(0, breakPoint + 1);
          currentPos += breakPoint + 1;
        } else {
          currentPos = endPos;
        }
      } else {
        currentPos = endPos;
      }

      chunks.push({
        text: chunkText.trim(),
        index: index++,
        startChar: currentPos - chunkText.length,
        endChar: currentPos,
      });

      // Apply overlap for next chunk
      if (currentPos < text.length) {
        currentPos = Math.max(0, currentPos - overlap);
      }
    }

    return chunks;
  }

  /**
   * Chunk with metadata preservation
   * 
   * Preserves document metadata (country, source, etc.)
   * for each chunk
   */
  async chunkWithMetadata(
    text: string,
    metadata: Record<string, any>,
    options: ChunkingOptions = {}
  ): Promise<Array<Chunk & { metadata: Record<string, any> }>> {
    const chunks = await this.chunkSemantically(text, options);
    
    return chunks.map((chunk) => ({
      ...chunk,
      metadata: {
        ...metadata,
        chunkIndex: chunk.index,
      },
    }));
  }
}
