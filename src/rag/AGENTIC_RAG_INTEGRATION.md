# Agentic RAG Integration Guide

## Overview

This guide documents the integration of **Agentic RAG** patterns from the RAG Sample into the Universal Intent Platform (UIP).

## Key Principles (From RAG Sample Article)

### ✅ What We Implemented

1. **Agent Controls RAG** (Not Direct LLM)
   - RAG is called by Intent Engine
   - RAG output is validated by engines
   - RAG never makes decisions

2. **Structured Output** (Deterministic JSON)
   - Every RAG response follows fixed schema
   - No free-form text in decision logic
   - Engines parse JSON, not natural language

3. **Semantic Chunking** (From RAG Sample)
   - LLM-based chunking preserves context
   - Better than simple character splitting
   - Chunks maintain semantic coherence

4. **Document Parsing** (From RAG Sample)
   - PDF, DOCX, HTML, TXT support
   - Extracts text for knowledge base
   - Preserves metadata

## Architecture

```
Intent
  ↓
Intent Engine
  ↓
Compliance Engine (blocks if needed)
  ↓
RAG Adapter (India/US)
  ├─→ Document Parser (extract text)
  ├─→ Semantic Chunker (LLM-based)
  ├─→ Vector Store (embeddings)
  └─→ Ollama (generate advisory)
  ↓
Decision Engine (uses RAG as context)
  ↓
Action Engine
  ↓
Evidence Engine (records all RAG calls)
```

## Files Added (From RAG Sample)

### 1. Document Parser (`services/document-parser.ts`)
- Extracted from `file_parsers.py`
- Handles PDF, DOCX, HTML, TXT
- Returns structured `ParsedDocument`

### 2. Semantic Chunker (`services/semantic-chunker.ts`)
- Extracted from `semantic_chunker.py`
- Uses LLM to split text semantically
- Preserves context and meaning
- Fallback to character-based if LLM fails

### 3. Document Ingestion (`services/document-ingestion.ts`)
- Orchestrates full pipeline:
  1. Parse document
  2. Chunk semantically
  3. Store in vector DB
- Used for loading India/US .docx files

## Integration Points

### Current RAG Adapters

Your existing adapters (`india-adapter.ts`, `us-adapter.ts`) already follow agentic pattern:

```typescript
// ✅ CORRECT: RAG is advisory only
async query(query: RAGQuery): Promise<RAGResponse> {
  // 1. Retrieve documents (vector store)
  const relevantDocs = await this.retrieveRelevantDocuments(query);
  
  // 2. Generate advisory (Ollama)
  const ragResponse = await this.executeQuery(query);
  
  // 3. Return structured JSON
  return ragResponse; // Fixed schema, deterministic
}
```

### Vector Store Integration

The `vector-store.ts` already has the interface. Now you can:

1. **Use BackendVectorStore** (recommended)
   - Calls backend API
   - Backend uses pgvector + sentence-transformers
   - Matches RAG sample pattern

2. **Use MockVectorStore** (development)
   - For testing without backend
   - Simple text matching

## Loading Knowledge Base Documents

### Step 1: Prepare Documents

You have:
- `India_Real_Estate_RAG_and_Valuation.docx`
- `US_Real_Estate_RAG_and_Valuation.docx`

### Step 2: Create Ingestion Script

```typescript
import { DocumentIngestionService } from './services/document-ingestion';
import { VectorStoreFactory } from './vector-store';
import { OllamaClient } from './ollama-client';

async function loadKnowledgeBase() {
  // Initialize services
  const vectorStore = VectorStoreFactory.create({
    backendUrl: 'http://localhost:8000', // Your backend
  });
  const ollamaClient = new OllamaClient();
  const ingestionService = new DocumentIngestionService(vectorStore, ollamaClient);

  // Load India document
  const indiaFile = await fetch('/knowledge-base/India_Real_Estate_RAG_and_Valuation.docx');
  const indiaBytes = await indiaFile.arrayBuffer();
  
  await ingestionService.ingestDocument(
    'India_Real_Estate_RAG_and_Valuation.docx',
    indiaBytes,
    {
      country: 'IN',
      source: 'India Knowledge Base',
      documentType: 'market_data',
    }
  );

  // Load US document
  const usFile = await fetch('/knowledge-base/US_Real_Estate_RAG_and_Valuation.docx');
  const usBytes = await usFile.arrayBuffer();
  
  await ingestionService.ingestDocument(
    'US_Real_Estate_RAG_and_Valuation.docx',
    usBytes,
    {
      country: 'US',
      source: 'US Knowledge Base',
      documentType: 'market_data',
    }
  );

  console.log('✅ Knowledge base loaded');
}
```

### Step 3: Backend Service (Required)

For production, you need a backend service that:

1. **Handles Document Parsing**
   ```python
   # backend/api/documents.py
   from file_parsers import extract_text
   
   @app.post("/api/v1/documents/parse-docx")
   async def parse_docx(file: UploadFile):
       bytes = await file.read()
       text = extract_text(file.filename, bytes)
       return {"text": text}
   ```

2. **Handles Vector Storage**
   ```python
   # backend/api/vector_store.py
   from search import search_chunks
   from sentence_transformers import SentenceTransformer
   
   @app.post("/api/v1/vector-store/search")
   async def search_vector_store(query: str, k: int = 5):
       results = search_chunks(query, top_k=k)
       return {"documents": [[r["chunk_text"] for r in results]]}
   ```

## What This Solves

### ✅ Before (Problems)

- Random RAG outputs
- Different results for same query
- No structured schema
- Simple text splitting (lost context)

### ✅ After (Solutions)

- **Deterministic JSON** - Same structure every time
- **Semantic Chunking** - Preserves context
- **Structured Output** - Engines parse JSON, not text
- **Agentic Control** - RAG is tool, not decision-maker

## Next Steps

1. **Create Backend Service**
   - Use Python FastAPI (from RAG sample)
   - Implement document parsing endpoints
   - Implement vector store endpoints

2. **Load Knowledge Base**
   - Run ingestion script
   - Verify chunks in vector store
   - Test retrieval

3. **Stabilize Output**
   - Lock JSON schema
   - Add validation
   - Test with multiple intents

4. **Commit to GitHub**
   ```bash
   git checkout -b intent-ie-dash-realestate
   git add .
   git commit -m "feat: agentic RAG advisory integration with intent engine"
   ```

## Key Takeaways

1. **RAG Sample = Technical Plumbing**
   - Chunking ✅
   - Parsing ✅
   - Embeddings ✅
   - **NOT** architecture (you already have that)

2. **Your Architecture = Agentic RAG**
   - Intent Engine controls RAG ✅
   - Structured output ✅
   - Advisory only ✅
   - Evidence tracking ✅

3. **Integration = Best of Both**
   - Use RAG sample for chunking/parsing
   - Keep your engine-first architecture
   - Maintain structured JSON output

## References

- RAG Sample: `/Users/bhanukiran/Downloads/ACENTLE/UiP/RAG Sample - LLM chunk processing`
- Agentic RAG Article: "How I finally got agentic RAG to work right"
- Current Implementation: `src/rag/` directory
