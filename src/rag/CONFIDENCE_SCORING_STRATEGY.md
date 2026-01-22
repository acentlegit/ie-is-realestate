# RAG Confidence Scoring Strategy

## Overview

Confidence scoring ensures RAG responses are properly flagged as advisory-only when uncertainty is high. This aligns with sir's requirement: **"Advisory only — 70% confidence"**.

## Confidence Calculation

### Factors Affecting Confidence

1. **Document Retrieval Quality** (0.0 - 0.4)
   - High relevance chunks found: +0.3 - 0.4
   - Medium relevance: +0.2 - 0.3
   - Low relevance: +0.1 - 0.2
   - No chunks found: +0.0

2. **Source Quality** (0.0 - 0.3)
   - Government sources: +0.3
   - Regulatory sources: +0.25
   - Market data sources: +0.2
   - Third-party sources: +0.1

3. **LLM Response Quality** (0.0 - 0.3)
   - Complete JSON with all fields: +0.3
   - Missing optional fields: +0.2
   - Missing required fields: +0.1
   - Invalid JSON: +0.0

### Confidence Formula

```typescript
function calculateConfidence(
  retrievalQuality: number,
  sourceQuality: number,
  responseQuality: number
): number {
  // Weighted sum
  const confidence = (
    retrievalQuality * 0.4 +
    sourceQuality * 0.3 +
    responseQuality * 0.3
  );
  
  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, confidence));
}
```

## Threshold Implementation

### Advisory Threshold: 0.7

```typescript
const ADVISORY_THRESHOLD = 0.7;

if (ragResponse.confidence < ADVISORY_THRESHOLD) {
  // Mark as low-confidence advisory
  // Engines should use with caution or skip
}
```

### Confidence Levels

| Level | Range | Flag | Usage |
|-------|-------|------|-------|
| High | 0.9 - 1.0 | `HIGH_CONFIDENCE` | Use directly, cite sources |
| Medium | 0.7 - 0.89 | `MEDIUM_CONFIDENCE` | Use with caution, verify |
| Low | 0.5 - 0.69 | `LOW_CONFIDENCE` | Advisory only, verify required |
| Very Low | < 0.5 | `VERY_LOW_CONFIDENCE` | Do not use, flag for review |

## Implementation in Base Adapter

```typescript
// In base-adapter.ts
private readonly ADVISORY_THRESHOLD = 0.7;

protected parseOllamaResponse(...): RAGResponse {
  // ... parse response ...
  
  const confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));
  
  // Apply threshold check
  if (confidence < this.ADVISORY_THRESHOLD) {
    console.warn(
      `[RAG Adapter] Low confidence (${confidence.toFixed(2)} < ${this.ADVISORY_THRESHOLD}). Advisory-only.`
    );
  }
  
  return ragResponse;
}

protected getAdvisoryFlag(ragResponse: RAGResponse): string {
  if (ragResponse.confidence >= 0.9) return "HIGH_CONFIDENCE";
  if (ragResponse.confidence >= this.ADVISORY_THRESHOLD) return "MEDIUM_CONFIDENCE";
  return "LOW_CONFIDENCE";
}
```

## Engine Integration

### Intent Engine

```typescript
// In Intent Engine
const ragResponse = await ragAdapter.query(query);

// Check confidence before using
if (ragResponse.confidence < 0.7) {
  // Log as advisory-only
  evidenceEngine.record({
    eventType: "RAG_ADVISORY_LOW_CONFIDENCE",
    payload: {
      confidence: ragResponse.confidence,
      threshold: 0.7,
      summary: ragResponse.summary
    }
  });
  
  // Still pass to Decision Engine, but flagged
  decisionContext.ragAdvisory = ragResponse;
  decisionContext.ragAdvisoryFlag = "LOW_CONFIDENCE";
}
```

### Decision Engine

```typescript
// In Decision Engine
function processDecision(intent, context) {
  const ragAdvisory = context.ragAdvisory;
  
  // Only use high-confidence RAG
  if (ragAdvisory && ragAdvisory.confidence >= 0.7) {
    // Use for context
    decisionContext.marketInfo = ragAdvisory.market_context;
  } else if (ragAdvisory) {
    // Low confidence - log but don't use
    console.warn("[Decision Engine] RAG advisory has low confidence, using engine-only logic");
  }
  
  // Decision logic is engine-controlled
  return engineLogic.determineDecision(intent, decisionContext);
}
```

## UI Display

### Knowledge Base Section

```typescript
// In Intent.jsx - Knowledge Base display
{ragResponse && (
  <div>
    {/* Confidence badge */}
    <div style={{
      padding: "4px 8px",
      borderRadius: 4,
      fontSize: 11,
      backgroundColor: ragResponse.confidence >= 0.7 
        ? "#E8F5E9" 
        : ragResponse.confidence >= 0.5 
        ? "#FFF3E0" 
        : "#FFEBEE",
      color: ragResponse.confidence >= 0.7 
        ? "#2E7D32" 
        : ragResponse.confidence >= 0.5 
        ? "#E65100" 
        : "#C62828",
    }}>
      {ragResponse.confidence >= 0.7 
        ? "✓ High Confidence" 
        : ragResponse.confidence >= 0.5 
        ? "⚠ Medium Confidence" 
        : "⚠ Low Confidence - Verify Required"}
    </div>
    
    {/* Advisory banner */}
    {ragResponse.confidence < 0.7 && (
      <div style={{
        padding: "8px 12px",
        backgroundColor: "#FFF3E0",
        border: "1px solid #FFC107",
        borderRadius: 6,
        fontSize: 12,
        color: "#856404",
        marginTop: 8,
      }}>
        ⚠️ Advisory only — Confidence: {(ragResponse.confidence * 100).toFixed(0)}%. 
        Verify information with primary sources.
      </div>
    )}
  </div>
)}
```

## Testing

### Confidence Threshold Test

```typescript
describe('Confidence Threshold', () => {
  it('should flag low confidence responses', () => {
    const lowConfidenceResponse = {
      ...validRAGResponse,
      confidence: 0.5
    };
    
    const flag = getAdvisoryFlag(lowConfidenceResponse);
    expect(flag).toBe('LOW_CONFIDENCE');
  });
  
  it('should allow high confidence responses', () => {
    const highConfidenceResponse = {
      ...validRAGResponse,
      confidence: 0.85
    };
    
    const flag = getAdvisoryFlag(highConfidenceResponse);
    expect(flag).toBe('MEDIUM_CONFIDENCE');
  });
});
```

## Summary

✅ **Threshold**: 0.7 (70% confidence)
✅ **Flagging**: Automatic in base adapter
✅ **Engine Integration**: Engines check confidence before using
✅ **UI Display**: Visual indicators for confidence levels
✅ **Evidence Tracking**: Low confidence logged in audit trail

**This ensures RAG is truly advisory-only, with clear confidence indicators.**
