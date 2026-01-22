/**
 * Knowledge Base Loader Script
 * 
 * Loads extracted knowledge base content into the vector store.
 * 
 * Usage:
 *   node src/rag/scripts/load-knowledge-base.js
 * 
 * Prerequisites:
 *   1. Extract content from .docx files to text files
 *   2. Place in src/rag/knowledge-base/{country}/ directory
 *   3. Ensure vector store backend is running (or use mock for dev)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import vector store (adjust path as needed)
// import { VectorStoreFactory } from '../vector-store.js';

/**
 * Chunk text into smaller pieces for embedding
 */
function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.substring(start, end);
    chunks.push(chunk.trim());
    start = end - overlap;
  }
  
  return chunks;
}

/**
 * Read and process knowledge base files
 */
function loadKnowledgeBaseFiles(country) {
  const baseDir = path.join(__dirname, '../knowledge-base', country.toLowerCase());
  const files = {
    market_data: 'market_data.txt',
    regulatory_info: 'regulatory_info.txt',
    apis_and_sources: 'apis_and_sources.txt',
    valuation_methods: 'valuation_methods.txt',
    risk_factors: 'risk_factors.txt',
  };
  
  const documents = [];
  
  for (const [section, filename] of Object.entries(files)) {
    const filePath = path.join(baseDir, filename);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const chunks = chunkText(content);
      
      chunks.forEach((chunk, index) => {
        documents.push({
          id: `${country}_${section}_${index}`,
          text: chunk,
          metadata: {
            country: country.toUpperCase(),
            section: section,
            source: filename,
            chunk_index: index,
          },
        });
      });
      
      console.log(`✅ Loaded ${chunks.length} chunks from ${filename}`);
    } else {
      console.warn(`⚠️  File not found: ${filePath}`);
    }
  }
  
  return documents;
}

/**
 * Main loader function
 */
async function loadKnowledgeBase() {
  console.log('🚀 Starting Knowledge Base Loader...\n');
  
  // Load India knowledge base
  console.log('📚 Loading India Knowledge Base...');
  const indiaDocs = loadKnowledgeBaseFiles('india');
  console.log(`   Loaded ${indiaDocs.length} document chunks\n`);
  
  // Load US knowledge base
  console.log('📚 Loading US Knowledge Base...');
  const usDocs = loadKnowledgeBaseFiles('us');
  console.log(`   Loaded ${usDocs.length} document chunks\n`);
  
  // Combine all documents
  const allDocs = [...indiaDocs, ...usDocs];
  console.log(`📊 Total documents to load: ${allDocs.length}\n`);
  
  // TODO: Load into vector store
  // const vectorStore = VectorStoreFactory.create({
  //   backendUrl: process.env.VITE_VECTOR_STORE_URL,
  // });
  // 
  // await vectorStore.add(allDocs);
  // console.log('✅ Knowledge base loaded into vector store!');
  
  console.log('📝 Documents ready for vector store loading.');
  console.log('   (Vector store integration pending - see TODO in script)');
  
  return allDocs;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  loadKnowledgeBase().catch(console.error);
}

export { loadKnowledgeBase, chunkText, loadKnowledgeBaseFiles };
