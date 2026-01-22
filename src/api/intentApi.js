import { getToken } from "../auth/keycloakAuth";

// Individual Engines - Each engine on its own port (original architecture)
// To use unified engine, set VITE_USE_UNIFIED_ENGINE=true and VITE_UNIFIED_ENGINE_URL=http://localhost:8000
const UNIFIED_ENGINE_URL = import.meta.env.VITE_UNIFIED_ENGINE_URL || null;
const USE_UNIFIED_ENGINE = import.meta.env.VITE_USE_UNIFIED_ENGINE === "true"; // Default: false (use individual engines)

const API_BASE = "http://localhost:8000";
const INTENT_ENGINE_URL = USE_UNIFIED_ENGINE ? `${UNIFIED_ENGINE_URL}/v1/intent` : "http://localhost:7001";
const COMPLIANCE_ENGINE_URL = USE_UNIFIED_ENGINE ? `${UNIFIED_ENGINE_URL}/v1/compliance` : "http://localhost:7002";
const DECISION_ENGINE_URL = USE_UNIFIED_ENGINE ? `${UNIFIED_ENGINE_URL}/v1` : "http://localhost:7003";
const ACTION_ENGINE_URL = USE_UNIFIED_ENGINE ? `${UNIFIED_ENGINE_URL}/v1` : "http://localhost:7004";
const RISK_ENGINE_URL = USE_UNIFIED_ENGINE ? `${UNIFIED_ENGINE_URL}/v1/risk` : "http://localhost:7005";
const EXPLAINABILITY_ENGINE_URL = USE_UNIFIED_ENGINE ? `${UNIFIED_ENGINE_URL}/v1/explainability` : "http://localhost:7006";
const EVIDENCE_ENGINE_URL = USE_UNIFIED_ENGINE ? `${UNIFIED_ENGINE_URL}/v1` : "http://localhost:7007"; // Phase 12

// Phase 14: RAG Integration - Ollama base URL (configurable)
// Vite uses import.meta.env instead of process.env
const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_URL || "http://localhost:11434";

// Phase 13.1: Voice Agent Evidence Emission
export async function emitVoiceEvidence(data) {
  try {
    const res = await fetch(`${EVIDENCE_ENGINE_URL}/v1/execute`, {
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

// Intent Engine API
export async function analyzeIntent(payload) {
  const res = await fetch(`${INTENT_ENGINE_URL}/v1/execute`, {
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

// Compliance Engine API
export async function checkCompliance(intent) {
  const res = await fetch(`${COMPLIANCE_ENGINE_URL}/v1/execute`, {
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
  const res = await fetch(`${DECISION_ENGINE_URL}/v1/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: {
        id: intent.id,
        type: intent.type,
        payload: intent.payload,
        complianceStatus,
      },
      existingDecisions,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Decision engine failed: ${errorText}`);
  }

  return res.json();
}

// Action Engine API
export async function getActions(intent, decisions, lifecycleState, existingActions = []) {
  try {
    // Use correct endpoint based on engine type
    const url = USE_UNIFIED_ENGINE 
      ? `${ACTION_ENGINE_URL}/action/execute`
      : `${ACTION_ENGINE_URL}/v1/execute`;
    
    console.log("[Action Engine] Fetching actions from:", url);
    console.log("[Action Engine] Request payload:", {
      intent: intent?.id || intent?.type,
      decisionsCount: decisions?.length || 0,
      lifecycleState,
      existingActionsCount: existingActions?.length || 0
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: {
          id: intent.id,
          type: intent.type,
          payload: intent.payload,
        },
        decisions: decisions || [],
        lifecycleState: lifecycleState || "AWAITING_DECISIONS",
        existingActions: existingActions || [],
      }),
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

// Phase 5.1: Resume API
export async function checkResume(userId, tenantId) {
  try {
    const res = await fetch(`${DECISION_ENGINE_URL}/v1/intent/resume?userId=${encodeURIComponent(userId)}&tenantId=${encodeURIComponent(tenantId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      // If engine is not available, return empty result instead of throwing
      if (res.status === 0 || res.status >= 500) {
        console.warn("Decision Engine not available for resume check");
        return { hasOpenIntent: false, resumable: false };
      }
      const errorText = await res.text();
      throw new Error(`Resume check failed: ${errorText}`);
    }

    return res.json();
  } catch (error) {
    // Network errors or connection refused - engine not running
    if (error.message.includes("Failed to fetch") || error.message.includes("ERR_CONNECTION_REFUSED")) {
      console.warn("Decision Engine not running - resume check skipped");
      return { hasOpenIntent: false, resumable: false };
    }
    // Re-throw other errors
    throw error;
  }
}

// Phase 5.2: Decision Selection API
export async function selectDecision(decisionId, optionId, userId, confirm = false) {
  const res = await fetch(`${DECISION_ENGINE_URL}/v1/decision/${decisionId}/select`, {
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
  const res = await fetch(`${DECISION_ENGINE_URL}/v1/decision/${decisionId}/change`, {
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

    const res = await fetch(`${ACTION_ENGINE_URL}/v1/action/${actionId}/outcome`, {
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
      throw new Error(`Action outcome update failed: ${errorText}`);
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
    const res = await fetch(`${RISK_ENGINE_URL}/v1/execute`, {
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
    const res = await fetch(`${EXPLAINABILITY_ENGINE_URL}/v1/execute`, {
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
      // If engine is not available, return null instead of throwing
      if (res.status === 0 || res.status >= 500) {
        console.warn("Explainability Engine not available");
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
    const res = await fetch(`${EVIDENCE_ENGINE_URL}/v1/intent/${intentId}/evidence`, {
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

// Phase 14: RAG Integration - Query RAG for knowledge retrieval
export async function queryRAG(intent, country) {
  try {
    // Quick health check - verify Ollama is accessible
    try {
      const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });
      if (!healthCheck.ok) {
        console.warn("[RAG Integration] Ollama health check failed - skipping RAG query");
        return null;
      }
    } catch (healthErr) {
      console.warn("[RAG Integration] Ollama not accessible - skipping RAG query:", healthErr.message);
      return null;
    }

    // Import RAG factory dynamically to avoid issues if RAG files have errors
    const { getRAGFactory } = await import("../rag/rag-factory");
    
    const ragFactory = getRAGFactory({
      baseUrl: OLLAMA_BASE_URL,
      model: import.meta.env.VITE_OLLAMA_MODEL || "llama3",
      timeout: 60000, // 60 seconds - first model load can be slow
    });

    const ragQuery = {
      intent_type: intent.type || "UNKNOWN",
      extracted_entities: intent.extractedInfo || intent.payload || {},
      country: country || "IN", // Default to India
      context: {
        lifecycle_state: intent.lifecycleState,
      },
    };

    const ragResponse = await ragFactory.query(ragQuery);
    return ragResponse;
  } catch (error) {
    console.warn("[RAG Integration] RAG query failed (non-blocking):", error);
    // Return null instead of throwing - RAG is advisory, shouldn't break flow
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

