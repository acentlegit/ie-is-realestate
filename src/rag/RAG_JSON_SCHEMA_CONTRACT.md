# RAG JSON Schema Contract (LOCKED)

## Purpose

This document defines the **strict, deterministic JSON schema** that all RAG adapters must return. This ensures:

1. **Deterministic Output** - Same structure every time
2. **Engine Compatibility** - Engines parse JSON, not free-form text
3. **Advisory Only** - Clear separation from decision logic
4. **Evidence Tracking** - All fields are auditable

## Schema Definition

```typescript
interface RAGResponse {
  // Core Fields (REQUIRED)
  summary: string;                    // 2-3 sentence advisory summary
  country: string;                   // "IN" | "US" | "UK" (ISO codes)
  confidence: number;                 // 0.0 - 1.0 (REQUIRED for advisory flag)
  retrieval_timestamp: string;        // ISO 8601 timestamp
  model_version: string;              // LLM model identifier

  // Market Context (REQUIRED)
  market_context: {
    location_insights: string;        // City/region specific insights
    price_trends: string;             // Historical and current trends
    market_conditions: string;        // Supply/demand, inventory
    comparable_properties?: string;    // Optional: similar properties
  };

  // Risk Signals (REQUIRED - can be empty array)
  risk_signals: Array<{
    type: "PRICE" | "LOCATION" | "LEGAL" | "MARKET" | "REGULATORY";
    severity: "LOW" | "MEDIUM" | "HIGH";
    description: string;              // Factual description
    source: string;                   // Where this came from
  }>;

  // Valuation Hint (REQUIRED)
  valuation_hint: {
    estimated_range?: string;         // Optional: "₹45-50 lakhs" or "$300-400k"
    factors: string[];                // Array of factors considered
    methodology: string;               // How valuation was derived
    confidence: number;               // 0.0 - 1.0
  };

  // Sources (REQUIRED - can be empty array)
  sources: Array<{
    type: "GOVERNMENT" | "MARKET_DATA" | "REGULATORY" | "THIRD_PARTY";
    name: string;                     // Source name
    url?: string;                     // Optional URL
    date: string;                     // ISO 8601 date
  }>;
}
```

## Confidence Thresholds

### Advisory Flagging

```typescript
// In base-adapter.ts or engine integration
const ADVISORY_THRESHOLD = 0.7;

if (ragResponse.confidence < ADVISORY_THRESHOLD) {
  // Mark as low-confidence advisory
  ragResponse.advisory_flag = "LOW_CONFIDENCE";
  ragResponse.advisory_note = "This information has lower confidence. Verify with primary sources.";
}
```

### Confidence Levels

| Confidence | Meaning | Action |
|------------|---------|--------|
| 0.9 - 1.0 | High | Use directly, cite sources |
| 0.7 - 0.89 | Medium | Use with caution, verify |
| 0.5 - 0.69 | Low | Advisory only, verify required |
| < 0.5 | Very Low | Do not use, flag for review |

## Validation Rules

### Required Fields

All fields marked as `REQUIRED` must be present. Missing fields = invalid response.

### Type Constraints

- `confidence`: Must be between 0.0 and 1.0
- `country`: Must be valid ISO country code
- `risk_signals`: Must be array (can be empty)
- `sources`: Must be array (can be empty)

### Content Rules

1. **No Decision Language**
   - ❌ "You should buy this property"
   - ✅ "Market conditions suggest favorable pricing"

2. **No Action Language**
   - ❌ "Contact this agent"
   - ✅ "Agent matching services available in this region"

3. **Factual Only**
   - ❌ "This is a great deal"
   - ✅ "Price is 15% below market average for this area"

## Example Valid Response

```json
{
  "summary": "Advisory analysis for buying a home in Vizag, Andhra Pradesh, India. Market shows steady growth with RERA-compliant properties available in the ₹45-50 lakh range.",
  "country": "IN",
  "confidence": 0.85,
  "retrieval_timestamp": "2026-01-16T10:30:00+05:30",
  "model_version": "llama3:latest",
  "market_context": {
    "location_insights": "Vizag is a major port city with growing IT sector. Property demand is steady in residential areas.",
    "price_trends": "Prices have increased 8% YoY. Current average: ₹4,500/sqft in prime areas.",
    "market_conditions": "Supply-demand balanced. RERA registration required for all transactions.",
    "comparable_properties": "Similar 2BHK apartments in area: ₹45-50 lakhs"
  },
  "risk_signals": [
    {
      "type": "REGULATORY",
      "severity": "MEDIUM",
      "description": "Ensure RERA registration verified before purchase",
      "source": "RERA Andhra Pradesh Portal"
    }
  ],
  "valuation_hint": {
    "estimated_range": "₹45-50 lakhs",
    "factors": ["Location", "RERA compliance", "Market trends"],
    "methodology": "Based on comparable properties and market data",
    "confidence": 0.8
  },
  "sources": [
    {
      "type": "GOVERNMENT",
      "name": "RERA Andhra Pradesh",
      "url": "https://rera.ap.gov.in",
      "date": "2026-01-15"
    },
    {
      "type": "MARKET_DATA",
      "name": "India Property Market Report 2025",
      "date": "2025-12-01"
    }
  ]
}
```

## Integration with Engines

### Intent Engine

```typescript
// Intent Engine receives RAG response
const ragResponse: RAGResponse = await ragAdapter.query(query);

// Validate confidence
if (ragResponse.confidence < 0.7) {
  // Mark as advisory-only
  evidenceEngine.record({
    eventType: "RAG_ADVISORY_LOW_CONFIDENCE",
    payload: { confidence: ragResponse.confidence, summary: ragResponse.summary }
  });
}

// Pass to Decision Engine (advisory context only)
decisionEngine.processIntent(intent, { ragAdvisory: ragResponse });
```

### Decision Engine

```typescript
// Decision Engine uses RAG as context, not authority
function makeDecision(intent, context) {
  const ragAdvisory = context.ragAdvisory;
  
  // Use RAG for context
  if (ragAdvisory?.market_context) {
    // Add to decision context
    decisionContext.marketInfo = ragAdvisory.market_context;
  }
  
  // Decision logic is engine-controlled, not RAG-controlled
  const decision = engineLogic.determineDecision(intent, decisionContext);
  
  return decision;
}
```

## Error Handling

### Invalid Schema

If RAG returns invalid schema:

```typescript
try {
  const ragResponse = await ragAdapter.query(query);
  validateRAGResponse(ragResponse); // Throws if invalid
} catch (error) {
  // Return error response with empty advisory
  return {
    summary: "RAG advisory unavailable",
    confidence: 0.0,
    // ... all required fields with empty/default values
  };
}
```

### Low Confidence

If confidence < threshold:

```typescript
if (ragResponse.confidence < ADVISORY_THRESHOLD) {
  // Still return response, but flag it
  ragResponse.advisory_flag = "LOW_CONFIDENCE";
  ragResponse.advisory_note = "Verify information with primary sources";
}
```

## Versioning

### Schema Version

Current: `1.0.0`

Breaking changes require:
1. New version number
2. Migration guide
3. Backward compatibility period

### Model Version

Tracked in `model_version` field:
- `llama3:latest`
- `gpt-4o-mini`
- `claude-3-sonnet`

## Testing

### Schema Validation Test

```typescript
describe('RAG Response Schema', () => {
  it('should match contract', () => {
    const response = await ragAdapter.query(testQuery);
    expect(response).toMatchSchema(RAGResponseSchema);
  });
});
```

### Confidence Test

```typescript
it('should flag low confidence', () => {
  const response = { ...validResponse, confidence: 0.5 };
  const flagged = flagLowConfidence(response);
  expect(flagged.advisory_flag).toBe('LOW_CONFIDENCE');
});
```

## Summary

✅ **Locked Schema** - No free-form fields
✅ **Confidence Thresholds** - Advisory flagging
✅ **Engine Integration** - Clear separation
✅ **Error Handling** - Graceful degradation
✅ **Versioning** - Future-proof

**This contract ensures deterministic, auditable, advisory-only RAG output.**
