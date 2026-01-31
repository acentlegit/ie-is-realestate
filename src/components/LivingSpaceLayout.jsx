/**
 * Living Space UI Layout Component
 * 
 * LEFT: Sessions (Buyer, Agent, Lender, Property, Legal)
 * MIDDLE: Live Communication (Chat + Video + Map + Property Images)
 * RIGHT: Actions + Decisions + Trust Receipt
 * 
 * All engines remain unchanged - only UI wrapper
 */

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideoCall from "./VideoCall";
import SpeechToText from "./SpeechToText";
import keycloak, { logout } from "../auth/keycloakAuth";
import { getAvailableSessions, getPrimaryRole, canAccessSession } from "../utils/roleUtils";
import { sortDecisionsByOrder, DECISION_ORDER } from "../services/emailService";

function LogoutButton() {
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };
  return (
    <button type="button" className="btn" onClick={handleLogout} title="Sign out">
      Logout
    </button>
  );
}

const ALL_SESSION_TYPES = [
  { key: "buyer", label: "Buyer", icon: "👤" },
  { key: "agent", label: "Agent", icon: "🏢" },
  { key: "lender", label: "Lender", icon: "💰" },
  { key: "property", label: "Property", icon: "🏠" },
  { key: "legal", label: "Legal", icon: "⚖️" },
];

// Professional labels for technical codes (no BUY_PROPERTY, SELECT_AGENT, etc. in UI)
function formatIntentLabel(type) {
  if (!type) return "Intent";
  const t = String(type).toUpperCase();
  if (t.includes("BUY") || t === "BUY_PROPERTY") return "Purchase";
  if (t.includes("INVEST")) return "Investment";
  if (t.includes("VERIFY") || t.includes("VERIFICATION")) return "Verification";
  if (t.includes("SELL")) return "Sale";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDecisionTypeLabel(type) {
  if (!type) return "";
  const t = String(type).toUpperCase();
  if (t.includes("PROPERTY") && !t.includes("SELECT_AGENT")) return "Property";
  if (t.includes("SELECT_AGENT") || t.includes("AGENT")) return "Agent";
  if (t.includes("LENDER") || t.includes("BANK")) return "Bank";
  if (t.includes("DOWN_PAYMENT") || t.includes("DOWNPAYMENT")) return "Down payment";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Actions that require document upload for verification (show upload UI only for these)
function actionRequiresDocuments(action) {
  if (!action?.description) return false;
  const d = String(action.description).toLowerCase();
  return (
    d.includes("verify") || d.includes("document") || d.includes("title") ||
    d.includes("deed") || d.includes("loan") || d.includes("registration") ||
    d.includes("encumbrance") || d.includes("apply for") || d.includes("legal")
  );
}

// Decision types relevant per intent (show only these in Final Decisions). null = show all.
// Include both UI names (SELECT_AGENT) and backend/Ollama names (AGENT_SELECTION, FINANCING_OPTION) so decisions show.
function getDecisionTypesForIntent(intentType, routeModel) {
  if (!intentType && routeModel !== "investor") return null; // no intent yet → show all
  const t = String(intentType || "").toUpperCase();
  if (t.includes("BUY") || routeModel === "buyer") return ["SELECT_PROPERTY", "SELECT_AGENT", "SELECT_LENDER", "DOWN_PAYMENT", "AGENT_SELECTION", "FINANCING_OPTION", "PROPERTY_SELECTION", "PROPERTY"];
  if (t.includes("INVEST") || routeModel === "investor") return ["SELECT_PROPERTY", "SELECT_LENDER", "DOWN_PAYMENT", "SELECT_AGENT", "AGENT_SELECTION", "FINANCING_OPTION", "PROPERTY_SELECTION", "PROPERTY"];
  if (t.includes("VERIFY")) return ["VERIFY", "DOCUMENT", "LEGAL", "COMPLIANCE"];
  if (t.includes("SELL")) return ["SELECT_PROPERTY", "SELECT_AGENT", "SELECT_LENDER", "AGENT_SELECTION", "FINANCING_OPTION", "PROPERTY_SELECTION"];
  return null;
}

// Whether an action is relevant for the given intent (by description keywords).
// Kept broad so 4–5+ actions always show for BUY/RENT/SELL.
function isActionRelevantForIntent(action, intentType, routeModel) {
  if (!intentType && routeModel !== "investor") return true; // no intent → show all
  const d = String(action?.description || "").toLowerCase();
  const t = String(intentType || "").toUpperCase();
  if (t.includes("BUY") || t.includes("RENT") || t === "" || routeModel === "buyer") {
    return d.includes("agent") || d.includes("visit") || d.includes("verify") || d.includes("document") || d.includes("loan") || d.includes("contact") || d.includes("schedule") || d.includes("apply") || d.includes("property") || d.includes("title") || d.includes("deed") || d.includes("kyc") || d.includes("income") || d.includes("mou") || d.includes("sign") || d.includes("encumbrance");
  }
  if (t.includes("INVEST") || routeModel === "investor") {
    return d.includes("roi") || d.includes("loan") || d.includes("property") || d.includes("yield") || d.includes("appreciation") || d.includes("agent") || d.includes("verify") || d.includes("document");
  }
  if (t.includes("VERIFY")) {
    return d.includes("verify") || d.includes("document") || d.includes("title") || d.includes("deed") || d.includes("encumbrance") || d.includes("legal") || d.includes("registration");
  }
  if (t.includes("SELL")) {
    return d.includes("agent") || d.includes("property") || d.includes("document") || d.includes("verify");
  }
  return true;
}

export default function LivingSpaceLayout({
  // Engine Data (unchanged)
  result,
  compliance,
  decisions,
  actions,
  evidenceList,
  ragResponse,
  explainabilityResult, // Phase 2: Add explainability result for legal references
  
  // Engine Handlers (unchanged)
  onAnalyze,
  onDecisionSelect,
  onConfirmAll, // Optional: (list of { decisionId, optionId }) => Promise – run sequentially so state updates correctly
  onActionOutcome,
  onVoiceClick,
  onDecisionChangeClick, // For changing confirmed decisions
  onChatMessage, // NEW: Handler for chat messages (for decision confirmations)
  onAddChatMessage, // Phase 2: Function to add system messages to chat
  
  // UI State
  input,
  setInput,
  loading,
  error,
  // Sir integration (intent-ai-nextjs-v2 / preview)
  refinementPrompt = null,
  loanOptions = [],
  roi = null,
  routeModel = "buyer",
  trustReceipt = null,
  confidence = 0,
  intentHistory = [],
  onSelectFromHistory = null,
  onDeleteFromHistory = null,
  onStartNew = null,
}) {
  const [activeSession, setActiveSession] = useState("buyer");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [propertyImages, setPropertyImages] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [journeyExpanded, setJourneyExpanded] = useState(null); // "intent"|"compliance"|"decisions"|"actions"|"history"|null – click to expand inside Your Buying Journey
  // Upload documents for verification: { [actionId]: Array<{ id, name, size }> }
  const [actionDocuments, setActionDocuments] = useState({});
  const [showPreview, setShowPreview] = useState(false); // Preview: summary of current session (intent, decisions, actions, RAG, explainability)

  // Role-based access: Get available sessions; append History for previous intent searches
  const availableSessions = useMemo(() => {
    const base = getAvailableSessions();
    if (!base.some(s => s.key === "history")) {
      return [...base, { key: "history", label: "History", icon: "📋" }];
    }
    return base;
  }, []);
  const userRole = useMemo(() => getPrimaryRole(), []);
  
  // Set default active session based on role
  useEffect(() => {
    if (availableSessions.length > 0 && !availableSessions.some(s => s.key === activeSession)) {
      setActiveSession(availableSessions[0].key);
    }
  }, [availableSessions]);
  
  // Phase 2: Expose function to add system messages to chat
  // This allows parent component (Intent.jsx) to add formatted engine responses
  useEffect(() => {
    if (onAddChatMessage) {
      // Store the setChatMessages function so parent can use it
      onAddChatMessage.current = (message) => {
        setChatMessages(prev => [...prev, {
          userId: "system",
          text: message.text || message,
          type: message.type || "system",
          timestamp: new Date().toLocaleString(),
          ...message
        }]);
      };
    }
  }, [onAddChatMessage]);

  // Handle chat message send (for decision confirmations)
  const handleChatSend = () => {
    if (!chatInput.trim() || loading) return;
    
    const message = chatInput.trim();
    setChatInput("");
    
    // Add user message to chat
    const userMsg = {
      userId: "user",
      text: message,
      timestamp: new Date().toLocaleString(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    
    // Process decision confirmation if chat handler is provided
    if (onChatMessage) {
      onChatMessage(message);
    }
  };

  // Handle speech-to-text transcript
  const handleSpeechTranscript = (transcript) => {
    if (transcript && transcript.trim()) {
      setChatInput(transcript);
      // Optionally auto-send or let user review first
      // handleChatSend();
    }
  };

  const activeSessionData = useMemo(() => {
    return ALL_SESSION_TYPES.find(s => s.key === activeSession);
  }, [activeSession]);

  // Helper function to format decision details based on type
  const formatDecisionDetails = (decision, option) => {
    if (!option) return null;
    
    const decisionType = (decision.type || "").toUpperCase();
    // Confidence is 0-1, convert to percentage
    const confidencePercent = decision.confidence ? (decision.confidence * 100).toFixed(0) : null;
    const confidence = confidencePercent ? `(${confidencePercent}%)` : "";
    
    if (decisionType.includes("AGENT")) {
      // Format: (82%) (name and experience)
      const name = option.name || option.label || "N/A";
      const experience = option.experience ? `${option.experience} years experience` : "";
      // Always show confidence for confirmed decisions, show name and experience
      const result = confidence ? `${confidence} ${name}` : name;
      return experience ? `${result} (${experience})` : result;
    } else if (decisionType.includes("PROPERTY")) {
      // Format: 2BHK/1BHK, price, location – full detail
      const parts = [];
      if (option.type) parts.push(option.type); // e.g., "2BHK", "1BHK", "3BHK"
      if (option.bedrooms) parts.push(`${option.bedrooms} BHK`);
      if (option.price) parts.push(`₹${(option.price / 100000).toFixed(0)}L`);
      if (option.location || option.address) parts.push(option.location || option.address);
      return parts.length ? parts.join(", ") : (option.label || "N/A");
    } else if (decisionType.includes("FINANCING") || decisionType.includes("LENDER") || decisionType.includes("BANK")) {
      // Format: bank name, interest rate, LTV, loan upto
      const parts = [];
      if (option.name || option.label) parts.push(option.name || option.label);
      if (option.interestRate) parts.push(`Interest: ${option.interestRate}%`);
      if (option.ltv) parts.push(`LTV: ${option.ltv}%`);
      if (option.loanAmount || option.loanUpto) {
        const loanAmt = option.loanAmount || option.loanUpto;
        parts.push(`Loan upto: ₹${(loanAmt / 100000).toFixed(0)}L`);
      }
      return parts.join(", ") || "N/A";
    } else if (decisionType.includes("DOWN_PAYMENT") || decisionType.includes("DOWNPAYMENT")) {
      // Format: 20% down payment like 10 lakhs payment
      const parts = [];
      if (option.percentage) parts.push(`${option.percentage}% down payment`);
      if (option.amount) {
        const amountInLakhs = (option.amount / 100000).toFixed(0);
        parts.push(`like ₹${amountInLakhs} lakhs payment`);
      }
      return parts.join(" ") || option.label || "N/A";
    }
    
    return option.label || option.id || "N/A";
  };

  // Get ALL decisions (both pending and confirmed) - merged into Final Decisions
  // Sorted by correct order: Property → Agent → Bank → Down Payment
  const allDecisions = useMemo(() => {
    const mapped = decisions.map(d => {
      const recommendedOption = d.options?.find(opt => opt.id === d.recommendedOptionId) || 
                                 d.options?.find(opt => opt.recommended === true) ||
                                 d.options?.[0];
      const selectedOption = d.selectedOptionId ? d.options?.find(opt => opt.id === d.selectedOptionId) : null;
      const isConfirmed = d.evolutionState === "CONFIRMED" || d.evolutionState === "SELECTED";
      const optionToShow = isConfirmed ? selectedOption : recommendedOption;
      
      // Format details - for confirmed decisions, use selected option with confidence
      // For pending, use recommended option with confidence
      const decisionForFormatting = {
        ...d,
        confidence: d.confidence || 0, // Keep as 0-1 for formatDecisionDetails
        type: d.type
      };
      const details = formatDecisionDetails(decisionForFormatting, optionToShow);
      
      return {
        decisionId: d.decisionId || d.id,
        type: d.type?.replace(/_/g, " "),
        isConfirmed,
        confidence: (d.confidence || 0) * 100, // Convert to percentage for display
        reasoning: d.recommendation || d.reasoning || "Based on analysis of available data",
        option: optionToShow,
        recommendedOption,
        selectedOption,
        details,
        decidedBy: d.decidedBy || null,
        decisionMethod: d.decisionMethod || null,
        decisionTimestamp: d.decisionTimestamp || null,
        originalDecision: d,
      };
    });
    
    // Sort by decision order: Property → Agent → Bank → Down Payment
    return mapped.sort((a, b) => {
      const orderA = DECISION_ORDER[a.originalDecision?.type] || 999;
      const orderB = DECISION_ORDER[b.originalDecision?.type] || 999;
      return orderA - orderB;
    });
  }, [decisions]);

  // Show only decisions relevant to the user's intent (result.type / routeModel)
  const intentFilteredDecisions = useMemo(() => {
    const allowed = getDecisionTypesForIntent(result?.type, routeModel);
    if (!allowed || allowed.length === 0) return allDecisions;
    return allDecisions.filter(d => {
      const dt = (d.originalDecision?.type || "").toUpperCase();
      return allowed.some(a => dt.includes(a) || a.includes(dt));
    });
  }, [allDecisions, result?.type, routeModel]);

  // Deduplicate actions by actionId and sort by order to prevent duplicates
  // Also filter out completed/confirmed actions that shouldn't be shown again
  const uniqueActions = useMemo(() => {
    const seen = new Map();
    
    // Process actions: keep most recent version of each action
    actions.forEach(action => {
      const id = action.actionId || action.id || `${action.description}-${action.order}`;
      const isCompleted = action.outcome === "COMPLETED" || action.outcome === "CONFIRMED";
      
      // If we've seen this action before, prefer the one with an outcome (completed/confirmed)
      // or the more recent one if both have outcomes
      if (seen.has(id)) {
        const existing = seen.get(id);
        const existingIsCompleted = existing.outcome === "COMPLETED" || existing.outcome === "CONFIRMED";
        
        // If new one is completed and existing isn't, replace it
        if (isCompleted && !existingIsCompleted) {
          seen.set(id, action);
        }
        // If both are completed, keep the one with later timestamp or higher order
        else if (isCompleted && existingIsCompleted) {
          const newTimestamp = action.updatedAt || action.timestamp || 0;
          const existingTimestamp = existing.updatedAt || existing.timestamp || 0;
          if (newTimestamp > existingTimestamp) {
            seen.set(id, action);
          }
        }
        // If neither is completed, keep the one with higher order or later timestamp
        else if (!isCompleted && !existingIsCompleted) {
          const newOrder = action.order || action.sequence || 0;
          const existingOrder = existing.order || existing.sequence || 0;
          if (newOrder > existingOrder) {
            seen.set(id, action);
          }
        }
      } else {
        seen.set(id, action);
      }
    });
    
    // Convert to array, filter out completed actions that shouldn't be shown, and sort by order
    return Array.from(seen.values())
      .filter(action => {
        // Show completed actions only if they're the most recent state
        // Don't filter them out completely - they should be visible but marked as completed
        return true;
      })
      .sort((a, b) => {
        const orderA = a.order || a.sequence || 999;
        const orderB = b.order || b.sequence || 999;
        return orderA - orderB;
      });
  }, [actions]);

  // Show only actions relevant to the user's intent (result.type / routeModel)
  const intentFilteredActions = useMemo(() => {
    return uniqueActions.filter(a => isActionRelevantForIntent(a, result?.type, routeModel));
  }, [uniqueActions, result?.type, routeModel]);

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <div className="h1">Intent AI Platform — Real Estate</div>
          <div className="sub">Living Space UI · All Engines Connected · Email Automation</div>
        </div>
        <div style={{display:"flex", gap:10, alignItems:"center"}}>
          {result && onStartNew && (
            <button type="button" className="btn primary" onClick={onStartNew} disabled={loading} style={{ fontSize: 12 }}>
              Start new
            </button>
          )}
          <button className="btn" onClick={()=>window.location.reload()}>Refresh</button>
          <button className="btn" onClick={()=>setShowPreview(true)} title="Summary of this session (intent, decisions, actions)">Preview</button>
          <span className="pill">Status: <b>{loading ? "Processing" : result ? "Active" : "Ready"}</b></span>
          <LogoutButton />
        </div>
      </div>

      {/* Preview modal: summary of current session (intent, decisions, actions, RAG, explainability) in one screen */}
      {showPreview && (
        <div
          role="dialog"
          aria-label="Session preview"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setShowPreview(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 20,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--stroke)", paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Session Preview</h3>
              <button type="button" className="btn" onClick={() => setShowPreview(false)}>Close</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {(() => {
                const latest = result || (intentHistory?.length > 0 ? intentHistory[0] : null);
                const previewIntent = latest?.intent || latest;
                const previewCompliance = latest?.compliance ?? compliance;
                const previewDecisions = latest?.decisions ?? decisions;
                const previewActions = latest?.actions ?? actions;
                const previewRag = latest?.ragResponse ?? ragResponse;
                if (!previewIntent) return <p className="small" style={{ opacity: 0.8 }}>No intent yet. Run a search to see the latest here and in history.</p>;
                return (
                <>
                  <section>
                    <div className="small" style={{ fontWeight: 600, marginBottom: 6, color: "var(--cool)" }}>Latest intent</div>
                    <div style={{ fontSize: 13 }}>{formatIntentLabel(previewIntent.type)} · {previewIntent.text || (previewIntent.payload?.location && `Location: ${previewIntent.payload.location}`) || "—"}</div>
                    {previewIntent.payload?.location && <div className="small" style={{ marginTop: 4 }}>Location: {previewIntent.payload.location}</div>}
                    {previewIntent.payload?.budget && <div className="small" style={{ marginTop: 2 }}>Budget: ₹{(previewIntent.payload.budget / 100000).toFixed(0)}L</div>}
                    {previewIntent.confidence != null && <div className="small" style={{ marginTop: 2, opacity: 0.8 }}>Confidence: {(previewIntent.confidence * 100).toFixed(0)}%</div>}
                    {latest?.createdAt && <div className="small" style={{ marginTop: 2, opacity: 0.7 }}>Saved: {new Date(latest.createdAt).toLocaleString()}</div>}
                  </section>
                  {previewCompliance && (
                    <section>
                      <div className="small" style={{ fontWeight: 600, marginBottom: 6, color: "var(--cool)" }}>Compliance</div>
                      <div style={{ fontSize: 13 }}>{previewCompliance.decision || previewCompliance.status || "—"} {previewCompliance.reason && `· ${previewCompliance.reason}`}</div>
                    </section>
                  )}
                  {previewDecisions?.length > 0 && (
                    <section>
                      <div className="small" style={{ fontWeight: 600, marginBottom: 6, color: "var(--cool)" }}>Decisions</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                        {previewDecisions.map((d, i) => {
                          const opt = d.options?.find(o => o.id === d.selectedOptionId);
                          return (
                            <li key={d.decisionId || i} style={{ marginBottom: 4 }}>
                              {formatDecisionTypeLabel(d.type) || d.type}: <strong>{opt?.label || opt?.name || (d.selectedOptionId ? "Selected" : "—")}</strong>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  )}
                  {previewActions?.length > 0 && (
                    <section>
                      <div className="small" style={{ fontWeight: 600, marginBottom: 6, color: "var(--cool)" }}>Actions</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                        {previewActions.slice(0, 10).map((a, i) => (
                          <li key={a.actionId || i} style={{ marginBottom: 4 }}>{a.description || a.label || "—"}</li>
                        ))}
                        {previewActions.length > 10 && <li className="small" style={{ opacity: 0.8 }}>+{previewActions.length - 10} more</li>}
                      </ul>
                    </section>
                  )}
                  {previewRag?.summary && (
                    <section>
                      <div className="small" style={{ fontWeight: 600, marginBottom: 6, color: "var(--cool)" }}>Knowledge / RAG</div>
                      <div style={{ fontSize: 12, opacity: 0.95 }}>{previewRag.summary.substring(0, 300)}{previewRag.summary.length > 300 ? "…" : ""}</div>
                    </section>
                  )}
                  {result && explainabilityResult?.summary && (
                    <section>
                      <div className="small" style={{ fontWeight: 600, marginBottom: 6, color: "var(--cool)" }}>Explainability</div>
                      <div style={{ fontSize: 12, opacity: 0.95 }}>{explainabilityResult.summary.substring(0, 300)}{explainabilityResult.summary.length > 300 ? "…" : ""}</div>
                    </section>
                  )}
                </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="grid" style={{height:"calc(100vh - 140px)", maxHeight:"900px"}}>
        {/* LEFT: Sessions – simple and readable (not cramped) */}
        <div className="card" style={{overflowY:"auto", overflowX:"hidden", padding:12}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10}}>
            <div className="title" style={{fontSize:14}}>Sessions</div>
            <span className="pill" style={{fontSize:10, background:"var(--cool-soft)", color:"var(--cool)"}}>{userRole}</span>
          </div>

          {/* Participants – compact but readable */}
          {result && (
            <div style={{marginBottom:10, paddingBottom:10, borderBottom:"1px solid var(--stroke)"}}>
              <div className="small" style={{fontSize:11, fontWeight:600, marginBottom:6}}>Participants</div>
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, padding:"4px 0"}}>
                  <span>👤 {keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || "You"}</span>
                  <span className="pill" style={{fontSize:9, background:"var(--good-soft)", color:"var(--good)"}}>ONLINE</span>
                </div>
                {decisions.some(d => d.type === "SELECT_AGENT" && d.evolutionState === "CONFIRMED") && (() => {
                  const agentDecision = decisions.find(d => d.type === "SELECT_AGENT" && d.evolutionState === "CONFIRMED");
                  const agentOption = agentDecision?.options?.find(opt => opt.id === agentDecision.selectedOptionId);
                  return (
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, padding:"4px 0"}}>
                      <span>🏢 {agentOption?.label || agentOption?.name || "Agent"}</span>
                      <span className="pill" style={{fontSize:9, background:"var(--warn-soft)", color:"var(--warn)"}}>PENDING</span>
                    </div>
                  );
                })()}
                {decisions.some(d => d.type === "SELECT_LENDER" && d.evolutionState === "CONFIRMED") && (() => {
                  const lenderDecision = decisions.find(d => d.type === "SELECT_LENDER" && d.evolutionState === "CONFIRMED");
                  const lenderOption = lenderDecision?.options?.find(opt => opt.id === lenderDecision.selectedOptionId);
                  return (
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, padding:"4px 0"}}>
                      <span>💰 {lenderOption?.label || lenderOption?.name || "Bank"}</span>
                      <span className="pill" style={{fontSize:9, background:"var(--warn-soft)", color:"var(--warn)"}}>PENDING</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Session tabs – icon, label, short sub-line */}
          <div style={{display:"flex", flexDirection:"column", gap:6}}>
            {availableSessions.map(session => (
              <div
                key={session.key}
                onClick={() => setActiveSession(session.key)}
                style={{
                  cursor:"pointer",
                  padding:8,
                  borderRadius:8,
                  background: activeSession === session.key ? "var(--cool-soft)" : "var(--neutral-soft)",
                  border: activeSession === session.key ? "1px solid var(--cool)" : "1px solid var(--stroke)",
                  fontSize:12
                }}
              >
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                  <span>{session.icon} {session.label}</span>
                  {activeSession === session.key && <span className="pill" style={{fontSize:9}}>Active</span>}
                </div>
                <div className="small" style={{fontSize:10, opacity:0.8, marginTop:2}}>
                  {session.key === "buyer" && "Your search"}
                  {session.key === "agent" && "Agent"}
                  {session.key === "lender" && "Loan"}
                  {session.key === "property" && "Property"}
                  {session.key === "legal" && "Legal"}
                  {session.key === "history" && "Previous intent searches"}
                </div>
              </div>
            ))}
          </div>

          {/* History session: list of previous intents – click to restore and change */}
          {activeSession === "history" && (
            <div style={{marginTop:12, paddingTop:12, borderTop:"1px solid var(--stroke)"}}>
              <div className="small" style={{fontSize:12, fontWeight:600, marginBottom:8, color:"var(--text)"}}>Previous intent searches</div>
              <div style={{display:"flex", flexDirection:"column", gap:6, maxHeight:320, overflowY:"auto"}}>
                {intentHistory.length === 0 ? (
                  <div className="small" style={{opacity:0.7, padding:8}}>No history yet. Run a search, then click <strong>Start new</strong> in the top bar to save the current session here.</div>
                ) : (
                  intentHistory.map((entry, idx) => {
                    const i = entry?.intent;
                    if (!i) return null;
                    const label = formatIntentLabel(i.type);
                    const loc = i.payload?.location || "—";
                    const budget = i.payload?.budget ? "₹" + (i.payload.budget / 100000).toFixed(0) + "L" : "";
                    const date = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
                    return (
                      <div
                        key={entry.createdAt + "-" + (i.id || idx)}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (onSelectFromHistory) onSelectFromHistory(entry);
                          setActiveSession("buyer");
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { if (onSelectFromHistory) onSelectFromHistory(entry); setActiveSession("buyer"); } }}
                        style={{
                          padding:10,
                          borderRadius:8,
                          border:"1px solid var(--stroke)",
                          background:"var(--card)",
                          cursor:"pointer",
                          fontSize:11,
                          transition: "border-color 0.15s, background 0.15s",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--cool)"; e.currentTarget.style.background = "var(--cool-soft)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--stroke)"; e.currentTarget.style.background = "var(--card)"; }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{fontWeight:600, color:"var(--text)"}}>{label} · {loc} {budget ? "· " + budget : ""}</div>
                          {date && <div className="small" style={{marginTop:4, opacity:0.8}}>{date}</div>}
                          <div className="small" style={{marginTop:4, opacity:0.85}}>Click to restore and change</div>
                        </div>
                        {onDeleteFromHistory && (
                          <button
                            type="button"
                            className="btn"
                            title="Delete from history"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDeleteFromHistory(entry); }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onDeleteFromHistory(entry); } }}
                            style={{ flexShrink: 0, padding: "4px 8px", fontSize: 11 }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* AI Concierge – simple cards, readable text (no heavy truncation) */}
          {result && (
            <div style={{marginTop:14, paddingTop:12, borderTop:"1px solid var(--stroke)"}}>
              <div className="small" style={{fontSize:12, fontWeight:600, marginBottom:8}}>AI Concierge</div>
              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                <div style={{padding:8, borderRadius:8, border:"1px solid var(--stroke)", background:"var(--neutral-soft)"}}>
                  <b style={{fontSize:11}}>Intent</b>
                  <div style={{fontSize:12, marginTop:4, lineHeight:1.4}}>{formatIntentLabel(result.type)} · {result.payload?.location || "—"} · {result.payload?.budget ? "₹" + (result.payload.budget / 100000).toFixed(0) + "L" : "—"}</div>
                </div>
                <div style={{padding:8, borderRadius:8, border:"1px solid var(--stroke)", background:"var(--neutral-soft)"}}>
                  <b style={{fontSize:11}}>Notes</b>
                  <div style={{fontSize:12, marginTop:4, lineHeight:1.4}}>{result?.payload?.originalText || "—"}</div>
                </div>
                <div style={{padding:8, borderRadius:8, border:"1px solid var(--stroke)", background:"var(--neutral-soft)"}}>
                  <b style={{fontSize:11}}>Hint</b>
                  <div style={{fontSize:12, marginTop:4, lineHeight:1.4}}>{actions.length > 0 ? actions[0].guidance || "Follow actions below" : "Complete compliance check"}</div>
                </div>
                <div style={{padding:8, borderRadius:8, border:"1px solid var(--stroke)", background:"var(--neutral-soft)"}}>
                  <b style={{fontSize:11}}>Next</b>
                  <div style={{fontSize:12, marginTop:4, lineHeight:1.4}}>{actions.length > 0 ? actions[0].description : "Complete decisions"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MIDDLE: Chat - Full Width with Modern Design */}
        <div className="card" style={{display:"flex", flexDirection:"column", height:"calc(100vh - 180px)", maxHeight:"800px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:12}}>
            <div>
              <div className="title">{activeSessionData?.label} Session</div>
              <div className="small">
                {result ? `${formatIntentLabel(result.type)} · ${result.payload?.location || "Location"}` : "No active intent"}
              </div>
            </div>
            <span className="pill">Session: <b>{activeSessionData?.label}</b></span>
          </div>

          {/* Modern Chat Interface – clean white/panel background */}
          <div style={{display:"flex", flexDirection:"column", flex:1, overflow:"hidden", background:"var(--card)", borderRadius:12, border:"1px solid var(--stroke)"}}>
            {/* Chat Messages Area */}
            <div style={{flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:12}}>
              {/* Loading State */}
              {loading && (
                <div style={{
                  display:"flex",
                  flexDirection:"column",
                  alignItems:"center",
                  justifyContent:"center",
                  padding:40,
                  opacity:0.8
                }}>
                  <div style={{fontSize:24, marginBottom:8}}>🔄</div>
                  <div className="small" style={{fontWeight:"bold"}}>Understanding your intent...</div>
                  <div className="small" style={{marginTop:4, fontSize:10, opacity:0.7}}>Extracting structure · Checking compliance · Preparing actions</div>
                </div>
              )}

              {/* Combined stream: Sir “What are you trying to do?” at top when buyer */}
              {!loading && activeSession === "buyer" && (
                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--stroke)", marginBottom: 12 }}>
                  <div className="small" style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
                    What are you trying to do today?
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setInput((p) => (p ? p : "I want to buy a home"))}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 10,
                        fontSize: 12,
                        background: result?.type === "BUY_PROPERTY" ? "rgba(200,162,74,0.15)" : "var(--card)",
                        border: result?.type === "BUY_PROPERTY" ? "1px solid var(--accent)" : "1px solid var(--stroke)",
                      }}
                    >
                      Buy a Home
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setInput("I want to invest in property with rental yield")}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 10,
                        fontSize: 12,
                        background: routeModel === "investor" ? "rgba(0,49,82,0.1)" : "var(--card)",
                        border: routeModel === "investor" ? "1px solid var(--cool)" : "1px solid var(--stroke)",
                      }}
                    >
                      Invest in Property
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setInput("I want to verify property / documents")}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 10,
                        fontSize: 12,
                        background: "var(--neutral-soft)",
                        border: "1px solid var(--stroke)",
                      }}
                    >
                      Verify Property / Documents
                    </button>
                  </div>
                  {refinementPrompt && (
                    <div style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 8,
                      background: "var(--warn-soft)",
                      border: "1px solid var(--warn)",
                      fontSize: 12,
                      color: "var(--text)",
                    }}>
                      💡 AI: {refinementPrompt}
                    </div>
                  )}
                </div>
              )}

              {/* Empty State - Show Knowledge Insights Even Before Intent (Same as After Intent) */}
              {!loading && chatMessages.length === 0 && !result && (
                <>
                  {/* Knowledge-Based Insights - Show even before intent (same format as after intent) */}
                  {ragResponse && (
                    <div style={{
                      alignSelf:"flex-start",
                      maxWidth:"75%",
                      display:"flex",
                      flexDirection:"column",
                      gap:4
                    }}>
                      <div style={{
                        padding:14,
                        borderRadius:16,
                        background:"var(--cool-soft)",
                        border:"1px solid var(--stroke)",
                        color:"var(--text)"
                      }}>
                        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
                          <div style={{
                            width:32,
                            height:32,
                            borderRadius:"50%",
                            background:"var(--cool-soft)",
                            display:"flex",
                            alignItems:"center",
                            justifyContent:"center",
                            fontSize:16
                          }}>💡</div>
                          <div>
                            <b style={{fontSize:12}}>Knowledge-Based Insights</b>
                            <div className="small" style={{fontSize:10, opacity:0.7}}>{new Date().toLocaleString()}</div>
                          </div>
                        </div>
                        {ragResponse.summary && (
                          <div style={{fontSize:13, lineHeight:1.6, marginBottom:10}}>
                            {ragResponse.summary}
                          </div>
                        )}
                        {ragResponse.market_context && (
                          <div style={{marginTop:10, padding:10, background:"var(--cool-soft)", borderRadius:8, fontSize:12}}>
                            {ragResponse.market_context.location_insights && (
                              <div style={{marginBottom:6}}><strong>Location:</strong> {ragResponse.market_context.location_insights}</div>
                            )}
                            {ragResponse.market_context.price_trends && (
                              <div style={{marginBottom:6}}><strong>Price Trends:</strong> {ragResponse.market_context.price_trends}</div>
                            )}
                            {ragResponse.market_context.market_conditions && (
                              <div><strong>Market Conditions:</strong> {ragResponse.market_context.market_conditions}</div>
                            )}
                          </div>
                        )}
                        {ragResponse.risk_signals && ragResponse.risk_signals.length > 0 && (
                          <div style={{marginTop:10, padding:10, background:"rgba(251,191,36,0.1)", borderRadius:8, fontSize:12}}>
                            <strong style={{marginBottom:6, display:"block"}}>⚠️ Risk Signals:</strong>
                            {ragResponse.risk_signals.slice(0, 3).map((signal, idx) => (
                              <div key={idx} style={{marginBottom:4, fontSize:11}}>
                                {typeof signal === "string" ? signal : signal.description || signal.type}
                                {typeof signal === "object" && signal.severity && (
                                  <span className="pill" style={{
                                    marginLeft:8,
                                    background: signal.severity === "HIGH" ? "rgba(239,68,68,0.2)" : 
                                               signal.severity === "MEDIUM" ? "rgba(251,191,36,0.2)" : 
                                               "rgba(34,197,94,0.2)",
                                    color: signal.severity === "HIGH" ? "var(--bad)" : 
                                          signal.severity === "MEDIUM" ? "var(--warn)" : 
                                          "var(--good)",
                                    fontSize:9
                                  }}>
                                    {signal.severity}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {ragResponse.confidence && (
                          <div className="small" style={{fontSize:11, opacity:0.8, marginTop:8}}>
                            Confidence: {(ragResponse.confidence * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Legal References - Show even before intent (same format as after intent) */}
                  {explainabilityResult && explainabilityResult.legalReferences && explainabilityResult.legalReferences.length > 0 && (
                    <div style={{
                      alignSelf:"flex-start",
                      maxWidth:"75%",
                      display:"flex",
                      flexDirection:"column",
                      gap:4,
                      marginTop:ragResponse ? 12 : 0
                    }}>
                      <div style={{
                        padding:14,
                        borderRadius:16,
                        background:"rgba(59,130,246,0.15)",
                        border:"1px solid rgba(59,130,246,0.3)",
                        color:"var(--text)"
                      }}>
                        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
                          <div style={{
                            width:32,
                            height:32,
                            borderRadius:"50%",
                            background:"rgba(59,130,246,0.3)",
                            display:"flex",
                            alignItems:"center",
                            justifyContent:"center",
                            fontSize:16
                          }}>⚖️</div>
                          <div>
                            <b style={{fontSize:12}}>Legal References</b>
                            <div className="small" style={{fontSize:10, opacity:0.7}}>{new Date().toLocaleString()}</div>
                          </div>
                        </div>
                        <div style={{fontSize:13, lineHeight:1.6}}>
                          {explainabilityResult.legalReferences.slice(0, 3).map((ref, idx) => (
                            <div key={idx} style={{marginBottom:8, padding:8, background:"var(--neutral-soft)", borderRadius:6}}>
                              <div style={{fontWeight:600, marginBottom:4}}>
                                {typeof ref === "string" ? ref : ref.title || ref.reference || "Legal Reference"}
                              </div>
                              {typeof ref === "object" && ref.description && (
                                <div className="small" style={{fontSize:11, opacity:0.8}}>
                                  {ref.description}
                                </div>
                              )}
                              {typeof ref === "object" && ref.url && (
                                <a href={ref.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11, color:"var(--cool)", marginTop:4, display:"inline-block"}}>
                                  View Reference 🔗
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Welcome message - only show if no insights loaded */}
                  {!ragResponse && !explainabilityResult && (
                    <div style={{
                      display:"flex",
                      flexDirection:"column",
                      alignItems:"center",
                      justifyContent:"center",
                      padding:40,
                      opacity:0.6
                    }}>
                      <div style={{fontSize:32, marginBottom:12}}>💬</div>
                      <div className="small">Enter your intent below to get started</div>
                    </div>
                  )}
                </>
              )}

              {/* System Message - Intent Processed */}
              {!loading && chatMessages.length === 0 && result && (
                <div style={{
                  alignSelf:"flex-start",
                  maxWidth:"75%",
                  padding:14,
                  borderRadius:16,
                  background:"rgba(59,130,246,0.15)",
                  border:"1px solid rgba(59,130,246,0.3)"
                }}>
                  <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
                    <div style={{
                      width:32,
                      height:32,
                      borderRadius:"50%",
                      background:"linear-gradient(135deg, #3b82f6, #8b5cf6)",
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"center",
                      fontSize:16
                    }}>🤖</div>
                    <div>
                      <b style={{fontSize:12}}>System</b>
                      <div className="small" style={{fontSize:10, opacity:0.7}}>{new Date().toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{marginTop:8, fontSize:13}}>
                    Intent: <b>{formatIntentLabel(result.type)}</b>
                  </div>
                  {compliance && (
                    <div style={{
                      marginTop:8,
                      padding:8,
                      borderRadius:8,
                      background:compliance.decision === "ALLOW" ? "rgba(34,197,94,0.2)" : compliance.decision === "DENY" ? "rgba(239,68,68,0.2)" : "rgba(251,191,36,0.2)",
                      border:`1px solid ${compliance.decision === "ALLOW" ? "var(--good)" : compliance.decision === "DENY" ? "var(--bad)" : "var(--warn)"}`
                    }}>
                      Compliance: {compliance.decision === "ALLOW" ? "✅ ALLOWED" : compliance.decision === "DENY" ? "❌ DENIED" : "⚠️ REVIEW"}
                    </div>
                  )}
                </div>
              )}
              
              {/* Knowledge-Based Insights in Chat (when intent exists) */}
              {!loading && result && ragResponse && (
                <div style={{
                  alignSelf:"flex-start",
                  maxWidth:"75%",
                  display:"flex",
                  flexDirection:"column",
                  gap:4,
                  marginTop:chatMessages.length > 0 ? 12 : 0
                }}>
                  <div style={{
                    padding:14,
                    borderRadius:16,
                    background:"rgba(139,92,246,0.15)",
                    border:"1px solid rgba(139,92,246,0.3)",
                    color:"var(--text)"
                  }}>
                    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
                      <div style={{
                        width:32,
                        height:32,
                        borderRadius:"50%",
                        background:"var(--cool-soft)",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"center",
                        fontSize:16
                      }}>💡</div>
                      <div>
                        <b style={{fontSize:12}}>Knowledge-Based Insights</b>
                        <div className="small" style={{fontSize:10, opacity:0.7}}>{new Date().toLocaleString()}</div>
                      </div>
                    </div>
                    {ragResponse.summary && (
                      <div style={{fontSize:13, lineHeight:1.6, marginBottom:10}}>
                        {ragResponse.summary}
                      </div>
                    )}
                    {ragResponse.market_context && (
                      <div style={{marginTop:10, padding:10, background:"var(--cool-soft)", borderRadius:8, fontSize:12}}>
                        {ragResponse.market_context.location_insights && (
                          <div style={{marginBottom:6}}><strong>Location:</strong> {ragResponse.market_context.location_insights}</div>
                        )}
                        {ragResponse.market_context.price_trends && (
                          <div style={{marginBottom:6}}><strong>Price Trends:</strong> {ragResponse.market_context.price_trends}</div>
                        )}
                        {ragResponse.market_context.market_conditions && (
                          <div><strong>Market Conditions:</strong> {ragResponse.market_context.market_conditions}</div>
                        )}
                      </div>
                    )}
                    {ragResponse.risk_signals && ragResponse.risk_signals.length > 0 && (
                      <div style={{marginTop:10, padding:10, background:"rgba(251,191,36,0.1)", borderRadius:8, fontSize:12}}>
                        <strong style={{marginBottom:6, display:"block"}}>⚠️ Risk Signals:</strong>
                        {ragResponse.risk_signals.slice(0, 3).map((signal, idx) => (
                          <div key={idx} style={{marginBottom:4, fontSize:11}}>
                            {typeof signal === "string" ? signal : signal.description || signal.type}
                            {typeof signal === "object" && signal.severity && (
                              <span className="pill" style={{
                                marginLeft:8,
                                background: signal.severity === "HIGH" ? "rgba(239,68,68,0.2)" : 
                                           signal.severity === "MEDIUM" ? "rgba(251,191,36,0.2)" : 
                                           "rgba(34,197,94,0.2)",
                                color: signal.severity === "HIGH" ? "var(--bad)" : 
                                      signal.severity === "MEDIUM" ? "var(--warn)" : 
                                      "var(--good)",
                                fontSize:9
                              }}>
                                {signal.severity}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {ragResponse.confidence && (
                      <div className="small" style={{fontSize:11, opacity:0.8, marginTop:8}}>
                        Confidence: {(ragResponse.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Legal References in Chat (when intent exists) */}
              {!loading && result && explainabilityResult && explainabilityResult.legalReferences && explainabilityResult.legalReferences.length > 0 && (
                <div style={{
                  alignSelf:"flex-start",
                  maxWidth:"75%",
                  display:"flex",
                  flexDirection:"column",
                  gap:4,
                  marginTop:12
                }}>
                  <div style={{
                    padding:14,
                    borderRadius:16,
                    background:"rgba(59,130,246,0.15)",
                    border:"1px solid rgba(59,130,246,0.3)",
                    color:"var(--text)"
                  }}>
                    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
                      <div style={{
                        width:32,
                        height:32,
                        borderRadius:"50%",
                        background:"rgba(59,130,246,0.3)",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"center",
                        fontSize:16
                      }}>⚖️</div>
                      <div>
                        <b style={{fontSize:12}}>Legal References</b>
                        <div className="small" style={{fontSize:10, opacity:0.7}}>{new Date().toLocaleString()}</div>
                      </div>
                    </div>
                    <div style={{fontSize:13, lineHeight:1.6}}>
                      {explainabilityResult.legalReferences.slice(0, 3).map((ref, idx) => (
                        <div key={idx} style={{marginBottom:8, padding:8, background:"var(--neutral-soft)", borderRadius:6}}>
                          <div style={{fontWeight:600, marginBottom:4}}>
                            {typeof ref === "string" ? ref : ref.title || ref.reference || "Legal Reference"}
                          </div>
                          {typeof ref === "object" && ref.description && (
                            <div className="small" style={{fontSize:11, opacity:0.8}}>
                              {ref.description}
                            </div>
                          )}
                          {typeof ref === "object" && ref.url && (
                            <a href={ref.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11, color:"var(--cool)", marginTop:4, display:"inline-block"}}>
                              View Reference 🔗
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Messages - Modern Bubbles */}
              {chatMessages.map((msg, idx) => {
                const isUser = msg.userId === "user";
                const isSystem = msg.userId === "system" || msg.type === "system" || msg.type?.includes("compliance") || msg.type?.includes("decisions") || msg.type?.includes("actions") || msg.type?.includes("intent") || msg.type?.includes("decision_confirmed") || msg.type?.includes("decisions_unlocked") || msg.type?.includes("rag_insights") || msg.type?.includes("legal_references");
                
                // Phase 2: Enhanced system message styling
                if (isSystem) {
                  const getSystemColor = (type) => {
                    if (type?.includes("compliance")) return "rgba(59,130,246,0.15)";
                    if (type?.includes("decisions") || type?.includes("decision")) return "rgba(139,92,246,0.15)";
                    if (type?.includes("actions")) return "rgba(34,197,94,0.15)";
                    if (type?.includes("intent")) return "rgba(251,191,36,0.15)";
                    if (type?.includes("rag_insights")) return "rgba(139,92,246,0.15)";
                    if (type?.includes("legal_references")) return "rgba(59,130,246,0.15)";
                    return "var(--neutral-soft)";
                  };
                  
                  const getSystemBorder = (type) => {
                    if (type?.includes("compliance")) return "rgba(59,130,246,0.3)";
                    if (type?.includes("decisions") || type?.includes("decision")) return "rgba(139,92,246,0.3)";
                    if (type?.includes("actions")) return "rgba(34,197,94,0.3)";
                    if (type?.includes("intent")) return "rgba(251,191,36,0.3)";
                    if (type?.includes("rag_insights")) return "rgba(139,92,246,0.3)";
                    if (type?.includes("legal_references")) return "rgba(59,130,246,0.3)";
                    return "var(--stroke)";
                  };
                  
                  return (
                    <div key={idx} style={{
                      alignSelf: "flex-start",
                      maxWidth:"75%",
                      display:"flex",
                      flexDirection:"column",
                      gap:4
                    }}>
                      <div style={{
                        padding:12,
                        borderRadius:16,
                        background: getSystemColor(msg.type),
                        border: `1px solid ${getSystemBorder(msg.type)}`,
                        color: "var(--text)"
                      }}>
                        <div style={{fontSize:13, lineHeight:1.5, fontWeight:500}}>{msg.text}</div>
                      </div>
                      <div className="small" style={{fontSize:10, opacity:0.6, paddingLeft:4}}>
                        {msg.timestamp || new Date().toLocaleString()}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={idx} style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth:"75%",
                    display:"flex",
                    flexDirection:"column",
                    gap:4
                  }}>
                    <div style={{
                      padding:12,
                      borderRadius:16,
                      background: isUser 
                        ? "linear-gradient(135deg, #22c55e, #3b82f6)" 
                        : "var(--neutral-soft)",
                      border: isUser ? "none" : "1px solid var(--stroke)",
                      color: isUser ? "#fff" : "var(--text)"
                    }}>
                      <div style={{fontSize:13, lineHeight:1.5}}>{msg.text}</div>
                    </div>
                    <div className="small" style={{fontSize:10, opacity:0.6, paddingLeft:4}}>
                      {msg.timestamp || new Date().toLocaleString()}
                    </div>
                  </div>
                );
              })}
              
              {/* Confirmed Decisions – simple one-line bubbles, professional labels */}
              {!loading && allDecisions.filter(d => d.isConfirmed).length > 0 && (
                allDecisions.filter(d => d.isConfirmed).map((decision) => (
                  <div key={decision.decisionId} style={{
                    alignSelf:"flex-start",
                    maxWidth:"75%",
                    padding:10,
                    borderRadius:12,
                    background:"var(--good-soft)",
                    border:"1px solid var(--good)",
                    color:"var(--text)",
                    display:"flex",
                    alignItems:"center",
                    gap:8,
                    flexWrap:"wrap"
                  }}>
                    <span style={{fontSize:14, color:"var(--good)"}}>✓</span>
                    <span style={{fontSize:12, fontWeight:600, color:"var(--text)"}}>{formatDecisionTypeLabel(decision.type || decision.originalDecision?.type)}:</span>
                    <span style={{fontSize:12, color:"var(--text)"}}>{decision.details || decision.option?.label || decision.option?.id}</span>
                    <span className="small" style={{fontSize:10, opacity:0.7, marginLeft:"auto"}}>
                      {decision.decisionTimestamp ? new Date(decision.decisionTimestamp).toLocaleString() : ""}
                    </span>
                  </div>
                ))
              )}

              {/* Combined stream: Sir AI Insights + Relevant Legal (same scroll as activity) */}
              {activeSession === "buyer" && (
                <div style={{ marginTop: 12 }}>
                  <div style={{
                    background: "var(--cool-soft)",
                    border: "1px solid var(--stroke)",
                    borderRadius: 12,
                    padding: 14,
                    color: "var(--text)",
                  }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: "var(--text)" }}>
                      AI Insights ({" "}
                      {result ? (confidence || (ragResponse && ragResponse.confidence != null ? Math.round(ragResponse.confidence * 100) : 70)) : 70}
                      % Confidence)
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.8 }}>
                      {(ragResponse?.summary
                        ? ragResponse.summary.split(/\n|•/).filter(Boolean).slice(0, 6)
                        : [
                            "Prices vary by locality & property type",
                            "Prioritize metro, schools & commercial access",
                            "Verify title deed, registration & encumbrance",
                            "Check RERA for new projects",
                            "Compare bank & NBFC loan options",
                          ]
                      ).map((line, i) => (
                        <li key={i}>{line.trim()}</li>
                      ))}
                    </ul>
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => onAnalyze && input.trim() && onAnalyze()}
                        style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11 }}
                      >
                        🔍 Apply to my search
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setInput((p) => p + (p ? " " : "") + "Follow-up: more details")}
                        style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11 }}
                      >
                        {"Ask follow-up >"}
                      </button>
                    </div>
                  </div>
                  {(explainabilityResult?.legalReferences?.length > 0 || result) && (
                    <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "var(--cool-soft)", border: "1px solid var(--stroke)" }}>
                      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Relevant Legal Checks</div>
                      {(explainabilityResult?.legalReferences?.length > 0
                        ? explainabilityResult.legalReferences.slice(0, 3)
                        : [{ title: "Legal Reference", timestamp: new Date().toISOString() }]
                      ).map((ref, i) => (
                        <div key={i} className="small" style={{ fontSize: 11, opacity: 0.9, marginBottom: 4 }}>
                          {typeof ref === "string" ? ref : ref.title || "Legal Reference"}
                          <span style={{ marginLeft: 6, opacity: 0.7 }}>
                            {typeof ref === "object" && ref.timestamp
                              ? new Date(ref.timestamp).toLocaleString()
                              : new Date().toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Intent / Chat Input Bar (fixed at bottom) */}
            <div style={{
              padding:12,
              borderTop:"1px solid var(--stroke)",
              background:"var(--card)",
              display:"flex",
              flexDirection:"column",
              gap:8
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {activeSession === "buyer" && !result ? (
                <>
                  <input 
                    className="input" 
                    placeholder="I want to buy a 2BHK in Vizag under 50L near metro"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !loading && input.trim()) {
                        e.preventDefault();
                        onAnalyze();
                      }
                    }}
                    disabled={loading}
                    style={{
                      flex:1,
                      background:"var(--card)",
                      color:"var(--text)",
                      border:"1px solid var(--stroke)",
                      padding:"12px 16px",
                      borderRadius:12,
                      fontSize:13
                    }}
                  />
                  <button 
                    className="btn" 
                    onClick={onVoiceClick} 
                    disabled={loading}
                    style={{
                      padding:"12px 16px",
                      borderRadius:12,
                      minWidth:50
                    }}
                  >
                    🎤
                  </button>
                  <button 
                    className="btn primary" 
                    onClick={onAnalyze} 
                    disabled={loading || !input.trim()}
                    style={{
                      padding:"12px 24px",
                      borderRadius:12,
                      fontWeight:"bold"
                    }}
                  >
                    {loading ? "Analyzing..." : "Analyze"}
                  </button>
                </>
              ) : (
                <>
                  <input 
                    className="input" 
                    placeholder="Type a message... (e.g., 'I accept Agent A', 'Change to Agent B')"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !loading && chatInput.trim()) {
                        e.preventDefault();
                        handleChatSend();
                      }
                    }}
                    style={{
                      flex:1,
                      background:"var(--card)",
                      color:"var(--text)",
                      border:"1px solid var(--stroke)",
                      padding:"12px 16px",
                      borderRadius:12,
                      fontSize:13
                    }}
                  />
                  <SpeechToText 
                    onTranscript={handleSpeechTranscript}
                    disabled={loading}
                  />
                  <button 
                    className="btn primary" 
                    onClick={handleChatSend} 
                    disabled={loading || !chatInput.trim()}
                    style={{
                      padding:"12px 24px",
                      borderRadius:12,
                      fontWeight:"bold"
                    }}
                  >
                    Send
                  </button>
                </>
              )}
              </div>
              {/* Sir: Try suggestions (intent-ai-preview) */}
              {activeSession === "buyer" && !result && (
                <div style={{ paddingLeft: 4 }}>
                  <span className="small" style={{ fontSize: 11, opacity: 0.8 }}>Try: </span>
                  <button type="button" className="btn" style={{ fontSize: 11, padding: "4px 8px", marginLeft: 4 }} onClick={() => setInput("Investment property with rental yield")}>
                    Investment property with rental yield
                  </button>
                  <button type="button" className="btn" style={{ fontSize: 11, padding: "4px 8px", marginLeft: 4 }} onClick={() => setInput("Verify legal status of a flat")}>
                    Verify legal status of a flat
                  </button>
                </div>
              )}
              {error && activeSession === "buyer" && (
                <div style={{
                  padding:12,
                  background:"var(--bad-soft)",
                  borderRadius:8,
                  border:"1px solid var(--bad)"
                }}>
                  <div className="small" style={{color:"var(--bad)"}}><strong>Error:</strong> {error}</div>
                </div>
              )}
            </div>
          </div>

          {/* Property Images + Map Viewer */}
          {activeSession === "property" && (
            <div className="section card" style={{padding:12, marginTop:12}}>
              <div className="title">Property Viewer</div>
              
              {/* Scrollable Images */}
              {propertyImages.length > 0 ? (
                <div style={{
                  display:"flex",
                  gap:8,
                  overflowX:"auto",
                  padding:8,
                  marginTop:8,
                  borderRadius:8,
                  background:"var(--neutral-soft)"
                }}>
                  {propertyImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img.url}
                      alt={img.alt || `Property image ${idx + 1}`}
                      style={{
                        width:200,
                        height:150,
                        objectFit:"cover",
                        borderRadius:8,
                        cursor:"pointer"
                      }}
                      onClick={() => {
                        setShowMap(true);
                        setMapCoordinates(img.coordinates);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="small" style={{marginTop:8, padding:20, textAlign:"center", color:"var(--muted)"}}>
                  No property images available. Images will appear here when property is selected.
                </div>
              )}

              {/* Map View (shows on scroll/click) */}
              {showMap && mapCoordinates && (
                <div style={{marginTop:12, height:300, borderRadius:8, overflow:"hidden", border:"1px solid var(--stroke)"}}>
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{border:0}}
                    src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY"}&q=${mapCoordinates.lat},${mapCoordinates.lng}&zoom=15`}
                    allowFullScreen
                  />
                  <div className="small" style={{padding:8, background:"var(--neutral-soft)"}}>
                    📍 Location: {mapCoordinates.lat}, {mapCoordinates.lng}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Video Call - LiveKit Integration */}
          {(activeSession === "agent" || activeSession === "buyer") && showVideoCall && (
            <div className="section card" style={{padding:12, marginTop:12}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
                <div>
                  <div className="title">Video Call</div>
                  <div className="small">Live communication with {activeSession === "agent" ? "Agent" : "Buyer"}</div>
                </div>
                <button className="btn" onClick={() => setShowVideoCall(false)} style={{padding:"6px 12px", fontSize:12}}>
                  ✕
                </button>
              </div>
              <VideoCall 
                userName={keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || "User"}
                roomName={`intent-${result?.id || "default"}-${activeSession}`}
              />
            </div>
          )}
          
          {/* Video Call Toggle Button */}
          {(activeSession === "agent" || activeSession === "buyer") && !showVideoCall && (
            <div style={{marginTop:12, textAlign:"center"}}>
              <button 
                className="btn primary" 
                onClick={() => setShowVideoCall(true)}
                style={{width:"100%", padding:"10px"}}
              >
                📹 Start Video Call
              </button>
            </div>
          )}
        </div>

          {/* RIGHT: Your Buying Journey + Actions (wider, scroll right if needed) */}
          <div style={{
            display:"flex",
            flexDirection:"column",
            height:"calc(100vh - 180px)",
            maxHeight:"800px",
            overflowY:"auto",
            overflowX:"auto",
            minWidth:0,
            paddingRight:4
          }}>
          <div className="card" style={{ padding: 12 }}>
            <div className="title" style={{ fontSize: 14, marginBottom: 10 }}>Your Buying Journey</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>

              {/* 1. Intent Identified – click to expand */}
              <div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setJourneyExpanded(journeyExpanded === "intent" ? null : "intent")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setJourneyExpanded(journeyExpanded === "intent" ? null : "intent"); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 8, cursor: "pointer", background: journeyExpanded === "intent" ? "var(--cool-soft)" : "var(--neutral-soft)", border: "1px solid var(--stroke)" }}
                >
                  <span style={{ fontWeight: "bold", fontSize: 12 }}>1.</span>
                  <span style={{ flex: 1, fontSize: 12 }}>Intent Identified</span>
                  <span className="pill" style={{ fontSize: 9 }}>{result ? "Ready" : "Pending"}</span>
                  <span style={{ fontSize: 10 }}>{journeyExpanded === "intent" ? "▼" : "▶"}</span>
                </div>
                {journeyExpanded === "intent" && result && (
                  <div style={{ marginTop: 6, padding: 8, borderRadius: 8, background: "var(--neutral-soft)", border: "1px solid var(--stroke)", fontSize: 11 }}>
                    <div><b>Intent:</b> {formatIntentLabel(result.type)} · {result.payload?.location || "—"} · {result.payload?.budget ? "₹" + (result.payload.budget / 100000).toFixed(0) + "L" : "—"}</div>
                    <div style={{ marginTop: 4 }}><b>Notes:</b> {result?.payload?.originalText || "—"}</div>
                  </div>
                )}
              </div>

              {/* 2. Compliance Check – click to expand (Trust Receipt / gate / checks) */}
              <div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setJourneyExpanded(journeyExpanded === "compliance" ? null : "compliance")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setJourneyExpanded(journeyExpanded === "compliance" ? null : "compliance"); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 8, cursor: "pointer", background: journeyExpanded === "compliance" ? "var(--cool-soft)" : "var(--neutral-soft)", border: "1px solid var(--stroke)" }}
                >
                  <span style={{ fontWeight: "bold", fontSize: 12 }}>2.</span>
                  <span style={{ flex: 1, fontSize: 12 }}>Compliance Check</span>
                  <span className="pill" style={{ fontSize: 9 }}>{compliance ? (compliance.decision === "ALLOW" ? "Pass" : "Review") : "Pending"}</span>
                  <span style={{ fontSize: 10 }}>{journeyExpanded === "compliance" ? "▼" : "▶"}</span>
                </div>
                {journeyExpanded === "compliance" && (
                  <div style={{ marginTop: 6, padding: 8, borderRadius: 8, background: "var(--card)", color: "var(--text)", border: "1px solid var(--stroke)", fontSize: 11 }}>
                    {trustReceipt ? (
                      <>
                        <div><strong>Generated:</strong> {trustReceipt.generatedAt ? new Date(trustReceipt.generatedAt).toLocaleString() : "—"}</div>
                        <div style={{ marginTop: 4 }}>{trustReceipt.intentType} · {trustReceipt.location} · {trustReceipt.budget}</div>
                        {trustReceipt.checks?.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            {trustReceipt.checks.map((c, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 10 }}>
                                <span>{c.label}</span>
                                <span style={{ color: c.status === "OK" ? "var(--good)" : c.status === "PENDING" ? "var(--warn)" : "var(--muted)" }}>{c.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : compliance ? (
                      <>
                        <div>{compliance.decision === "ALLOW" ? "Intent is compliant and allowed to proceed." : compliance.decision === "DENY" ? "Intent is not compliant." : "Intent requires review."}</div>
                        <div style={{ marginTop: 6, fontWeight: 600, color: compliance.decision === "ALLOW" ? "var(--good)" : compliance.decision === "DENY" ? "var(--bad)" : "var(--warn)" }}>
                          {compliance.decision === "ALLOW" ? "✅ UNLOCKED" : compliance.decision === "DENY" ? "🔒 LOCKED" : "⚠️ LOCKED"}
                        </div>
                        {compliance.checks?.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            {compliance.checks.map((c, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 10 }}>
                                <span>{c.check}</span>
                                <span className={c.passed ? "statusPass" : "statusFail"}>{c.passed ? "PASS" : "FAIL"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ opacity: 0.7 }}>Enter your intent to see compliance status</div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Final Decisions – click to expand (decisions + Confirm all) */}
              <div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setJourneyExpanded(journeyExpanded === "decisions" ? null : "decisions")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setJourneyExpanded(journeyExpanded === "decisions" ? null : "decisions"); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 8, cursor: "pointer", background: journeyExpanded === "decisions" ? "var(--cool-soft)" : "var(--neutral-soft)", border: "1px solid var(--stroke)" }}
                >
                  <span style={{ fontWeight: "bold", fontSize: 12 }}>3.</span>
                  <span style={{ flex: 1, fontSize: 12 }}>Final Decisions</span>
                  <span className="pill" style={{ fontSize: 9 }}>{intentFilteredDecisions.length ? intentFilteredDecisions.filter(d => d.isConfirmed).length + "/" + intentFilteredDecisions.length : "—"}</span>
                  <span style={{ fontSize: 10 }}>{journeyExpanded === "decisions" ? "▼" : "▶"}</span>
                </div>
                {journeyExpanded === "decisions" && (
                  <div style={{ marginTop: 6, padding: 8, borderRadius: 8, background: "var(--neutral-soft)", border: "1px solid var(--stroke)" }}>
                    {intentFilteredDecisions.length > 0 && intentFilteredDecisions.some(d => !d.isConfirmed) && (onConfirmAll || onDecisionSelect) && (
                      <button className="btn primary" style={{ fontSize: 11, padding: "6px 10px", marginBottom: 8 }} onClick={async () => {
                        const pending = intentFilteredDecisions.filter(d => !d.isConfirmed && d.option);
                        if (onConfirmAll) {
                          await onConfirmAll(pending.map(d => ({ decisionId: d.decisionId, optionId: d.option.id })));
                        } else {
                          pending.forEach(d => onDecisionSelect(d.decisionId, d.option.id, true));
                        }
                      }} disabled={loading}>Confirm all</button>
                    )}
                    {intentFilteredDecisions.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {intentFilteredDecisions.map((decision, idx) => {
                          const dt = (decision.originalDecision?.type || "").toUpperCase();
                          const label = dt.includes("AGENT") ? "Agent" : dt.includes("PROPERTY") && !dt.includes("AGENT") ? "Property" : dt.includes("LENDER") || dt.includes("BANK") ? "Bank" : dt.includes("DOWN_PAYMENT") || dt.includes("DOWNPAYMENT") ? "Down payment" : formatDecisionTypeLabel(decision.type);
                          const value = decision.details || decision.option?.label || decision.option?.id || "—";
                          return (
                            <div key={decision.decisionId || idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4, padding: 6, borderRadius: 6, borderLeft: decision.isConfirmed ? "3px solid var(--good)" : "3px solid var(--warn)", background: decision.isConfirmed ? "var(--good-soft)" : "var(--neutral-soft)", fontSize: 11 }}>
                              <span><b>{label}</b> {value}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                {decision.isConfirmed ? (onDecisionChangeClick && <button type="button" className="btn" style={{ fontSize: 10, padding: "4px 8px" }} onClick={() => onDecisionChangeClick(decision, null)} disabled={loading}>Change</button>) : (<>{onDecisionSelect && decision.option && <button type="button" className="btn primary" style={{ fontSize: 10, padding: "4px 8px" }} onClick={() => onDecisionSelect(decision.decisionId, decision.option.id, true)} disabled={loading}>Accept</button>}{onDecisionChangeClick && <button type="button" className="btn" style={{ fontSize: 10, padding: "4px 8px" }} onClick={() => onDecisionChangeClick(decision, null)} disabled={loading}>Change</button>}</>)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="small" style={{ opacity: 0.6, fontSize: 11 }}>{result ? "No decisions for this intent yet; they appear after analysis." : "AI recommendations appear after intent analysis."}</div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Actions – click to expand */}
              <div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setJourneyExpanded(journeyExpanded === "actions" ? null : "actions")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setJourneyExpanded(journeyExpanded === "actions" ? null : "actions"); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, cursor: "pointer", background: journeyExpanded === "actions" ? "var(--cool-soft)" : "var(--neutral-soft)", border: "1px solid var(--stroke)" }}
                >
                  <span style={{ fontWeight: "bold", fontSize: 13 }}>4.</span>
                  <span style={{ flex: 1, fontSize: 13 }}>Actions</span>
                  <span className="pill" style={{ fontSize: 11 }}>{intentFilteredActions.length ? intentFilteredActions.filter(a => a.outcome === "COMPLETED" || a.outcome === "CONFIRMED").length + "/" + intentFilteredActions.length : "—"}</span>
                  <span style={{ fontSize: 12 }}>{journeyExpanded === "actions" ? "▼" : "▶"}</span>
                </div>
                {journeyExpanded === "actions" && (
                  <div style={{ marginTop: 6, padding: 12, borderRadius: 8, background: "var(--neutral-soft)", border: "1px solid var(--stroke)", overflowX: "auto", minWidth: 280 }}>
                    {intentFilteredActions.length > 0 ? (() => {
                      const actionMap = new Map();
                      intentFilteredActions.forEach(a => { const id = a.actionId || a.id; const done = a.outcome === "COMPLETED" || a.outcome === "CONFIRMED"; if (!actionMap.has(id)) actionMap.set(id, a); else { const ex = actionMap.get(id); if ((ex.outcome === "COMPLETED" || ex.outcome === "CONFIRMED") && !done) return; actionMap.set(id, a); } });
                      const list = Array.from(actionMap.values()).sort((a, b) => (a.order || a.sequence || 999) - (b.order || b.sequence || 999));
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {list.map((action, i) => {
                            const done = action.outcome === "COMPLETED" || action.outcome === "CONFIRMED";
                            const prev = i > 0 ? list[i - 1] : null;
                            const locked = prev && prev.outcome !== "COMPLETED" && prev.outcome !== "CONFIRMED" && prev.outcome !== "SKIPPED";
                            const actionId = action.actionId || action.id || `${action.description}-${action.order}`;
                            const showUpload = actionRequiresDocuments(action) && !locked;
                            const docs = actionDocuments[actionId] || [];
                            const addDocs = (files) => {
                              if (!files?.length) return;
                              const newEntries = Array.from(files).map((f, idx) => ({ id: `${actionId}-${Date.now()}-${idx}`, name: f.name, size: f.size }));
                              setActionDocuments(prev => ({ ...prev, [actionId]: [...(prev[actionId] || []), ...newEntries] }));
                            };
                            const removeDoc = (id) => setActionDocuments(prev => ({ ...prev, [actionId]: (prev[actionId] || []).filter(d => d.id !== id) }));
                            return (
                              <div key={action.actionId || actionId} style={{ opacity: locked ? 0.5 : 1, padding: 12, borderRadius: 8, borderLeft: !locked && !action.outcome ? "4px solid var(--primary)" : "none", background: "var(--neutral-soft)" }}>
                                <div style={{ fontSize: 15, lineHeight: 1.5, fontWeight: 500, marginBottom: 8, wordBreak: "break-word", overflowWrap: "break-word" }}>{locked && "🔒 "}{action.description || "Action"}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                  <span className="pill" style={{ fontSize: 13, padding: "4px 10px", background: done ? "var(--good-soft)" : "var(--neutral-soft)", color: done ? "var(--good)" : "var(--muted)" }}>{locked ? "Locked" : (action.outcome || "Ready")}</span>
                                  {!action.outcome && !locked && onActionOutcome && <><button type="button" className="btn primary" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => onActionOutcome(action, "COMPLETED")} disabled={loading}>Done</button><button type="button" className="btn" style={{ fontSize: 13, padding: "8px 12px" }} onClick={() => onActionOutcome(action, "FAILED")} disabled={loading}>Fail</button></>}
                                </div>
                                {showUpload && (
                                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--stroke)" }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--muted)" }}>Upload documents for verification</div>
                                    <input
                                      type="file"
                                      accept=".pdf,image/*,.doc,.docx"
                                      multiple
                                      onChange={(e) => { addDocs(e.target.files || []); e.target.value = ""; }}
                                      style={{ fontSize: 12, marginBottom: 8, maxWidth: "100%" }}
                                    />
                                    {docs.length > 0 && (
                                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                                        {docs.map((d) => (
                                          <li key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                            <span style={{ flex: 1, wordBreak: "break-word" }}>{d.name}</span>
                                            <button type="button" className="btn" style={{ fontSize: 11, padding: "2px 6px" }} onClick={() => removeDoc(d.id)} aria-label="Remove">×</button>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })() : (
                      <div className="small" style={{ opacity: 0.6, fontSize: 15 }}>{result ? "No actions for this intent yet; they appear after decisions." : "Actions appear after decisions."}</div>
                    )}
                  </div>
                )}
              </div>

              {/* 5. Session History – what we searched, got, decided, and completed */}
              <div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setJourneyExpanded(journeyExpanded === "history" ? null : "history")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setJourneyExpanded(journeyExpanded === "history" ? null : "history"); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, cursor: "pointer", background: journeyExpanded === "history" ? "var(--cool-soft)" : "var(--neutral-soft)", border: "1px solid var(--stroke)" }}
                >
                  <span style={{ fontWeight: "bold", fontSize: 13 }}>5.</span>
                  <span style={{ flex: 1, fontSize: 13 }}>Session History</span>
                  <span style={{ fontSize: 12 }}>{journeyExpanded === "history" ? "▼" : "▶"}</span>
                </div>
                {journeyExpanded === "history" && (
                  <div style={{ marginTop: 6, padding: 12, borderRadius: 8, background: "var(--neutral-soft)", border: "1px solid var(--stroke)", fontSize: 11 }}>
                    {result ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ paddingBottom: 8, borderBottom: "1px solid var(--stroke)" }}>
                          <b style={{ color: "var(--cool)" }}>What you searched</b>
                          <div style={{ marginTop: 4 }}>{formatIntentLabel(result.type)} · {result.payload?.location || "—"} {result.payload?.budget ? "· ₹" + (result.payload.budget / 100000).toFixed(0) + "L" : ""}</div>
                          {result?.payload?.originalText && <div className="small" style={{ marginTop: 4, opacity: 0.9 }}>{result.payload.originalText}</div>}
                        </div>
                        {ragResponse && (
                          <div style={{ paddingBottom: 8, borderBottom: "1px solid var(--stroke)" }}>
                            <b style={{ color: "var(--cool)" }}>What you got (insights)</b>
                            <div style={{ marginTop: 4 }}>{ragResponse.summary?.substring(0, 200) || "—"}{ragResponse.summary?.length > 200 ? "…" : ""}</div>
                            {ragResponse.sources?.length > 0 && <div className="small" style={{ marginTop: 4, opacity: 0.8 }}>{ragResponse.sources.length} source(s) referenced</div>}
                          </div>
                        )}
                        {compliance && (
                          <div style={{ paddingBottom: 8, borderBottom: "1px solid var(--stroke)" }}>
                            <b style={{ color: "var(--cool)" }}>Compliance</b>
                            <div style={{ marginTop: 4 }}>{compliance.decision === "ALLOW" ? "✅ Passed" : compliance.decision === "DENY" ? "❌ Denied" : "⚠️ Review"} {compliance.reason ? "· " + compliance.reason : ""}</div>
                          </div>
                        )}
                        {intentFilteredDecisions.length > 0 && (
                          <div style={{ paddingBottom: 8, borderBottom: "1px solid var(--stroke)" }}>
                            <b style={{ color: "var(--cool)" }}>What you decided</b>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                              {intentFilteredDecisions.map((d, i) => {
                                const dt = (d.originalDecision?.type || d.type || "").toUpperCase();
                                const label = dt.includes("AGENT") ? "Agent" : dt.includes("PROPERTY") && !dt.includes("AGENT") ? "Property" : dt.includes("LENDER") || dt.includes("BANK") ? "Bank" : dt.includes("DOWN_PAYMENT") ? "Down payment" : formatDecisionTypeLabel(d.type);
                                const value = d.details || d.option?.label || d.option?.id || "—";
                                return <div key={i}>{label}: {value} {d.isConfirmed ? "✓" : "(pending)"}</div>;
                              })}
                            </div>
                          </div>
                        )}
                        {intentFilteredActions.length > 0 && (
                          <div>
                            <b style={{ color: "var(--cool)" }}>Actions completed</b>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                              {intentFilteredActions.map((a, i) => {
                                const done = a.outcome === "COMPLETED" || a.outcome === "CONFIRMED";
                                return <div key={a.actionId || a.id || i} style={{ opacity: done ? 1 : 0.7 }}>{done ? "✓" : "○"} {a.description || "Action"}</div>;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="small" style={{ opacity: 0.6 }}>Start a search to see your session history here.</div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
