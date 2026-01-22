/**
 * Document Parser Service
 * 
 * Extracted from RAG Sample - LLM chunk processing
 * Handles parsing of PDF, DOCX, HTML, and TXT files
 * 
 * This service is used during document ingestion to extract text
 * from knowledge base documents (India/US .docx files)
 */

export interface ParsedDocument {
  text: string;
  metadata: {
    filename: string;
    fileType: string;
    pageCount?: number;
    extractedAt: string;
  };
}

/**
 * Parse PDF file (requires backend service or PDF.js)
 * For frontend, this would call a backend API
 */
export async function parsePDF(fileBytes: Uint8Array | ArrayBuffer, filename: string): Promise<ParsedDocument> {
  // In frontend, this should call backend API
  // Backend implementation would use pdfplumber
  const response = await fetch('/api/v1/documents/parse-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: fileBytes,
  });

  if (!response.ok) {
    throw new Error(`Failed to parse PDF: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    text: result.text,
    metadata: {
      filename,
      fileType: 'pdf',
      pageCount: result.pageCount,
      extractedAt: new Date().toISOString(),
    },
  };
}

/**
 * Parse DOCX file (requires backend service or mammoth.js)
 * For frontend, this would call a backend API
 */
export async function parseDOCX(fileBytes: Uint8Array | ArrayBuffer, filename: string): Promise<ParsedDocument> {
  // In frontend, this should call backend API
  // Backend implementation would use python-docx
  const response = await fetch('/api/v1/documents/parse-docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: fileBytes,
  });

  if (!response.ok) {
    throw new Error(`Failed to parse DOCX: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    text: result.text,
    metadata: {
      filename,
      fileType: 'docx',
      extractedAt: new Date().toISOString(),
    },
  };
}

/**
 * Parse HTML file
 */
export function parseHTML(fileBytes: Uint8Array | ArrayBuffer, filename: string): ParsedDocument {
  const decoder = new TextDecoder('utf-8');
  const html = decoder.decode(fileBytes);
  
  // Simple HTML text extraction (for production, use DOMParser)
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    text,
    metadata: {
      filename,
      fileType: 'html',
      extractedAt: new Date().toISOString(),
    },
  };
}

/**
 * Parse TXT file
 */
export function parseTXT(fileBytes: Uint8Array | ArrayBuffer, filename: string): ParsedDocument {
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(fileBytes);

  return {
    text,
    metadata: {
      filename,
      fileType: 'txt',
      extractedAt: new Date().toISOString(),
    },
  };
}

/**
 * Extract text from file based on extension
 * 
 * This is the main entry point for document parsing
 */
export async function extractText(
  filename: string,
  fileBytes: Uint8Array | ArrayBuffer
): Promise<ParsedDocument> {
  const lower = filename.toLowerCase();

  if (lower.endsWith('.pdf')) {
    return await parsePDF(fileBytes, filename);
  }
  if (lower.endsWith('.docx')) {
    return await parseDOCX(fileBytes, filename);
  }
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return parseHTML(fileBytes, filename);
  }
  if (lower.endsWith('.txt')) {
    return parseTXT(fileBytes, filename);
  }

  // Default: try as text
  return parseTXT(fileBytes, filename);
}
