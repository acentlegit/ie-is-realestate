import { getToken } from "../auth/keycloakAuth";

// Individual Engines - Each engine on its own port (original architecture)
// To use unified engine, set VITE_USE_UNIFIED_ENGINE=true and VITE_UNIFIED_ENGINE_URL="" (same-origin) or full URL
const UNIFIED_ENGINE_URL = (import.meta.env.VITE_UNIFIED_ENGINE_URL ?? "").toString().replace(/\/$/, "");
const USE_UNIFIED_ENGINE = import.meta.env.VITE_USE_UNIFIED_ENGINE === "true"; // Default: false (use individual engines)

// Production: Use relative paths via Nginx (/api/...)
// Development: Use localhost URLs
const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD;
const API_BASE = import.meta.env.VITE_API_BASE || (isProduction ? '' : "http://localhost:8000");

// Engine URLs - Support environment variables or use relative paths in production
const INTENT_ENGINE_URL = USE_UNIFIED_ENGINE 
  ? `${UNIFIED_ENGINE_URL}/v1/intent` 
  : (import.meta.env.VITE_INTENT_ENGINE_URL || (isProduction ? '/api/intent' : "http://localhost:7001"));
const COMPLIANCE_ENGINE_URL = USE_UNIFIED_ENGINE 
  ? `${UNIFIED_ENGINE_URL}/v1/compliance` 
  : (import.meta.env.VITE_COMPLIANCE_ENGINE_URL || (isProduction ? '/api/compliance' : "http://localhost:7002"));
const DECISION_ENGINE_URL = USE_UNIFIED_ENGINE 
  ? `${UNIFIED_ENGINE_URL}/v1` 
  : (import.meta.env.VITE_DECISION_ENGINE_URL || (isProduction ? '/api/decision' : "http://localhost:7003"));
const ACTION_ENGINE_URL = USE_UNIFIED_ENGINE 
  ? `${UNIFIED_ENGINE_URL}/v1` 
  : (import.meta.env.VITE_ACTION_ENGINE_URL || (isProduction ? '/api/action' : "http://localhost:7004"));
const RISK_ENGINE_URL = USE_UNIFIED_ENGINE 
  ? `${UNIFIED_ENGINE_URL}/v1/risk` 
  : (import.meta.env.VITE_RISK_ENGINE_URL || (isProduction ? '/api/risk' : "http://localhost:7005"));
// In dev, use /api/explainability so Vite proxies to engine (7006). Avoids ERR_CONNECTION_REFUSED when engine is down.
const EXPLAINABILITY_ENGINE_URL = USE_UNIFIED_ENGINE 
  ? `${UNIFIED_ENGINE_URL}/v1/explainability` 
  : (import.meta.env.VITE_EXPLAINABILITY_ENGINE_URL || "/api/explainability");
const EVIDENCE_ENGINE_URL = USE_UNIFIED_ENGINE 
  ? `${UNIFIED_ENGINE_URL}/v1` 
  : (import.meta.env.VITE_EVIDENCE_ENGINE_URL || (isProduction ? '/api/evidence' : "http://localhost:7007")); // Phase 12

// Phase 14: RAG Integration - Ollama base URL (configurable)
// Vite uses import.meta.env instead of process.env
// In production, Ollama is typically not available, so we skip it
const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_URL || (isProduction ? null : "http://localhost:11434");

// Phase 13.1: Voice Agent Evidence Emission
export async function emitVoiceEvidence(data) {
  try {
    const path = USE_UNIFIED_ENGINE ? "/execute" : "/v1/execute";
    const res = await fetch(`${EVIDENCE_ENGINE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intentId: data.intentId || "unknown",
        engine: "VOICE_AGENT_ENGINE",
        eventType: data.eventType,
        actorId: data.actorId || "default-user",
        tenantId: data.tenantId || "default-tenant",
        payload: data.payload || {},
        reason: data.reason,
        confidence: data.confidence || "HIGH",
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`[Voice Agent Evidence] Failed to emit evidence (status: ${res.status}): ${errorText}`);
    }
  } catch (error) {
    // Non-blocking: evidence emission failures should not block voice actions
    const errorMsg = error.message || String(error);
    if (errorMsg.includes("fetch") || errorMsg.includes("ECONNREFUSED")) {
      console.warn(`[Voice Agent Evidence] Evidence Engine not available (non-blocking): ${errorMsg}`);
    } else {
      console.warn(`[Voice Agent Evidence] Error emitting evidence (non-blocking): ${errorMsg}`);
    }
  }
}

// Intent Engine API (unified: /v1/intent/execute; individual: /v1/execute)
export async function analyzeIntent(payload) {
  const path = USE_UNIFIED_ENGINE ? "/execute" : "/v1/execute";
  const res = await fetch(`${INTENT_ENGINE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Intent analysis failed: ${errorText}`);
  }

  return res.json();
}

// Compliance Engine API (unified: /v1/compliance/execute; individual: /v1/execute)
export async function checkCompliance(intent) {
  const path = USE_UNIFIED_ENGINE ? "/execute" : "/v1/execute";
  const res = await fetch(`${COMPLIANCE_ENGINE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intentId: intent.id,
      tenantId: intent.tenantId || "default-tenant",
      actorId: intent.actorId || "default-user",
      intentType: intent.type,
      location: intent.payload.location,
      budget: intent.payload.budget,
      area: intent.payload.area,
      propertyId: intent.payload.propertyId,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Compliance check failed: ${errorText}`);
  }

  return res.json();
}

// Decision Engine API
export async function getDecisions(intent, complianceStatus, existingDecisions = []) {
  // Ensure location and budget are in payload for location-specific decisions
  const payload = {
    ...(intent.payload || {}),
    // Ensure location is present (from payload, extractedInfo, or text)
    location: intent.payload?.location || 
              intent.extractedInfo?.location || 
              intent.extractedInfo?.city ||
              intent.extractedInfo?.state ||
              null,
    // Ensure budget is present
    budget: intent.payload?.budget || 
            intent.extractedInfo?.budget ||
            null,
    // Include area if available
    area: intent.payload?.area || intent.extractedInfo?.area || null,
  };

  const path = USE_UNIFIED_ENGINE ? "/execute" : "/v1/execute";
  const url = `${DECISION_ENGINE_URL}${path}`;
  const body = {
    intent: {
      id: intent.id,
      type: intent.type,
      payload: payload,
      extractedInfo: intent.extractedInfo || {}, // Pass extractedInfo for location-specific decisions
      text: intent.text || intent.originalText || "", // Pass original text for context
      complianceStatus,
    },
    existingDecisions,
  };
  if (typeof console !== "undefined" && console.log) {
    console.log("[Decision API] POST", url, "complianceStatus:", complianceStatus);
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[Decision API] Failed:", res.status, errorText);
    }
    throw new Error(`Decision engine failed: ${errorText}`);
  }

  return res.json();
}

// Action Engine API
export async function getActions(intent, decisions, lifecycleState, existingActions = []) {
  try {
    // Validate intent object - ensure it's complete
    if (!intent || typeof intent !== 'object') {
      throw new Error("Intent must be a complete object with id, type, and payload");
    }
    
    if (!intent.id || !intent.type) {
      throw new Error("Intent must have id and type properties");
    }

    // Use correct endpoint based on engine type
    const path = USE_UNIFIED_ENGINE ? "/action/execute" : "/v1/execute";
    const url = `${ACTION_ENGINE_URL}${path}`;
    
    console.log("[Action Engine] Fetching actions from:", url);
    console.log("[Action Engine] Request payload:", {
      intent: intent.id,
      intentType: intent.type,
      decisionsCount: decisions?.length || 0,
      lifecycleState,
      existingActionsCount: existingActions?.length || 0
    });

    // Build complete payload - MANDATORY for Action Engine statefulness
    const payload = {
      intent: {
        id: intent.id,
        type: intent.type,
        payload: intent.payload || {},
      },
      decisions: Array.isArray(decisions) ? decisions : [],
      lifecycleState: lifecycleState || "AWAITING_DECISIONS",
      existingActions: Array.isArray(existingActions) ? existingActions : [],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Action Engine] Error response:", res.status, errorText);
      // For 404 or connection errors, return empty actions (non-blocking)
      if (res.status === 404 || errorText.includes("ECONNREFUSED")) {
        console.warn("[Action Engine] Action engine not available, returning empty actions");
        return { actions: [], nextLifecycleState: lifecycleState };
      }
      throw new Error(`Action engine failed (${res.status}): ${errorText}`);
    }

    const result = await res.json();
    console.log("[Action Engine] Response received:", {
      actionsCount: result.actions?.length || 0,
      nextLifecycleState: result.nextLifecycleState,
      actions: result.actions?.map(a => ({ id: a.actionId, desc: a.description, outcome: a.outcome }))
    });
    return result;
  } catch (error) {
    const errorMsg = error.message || String(error);
    if (errorMsg.includes("fetch") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("Failed to fetch") || errorMsg.includes("NetworkError")) {
      console.warn("[Action Engine] Action engine not available (non-blocking):", errorMsg);
      // Return empty actions array instead of throwing - non-blocking
      return { actions: [], nextLifecycleState: lifecycleState };
    }
    console.error("[Action Engine] Unexpected error:", error);
    throw error;
  }
}

// Phase 5.1: Resume API — tolerates HTML/404/non-JSON (e.g. when Decision Engine is not running or URL hits dev server)
export async function checkResume(userId, tenantId) {
  try {
    const path = USE_UNIFIED_ENGINE ? "/intent/resume" : "/v1/intent/resume";
  const res = await fetch(`${DECISION_ENGINE_URL}${path}?userId=${encodeURIComponent(userId)}&tenantId=${encodeURIComponent(tenantId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    const contentType = res.headers.get("Content-Type") || "";

    if (!res.ok) {
      if (res.status >= 500 || res.status === 0) {
        console.warn("Decision Engine not available for resume check");
        return { hasOpenIntent: false, resumable: false };
      }
      // 404 / 4xx often return HTML when the URL hits the app server
      if (res.status === 404 || !contentType.includes("application/json") || text.trim().startsWith("<")) {
        console.warn("Resume API call failed (this is OK if Decision Engine is not running)");
        return { hasOpenIntent: false, resumable: false };
      }
      throw new Error(`Resume check failed: ${text.slice(0, 200)}`);
    }

    if (!contentType.includes("application/json") || text.trim().startsWith("<")) {
      console.warn("Resume API returned non-JSON (this is OK if Decision Engine is not running)");
      return { hasOpenIntent: false, resumable: false };
    }
    try {
      return JSON.parse(text);
    } catch {
      console.warn("Resume API returned invalid JSON");
      return { hasOpenIntent: false, resumable: false };
    }
  } catch (error) {
    const msg = error.message || String(error);
    if (
      msg.includes("Failed to fetch") ||
      msg.includes("ERR_CONNECTION_REFUSED") ||
      msg.includes("Unexpected token") ||
      msg.includes("is not valid JSON")
    ) {
      console.warn("Resume API call failed (this is OK if Decision Engine is not running):", msg.slice(0, 80));
      return { hasOpenIntent: false, resumable: false };
    }
    throw error;
  }
}

// Phase 5.2: Decision Selection API
export async function selectDecision(decisionId, optionId, userId, confirm = false) {
  const path = USE_UNIFIED_ENGINE ? `/decision/${decisionId}/select` : `/v1/decision/${decisionId}/select`;
  const res = await fetch(`${DECISION_ENGINE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      optionId,
      confirm,
      userId,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Decision selection failed: ${errorText}`);
  }

  return res.json();
}

// Phase 5.2: Decision Change API
export async function changeDecision(decisionId, newOptionId, reason, userId) {
  const path = USE_UNIFIED_ENGINE ? `/decision/${decisionId}/change` : `/v1/decision/${decisionId}/change`;
  const res = await fetch(`${DECISION_ENGINE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newOptionId,
      reason,
      userId,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Decision change failed: ${errorText}`);
  }

  return res.json();
}

// Phase 5.3: Action Outcome API
export async function updateActionOutcome(actionId, outcome, userId, reason = null, scheduledFor = null) {
  // Validate required parameters
  if (!actionId) {
    throw new Error("Action ID is required");
  }
  
  if (!userId) {
    // Fallback to default user if not provided
    userId = "dev";
    console.warn("[Action Outcome] userId not provided, using default:", userId);
  }

  const body = {
    outcome,
    userId,
  };
  
  if (reason) body.reason = reason;
  if (scheduledFor) body.scheduledFor = scheduledFor;

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const path = USE_UNIFIED_ENGINE ? `/action/${actionId}/outcome` : `/v1/action/${actionId}/outcome`;
    const res = await fetch(`${ACTION_ENGINE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      
      // Handle NOT_FOUND specifically - action was not found in Redis
      if (res.status === 404 || errorText.includes("NOT_FOUND") || errorText.includes("not found")) {
        throw new Error(`Action ${actionId} not found. This usually means the action was regenerated. Please refresh and try again.`);
      }
      
      throw new Error(`Action outcome update failed (${res.status}): ${errorText}`);
    }

    return res.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Action Engine request timed out. Please check if Action Engine is running on port 7004.');
    }
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('Action Engine is not running. Please start the Action Engine on port 7004.');
    }
    throw error;
  }
}

// Phase 11: Risk Engine API
export async function evaluateRisk(intent, complianceResult, decisions = []) {
  try {
    const path = USE_UNIFIED_ENGINE ? "/execute" : "/v1/execute";
    const res = await fetch(`${RISK_ENGINE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intentId: intent.id,
        intentType: intent.type,
        complianceResult,
        intentPayload: intent.payload,
        decisions,
        tenantId: intent.tenantId || "default-tenant",
        actorId: intent.actorId || "default-user",
      }),
    });

    if (!res.ok) {
      // If engine is not available, return null instead of throwing
      if (res.status === 0 || res.status >= 500) {
        console.warn("Risk Engine not available");
        return null;
      }
      const errorText = await res.text();
      throw new Error(`Risk evaluation failed: ${errorText}`);
    }

    return res.json();
  } catch (error) {
    // Network errors - engine not running
    if (error.message.includes("Failed to fetch") || error.message.includes("ERR_CONNECTION_REFUSED")) {
      console.warn("Risk Engine not running - risk evaluation skipped");
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

// Phase 11: Explainability Engine API
export async function getExplainability(intent, complianceResult, riskResult, decisions = []) {
  try {
    const path = USE_UNIFIED_ENGINE ? "/execute" : "/v1/execute";
    const res = await fetch(`${EXPLAINABILITY_ENGINE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intentId: intent.id,
        intentType: intent.type,
        complianceResult,
        riskResult: riskResult || undefined, // Only include if risk was evaluated
        decisions,
        tenantId: intent.tenantId || "default-tenant",
        actorId: intent.actorId || "default-user",
      }),
    });

    if (!res.ok) {
      // If engine is not available or method not allowed (405), return null instead of throwing
      if (res.status === 0 || res.status >= 500 || res.status === 405) {
        // Suppress 405 errors in production (route might not be registered)
        const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD;
        if (!isProduction || res.status !== 405) {
          console.warn("Explainability Engine not available");
        }
        return null;
      }
      const errorText = await res.text();
      throw new Error(`Explainability failed: ${errorText}`);
    }

    return res.json();
  } catch (error) {
    // Network errors - engine not running
    if (error.message.includes("Failed to fetch") || error.message.includes("ERR_CONNECTION_REFUSED")) {
      console.warn("Explainability Engine not running - explanation skipped");
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

// Phase 12: Evidence Engine API
export async function getEvidenceByIntent(intentId) {
  try {
    const path = USE_UNIFIED_ENGINE ? `/intent/${intentId}/evidence` : `/v1/intent/${intentId}/evidence`;
    const res = await fetch(`${EVIDENCE_ENGINE_URL}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      // If engine is not available, return empty array instead of throwing
      if (res.status === 0 || res.status >= 500) {
        console.warn("Evidence Engine not available");
        return [];
      }
      const errorText = await res.text();
      throw new Error(`Evidence retrieval failed: ${errorText}`);
    }

    return res.json();
  } catch (error) {
    // Network errors - engine not running
    if (error.message.includes("Failed to fetch") || error.message.includes("ERR_CONNECTION_REFUSED")) {
      console.warn("Evidence Engine not running - evidence retrieval skipped");
      return [];
    }
    // Re-throw other errors
    throw error;
  }
}

// Legacy API (for backward compatibility)
export async function makeOffer(payload) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/intent/make_offer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to make offer: ${errorText}`);
  }

  return res.json();
}

// Phase 14: RAG Integration - Backend/Ollama only; no hardcoded fallback
const RAG_ENGINE_URL = USE_UNIFIED_ENGINE
  ? `${UNIFIED_ENGINE_URL}/v1`
  : null;

export async function queryRAG(intent, country) {
  try {
    // Prefer backend RAG (Ollama on server) when unified engine is used
    if (USE_UNIFIED_ENGINE && RAG_ENGINE_URL) {
      const res = await fetch(`${RAG_ENGINE_URL}/rag/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent_type: intent.type || "UNKNOWN",
          intentType: intent.type || "UNKNOWN",
          extracted_entities: intent.extractedInfo || intent.payload || {},
          extractedEntities: intent.extractedInfo || intent.payload || {},
          extractedInfo: intent.extractedInfo || {},
          country: country || "IN",
          context: { lifecycle_state: intent.lifecycleState },
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) {
        console.warn("[RAG] Backend RAG unavailable (non-blocking):", res.status);
        return null;
      }
      return res.json();
    }

    // Non-unified: try frontend Ollama only (no hardcoded fallback)
    if (isProduction || !OLLAMA_BASE_URL) {
      return null;
    }
    try {
      const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      if (!healthCheck.ok) return null;
    } catch {
      return null;
    }

    const { getRAGFactory } = await import("../rag/rag-factory");
    const ragFactory = getRAGFactory({
      baseUrl: OLLAMA_BASE_URL,
      model: import.meta.env.VITE_OLLAMA_MODEL || "llama3",
      timeout: 60000,
    });
    const ragQuery = {
      intent_type: intent.type || "UNKNOWN",
      extracted_entities: intent.extractedInfo || intent.payload || {},
      country: country || "IN",
      context: { lifecycle_state: intent.lifecycleState },
    };
    return await ragFactory.query(ragQuery);
  } catch (error) {
    console.warn("[RAG Integration] RAG query failed (non-blocking):", error);
    return null;
  }
}

// Phase 14: Helper function to determine country from intent
export function determineCountry(intent) {
  // Extract location from intent - check multiple sources
  const location = intent.extractedInfo?.location || 
                   intent.payload?.location || 
                   intent.extractedInfo?.city ||
                   intent.extractedInfo?.state ||
                   intent.extractedInfo?.country ||
                   "";
  
  // Also check the original intent text for location hints
  const intentText = intent.text || intent.originalText || "";
  
  const locationLower = location.toLowerCase();
  const textLower = intentText.toLowerCase();
  const combinedText = `${locationLower} ${textLower}`;
  
  // India indicators - expanded list
  const indiaKeywords = [
    // Major cities
    "vizag", "visakhapatnam", "mumbai", "bombay", "delhi", "new delhi",
    "bangalore", "bengaluru", "chennai", "madras", "hyderabad", "pune",
    "kolkata", "calcutta", "ahmedabad", "surat", "jaipur", "lucknow",
    "kanpur", "nagpur", "indore", "thane", "bhopal", "visakhapatnam",
    "patna", "vadodara", "ghaziabad", "ludhiana", "agra", "nashik",
    // States
    "andhra pradesh", "maharashtra", "karnataka", "tamil nadu", "gujarat",
    "rajasthan", "uttar pradesh", "west bengal", "bihar", "madhya pradesh",
    "punjab", "haryana", "odisha", "kerala", "assam", "jharkhand",
    // Country indicators
    "india", "indian", "bharat", "hindustan",
    // Currency indicators
    "lakh", "lakhs", "crore", "crores", "rupee", "rupees", "inr", "₹"
  ];
  
  // US indicators - expanded list
  const usKeywords = [
    // Major cities
    "austin", "new york", "nyc", "los angeles", "la", "chicago", "houston",
    "phoenix", "philadelphia", "san antonio", "san diego", "dallas",
    "san jose", "seattle", "denver", "boston", "washington", "miami",
    "atlanta", "detroit", "minneapolis", "portland", "las vegas",
    "nashville", "orlando", "charlotte", "san francisco", "columbus",
    // States
    "texas", "california", "florida", "new york", "pennsylvania", "illinois",
    "ohio", "georgia", "north carolina", "michigan", "new jersey", "virginia",
    "washington", "arizona", "massachusetts", "tennessee", "indiana",
    "missouri", "maryland", "wisconsin", "colorado", "minnesota",
    // Country indicators
    "usa", "us", "united states", "america", "american",
    // Currency indicators
    "dollar", "dollars", "usd", "$"
  ];
  
  // Check for India keywords
  for (const keyword of indiaKeywords) {
    if (combinedText.includes(keyword)) {
      return "IN";
    }
  }
  
  // Check for US keywords
  for (const keyword of usKeywords) {
    if (combinedText.includes(keyword)) {
      return "US";
    }
  }
  
  // Default to India (since current demo is India-focused)
  return "IN";
}

// No hardcoded RAG fallback - all RAG via backend/Ollama or frontend Ollama; on failure return null

