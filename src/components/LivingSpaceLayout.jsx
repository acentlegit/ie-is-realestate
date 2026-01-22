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
import VideoCall from "./VideoCall";
import SpeechToText from "./SpeechToText";
import keycloak from "../auth/keycloakAuth";
import { getAvailableSessions, getPrimaryRole, canAccessSession } from "../utils/roleUtils";
import { sortDecisionsByOrder, DECISION_ORDER } from "../services/emailService";

const ALL_SESSION_TYPES = [
  { key: "buyer", label: "Buyer", icon: "👤" },
  { key: "agent", label: "Agent", icon: "🏢" },
  { key: "lender", label: "Lender", icon: "💰" },
  { key: "property", label: "Property", icon: "🏠" },
  { key: "legal", label: "Legal", icon: "⚖️" },
];

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
}) {
  const [activeSession, setActiveSession] = useState("buyer");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [propertyImages, setPropertyImages] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState(null);
  const [showVideoCall, setShowVideoCall] = useState(false);

  // Role-based access: Get available sessions based on user role
  const availableSessions = useMemo(() => getAvailableSessions(), []);
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
      // Format: 3BHK, 45Lakhs, MVP Colony
      const parts = [];
      if (option.type) parts.push(option.type); // e.g., "3BHK"
      if (option.price) parts.push(`₹${(option.price / 100000).toFixed(0)}Lakhs`);
      if (option.location || option.address) parts.push(option.location || option.address);
      return parts.join(", ") || option.label || "N/A";
    } else if (decisionType.includes("LENDER") || decisionType.includes("BANK")) {
      // Format: (bank name, interest rate, LTV, loan upto)
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
      const isConfirmed = d.evolutionState === "CONFIRMED";
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

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <div className="h1">Intent AI Platform — Real Estate</div>
          <div className="sub">Living Space UI · All Engines Connected · Email Automation</div>
        </div>
        <div style={{display:"flex", gap:10, alignItems:"center"}}>
          <button className="btn" onClick={()=>window.location.reload()}>Refresh</button>
          <span className="pill">Status: <b>{loading ? "Processing" : result ? "Active" : "Ready"}</b></span>
        </div>
      </div>

      <div className="grid" style={{height:"calc(100vh - 140px)", maxHeight:"900px"}}>
        {/* LEFT: Sessions */}
        <div className="card" style={{overflowY:"auto", overflowX:"hidden"}}>
          <div className="title" style={{fontSize:result ? 13 : 16}}>Sessions</div>
          <div className="small" style={{fontSize:result ? 10 : 12}}>Switch between different session types</div>
          
          {/* Role Badge */}
          <div style={{marginTop:8, marginBottom:8, padding:"6px 10px", background:"rgba(59,130,246,0.2)", borderRadius:6, fontSize:11}}>
            <b>Role:</b> {userRole.toUpperCase()}
          </div>

          {/* Participants List - Show active users by role */}
          {result && (
            <div style={{marginTop:12, marginBottom:12, paddingTop:12, borderTop:"1px solid var(--stroke)"}}>
              <div className="title" style={{fontSize:12, marginBottom:8}}>Participants</div>
              <div className="small" style={{fontSize:10, marginBottom:6}}>Active users in this intent</div>
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                {/* Buyer - Always present */}
                <div style={{display:"flex", alignItems:"center", gap:6, padding:"6px 8px", background:"rgba(0,0,0,0.1)", borderRadius:6}}>
                  <span style={{fontSize:14}}>👤</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11, fontWeight:"bold"}}>Buyer</div>
                    <div className="small" style={{fontSize:9, opacity:0.7}}>
                      {keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || "You"}
                    </div>
                  </div>
                  <span className="pill" style={{fontSize:9, background:"rgba(34,197,94,0.2)", color:"var(--good)"}}>ONLINE</span>
                </div>
                
                {/* Agent - If agent decision is confirmed */}
                {decisions.some(d => d.type === "SELECT_AGENT" && d.evolutionState === "CONFIRMED") && (
                  <div style={{display:"flex", alignItems:"center", gap:6, padding:"6px 8px", background:"rgba(0,0,0,0.1)", borderRadius:6}}>
                    <span style={{fontSize:14}}>🏢</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11, fontWeight:"bold"}}>Agent</div>
                      <div className="small" style={{fontSize:9, opacity:0.7}}>
                        {(() => {
                          const agentDecision = decisions.find(d => d.type === "SELECT_AGENT" && d.evolutionState === "CONFIRMED");
                          const agentOption = agentDecision?.options?.find(opt => opt.id === agentDecision.selectedOptionId);
                          return agentOption?.label || agentOption?.name || "Selected Agent";
                        })()}
                      </div>
                    </div>
                    <span className="pill" style={{fontSize:9, background:"rgba(251,191,36,0.2)", color:"var(--warn)"}}>PENDING</span>
                  </div>
                )}
                
                {/* Lender/Bank - If lender decision is confirmed */}
                {decisions.some(d => d.type === "SELECT_LENDER" && d.evolutionState === "CONFIRMED") && (
                  <div style={{display:"flex", alignItems:"center", gap:6, padding:"6px 8px", background:"rgba(0,0,0,0.1)", borderRadius:6}}>
                    <span style={{fontSize:14}}>💰</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11, fontWeight:"bold"}}>Lender</div>
                      <div className="small" style={{fontSize:9, opacity:0.7}}>
                        {(() => {
                          const lenderDecision = decisions.find(d => d.type === "SELECT_LENDER" && d.evolutionState === "CONFIRMED");
                          const lenderOption = lenderDecision?.options?.find(opt => opt.id === lenderDecision.selectedOptionId);
                          return lenderOption?.label || lenderOption?.name || "Selected Bank";
                        })()}
                      </div>
                    </div>
                    <span className="pill" style={{fontSize:9, background:"rgba(251,191,36,0.2)", color:"var(--warn)"}}>PENDING</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session List - Filtered by Role */}
          <div style={{marginTop:result ? 8 : 12}}>
            {availableSessions.map(session => (
              <div
                key={session.key}
                className={`roomItem ${activeSession === session.key ? "active" : ""}`}
                onClick={() => setActiveSession(session.key)}
                style={{cursor:"pointer", padding:result ? "8px" : undefined}}
              >
                <div style={{display:"flex", justifyContent:"space-between", gap:10}}>
                  <div style={{fontWeight:950, display:"flex", alignItems:"center", gap:8, fontSize:result ? 12 : undefined}}>
                    <span>{session.icon}</span>
                    <span>{session.label}</span>
                  </div>
                  {activeSession === session.key && (
                    <span className="pill" style={{fontSize:result ? 9 : undefined}}>ACTIVE</span>
                  )}
                </div>
                <div className="small" style={{marginTop:result ? 4 : 6, fontSize:result ? 10 : undefined}}>
                  {session.key === "buyer" && "Your property search session"}
                  {session.key === "agent" && "Agent communication & coordination"}
                  {session.key === "lender" && "Loan & financing details"}
                  {session.key === "property" && "Property details & documents"}
                  {session.key === "legal" && "Legal compliance & verification"}
                </div>
              </div>
            ))}
          </div>

          {/* AI Concierge - Moved to Left Panel */}
          {result && (
            <div style={{marginTop:20, paddingTop:20, borderTop:"1px solid var(--stroke)"}}>
              <div className="title" style={{fontSize:14, marginBottom:8}}>AI Concierge</div>
              <div style={{display:"grid", gap:8}}>
                <div style={{padding:8, borderRadius:8, border:"1px solid var(--stroke)", background:"rgba(0,0,0,0.18)"}}>
                  <b style={{fontSize:11}}>📋 Intent</b>
                  <div className="small" style={{marginTop:4, fontSize:10}}>
                    <b>Type:</b> {result.type || "N/A"}
                  </div>
                  {result.payload?.location && (
                    <div className="small" style={{fontSize:10}}>
                      <b>Location:</b> {result.payload.location}
                    </div>
                  )}
                  {result.payload?.budget && (
                    <div className="small" style={{fontSize:10}}>
                      <b>Budget:</b> ₹{(result.payload.budget / 100000).toFixed(0)}L
                    </div>
                  )}
                </div>
                <div style={{padding:8, borderRadius:8, border:"1px solid var(--stroke)", background:"rgba(0,0,0,0.18)"}}>
                  <b style={{fontSize:11}}>📝 Notes</b>
                  <div className="small" style={{marginTop:4, fontSize:10}}>
                    {result?.payload?.originalText || "Analysis notes..."}
                  </div>
                </div>
                <div style={{padding:8, borderRadius:8, border:"1px solid var(--stroke)", background:"rgba(0,0,0,0.18)"}}>
                  <b style={{fontSize:11}}>💡 Hint</b>
                  <div className="small" style={{marginTop:4, fontSize:10}}>
                    {actions.length > 0 ? actions[0].guidance || "Follow actions below" : "Complete compliance check"}
                  </div>
                </div>
                <div style={{padding:8, borderRadius:8, border:"1px solid var(--stroke)", background:"rgba(0,0,0,0.18)"}}>
                  <b style={{fontSize:11}}>➡️ Next</b>
                  <div className="small" style={{marginTop:4, fontSize:10}}>
                    {actions.length > 0 ? actions[0].description : "Complete decisions"}
                  </div>
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
                {result ? `${result.type || "Intent"} · ${result.payload?.location || "Location"}` : "No active intent"}
              </div>
            </div>
            <span className="pill">Session: <b>{activeSessionData?.label}</b></span>
          </div>

          {/* Modern Chat Interface */}
          <div style={{display:"flex", flexDirection:"column", flex:1, overflow:"hidden", background:"rgba(0,0,0,0.2)", borderRadius:12, border:"1px solid var(--stroke)"}}>
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
                        background:"rgba(139,92,246,0.15)",
                        border:"1px solid rgba(139,92,246,0.3)",
                        color:"var(--text)"
                      }}>
                        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
                          <div style={{
                            width:32,
                            height:32,
                            borderRadius:"50%",
                            background:"rgba(139,92,246,0.3)",
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
                          <div style={{marginTop:10, padding:10, background:"rgba(59,130,246,0.1)", borderRadius:8, fontSize:12}}>
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
                            <div key={idx} style={{marginBottom:8, padding:8, background:"rgba(0,0,0,0.2)", borderRadius:6}}>
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
                    Intent processed: <b>{result.type || "N/A"}</b>
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
                        background:"rgba(139,92,246,0.3)",
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
                      <div style={{marginTop:10, padding:10, background:"rgba(59,130,246,0.1)", borderRadius:8, fontSize:12}}>
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
                        <div key={idx} style={{marginBottom:8, padding:8, background:"rgba(0,0,0,0.2)", borderRadius:6}}>
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
                    return "rgba(255,255,255,0.08)";
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
                        : "rgba(255,255,255,0.08)",
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
              
              {/* Confirmed Decisions - Modern Cards */}
              {!loading && allDecisions.filter(d => d.isConfirmed).length > 0 && (
                allDecisions.filter(d => d.isConfirmed).map((decision) => (
                  <div key={decision.decisionId} style={{
                    alignSelf:"flex-start",
                    maxWidth:"75%",
                    padding:14,
                    borderRadius:16,
                    background:"rgba(34,197,94,0.15)",
                    border:"1px solid rgba(34,197,94,0.3)"
                  }}>
                    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
                      <div style={{
                        width:32,
                        height:32,
                        borderRadius:"50%",
                        background:"rgba(34,197,94,0.3)",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"center",
                        fontSize:16
                      }}>✅</div>
                      <div>
                        <b style={{fontSize:12}}>Decision Confirmed</b>
                        <div className="small" style={{fontSize:10, opacity:0.7}}>
                          {decision.decisionTimestamp ? new Date(decision.decisionTimestamp).toLocaleString() : new Date().toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div style={{marginTop:8, fontSize:13}}>
                      <b>{decision.type}:</b> {decision.details || decision.option?.label || decision.option?.id}
                    </div>
                    {decision.decidedBy && (
                      <div style={{marginTop:6, fontSize:11, opacity:0.8}}>
                        Decided by: {decision.decidedBy} · Method: {decision.decisionMethod || "chat"}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {/* Modern Chat Input Bar */}
            <div style={{
              padding:12,
              borderTop:"1px solid var(--stroke)",
              background:"rgba(0,0,0,0.3)",
              display:"flex",
              gap:8,
              alignItems:"center"
            }}>
              {activeSession === "buyer" && !result ? (
                <>
                  <input 
                    className="input" 
                    placeholder="Describe your intent... (e.g., Buy a home in Vizag Under 50L)"
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
                      background:"rgba(0,0,0,0.4)",
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
                      background:"rgba(0,0,0,0.4)",
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
              {error && activeSession === "buyer" && (
                <div style={{
                  marginTop:12,
                  padding:12,
                  background:"rgba(239,68,68,0.2)",
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
                  background:"rgba(0,0,0,0.2)"
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
                  <div className="small" style={{padding:8, background:"rgba(0,0,0,0.3)"}}>
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

          {/* RIGHT: Actions + Decisions + Trust Receipt - Scrollable Panel */}
          <div style={{
            display:"flex",
            flexDirection:"column",
            height:"calc(100vh - 180px)",
            maxHeight:"800px",
            overflowY:"auto",
            overflowX:"hidden",
            paddingRight:4
          }}>
          {/* Trust Receipt (Compliance Gate) */}
          <div className="card" style={{padding:result ? 8 : 12, marginBottom:result ? 8 : 12}}>
            <div className="title" style={{fontSize:result ? 13 : 16}}>Trust Receipt (Certification Gate)</div>
            {compliance ? (
              <>
                <div className="small">
                  {compliance.decision === "ALLOW" ? "Intent is compliant and allowed to proceed." : 
                   compliance.decision === "DENY" ? "Intent is not compliant and cannot proceed." : 
                   "Intent requires review before proceeding."}
                </div>
                
                <div style={{marginTop:result ? 6 : 10}}>
                  <div className="small" style={{fontSize:result ? 10 : 12}}><b>Gate Status:</b></div>
                  <div style={{fontSize:result ? 14 : 20, fontWeight:950, color:compliance.decision === "ALLOW" ? "var(--good)" : compliance.decision === "DENY" ? "var(--bad)" : "var(--warn)", marginTop:4}}>
                    {compliance.decision === "ALLOW" ? "✅ UNLOCKED" : compliance.decision === "DENY" ? "🔒 LOCKED" : "⚠️ LOCKED"}
                  </div>
                </div>

                {compliance.checks && compliance.checks.length > 0 && (
                  <div className="list" style={{marginTop:result ? 6 : 10}}>
                    {compliance.checks.map((c,i)=>(
                      <div key={i} className="item" style={{display:"flex", justifyContent:"space-between", gap:10, padding:result ? "6px" : undefined}}>
                        <div>
                          <b style={{fontSize:result ? 11 : undefined}}>{c.check}</b>
                          <div className="small" style={{fontSize:result ? 9 : undefined}}>{c.reason}</div>
                        </div>
                        <div className={c.passed ? "statusPass" : "statusFail"} style={{fontSize:result ? 9 : undefined}}>{c.passed ? "PASS" : "FAIL"}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Decision Audit Trail - Only show if there are confirmed decisions */}
                {allDecisions.filter(d => d.isConfirmed).length > 0 && (
                  <div style={{marginTop:result ? 8 : 15, paddingTop:result ? 8 : 15, borderTop:"1px solid var(--stroke)"}}>
                    <div className="small" style={{fontWeight:"bold", marginBottom:result ? 4 : 8, fontSize:result ? 10 : undefined}}>Decision Audit Trail:</div>
                    <div className="list" style={{marginTop:result ? 4 : 8}}>
                      {allDecisions.filter(d => d.isConfirmed).map((rec, idx) => (
                        <div key={idx} className="item" style={{padding:result ? 6 : 8}}>
                          <div className="small" style={{fontSize:result ? 10 : undefined}}><b>{rec.type}:</b></div>
                          {rec.recommendedOption && (
                            <div className="small" style={{marginTop:result ? 2 : 4, opacity:0.8, fontSize:result ? 9 : undefined}}>
                              AI Recommended: {rec.recommendedOption.label || rec.recommendedOption.id} ({rec.confidence.toFixed(0)}%)
                            </div>
                          )}
                          <div className="small" style={{marginTop:result ? 1 : 2, fontSize:result ? 10 : undefined}}>
                            Final Decision: <b>{rec.details || rec.option?.label || rec.option?.id}</b>
                          </div>
                          {rec.decidedBy && (
                            <div className="small" style={{marginTop:result ? 1 : 2, fontSize:result ? 9 : 10, opacity:0.8}}>
                              Decided by: {rec.decidedBy} · Method: {rec.decisionMethod || "chat"}
                            </div>
                          )}
                          {rec.decisionTimestamp && (
                            <div className="small" style={{fontSize:result ? 9 : 10, opacity:0.7}}>
                              {new Date(rec.decisionTimestamp).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="small" style={{marginTop:8, opacity:0.6}}>
                Enter your intent to see compliance status
              </div>
            )}
          </div>

          {/* Final Decisions Panel - Shows all decisions (pending + confirmed) with Accept/Change/Reject */}
          <div className="section card" style={{padding:12, marginBottom:12}}>
            <div className="title" style={{fontSize:16}}>Final Decisions</div>
            <div className="small" style={{fontSize:12}}>Review AI recommendations and confirm your decisions.</div>
            {allDecisions.length > 0 ? (
              <div className="list" style={{marginTop:10}}>
                {allDecisions.map((decision, idx) => {
                  const decisionType = (decision.originalDecision?.type || "").toUpperCase();
                  const isAgent = decisionType.includes("AGENT");
                  const isProperty = decisionType.includes("PROPERTY");
                  const isBank = decisionType.includes("LENDER") || decisionType.includes("BANK");
                  const isDownPayment = decisionType.includes("DOWN_PAYMENT") || decisionType.includes("DOWNPAYMENT");
                  
                  return (
                    <div key={decision.decisionId || idx} className="item" style={{
                      borderLeft: decision.isConfirmed ? "3px solid var(--good)" : "3px solid var(--warn)",
                      padding: "12px 12px 12px 12px"
                    }}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
                        <b style={{fontSize:14}}>
                          {isAgent && "Agent"}
                          {isProperty && "Property"}
                          {isBank && "Bank"}
                          {isDownPayment && "Down Payment"}
                          {!isAgent && !isProperty && !isBank && !isDownPayment && decision.type}
                        </b>
                        <span className="pill" style={{
                          background: decision.isConfirmed ? "rgba(34,197,94,0.2)" : "rgba(251,191,36,0.2)",
                          color: decision.isConfirmed ? "var(--good)" : "var(--warn)",
                          fontSize:10
                        }}>
                          {decision.isConfirmed ? "✅ CONFIRMED" : `⏳ ${decision.confidence.toFixed(0)}%`}
                        </span>
                      </div>
                      
                      {/* Detailed Decision Information */}
                      <div style={{
                        padding:10,
                        background: decision.isConfirmed ? "rgba(34,197,94,0.1)" : "rgba(59,130,246,0.1)",
                        borderRadius:6,
                        border: decision.isConfirmed ? "1px solid var(--good)" : "1px solid var(--cool)",
                        marginBottom:8
                      }}>
                        {decision.isConfirmed ? (
                          // For confirmed decisions, show detailed format
                          <div className="small" style={{fontSize:13, lineHeight:1.6, fontWeight:500}}>
                            {(() => {
                              // Always use formatDecisionDetails for confirmed decisions
                              const option = decision.option || decision.selectedOption;
                              if (!option) return "Not available";
                              
                              // Use the formatDecisionDetails function with correct confidence
                              const decisionForFormat = {
                                ...decision.originalDecision,
                                confidence: (decision.confidence || 0) / 100, // Convert back to 0-1 for formatDecisionDetails
                                type: decision.originalDecision?.type || decision.type
                              };
                              
                              const formatted = formatDecisionDetails(decisionForFormat, option);
                              return formatted || decision.details || option.label || "Not available";
                            })()}
                          </div>
                        ) : (
                          // For pending decisions, show recommendation with reasoning
                          <>
                            {decision.details ? (
                              <div className="small" style={{fontSize:13, lineHeight:1.6, fontWeight:400}}>
                                {decision.details}
                              </div>
                            ) : (
                              <div className="small" style={{fontSize:12}}>
                                {decision.option?.label || decision.option?.id || "Not available"}
                              </div>
                            )}
                            {decision.reasoning && (
                              <div className="small" style={{marginTop:6, fontSize:10, fontStyle:"italic", opacity:0.8}}>
                                💡 {decision.reasoning}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* Action Buttons - Only show for pending decisions */}
                      {!decision.isConfirmed && (
                        <div style={{display:"flex", gap:6, marginTop:8}}>
                          <button 
                            className="btn primary" 
                            style={{flex:1, fontSize:11, padding:"8px 12px"}}
                            onClick={() => {
                              if (onDecisionSelect && decision.option) {
                                onDecisionSelect(decision.decisionId, decision.option.id, true);
                              }
                            }}
                            disabled={loading}
                          >
                            ✅ Accept
                          </button>
                          <button 
                            className="btn" 
                            style={{flex:1, fontSize:11, padding:"8px 12px"}}
                            onClick={() => {
                              if (onDecisionChangeClick) {
                                onDecisionChangeClick(decision, null);
                              }
                            }}
                            disabled={loading}
                          >
                            🔄 Change
                          </button>
                          <button 
                            className="btn" 
                            style={{flex:1, fontSize:11, padding:"8px 12px", background:"rgba(239,68,68,0.2)", color:"var(--bad)"}}
                            onClick={() => {
                              // Reject logic - could mark as rejected or skip
                              console.log("Reject decision:", decision.decisionId);
                            }}
                            disabled={loading}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      )}
                      
                      {/* Confirmed Decision Info + Change Button */}
                      {decision.isConfirmed && (
                        <div>
                          <div style={{marginTop:8, padding:6, background:"rgba(34,197,94,0.05)", borderRadius:4, marginBottom:8}}>
                            {decision.decidedBy && (
                              <div className="small" style={{fontSize:10, opacity:0.8}}>
                                Approved by: {decision.decidedBy}
                              </div>
                            )}
                            {decision.decisionMethod && (
                              <div className="small" style={{fontSize:10, opacity:0.8}}>
                                Method: {decision.decisionMethod === "chat" ? "💬 Chat" : decision.decisionMethod === "voice" ? "🎤 Voice" : decision.decisionMethod}
                              </div>
                            )}
                            {decision.decisionTimestamp && (
                              <div className="small" style={{fontSize:10, opacity:0.7, marginTop:4}}>
                                {new Date(decision.decisionTimestamp).toLocaleString()}
                              </div>
                            )}
                          </div>
                          {/* Change Button for Confirmed Decisions - Only show if actually confirmed */}
                          {decision.originalDecision?.evolutionState === "CONFIRMED" && (
                            <button 
                              className="btn" 
                              style={{width:"100%", fontSize:11, padding:"8px 12px", marginTop:8}}
                              onClick={() => {
                                if (onDecisionChangeClick && decision.originalDecision?.evolutionState === "CONFIRMED") {
                                  onDecisionChangeClick(decision, null);
                                } else {
                                  console.warn("Cannot change decision: not in CONFIRMED state", decision.originalDecision?.evolutionState);
                                }
                              }}
                              disabled={loading}
                            >
                              🔄 Change Decision
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="small" style={{marginTop:10, opacity:0.6, fontSize:11}}>
                AI recommendations will appear here after intent analysis
              </div>
            )}
          </div>


          {/* Actions */}
          <div className="section card" style={{padding:12}}>
            <div className="title" style={{fontSize:16}}>Actions</div>
            <div className="small" style={{fontSize:12}}>Track and complete actions for this intent.</div>
            {uniqueActions.length > 0 ? (() => {
              // Filter actions: show only the latest version of each action
              // If an action is completed, don't show it again as pending
              const actionMap = new Map();
              uniqueActions.forEach(action => {
                const id = action.actionId || action.id;
                const isCompleted = action.outcome === "COMPLETED" || action.outcome === "CONFIRMED";
                
                if (!actionMap.has(id)) {
                  actionMap.set(id, action);
                } else {
                  const existing = actionMap.get(id);
                  const existingIsCompleted = existing.outcome === "COMPLETED" || existing.outcome === "CONFIRMED";
                  
                  // If existing is completed and new one is pending, don't replace (completed takes precedence)
                  if (existingIsCompleted && !isCompleted) {
                    // Keep existing completed action
                    return;
                  }
                  // If new one is completed or both are pending, use the new one
                  actionMap.set(id, action);
                }
              });
              
              // Convert to array and sort
              const displayActions = Array.from(actionMap.values()).sort((a, b) => {
                const orderA = a.order || a.sequence || 999;
                const orderB = b.order || b.sequence || 999;
                return orderA - orderB;
              });
              
              return (
                <div className="list" style={{marginTop:10}}>
                  {displayActions.map((action, index) => {
                    const isCompleted = action.outcome === "COMPLETED" || action.outcome === "CONFIRMED";
                    const isFailed = action.outcome === "FAILED";
                    const isRescheduled = action.outcome === "RESCHEDULED";
                    const previousAction = index > 0 ? displayActions[index - 1] : null;
                    const isLocked = previousAction && 
                      previousAction.outcome !== "COMPLETED" && 
                      previousAction.outcome !== "CONFIRMED" &&
                      previousAction.outcome !== "SKIPPED";
                    
                    return (
                      <div key={action.actionId} className="item" style={{
                        opacity: isLocked ? 0.5 : 1,
                        borderLeft: !isLocked && !action.outcome ? "3px solid var(--primary)" : "none",
                        padding: !isLocked && !action.outcome ? "12px 12px 12px 12px" : "12px"
                      }}>
                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
                          <div style={{display:"flex", alignItems:"center", gap:8}}>
                            {isLocked && <span style={{fontSize:18}}>🔒</span>}
                            <b style={{fontSize:14}}>{action.description || "Action"}</b>
                          </div>
                          <span className="pill" style={{
                            background:isCompleted ? "rgba(34,197,94,0.2)" : 
                                      isFailed ? "rgba(239,68,68,0.2)" : 
                                      isRescheduled ? "rgba(251,191,36,0.2)" :
                                      isLocked ? "rgba(107,114,128,0.2)" :
                                      "rgba(255,255,255,0.06)", 
                            color:isCompleted ? "var(--good)" : 
                                   isFailed ? "var(--bad)" : 
                                   isRescheduled ? "var(--warn)" :
                                   isLocked ? "var(--muted)" :
                                   "var(--muted)",
                            fontSize:10
                          }}>
                            {isLocked ? "🔒 LOCKED" : action.outcome || action.status || "READY"}
                          </span>
                        </div>
                        {action.guidance && (
                          <div className="small" style={{marginBottom:8, fontSize:12}}>💡 {action.guidance}</div>
                        )}
                        {isLocked && (
                          <div className="small" style={{marginBottom:8, color:"var(--muted)", fontStyle:"italic", fontSize:11}}>
                            ⏳ Waiting for previous action to complete
                          </div>
                        )}
                        {!action.outcome && !isLocked && (
                          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                            <button className="btn primary" onClick={()=>onActionOutcome(action, "COMPLETED")} disabled={loading} style={{fontSize:11, padding:"8px 12px"}}>Complete</button>
                            <button className="btn" onClick={()=>onActionOutcome(action, "FAILED")} disabled={loading} style={{fontSize:11, padding:"8px 12px"}}>Fail</button>
                            <button className="btn" onClick={()=>onActionOutcome(action, "RESCHEDULED")} disabled={loading} style={{fontSize:11, padding:"8px 12px"}}>Reschedule</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              <div className="small" style={{marginTop:10, opacity:0.6}}>
                Actions will appear here after decisions are made
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
