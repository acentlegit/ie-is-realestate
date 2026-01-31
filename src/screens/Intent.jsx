import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  analyzeIntent,
  checkCompliance,
  getDecisions,
  getActions,
  checkResume,
  selectDecision,
  changeDecision,
  updateActionOutcome,
  evaluateRisk,
  getExplainability,
  getEvidenceByIntent, // Phase 12
  emitVoiceEvidence, // Phase 13.1
  queryRAG, // Phase 14: RAG Integration
  determineCountry, // Phase 14: Country detection
} from "../api/intentApi";
import { createAgentRequest } from "../api/agentRequestApi";
import { parseVoiceCommand } from "../utils/voiceCommandParser"; // Phase 13.1
import keycloak from "../auth/keycloakAuth";
import { useProgressionTree } from "../progression/useProgressionTree";
import { parseMultipleIntents, createIntentPayload } from "../utils/multiIntentParser"; // Multi-intent support
import {
  sendInitialConfirmationEmail,
  sendActionStatusEmail,
  areAllDecisionsConfirmed,
  extractDecisionValues,
  // Phase 3: All 9 email trigger points
  sendIntentCreatedEmail,
  sendComplianceResultEmail,
  sendDecisionGeneratedEmail,
  sendDecisionConfirmedEmail,
  sendDecisionChangedEmail,
  sendActionCreatedEmail,
  sendIntentCompletedEmail,
} from "../services/emailService";
import LivingSpaceLayout from "../components/LivingSpaceLayout";
import "../styles/living-space.css";
import { getRefinementPrompt } from "../services/refinementService";
import { matchBanks } from "../services/loanService";
import { calculateROI } from "../services/roiService";
import { routeModel } from "../services/routeModelService";
import { calibrateConfidence } from "../services/confidenceService";
import { generateTrustReceipt } from "../services/trustReceiptService";
import { loadIntentHistory, saveIntentHistory, saveCurrentSessionToHistory } from "../utils/intentHistoryStorage";

function fmtTime(ts) {
  return new Date(ts).toLocaleString();
}

function safeText(v) {
  if (v === null || v === undefined) return "";
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default function Intent() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [actions, setActions] = useState([]);
  const [lifecycleState, setLifecycleState] = useState(null);
  const [error, setError] = useState(null);

  // Phase 11: Risk + Explainability state
  const [riskResult, setRiskResult] = useState(null);
  const [explainabilityResult, setExplainabilityResult] = useState(null);

  // Phase 12: Audit Trail state
  const [evidenceList, setEvidenceList] = useState([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  // Phase 14: RAG Integration state
  const [ragResponse, setRagResponse] = useState(null);
  const [ragLoading, setRagLoading] = useState(false);

  // Phase 5.4: Resume state
  const [resumeData, setResumeData] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(true);

  // Multi-Intent Support: Store multiple intents and current active intent
  const [multipleIntents, setMultipleIntents] = useState([]); // Array of { intent, decisions, actions, compliance, etc. }
  const [intentHistory, setIntentHistory] = useState([]); // Previous intent sessions for History tab (persisted per user)
  const [activeIntentIndex, setActiveIntentIndex] = useState(0); // Index of currently active intent
  const latestSessionRef = useRef({ result: null, compliance: null, decisions: [], actions: [], lifecycleState: null, ragResponse: null });

  // Intent Progression Tree (after resumeData is declared)
  // Hooks must be called unconditionally, so we always call it
  const buyerName = keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || "You";
  const currentIntentId = result?.id || resumeData?.intentId || "";
  
  // Always call the hook (React rule - hooks must be called unconditionally)
  const progression = useProgressionTree({
    intentId: currentIntentId || "", // Empty string if no intent
    buyerName,
    decisions: decisions || [],
  });
  
  // Extract values (will be null if no intent)
  const hierarchicalTree = progression.hierarchicalTree;
  const handleEntityAction = progression.handleEntityAction;

  // Phase 5.4: Decision change modal
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [decisionToChange, setDecisionToChange] = useState(null);
  const [newOptionForChange, setNewOptionForChange] = useState(null);
  const [changeReason, setChangeReason] = useState("");

  // Phase 5.4: Action outcome modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionForOutcome, setActionForOutcome] = useState(null);
  const [outcomeType, setOutcomeType] = useState(null);
  const [outcomeReason, setOutcomeReason] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");

  // Phase 2: Chat message handler ref (for adding system messages)
  const addChatMessageRef = useRef(null);

  // Phase 3: Track if Intent Completed email has been sent (prevent duplicates)
  const intentCompletedEmailSentRef = useRef(false);
  
  // Track last lifecycle state we fetched actions for (prevent regeneration)
  // Key format: `${intentId}:${lifecycleState}` to track per intent
  const actionsFetchedForRef = useRef(new Set());

  // Voice Input State
  const [voiceState, setVoiceState] = useState("idle"); // "idle" | "listening" | "transcribing" | "ready"
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const recognitionRunningRef = useRef(false); // Track actual recognition state (independent of React state)
  const handleAnalyzeRef = useRef(null); // Ref to store latest handleAnalyze

  // Phase 13.1: AI Agent Mode state
  const [aiAgentMode, setAiAgentMode] = useState(() => {
    // Load from localStorage, default to false
    const saved = localStorage.getItem("aiAgentMode");
    return saved === "true";
  });
  const rightPanelRef = useRef(null); // Ref to right panel for scrolling

  // Phase 13.2: Confirmation state for voice commands
  const [voiceConfirmation, setVoiceConfirmation] = useState(null); // { type, action, params, timeout }
  const confirmationTimeoutRef = useRef(null);

  // Phase 13.2: Cleanup confirmation timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
      }
    };
  }, []);

  // Phase 13.4: Helper function for reliable text-to-speech
  const speakText = useCallback((text, options = {}) => {
    if (!window.speechSynthesis) {
      console.warn("[Voice Agent] Speech Synthesis not available");
      return false;
    }

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Small delay to ensure cancellation is processed
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure speech settings
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        utterance.lang = options.lang || "en-US";
        
        // Event handlers
        utterance.onstart = () => {
          console.log("[Voice Agent] Speech started:", text.substring(0, 50));
          if (options.onStart) options.onStart();
        };
        
        utterance.onerror = (error) => {
          console.error("[Voice Agent] Speech error:", error);
          // Retry once if error occurs
          if (error.error === "network" && !options.retried) {
            console.log("[Voice Agent] Retrying speech after network error...");
            setTimeout(() => {
              speakText(text, { ...options, retried: true });
            }, 500);
          }
          if (options.onError) options.onError(error);
        };
        
        utterance.onend = () => {
          console.log("[Voice Agent] Speech ended");
          if (options.onEnd) options.onEnd();
        };
        
        utterance.onpause = () => {
          console.log("[Voice Agent] Speech paused");
        };
        
        utterance.onresume = () => {
          console.log("[Voice Agent] Speech resumed");
        };
        
        // Speak
        window.speechSynthesis.speak(utterance);
        console.log("[Voice Agent] Queued speech:", text.substring(0, 50));
      }, 100);
      
      return true;
    } catch (error) {
      console.error("[Voice Agent] Error setting up speech:", error);
      return false;
    }
  }, []);

  // Phase 13.4: Content extraction functions for read commands
  const getDecisionContent = useCallback((decisionIdentifier) => {
    if (!decisions || decisions.length === 0) {
      return null;
    }

    let targetDecision = null;

    // If identifier is provided, try to match by number or keyword
    if (decisionIdentifier) {
      // Check if identifier is a number (1, 2, 3, "one", "two", etc.)
      const numberMap = { "one": 0, "two": 1, "three": 2, "four": 3, "five": 4 };
      const numIndex = numberMap[decisionIdentifier] !== undefined 
        ? numberMap[decisionIdentifier] 
        : (parseInt(decisionIdentifier) - 1);
      
      if (!isNaN(numIndex) && numIndex >= 0 && numIndex < decisions.length) {
        targetDecision = decisions[numIndex];
      } else {
        // Try to match by keyword in decision type or options
        const keyword = decisionIdentifier.toLowerCase();
        targetDecision = decisions.find(d => 
          d.type?.toLowerCase().includes(keyword) ||
          d.options?.some(opt => opt.label?.toLowerCase().includes(keyword) || opt.id?.toLowerCase().includes(keyword))
        );
      }
    }

    // If no identifier or no match, use most recent decision
    if (!targetDecision) {
      targetDecision = decisions[decisions.length - 1];
    }

    if (!targetDecision) return null;

    // Format decision content for speech
    const type = targetDecision.type || "Decision";
    const options = targetDecision.options || [];
    const optionsText = options.map((opt, idx) => {
      const label = opt.label || opt.id || `Option ${idx + 1}`;
      return `${label}`;
    }).join(", ");

    let text = `${type}. Options: ${optionsText}.`;

    if (targetDecision.selectedOptionId) {
      const selected = options.find(opt => opt.id === targetDecision.selectedOptionId);
      const selectedLabel = selected?.label || selected?.id || targetDecision.selectedOptionId;
      text += ` Currently selected: ${selectedLabel}.`;
    }

    if (targetDecision.recommendation) {
      text += ` Recommended: ${targetDecision.recommendation}.`;
    }

    return text;
  }, [decisions]);

  const getActionContent = useCallback((actionIdentifier) => {
    if (!actions || actions.length === 0) {
      return null;
    }

    let targetAction = null;

    // If identifier is provided, try to match by number or description
    if (actionIdentifier) {
      // Check if identifier is a number (1, 2, 3, "one", "two", etc.)
      const numberMap = { "one": 0, "two": 1, "three": 2, "four": 3, "five": 4 };
      const numIndex = numberMap[actionIdentifier] !== undefined 
        ? numberMap[actionIdentifier] 
        : (parseInt(actionIdentifier) - 1);
      
      if (!isNaN(numIndex) && numIndex >= 0 && numIndex < actions.length) {
        targetAction = actions[numIndex];
      } else {
        // Try to match by keyword in action description
        const keyword = actionIdentifier.toLowerCase();
        targetAction = actions.find(a => 
          a.description?.toLowerCase().includes(keyword) ||
          a.actionId?.toLowerCase().includes(keyword) ||
          a.type?.toLowerCase().includes(keyword)
        );
      }
    }

    // If no identifier or no match, use most recent action
    if (!targetAction) {
      targetAction = actions[actions.length - 1];
    }

    if (!targetAction) return null;

    // Format action content for speech
    const description = targetAction.description || "Action";
    const status = targetAction.status || "PENDING";
    const outcome = targetAction.outcome || null;

    let text = `${description}. Status: ${status.toLowerCase()}.`;

    if (targetAction.guidance) {
      text += ` ${targetAction.guidance}.`;
    }

    if (outcome) {
      text += ` Outcome: ${outcome.toLowerCase()}.`;
    }

    return text;
  }, [actions]);

  const getExplanationContent = useCallback(() => {
    if (!explainabilityResult) {
      return null;
    }

    // Try decision rationale first
    if (explainabilityResult.decisionRationale) {
      const why = explainabilityResult.decisionRationale.whyDecisionsNeeded || "";
      const basis = explainabilityResult.decisionRationale.recommendationBasis || "";
      return `This decision was recommended because: ${why}. ${basis}`;
    }

    // Fallback to compliance explanation
    if (explainabilityResult.complianceExplanation) {
      const reason = explainabilityResult.complianceExplanation.primaryReason || "";
      return `This decision was made because: ${reason}.`;
    }

    return null;
  }, [explainabilityResult]);

  const getIntentSummary = useCallback(() => {
    if (!result) {
      return null;
    }

    const type = result.type || "Intent";
    const extractedInfo = result.extractedInfo || {};
    const state = lifecycleState || "CREATED";

    let text = `Intent type: ${type}. Current status: ${state.toLowerCase().replace(/_/g, " ")}.`;

    // Add key extracted information
    const infoKeys = Object.keys(extractedInfo).slice(0, 3); // Limit to 3 key fields
    if (infoKeys.length > 0) {
      const infoText = infoKeys.map(key => {
        const value = extractedInfo[key];
        return `${key}: ${value}`;
      }).join(", ");
      text += ` Extracted information: ${infoText}.`;
    }

    return text;
  }, [result, lifecycleState]);

  // Phase 13.4: Content extraction for compliance result
  const getComplianceContent = useCallback(() => {
    if (!compliance) {
      return null;
    }

    const decision = compliance.decision || "UNKNOWN";
    const reason = compliance.reason || "";
    const violations = compliance.violations || [];
    const warnings = compliance.warnings || [];

    let text = `Compliance decision: ${decision.toLowerCase()}.`;

    if (reason) {
      text += ` Reason: ${reason}.`;
    }

    if (violations.length > 0) {
      const violationsText = violations.slice(0, 3).join(", ");
      text += ` Violations: ${violationsText}.`;
    }

    if (warnings.length > 0) {
      const warningsText = warnings.slice(0, 3).join(", ");
      text += ` Warnings: ${warningsText}.`;
    }

    return text;
  }, [compliance]);

  // Phase 13.4: Content extraction for risk assessment
  const getRiskContent = useCallback(() => {
    if (!riskResult) {
      return null;
    }

    const overallRisk = riskResult.overallRisk || "UNKNOWN";
    const riskLevel = riskResult.riskLevel || "UNKNOWN";
    const riskScore = riskResult.riskScore || 0;
    const factors = riskResult.riskFactors || [];
    const recommendations = riskResult.recommendations || [];

    let text = `Overall risk: ${overallRisk.toLowerCase()}. Risk level: ${riskLevel.toLowerCase()}. Risk score: ${riskScore}.`;

    if (factors.length > 0) {
      const factorsText = factors.slice(0, 3).map(f => {
        if (typeof f === "string") return f;
        return f.factor || f.description || f;
      }).join(", ");
      text += ` Risk factors: ${factorsText}.`;
    }

    if (recommendations.length > 0) {
      const recommendationsText = recommendations.slice(0, 2).join(", ");
      text += ` Recommendations: ${recommendationsText}.`;
    }

    return text;
  }, [riskResult]);

  // Phase 13.4: Content extraction for next steps
  const getNextStepContent = useCallback(() => {
    // Next steps are typically pending actions
    if (!actions || actions.length === 0) {
      // If no actions, check if there are pending decisions
      if (decisions && decisions.length > 0) {
        const pendingDecisions = decisions.filter(d => !d.selectedOptionId);
        if (pendingDecisions.length > 0) {
          return `Next step: Make a decision. ${pendingDecisions.length} decision${pendingDecisions.length > 1 ? "s" : ""} pending.`;
        }
      }
      // If no actions or decisions, check lifecycle state
      if (lifecycleState) {
        return `Next step: Current status is ${lifecycleState.toLowerCase().replace(/_/g, " ")}.`;
      }
      return "No next steps available yet.";
    }

    // Find pending actions (not completed, failed, or skipped)
    const pendingActions = actions.filter(a => 
      !a.outcome || 
      (a.outcome !== "COMPLETED" && a.outcome !== "FAILED" && a.outcome !== "SKIPPED")
    );

    if (pendingActions.length === 0) {
      return "All actions are completed. No next steps.";
    }

    // Get the first pending action
    const nextAction = pendingActions[0];
    const description = nextAction.description || "Action";
    const status = nextAction.status || "PENDING";

    let text = `Next step: ${description}. Status: ${status.toLowerCase()}.`;

    if (nextAction.guidance) {
      text += ` ${nextAction.guidance}.`;
    }

    if (pendingActions.length > 1) {
      text += ` There are ${pendingActions.length - 1} more pending action${pendingActions.length > 2 ? "s" : ""}.`;
    }

    return text;
  }, [actions, decisions, lifecycleState]);

  const getCurrentContent = useCallback(() => {
    // Priority: 1. Active confirmation banner, 2. Latest decision, 3. Latest action, 4. Intent summary
    if (voiceConfirmation) {
      // If there's a pending confirmation, read that
      const actionDesc = voiceConfirmation.params?.actionDescription || voiceConfirmation.action || "action";
      return `Pending confirmation: ${actionDesc}.`;
    }

    if (decisions && decisions.length > 0) {
      return getDecisionContent(null); // Most recent decision
    }

    if (actions && actions.length > 0) {
      return getActionContent(null); // Most recent action
    }

    return getIntentSummary();
  }, [voiceConfirmation, decisions, actions, getDecisionContent, getActionContent, getIntentSummary]);

  // Auto-save current session to history when completed (all actions done or lifecycle COMPLETED)
  const historySavedForSessionRef = useRef(null);
  useEffect(() => {
    if (!result?.id) return;
    const allDone = actions.length > 0 && actions.every((a) => a.outcome === "COMPLETED" || a.outcome === "CONFIRMED");
    const completed = lifecycleState === "COMPLETED";
    if (!allDone && !completed) return;
    const key = `${result.id}-completed`;
    if (historySavedForSessionRef.current === key) return;
    historySavedForSessionRef.current = key;
    setIntentHistory((prev) => {
      const entry = {
        intent: result,
        compliance,
        decisions,
        actions,
        lifecycleState,
        ragResponse,
        createdAt: new Date().toISOString(),
      };
      return [entry, ...prev.filter((e) => e.intent?.id !== result.id)].slice(0, 50);
    });
  }, [result, compliance, decisions, actions, lifecycleState, ragResponse]);

  // Persist intent history: load on mount (per user), save on change, save current on beforeunload/unmount
  const userId = keycloak.tokenParsed?.sub || "anonymous";
  useEffect(() => {
    const loaded = loadIntentHistory(userId);
    if (loaded.length > 0) setIntentHistory(loaded);
  }, [userId]);
  useEffect(() => {
    latestSessionRef.current = { result, compliance, decisions, actions, lifecycleState, ragResponse };
  }, [result, compliance, decisions, actions, lifecycleState, ragResponse]);
  useEffect(() => {
    saveIntentHistory(userId, intentHistory);
  }, [userId, intentHistory]);
  useEffect(() => {
    const saveCurrent = () => {
      const { result: r, compliance: c, decisions: d, actions: a, lifecycleState: ls, ragResponse: rag } = latestSessionRef.current;
      if (r) {
        const entry = { intent: r, compliance: c, decisions: d, actions: a, lifecycleState: ls, ragResponse: rag, createdAt: new Date().toISOString() };
        const existing = loadIntentHistory(userId);
        saveCurrentSessionToHistory(userId, entry, existing);
      }
    };
    const onBeforeUnload = () => saveCurrent();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      saveCurrent();
    };
  }, [userId]);

  // Define handleAnalyze FIRST before using it in voice recognition useEffect
  // Optional overrideText: when provided (e.g. from "New search" field), use it instead of input
  const handleAnalyze = useCallback(async (overrideText) => {
    const currentInput = (overrideText !== undefined && overrideText !== null ? String(overrideText).trim() : input.trim());
    if (!currentInput) {
      setError("Please enter your intent");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCompliance(null);
    setDecisions([]);
    setActions([]);
    setLifecycleState(null);
    setResumeData(null); // Clear resume data for new intent
    setRiskResult(null); // Phase 11: Clear risk result
    setExplainabilityResult(null); // Phase 11: Clear explainability result
    setEvidenceList([]); // Phase 12: Clear evidence
    setRagResponse(null); // Phase 14: Clear RAG response
    intentCompletedEmailSentRef.current = false; // Phase 3: Reset email sent flag for new intent
    actionsFetchedForRef.current.clear(); // Reset action fetch tracking for new intent

    try {
      const tokenParsed = keycloak.tokenParsed;
      const actorId = tokenParsed?.sub || "unknown-user";
      const tenantId = tokenParsed?.realm || "intent-platform";

      // Check if input contains multiple intents
      const parsedIntents = parseMultipleIntents(currentInput);
      
      if (parsedIntents.length > 1) {
        // Multiple intents detected - process each separately
        console.log(`[Multi-Intent] Detected ${parsedIntents.length} intents`);
        
        const processedIntents = [];
        
        // Process each intent
        for (let i = 0; i < parsedIntents.length; i++) {
          const parsed = parsedIntents[i];
          console.log(`[Multi-Intent] Processing intent ${i + 1}/${parsedIntents.length}: ${parsed.intentType} in ${parsed.location}`);
          
          // Create intent payload with extracted info
          const intentPayload = createIntentPayload(parsed, tenantId, actorId);
          
          // Analyze intent with Intent Engine
          let intent = await analyzeIntent(intentPayload);
          // Override UNKNOWN/missing type with parsed type (e.g. "Find me a home in Chennai" → BUY_PROPERTY)
          if (!intent.type || intent.type === "UNKNOWN") {
            intent = { ...intent, type: parsed.intentType };
          }
          // CRITICAL: Ensure parsed location and budget are preserved in intent object
          if (!intent.payload) intent.payload = {};
          if (!intent.extractedInfo) intent.extractedInfo = {};
          intent.payload.location = parsed.location !== "selected location" ? parsed.location : (intent.payload.location || null);
          intent.payload.budget = parsed.budget || intent.payload.budget || null;
          intent.extractedInfo.location = parsed.location !== "selected location" ? parsed.location : (intent.extractedInfo.location || null);
          intent.extractedInfo.city = parsed.location !== "selected location" ? parsed.location : (intent.extractedInfo.city || null);
          intent.extractedInfo.budget = parsed.budget || intent.extractedInfo.budget || null;
          
          // Process compliance, decisions, actions for this intent
          let complianceResult = null;
          let decisionsResult = [];
          let actionsResult = [];
          let lifecycleStateResult = null;
          let riskResultLocal = null;
          let ragResultLocal = null;
          
          // Compliance check (for BUY, SELL, RENT)
          if (intent.type === "BUY_PROPERTY" || intent.type === "SELL_PROPERTY" || intent.type === "RENT_PROPERTY") {
            try {
              complianceResult = await checkCompliance(intent);
              
              // Email: Compliance result
              const userEmail = tokenParsed?.email || tokenParsed?.preferred_username || null;
              if (userEmail && complianceResult) {
                sendComplianceResultEmail({
                  userEmail,
                  compliance: complianceResult,
                  intentId: intent.id || "unknown",
                }).catch((emailErr) => {
                  console.warn(`[Multi-Intent] Email failed for intent ${i + 1}:`, emailErr);
                });
              }
            } catch (err) {
              console.warn(`[Multi-Intent] Compliance check failed for intent ${i + 1}:`, err);
            }
          }
          
          // Get decisions when compliance ALLOW or REVIEW (so user sees decisions even if compliance needs review); skip only on DENY for BUY
          const complianceOk = !complianceResult || complianceResult.decision === "ALLOW" || complianceResult.decision === "REVIEW" || intent.type !== "BUY_PROPERTY";
          if (complianceOk) {
            try {
              const decisionsResponse = await getDecisions(
                intent,
                complianceResult?.decision || "ALLOW",
                []
              );
              decisionsResult = decisionsResponse.decisions || [];
              lifecycleStateResult = decisionsResponse.lifecycleState || "AWAITING_DECISIONS";
              
              // Email: Decisions generated
              const userEmail = tokenParsed?.email || tokenParsed?.preferred_username || null;
              if (userEmail && decisionsResult.length > 0) {
                sendDecisionGeneratedEmail({
                  userEmail,
                  decisions: decisionsResult,
                  intentId: intent.id || "unknown",
                }).catch((emailErr) => {
                  console.warn(`[Multi-Intent] Email failed for intent ${i + 1}:`, emailErr);
                });
              }
            } catch (err) {
              console.warn(`[Multi-Intent] Decisions fetch failed for intent ${i + 1}:`, err);
            }
          }
          
          // Risk evaluation (for BUY intents)
          if (intent.type === "BUY_PROPERTY") {
            try {
              riskResultLocal = await evaluateRisk(intent, complianceResult, decisionsResult);
            } catch (err) {
              console.warn(`[Multi-Intent] Risk evaluation failed for intent ${i + 1}:`, err);
            }
          }
          
          // RAG insights
          try {
            const country = determineCountry(intent);
            ragResultLocal = await queryRAG(intent, country);
          } catch (err) {
            console.warn(`[Multi-Intent] RAG query failed for intent ${i + 1}:`, err);
          }
          
          // Get actions if decisions are made
          if (lifecycleStateResult === "DECISIONS_MADE" || lifecycleStateResult === "ACTIONS_IN_PROGRESS") {
            try {
              const actionsResponse = await getActions(intent, decisionsResult, lifecycleStateResult, []);
              actionsResult = actionsResponse.actions || [];
              
              // Track that we fetched actions for this intent
              const fetchKey = `${intent.id}:${lifecycleStateResult}`;
              actionsFetchedForRef.current.add(fetchKey);
            } catch (err) {
              console.warn(`[Multi-Intent] Actions fetch failed for intent ${i + 1}:`, err);
            }
          }
          
          // Email: Intent created for each intent
          const userEmail = tokenParsed?.email || tokenParsed?.preferred_username || null;
          if (userEmail) {
            sendIntentCreatedEmail({
              userEmail,
              intent,
              intentId: intent.id || "unknown",
            }).catch((emailErr) => {
              console.warn(`[Multi-Intent] Email failed for intent ${i + 1}:`, emailErr);
            });
          }
          
          processedIntents.push({
            intent,
            compliance: complianceResult,
            decisions: decisionsResult,
            actions: actionsResult,
            lifecycleState: lifecycleStateResult,
            riskResult: riskResultLocal,
            ragResponse: ragResultLocal,
            parsedInfo: parsed
          });
        }
        
        // Store all processed intents
        setMultipleIntents(processedIntents);
        setActiveIntentIndex(0);
        
        // Set first intent as active
        const firstIntent = processedIntents[0];
        setResult(firstIntent.intent);
        setCompliance(firstIntent.compliance);
        setDecisions(firstIntent.decisions);
        setActions(firstIntent.actions);
        setLifecycleState(firstIntent.lifecycleState);
        setRiskResult(firstIntent.riskResult);
        setRagResponse(firstIntent.ragResponse);
        
        // Add chat messages about each intent
        if (addChatMessageRef.current) {
          addChatMessageRef.current({
            text: `📋 Processed ${processedIntents.length} intents. Switch between them using the tabs above.`,
            type: "system",
            timestamp: new Date().toLocaleString()
          });
          
          // Add summary for each intent
          processedIntents.forEach((intentData, idx) => {
            const parsed = intentData.parsedInfo;
            const intentTypeLabel = parsed.intentType === "BUY_PROPERTY" ? "Buy" : 
                                   parsed.intentType === "SELL_PROPERTY" ? "Sell" : 
                                   parsed.intentType === "RENT_PROPERTY" ? "Rent" : "Property";
            const budgetText = parsed.budget ? `₹${(parsed.budget / 100000).toFixed(0)}L` : "";
            const decisionsCount = intentData.decisions.length;
            const actionsCount = intentData.actions.length;
            
            addChatMessageRef.current({
              text: `Intent ${idx + 1}: ${intentTypeLabel} in ${parsed.location}${budgetText ? ` (${budgetText})` : ""} - ${decisionsCount} decisions, ${actionsCount} actions`,
              type: "intent",
              timestamp: new Date().toLocaleString()
            });
          });
        }
        
        setLoading(false);
        return; // Exit early for multi-intent flow
      }
      
      // Single intent flow — use parsed type/location/budget so "I want a house in Delhi for 80 lakhs" → BUY_PROPERTY in Delhi ₹80L
      const parsedSingle = parseMultipleIntents(currentInput);
      const parsed = parsedSingle.length > 0 ? parsedSingle[0] : null;
      const intentPayload = parsed
        ? createIntentPayload(parsed, tenantId, actorId)
        : { text: currentInput, tenantId, actorId, industry: "real-estate" };

      let intent = await analyzeIntent(intentPayload);

      // Override UNKNOWN/missing type with our parsed type (e.g. "I want a house in Delhi" → BUY_PROPERTY)
      if (parsed && (!intent.type || intent.type === "UNKNOWN")) {
        intent = { ...intent, type: parsed.intentType };
      }

      // CRITICAL: Extract and preserve location/budget for location-specific decisions
      if (parsed) {
        if (!intent.payload) intent.payload = {};
        if (!intent.extractedInfo) intent.extractedInfo = {};
        if (parsed.location && parsed.location !== "selected location") {
          intent.payload.location = parsed.location;
          intent.extractedInfo.location = parsed.location;
          intent.extractedInfo.city = parsed.location;
        }
        if (parsed.budget) {
          intent.payload.budget = parsed.budget;
          intent.extractedInfo.budget = parsed.budget;
        }
      }

      setResult(intent);
      setMultipleIntents([]); // Clear multi-intent state for single intent
      setActiveIntentIndex(0);

      // Phase 3: Email Trigger 1 - Intent Created/Analyzed
      const userEmail = tokenParsed?.email || tokenParsed?.preferred_username || null;
      console.log("[Email Debug] Intent Created - tokenParsed.email:", tokenParsed?.email, "tokenParsed.preferred_username:", tokenParsed?.preferred_username, "Final userEmail:", userEmail);
      if (userEmail) {
        // Check if email is test@example.com and warn
        if (userEmail === "test@example.com" || userEmail.includes("test@example")) {
          console.warn("[Email Debug] ⚠️ WARNING: Using test@example.com as email. Please update your Keycloak user profile email to bsai@acentle.com");
        }
        console.log("[Email Debug] Sending Intent Created email to:", userEmail);
        sendIntentCreatedEmail({
          userEmail,
          intent,
          intentId: intent.id || "unknown",
        }).catch((emailErr) => {
          console.warn("[Email] Failed to send intent created email:", emailErr);
        });
      } else {
        console.warn("[Email Debug] No user email found in Keycloak token. Email not sent.");
      }

      // Phase 2: Add intent analysis message to chat
      if (addChatMessageRef.current) {
        // Improved location extraction - check multiple sources including original text
        let location = intent.payload?.location || 
                      intent.extractedInfo?.location || 
                      intent.extractedInfo?.city ||
                      intent.extractedInfo?.state ||
                      "";
        
        // If location is still empty, try to extract from original user input
        if (!location || location === "Location" || location.toLowerCase() === "unknown location" || location.toLowerCase().includes("unknown")) {
          const originalText = intent.text || intent.originalText || "";
          
          // First, try to match known Indian city names directly
          const indianCities = [
            "mumbai", "bombay", "delhi", "bangalore", "bengaluru", "chennai", "madras",
            "hyderabad", "pune", "kolkata", "calcutta", "ahmedabad", "surat", "jaipur",
            "lucknow", "kanpur", "nagpur", "indore", "thane", "bhopal", "visakhapatnam",
            "vizag", "patna", "vadodara", "ghaziabad", "ludhiana", "agra", "nashik"
          ];
          
          const textLower = originalText.toLowerCase();
          for (const city of indianCities) {
            if (textLower.includes(city)) {
              location = city.charAt(0).toUpperCase() + city.slice(1);
              break;
            }
          }
          
          // If still not found, try pattern matching
          if (!location || location === "Location" || location.toLowerCase() === "unknown location") {
            const locationPatterns = [
              /(?:in|at|near|around|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
              /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:for|with|at|in)/i
            ];
            
            for (const pattern of locationPatterns) {
              const match = originalText.match(pattern);
              if (match && match[1]) {
                const candidate = match[1].trim();
                // Filter out common non-location words
                const nonLocations = ["home", "house", "property", "buy", "purchase", "crore", "lakh", "rupees", "dollars", "budget"];
                if (!nonLocations.some(word => candidate.toLowerCase().includes(word)) && candidate.length > 2) {
                  location = candidate;
                  break;
                }
              }
            }
          }
        }
        
        // Final fallback
        if (!location || location === "Location" || location.toLowerCase() === "unknown location") {
          location = "selected location";
        }
        
        const budget = intent.payload?.budget ? `₹${(intent.payload.budget / 100000).toFixed(0)}L` : "";
        const intentSummary = `Intent: ${intent.type || "Property Search"}${location ? ` in ${location}` : ""}${budget ? ` with budget ${budget}` : ""}`;
        
        addChatMessageRef.current({
          text: `🔍 ${intentSummary}`,
          type: "intent",
          timestamp: new Date().toLocaleString()
        });
      }

      // Phase 14: Step 1.5 - Query RAG for knowledge retrieval (advisory only)
      // RAG provides context, engines still decide
      try {
        const country = determineCountry(intent);
        console.log("[RAG Integration] Determining country:", country, "from intent:", intent);
        
        setRagLoading(true);
        const ragResult = await queryRAG(intent, country);
        
        if (ragResult) {
          setRagResponse(ragResult);
          console.log("[RAG Integration] RAG response received:", ragResult);
          
          // Phase 2: Add RAG insights message to chat
          if (addChatMessageRef.current) {
            const sourcesCount = ragResult.sources?.length || 0;
            const confidence = ragResult.confidence ? `${(ragResult.confidence * 100).toFixed(0)}%` : "";
            addChatMessageRef.current({
              text: `💡 Knowledge-based insights retrieved${confidence ? ` (${confidence} confidence)` : ""}. ${sourcesCount > 0 ? `${sourcesCount} source${sourcesCount > 1 ? "s" : ""} referenced.` : ""}`,
              type: "rag_insights",
              timestamp: new Date().toLocaleString()
            });
          }
          
          // Emit RAG evidence
          await emitVoiceEvidence({
            eventType: "RAG_QUERY_EXECUTED",
            intentId: intent.id || "unknown",
            actorId: actorId,
            tenantId: tenantId,
            payload: {
              country: country,
              adapter: ragResult.country,
              query: {
                intent_type: intent.type,
                extracted_entities: intent.extractedInfo || {},
              },
              response_summary: ragResult.summary.substring(0, 100),
              confidence: ragResult.confidence,
              sources_count: ragResult.sources?.length || 0,
            },
            reason: "RAG knowledge retrieval for intent enrichment (advisory only)",
            confidence: ragResult.confidence >= 0.7 ? "HIGH" : "MEDIUM",
          });
        } else {
          console.log("[RAG Integration] RAG query returned null (non-blocking)");
        }
      } catch (ragErr) {
        console.warn("[RAG Integration] RAG query error (non-blocking):", ragErr);
        // Non-blocking - RAG is advisory, shouldn't break flow
      } finally {
        setRagLoading(false);
      }

      // Step 2: Check compliance (BUY, RENT, SELL)
      if (intent.type === "BUY_PROPERTY" || intent.type === "RENT_PROPERTY" || intent.type === "SELL_PROPERTY") {
        try {
          const complianceResult = await checkCompliance(intent);
          setCompliance(complianceResult);
          const decisionKey = (complianceResult.decision || "").toUpperCase();
          console.log("[Compliance] decision:", complianceResult.decision, "→ normalized:", decisionKey);

          // Phase 3: Email Trigger 2 - Compliance Check Result
          if (userEmail) {
            sendComplianceResultEmail({
              userEmail,
              compliance: complianceResult,
              intentId: intent.id || "unknown",
            }).catch((emailErr) => {
              console.warn("[Email] Failed to send compliance result email:", emailErr);
            });
          }

          // Phase 2: Add compliance message to chat
          if (addChatMessageRef.current) {
            const complianceEmoji = decisionKey === "ALLOW" ? "✅" : decisionKey === "DENY" ? "❌" : "⚠️";
            const complianceText = decisionKey === "ALLOW" 
              ? "Compliance check passed! You can proceed with your property search."
              : decisionKey === "DENY"
              ? `Compliance check failed: ${complianceResult.reason || "Not compliant"}`
              : `Compliance review required: ${complianceResult.reason || "Needs review"}`;
            
            addChatMessageRef.current({
              text: `${complianceEmoji} ${complianceText}`,
              type: "compliance",
              timestamp: new Date().toLocaleString()
            });
          }

          // Step 3: Get decisions when compliance ALLOW or REVIEW (so decisions show even if compliance needs review)
          if (decisionKey === "ALLOW" || decisionKey === "REVIEW") {
            try {
              console.log("[Decisions] Fetching decisions (compliance:", decisionKey, ")...");
              const decisionResult = await getDecisions(
                intent,
                decisionKey,
                []
              );
              const decisionsList = decisionResult.decisions || [];
              console.log("[Decisions] Received count:", decisionsList.length, decisionResult);
              setDecisions(decisionsList);
              setLifecycleState(decisionResult.lifecycleState || "AWAITING_DECISIONS");

              // Phase 3: Email Trigger 3 - Decision Generated
              if (userEmail && decisionsList.length > 0) {
                sendDecisionGeneratedEmail({
                  userEmail,
                  decisions: decisionsList,
                  intentId: intent.id || "unknown",
                }).catch((emailErr) => {
                  console.warn("[Email] Failed to send decision generated email:", emailErr);
                });
              }

              // Phase 2: Add decisions message to chat
              if (addChatMessageRef.current && decisionsList.length > 0) {
                const decisionsCount = decisionsList.length;
                const pendingCount = decisionsList.filter(d => 
                  d.evolutionState !== "CONFIRMED" && d.state !== "CONFIRMED"
                ).length;
                
                addChatMessageRef.current({
                  text: `🎯 ${decisionsCount} decision${decisionsCount > 1 ? "s" : ""} generated. ${pendingCount > 0 ? `${pendingCount} pending your review.` : "All decisions confirmed."}`,
                  type: "decisions",
                  timestamp: new Date().toLocaleString()
                });
              }

              // Phase 11: Step 3.5 - Evaluate Risk (after compliance ALLOW)
              try {
                const riskEvaluation = await evaluateRisk(
                  intent,
                  complianceResult,
                  decisionsList
                );
                if (riskEvaluation) {
                  setRiskResult(riskEvaluation);

                  // Phase 11: Step 3.6 - Get Explainability (after risk evaluation)
                  try {
                    const explainabilityResponse = await getExplainability(
                      intent,
                      complianceResult,
                      riskEvaluation,
                      decisionsList
                    );
                    if (explainabilityResponse) {
                      setExplainabilityResult(explainabilityResponse);
                      
                      // Phase 2: Add legal references message to chat
                      if (addChatMessageRef.current) {
                        const legalRefsCount = explainabilityResponse.legalReferences?.length || 0;
                        if (legalRefsCount > 0) {
                          addChatMessageRef.current({
                            text: `⚖️ ${legalRefsCount} legal reference${legalRefsCount > 1 ? "s" : ""} available. Check Legal References section.`,
                            type: "legal_references",
                            timestamp: new Date().toLocaleString()
                          });
                        }
                      }
                    }
                  } catch (explainErr) {
                    console.error("Explainability engine error:", explainErr);
                    // Non-blocking - explainability is nice-to-have
                  }
                }
              } catch (riskErr) {
                console.error("Risk engine error:", riskErr);
                // Non-blocking - risk evaluation is nice-to-have
              }

              // Step 4: Get actions if lifecycle allows
              if (
                decisionResult.lifecycleState === "DECISIONS_MADE" ||
                decisionResult.lifecycleState === "ACTIONS_IN_PROGRESS"
              ) {
                try {
                  const actionResult = await getActions(
                    intent,
                    decisionsList,
                    decisionResult.lifecycleState,
                    actions  // ✅ Pass existing actions to prevent regeneration
                  );
                  setActions(actionResult.actions || []);
                  if (actionResult.nextLifecycleState) {
                    setLifecycleState(actionResult.nextLifecycleState);
                  }

                  // Phase 2: Add actions message to chat
                  if (addChatMessageRef.current && actionResult.actions && actionResult.actions.length > 0) {
                    const actionsCount = actionResult.actions.length;
                    const pendingActions = actionResult.actions.filter(a => 
                      !a.outcome || (a.outcome !== "COMPLETED" && a.outcome !== "FAILED" && a.outcome !== "SKIPPED")
                    ).length;
                    
                    addChatMessageRef.current({
                      text: `📋 ${actionsCount} action${actionsCount > 1 ? "s" : ""} created. ${pendingActions > 0 ? `${pendingActions} ready to start.` : "All actions completed."}`,
                      type: "actions",
                      timestamp: new Date().toLocaleString()
                    });
                  }
                } catch (actionErr) {
                  console.error("Action engine error:", actionErr);
                }
              }
            } catch (decisionErr) {
              console.error("Decision engine error:", decisionErr);
            }
          } else {
            // Phase 11: Even if compliance DENIES, we can still get explainability (but not risk)
            try {
              const explainabilityResponse = await getExplainability(
                intent,
                complianceResult,
                null, // No risk if denied
                []
              );
              if (explainabilityResponse) {
                setExplainabilityResult(explainabilityResponse);
              }
            } catch (explainErr) {
              console.error("Explainability engine error:", explainErr);
              // Non-blocking
            }
          }
        } catch (compErr) {
          console.error("Compliance check error:", compErr);
          setCompliance({
            decision: "REVIEW",
            reason: "Compliance check unavailable",
            confidence: "LOW",
          });
        }
      }
    } catch (err) {
      setError(err.message || "Failed to analyze intent");
      console.error("Intent analysis error:", err);
    } finally {
      setLoading(false);
    }
  }, [input]);

  // Keep handleAnalyzeRef updated with latest handleAnalyze
  useEffect(() => {
    handleAnalyzeRef.current = handleAnalyze;
  }, [handleAnalyze]);

  // Voice Input: Initialize Speech Recognition (run once on mount)
  useEffect(() => {
    // Check if Speech Recognition API is available
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser. Voice input will be disabled.");
      recognitionRef.current = null; // Explicitly set to null
      return;
    }

    // Initialize recognition only once
    if (recognitionRef.current) {
      console.log("Speech Recognition already initialized");
      return; // Already initialized
    }

    try {
      console.log("Initializing Speech Recognition...");
      // Initialize recognition
      const recognition = new SpeechRecognition();
      
      // Phase 13.1: Continuous listening when AI Agent Mode is enabled
      const savedMode = localStorage.getItem("aiAgentMode") === "true";
      recognition.continuous = savedMode; // Continuous when AI Agent Mode is on
      recognition.interimResults = false; // Only return final results
      recognition.lang = "en-US"; // Language (can be made configurable)
      
      // Improve speech recognition accuracy
      // Some browsers support these properties
      if ('grammars' in recognition) {
        // Could add grammar hints here if supported
      }
      
      console.log("[Speech Recognition] Continuous mode:", savedMode);

      recognition.onstart = () => {
        console.log("Speech recognition started");
        setVoiceState("listening");
        setIsListening(true);
        recognitionRunningRef.current = true; // Track actual running state
      };

      recognition.onresult = async (event) => {
        // Build full transcript from all results (continuous mode may have multiple segments)
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += (event.results[i][0]?.transcript || "") + " ";
        }
        transcript = transcript.trim();
        if (!transcript) return;
        console.log("[Speech Recognition] Transcript:", transcript);
        setVoiceState("transcribing");
        
        // When no intent exists yet, always treat speech as intent input (e.g. "buy a home in vizag under 50L")
        if (!result) {
          setInput(transcript);
          setVoiceState("idle");
          setIsListening(false);
          recognitionRunningRef.current = false;
          setTimeout(() => {
            if (handleAnalyzeRef.current) handleAnalyzeRef.current();
          }, 200);
          return;
        }
        
        // Phase 13.1: Check if AI Agent Mode is enabled (for post-intent voice commands)
        const savedMode = localStorage.getItem("aiAgentMode") === "true";
        console.log("[Voice Agent] AI Agent Mode enabled:", savedMode);
        
        if (savedMode) {
          try {
            // Parse command
            let parsed = parseVoiceCommand(transcript);
            console.log("[Voice Agent] Parsed command:", parsed);
            console.log("[Voice Agent] Parsed command type:", parsed.type);
            
            // Phase 13.4: CRITICAL FIX - Handle mis-transcription of "read decision" as "scroll down"
            // Speech recognition often transcribes "read decision" as "scroll down"
            // STRATEGY: If we get "scroll down" and decisions exist, convert it to "read decision"
            // This is a VERY common mis-transcription, so we'll be aggressive about fixing it
            if (parsed.type === "scroll" && parsed.direction === "down") {
              const transcriptLower = transcript.toLowerCase().trim();
              const transcriptLength = transcriptLower.length;
              
              // Check if decisions are available (strong indicator this might be "read decision")
              // Use Array.isArray to be extra safe
              const hasDecisions = Array.isArray(decisions) && decisions.length > 0;
              const decisionsCount = Array.isArray(decisions) ? decisions.length : 0;
              
              console.log("[Voice Agent] 🔍 Checking 'scroll down' command:", {
                transcript: transcriptLower,
                length: transcriptLength,
                hasDecisions: hasDecisions,
                decisionsCount: decisionsCount,
                decisionsType: typeof decisions,
                decisionsIsArray: Array.isArray(decisions)
              });
              
              // AGGRESSIVE FIX: If we have decisions and transcript is "scroll down" (11 chars) or shorter,
              // treat it as "read decision" - this is the most common mis-transcription
              // Also check if transcript is exactly "scroll down" (most common case)
              const isScrollDown = transcriptLower === "scroll down" || transcriptLength <= 12;
              
              if (hasDecisions && isScrollDown) {
                console.log("[Voice Agent] ⚠️⚠️⚠️ DETECTED MIS-TRANSCRIPTION: 'scroll down' → 'read decision'");
                console.log("[Voice Agent] Context: decisions available =", hasDecisions, "(", decisionsCount, "decisions), transcript length =", transcriptLength);
                console.log("[Voice Agent] ✅✅✅ CONVERTING to 'read decision' command");
                parsed = {
                  type: "read",
                  target: "decision",
                  identifier: null,
                  confirmation: false,
                  action: "read_decision"
                };
                console.log("[Voice Agent] ✅ Parsed command after conversion:", parsed);
              } else if (hasDecisions) {
                // Even if transcript is longer, if decisions exist, log for debugging
                console.log("[Voice Agent] ℹ️ 'scroll down' detected with decisions available. If you meant 'read decision', try saying it more clearly.");
              } else {
                console.log("[Voice Agent] ℹ️ 'scroll down' detected but no decisions available (count:", decisionsCount, "). Treating as scroll command.");
              }
            }
            
            // Early check: if this is a read command or other voice command, don't treat as intent input
            if (parsed.type === "read" || parsed.type === "scroll" || parsed.type === "select_decision" || 
                parsed.type === "update_action_outcome" || parsed.type === "confirm_decision" || parsed.type === "cancel") {
              console.log("[Voice Agent] This is a voice command, will not treat as intent input");
            }
            
            // Get user context for evidence
            const tokenParsed = keycloak.tokenParsed;
            const actorId = tokenParsed?.sub || "unknown-user";
            const tenantId = tokenParsed?.realm || "intent-platform";
            const intentId = result?.id || "unknown";
            
            // Emit VOICE_COMMAND_RECEIVED evidence
            await emitVoiceEvidence({
              eventType: "VOICE_COMMAND_RECEIVED",
              intentId,
              actorId,
              tenantId,
              payload: {
                rawCommand: transcript,
                parsedCommand: parsed,
              },
              reason: "Voice command received",
              confidence: "HIGH",
            });
            
            // Phase 13.2: Handle confirmation commands first (if pending confirmation exists)
            if ((parsed.type === "confirm_decision" || parsed.type === "cancel") && voiceConfirmation) {
              if (parsed.type === "confirm_decision") {
                // User confirmed - execute the pending action
                console.log("[Voice Agent] Confirmation received, executing action:", voiceConfirmation);
                
                await emitVoiceEvidence({
                  eventType: "VOICE_ACTION_CONFIRMED",
                  intentId,
                  actorId,
                  tenantId,
                  payload: {
                    pendingAction: voiceConfirmation.action,
                    confirmationType: "voice",
                  },
                  reason: "Voice confirmation received",
                });
                
                  // Execute the pending action
                  if (voiceConfirmation.action === "select_decision") {
                    const { decisionId, optionId } = voiceConfirmation.params;
                    await handleDecisionSelect(decisionId, optionId, false);
                    
                    await emitVoiceEvidence({
                      eventType: "VOICE_DECISION_SELECTED",
                      intentId,
                      actorId,
                      tenantId,
                      payload: {
                        decisionId,
                        optionId,
                        confirmationMethod: "voice",
                      },
                      reason: "Decision selected via voice command",
                    });
                  } else if (voiceConfirmation.action === "update_action_outcome") {
                    // Phase 13.3: Handle action outcome update
                    const { actionId, outcomeType } = voiceConfirmation.params;
                    
                    // Get token for userId
                    const tokenParsed = keycloak.tokenParsed;
                    const userId = tokenParsed?.sub || "unknown-user";
                    
                    // Call updateActionOutcome directly (similar to handleActionOutcomeConfirm)
                    // For COMPLETED, SKIPPED - no reason required
                    // For FAILED, BLOCKED, RESCHEDULED - reason is required, but we'll use a default
                    const outcomeReason = (outcomeType === "FAILED" || outcomeType === "BLOCKED" || outcomeType === "RESCHEDULED")
                      ? "Updated via voice command" // Default reason for voice updates
                      : null;
                    
                    try {
                      const response = await updateActionOutcome(
                        actionId,
                        outcomeType,
                        userId,
                        outcomeReason,
                        null // scheduledFor - not supported via voice yet
                      );
                      
                      // Update the action in state
                      setActions((prev) =>
                        prev.map((a) =>
                          a.actionId === actionId ? response.action : a
                        )
                      );
                      
                      // ❌ DO NOT call getActions() here - it regenerates actions!
                      // Action Engine handles unlocking internally via updateActionOutcome response
                      // If response.nextActions exists, add them directly without calling /execute
                      if (response.nextActions && response.nextActions.length > 0) {
                        setActions((prev) => {
                          const existingIds = new Set(prev.map(a => a.actionId || a.id));
                          const newActions = response.nextActions.filter(a => 
                            !existingIds.has(a.actionId || a.id)
                          );
                          return [...prev, ...newActions];
                        });
                      }
                      
                      // Update lifecycle state if provided
                      if (response.intentStatus) {
                        setLifecycleState(response.intentStatus);
                      }
                      
                      await emitVoiceEvidence({
                        eventType: "VOICE_ACTION_OUTCOME_UPDATED",
                        intentId,
                        actorId,
                        tenantId,
                        payload: {
                          actionId,
                          outcomeType,
                          confirmationMethod: "voice",
                        },
                        reason: "Action outcome updated via voice command",
                      });
                      
                      // Speak success
                      if (window.speechSynthesis) {
                        const outcomeText = outcomeType.toLowerCase().replace(/_/g, " ");
                        const utterance = new SpeechSynthesisUtterance(`Action marked as ${outcomeText}.`);
                        utterance.rate = 1.0;
                        window.speechSynthesis.speak(utterance);
                      }
                    } catch (err) {
                      console.error("[Voice Agent] Failed to update action outcome:", err);
                      await emitVoiceEvidence({
                        eventType: "VOICE_ACTION_FAILED",
                        intentId,
                        actorId,
                        tenantId,
                        payload: {
                          actionId,
                          outcomeType,
                          error: err.message,
                        },
                        reason: "Action outcome update failed",
                      });
                      
                      // Speak error
                      if (window.speechSynthesis) {
                        const utterance = new SpeechSynthesisUtterance(`Failed to update action. ${err.message}`);
                        utterance.rate = 1.0;
                        window.speechSynthesis.speak(utterance);
                      }
                    }
                  }
                
                // Clear confirmation state
                setVoiceConfirmation(null);
                if (confirmationTimeoutRef.current) {
                  clearTimeout(confirmationTimeoutRef.current);
                  confirmationTimeoutRef.current = null;
                }
                
                // Speak confirmation
                if (window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance("Decision confirmed and executed.");
                  utterance.rate = 1.0;
                  window.speechSynthesis.speak(utterance);
                }
              } else if (parsed.type === "cancel") {
                // User cancelled
                console.log("[Voice Agent] Action cancelled by user");
                
                await emitVoiceEvidence({
                  eventType: "VOICE_ACTION_CANCELLED",
                  intentId,
                  actorId,
                  tenantId,
                  payload: {
                    cancelledAction: voiceConfirmation.action,
                  },
                  reason: "Voice action cancelled by user",
                });
                
                // Clear confirmation state
                setVoiceConfirmation(null);
                if (confirmationTimeoutRef.current) {
                  clearTimeout(confirmationTimeoutRef.current);
                  confirmationTimeoutRef.current = null;
                }
                
                // Speak cancellation
                if (window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance("Action cancelled.");
                  utterance.rate = 1.0;
                  window.speechSynthesis.speak(utterance);
                }
              }
              
              // Keep listening in continuous mode
              const isContinuous = recognitionRef.current?.continuous || false;
              if (isContinuous) {
                setVoiceState("listening");
              } else {
                setVoiceState("idle");
                setIsListening(false);
              }
              return; // Don't treat as intent input
            }
            
            // Phase 13.2: Handle decision selection commands (requires confirmation)
            if (parsed.type === "select_decision") {
              console.log("[Voice Agent] Decision selection command:", parsed.option);
              
              // Find matching decision and option
              let matchedDecision = null;
              let matchedOption = null;
              
              for (const decision of decisions) {
                if (decision.evolutionState === "CONFIRMED") {
                  continue; // Skip confirmed decisions
                }
                
                // Try to match option by label or ID
                for (const option of decision.options) {
                  const optionLabelLower = option.label.toLowerCase();
                  const optionIdLower = option.id.toLowerCase();
                  const searchTerm = parsed.option.toLowerCase();
                  
                  // Match by label (e.g., "agent a" matches "Agent A")
                  if (optionLabelLower.includes(searchTerm) || searchTerm.includes(optionLabelLower.split(" ")[0])) {
                    matchedDecision = decision;
                    matchedOption = option;
                    break;
                  }
                  
                  // Match by ID (e.g., "a" matches option id "agent-a")
                  if (optionIdLower.includes(searchTerm) || searchTerm === optionIdLower.split("-")[0]) {
                    matchedDecision = decision;
                    matchedOption = option;
                    break;
                  }
                }
                
                if (matchedDecision && matchedOption) break;
              }
              
              if (!matchedDecision || !matchedOption) {
                console.log("[Voice Agent] No matching decision/option found for:", parsed.option);
                // Speak error
                if (window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance(`Could not find option ${parsed.option}. Please try again.`);
                  utterance.rate = 1.0;
                  window.speechSynthesis.speak(utterance);
                }
                
                // Keep listening
                const isContinuous = recognitionRef.current?.continuous || false;
                if (isContinuous) {
                  setVoiceState("listening");
                } else {
                  setVoiceState("idle");
                  setIsListening(false);
                }
                return;
              }
              
              // Request confirmation
              console.log("[Voice Agent] Requesting confirmation for:", matchedOption.label);
              
              // Emit VOICE_ACTION_REQUESTED evidence
              await emitVoiceEvidence({
                eventType: "VOICE_ACTION_REQUESTED",
                intentId,
                actorId,
                tenantId,
                payload: {
                  command: parsed.action,
                  decisionId: matchedDecision.decisionId,
                  optionId: matchedOption.id,
                  optionLabel: matchedOption.label,
                  confirmationRequired: true,
                },
                reason: "Decision selection requested (confirmation required)",
              });
              
              // Set confirmation state
              const confirmationTimeout = setTimeout(() => {
                console.log("[Voice Agent] Confirmation timeout - clearing pending action");
                setVoiceConfirmation(null);
              }, 30000); // 30 second timeout
              
              confirmationTimeoutRef.current = confirmationTimeout;
              
              setVoiceConfirmation({
                type: "select_decision",
                action: "select_decision",
                params: {
                  decisionId: matchedDecision.decisionId,
                  optionId: matchedOption.id,
                  optionLabel: matchedOption.label,
                },
                timeout: confirmationTimeout,
              });
              
              // Speak confirmation request
              if (window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(
                  `Asking confirmation: Select ${matchedOption.label}? Say 'Confirm' to proceed, or 'Cancel' to abort.`
                );
                utterance.rate = 1.0;
                window.speechSynthesis.speak(utterance);
              }
              
              // Keep listening for confirmation
              const isContinuous = recognitionRef.current?.continuous || false;
              if (isContinuous) {
                setVoiceState("listening");
              } else {
                // Even in non-continuous mode, we need to keep listening for confirmation
                // So restart recognition
                setTimeout(() => {
                  try {
                    recognitionRef.current?.start();
                    setVoiceState("listening");
                    setIsListening(true);
                  } catch (e) {
                    console.error("[Voice Agent] Error restarting for confirmation:", e);
                  }
                }, 500);
              }
              return; // Don't treat as intent input
            }
            
            // Phase 13.3: Handle action outcome update commands (requires confirmation)
            if (parsed.type === "update_action_outcome") {
              console.log("[Voice Agent] Action outcome update command:", parsed.actionIdentifier, parsed.outcomeType);
              console.log("[Voice Agent] Available actions:", actions.length, actions.map(a => ({ id: a.actionId, desc: a.description, outcome: a.outcome })));
              
              // Find matching action
              let matchedAction = null;
              
              if (actions.length === 0) {
                console.log("[Voice Agent] No actions available yet");
                // Speak error
                if (window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance("No actions available yet. Please wait for actions to be generated.");
                  utterance.rate = 1.0;
                  window.speechSynthesis.speak(utterance);
                }
                
                // Keep listening
                const isContinuous = recognitionRef.current?.continuous || false;
                if (isContinuous) {
                  setVoiceState("listening");
                } else {
                  setVoiceState("idle");
                  setIsListening(false);
                }
                return;
              }
              
              const searchTerm = parsed.actionIdentifier.toLowerCase();
              
              // Match by number first (e.g., "action 1" matches first action)
              if (/^\d+$/.test(searchTerm)) {
                const actionIndex = parseInt(searchTerm) - 1;
                if (actionIndex >= 0 && actionIndex < actions.length) {
                  const candidate = actions[actionIndex];
                  // Only match if it doesn't have an outcome
                  if (!candidate.outcome || candidate.outcome === "PENDING") {
                    matchedAction = candidate;
                    console.log("[Voice Agent] Matched by number:", actionIndex, candidate.description);
                  }
                }
              }
              
              // If not matched by number, try description/ID matching
              if (!matchedAction) {
                for (const action of actions) {
                  // Skip actions that already have an outcome
                  if (action.outcome && action.outcome !== "PENDING") {
                    continue;
                  }
                  
                  const actionDescriptionLower = action.description.toLowerCase();
                  const actionIdLower = action.actionId.toLowerCase();
                  
                  // Match by description - check if search term is contained in description or vice versa
                  // More flexible: "talk to agent" should match "Contact selected agent" or "Talk to agent"
                  if (actionDescriptionLower.includes(searchTerm) || searchTerm.includes(actionDescriptionLower.split(" ")[0])) {
                    matchedAction = action;
                    console.log("[Voice Agent] Matched by description:", action.description);
                    break;
                  }
                  
                  // Also try word-by-word matching for better flexibility
                  const searchWords = searchTerm.split(" ");
                  const descriptionWords = actionDescriptionLower.split(" ");
                  const matchingWords = searchWords.filter(word => descriptionWords.some(descWord => descWord.includes(word) || word.includes(descWord)));
                  if (matchingWords.length >= Math.min(2, searchWords.length)) {
                    matchedAction = action;
                    console.log("[Voice Agent] Matched by word overlap:", action.description);
                    break;
                  }
                  
                  // Match by ID or partial ID
                  if (actionIdLower.includes(searchTerm) || searchTerm === actionIdLower.split("-")[0]) {
                    matchedAction = action;
                    console.log("[Voice Agent] Matched by ID:", action.actionId);
                    break;
                  }
                }
              }
              
              if (!matchedAction) {
                console.log("[Voice Agent] No matching action found for:", parsed.actionIdentifier);
                console.log("[Voice Agent] Available actions:", actions.map(a => a.description));
                // Speak error
                if (window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance(`Could not find action ${parsed.actionIdentifier}. Available actions: ${actions.slice(0, 3).map(a => a.description).join(", ")}.`);
                  utterance.rate = 1.0;
                  window.speechSynthesis.speak(utterance);
                }
                
                // Keep listening
                const isContinuous = recognitionRef.current?.continuous || false;
                if (isContinuous) {
                  setVoiceState("listening");
                } else {
                  setVoiceState("idle");
                  setIsListening(false);
                }
                return;
              }
              
              // Request confirmation
              console.log("[Voice Agent] Requesting confirmation for:", matchedAction.description, parsed.outcomeType);
              
              // Emit VOICE_ACTION_REQUESTED evidence
              await emitVoiceEvidence({
                eventType: "VOICE_ACTION_REQUESTED",
                intentId,
                actorId,
                tenantId,
                payload: {
                  command: parsed.action,
                  actionId: matchedAction.actionId,
                  actionDescription: matchedAction.description,
                  outcomeType: parsed.outcomeType,
                  confirmationRequired: true,
                },
                reason: "Action outcome update requested (confirmation required)",
              });
              
              // Set confirmation state
              const confirmationTimeout = setTimeout(() => {
                console.log("[Voice Agent] Confirmation timeout - clearing pending action");
                setVoiceConfirmation(null);
              }, 30000); // 30 second timeout
              
              confirmationTimeoutRef.current = confirmationTimeout;
              
              setVoiceConfirmation({
                type: "update_action_outcome",
                action: "update_action_outcome",
                params: {
                  actionId: matchedAction.actionId,
                  actionDescription: matchedAction.description,
                  outcomeType: parsed.outcomeType,
                },
                timeout: confirmationTimeout,
              });
              
              // Speak confirmation request
              if (window.speechSynthesis) {
                const outcomeText = parsed.outcomeType.toLowerCase().replace(/_/g, " ");
                const utterance = new SpeechSynthesisUtterance(
                  `Asking confirmation: Mark ${matchedAction.description} as ${outcomeText}? Say 'Confirm' to proceed, or 'Cancel' to abort.`
                );
                utterance.rate = 1.0;
                window.speechSynthesis.speak(utterance);
              }
              
              // Keep listening for confirmation
              const isContinuous = recognitionRef.current?.continuous || false;
              if (isContinuous) {
                setVoiceState("listening");
              } else {
                // Even in non-continuous mode, we need to keep listening for confirmation
                // So restart recognition
                setTimeout(() => {
                  try {
                    recognitionRef.current?.start();
                    setVoiceState("listening");
                    setIsListening(true);
                  } catch (e) {
                    console.error("[Voice Agent] Error restarting for confirmation:", e);
                  }
                }, 500);
              }
              return; // Don't treat as intent input
            }
            
            // Handle navigation commands (Phase 13.1) - SIMPLE: Just execute directly
            if (parsed.type === "scroll") {
              console.log("[Voice Agent] Executing scroll command:", parsed.direction);
              
              // Emit VOICE_ACTION_REQUESTED
              await emitVoiceEvidence({
                eventType: "VOICE_ACTION_REQUESTED",
                intentId,
                actorId,
                tenantId,
                payload: {
                  command: parsed.action,
                  parameters: { direction: parsed.direction },
                  confirmationRequired: false,
                },
                reason: "Navigation command requested",
              });
              
              // Execute scroll - simple and direct
              const scrollTarget = rightPanelRef.current || window;
              const scrollAmount = scrollTarget === window 
                ? window.innerHeight * 0.8 
                : scrollTarget.clientHeight * 0.8;
              
              console.log("[Voice Agent] Scrolling", parsed.direction, "by", scrollAmount, "px");
              
              if (parsed.direction === "down") {
                if (scrollTarget === window) {
                  window.scrollBy({ top: scrollAmount, behavior: "smooth" });
                } else {
                  scrollTarget.scrollBy({ top: scrollAmount, behavior: "smooth" });
                }
              } else if (parsed.direction === "up") {
                if (scrollTarget === window) {
                  window.scrollBy({ top: -scrollAmount, behavior: "smooth" });
                } else {
                  scrollTarget.scrollBy({ top: -scrollAmount, behavior: "smooth" });
                }
              }
              
              // Emit VOICE_NAVIGATION_EXECUTED evidence
              await emitVoiceEvidence({
                eventType: "VOICE_NAVIGATION_EXECUTED",
                intentId,
                actorId,
                tenantId,
                payload: {
                  command: parsed.action,
                  direction: parsed.direction,
                  scrollAmount,
                },
                reason: "Navigation command executed",
              });
              
              console.log("[Voice Agent] Scroll command executed successfully");
              
              // Keep listening in continuous mode
              const isContinuous = recognitionRef.current?.continuous || false;
              if (!isContinuous) {
                setVoiceState("idle");
                setIsListening(false);
              } else {
                setVoiceState("listening");
                console.log("[Voice Agent] Continuous mode - keeping mic active");
              }
              return; // Don't treat as intent input
            }
            
            // Phase 13.4: Handle read commands (no confirmation required - read-only)
            if (parsed.type === "read") {
              console.log("[Voice Agent] Read command detected:", parsed.target, parsed.identifier);
              console.log("[Voice Agent] Content functions available:", {
                getDecisionContent: typeof getDecisionContent,
                getActionContent: typeof getActionContent,
                getExplanationContent: typeof getExplanationContent,
                getIntentSummary: typeof getIntentSummary,
                getCurrentContent: typeof getCurrentContent,
                getComplianceContent: typeof getComplianceContent,
                getRiskContent: typeof getRiskContent,
                getNextStepContent: typeof getNextStepContent,
              });
              
              let content = null;
              let contentType = parsed.target;
              
              try {
                // Extract content based on target
                switch (parsed.target) {
                  case "decision":
                    console.log("[Voice Agent] Extracting decision content, identifier:", parsed.identifier);
                    content = getDecisionContent ? getDecisionContent(parsed.identifier) : null;
                    console.log("[Voice Agent] Decision content extracted:", content ? `${content.substring(0, 50)}...` : "null");
                    break;
                  case "action":
                    console.log("[Voice Agent] Extracting action content, identifier:", parsed.identifier);
                    content = getActionContent ? getActionContent(parsed.identifier) : null;
                    console.log("[Voice Agent] Action content extracted:", content ? `${content.substring(0, 50)}...` : "null");
                    break;
                  case "explanation":
                    console.log("[Voice Agent] Extracting explanation content");
                    content = getExplanationContent ? getExplanationContent() : null;
                    console.log("[Voice Agent] Explanation content extracted:", content ? `${content.substring(0, 50)}...` : "null");
                    break;
                  case "intent":
                    console.log("[Voice Agent] Extracting intent summary");
                    content = getIntentSummary ? getIntentSummary() : null;
                    console.log("[Voice Agent] Intent summary extracted:", content ? `${content.substring(0, 50)}...` : "null");
                    break;
                  case "compliance":
                    console.log("[Voice Agent] Extracting compliance content");
                    content = getComplianceContent ? getComplianceContent() : null;
                    console.log("[Voice Agent] Compliance content extracted:", content ? `${content.substring(0, 50)}...` : "null");
                    break;
                  case "risk":
                    console.log("[Voice Agent] Extracting risk content");
                    content = getRiskContent ? getRiskContent() : null;
                    console.log("[Voice Agent] Risk content extracted:", content ? `${content.substring(0, 50)}...` : "null");
                    break;
                  case "next_step":
                    console.log("[Voice Agent] Extracting next step content");
                    content = getNextStepContent ? getNextStepContent() : null;
                    console.log("[Voice Agent] Next step content extracted:", content ? `${content.substring(0, 50)}...` : "null");
                    break;
                  case "current":
                    console.log("[Voice Agent] Extracting current content");
                    content = getCurrentContent ? getCurrentContent() : null;
                    console.log("[Voice Agent] Current content extracted:", content ? `${content.substring(0, 50)}...` : "null");
                    break;
                  default:
                    console.log("[Voice Agent] Unknown read target:", parsed.target);
                    content = null;
                }
              } catch (error) {
                console.error("[Voice Agent] Error extracting content:", error);
                content = null;
              }
              
              if (!content) {
                // No content available
                console.log("[Voice Agent] No content available for:", parsed.target);
                
                await emitVoiceEvidence({
                  eventType: "VOICE_READ_REQUESTED",
                  intentId,
                  actorId,
                  tenantId,
                  payload: {
                    command: parsed.action,
                    target: parsed.target,
                    identifier: parsed.identifier,
                    contentLength: 0,
                    error: "No content available",
                  },
                  reason: "Read command requested but no content available",
                });
                
                // Speak error message with improved reliability
                const errorMessage = `No ${parsed.target} content available to read.`;
                speakText(errorMessage, {
                  rate: 1.0,
                  onError: (error) => {
                    console.error("[Voice Agent] Failed to speak error message:", error);
                  }
                });
              } else {
                // Emit VOICE_READ_REQUESTED evidence
                await emitVoiceEvidence({
                  eventType: "VOICE_READ_REQUESTED",
                  intentId,
                  actorId,
                  tenantId,
                  payload: {
                    command: parsed.action,
                    target: parsed.target,
                    identifier: parsed.identifier,
                    contentLength: content.length,
                  },
                  reason: "Read command requested",
                });
                
                // Speak the content with improved reliability
                const spoken = speakText(content, {
                  rate: 1.0,
                  pitch: 1.0,
                  volume: 1.0,
                  lang: "en-US",
                  onStart: () => {
                    console.log("[Voice Agent] Reading content:", contentType, "length:", content.length);
                  },
                  onError: (error) => {
                    console.error("[Voice Agent] Failed to read content:", error);
                    // Fallback: log content to console
                    console.log("[Voice Agent] Content to read (fallback):", content);
                  },
                  onEnd: () => {
                    console.log("[Voice Agent] Finished reading:", contentType);
                  }
                });
                
                if (!spoken) {
                  // Fallback: log content to console if TTS is not available
                  console.log("[Voice Agent] Content to read (TTS unavailable):", content);
                }
              }
              
              // In continuous mode, keep listening
              const isContinuous = recognitionRef.current?.continuous || false;
              if (!isContinuous) {
                setVoiceState("idle");
                setIsListening(false);
              } else {
                setVoiceState("listening");
                console.log("[Voice Agent] Continuous mode - keeping mic active");
              }
              return; // Don't treat as intent input
            }
            
            // If command is not handled above, check if it should fall through to intent input
            if (parsed.type === "unknown") {
              console.log("[Voice Agent] Command type is unknown, falling through to intent input");
              // Fall through to normal intent input behavior below
            } else {
              // Command was recognized but not handled - log and return early to prevent intent input
              console.warn("[Voice Agent] Command recognized but not handled:", parsed.type);
              // Keep listening in continuous mode
              const isContinuous = recognitionRef.current?.continuous || false;
              if (!isContinuous) {
                setVoiceState("idle");
                setIsListening(false);
              } else {
                setVoiceState("listening");
              }
              return; // Don't treat as intent input
            }
          } catch (error) {
            console.error("[Voice Agent] Error processing command:", error);
            // On error, still fall through to normal intent input
          }
        } else {
          console.log("[Voice Agent] AI Agent Mode is disabled, treating as intent input");
        }
        
        // Normal behavior: Set transcribed text in input (existing logic)
        // Only reach here if AI Agent Mode is disabled OR command type is "unknown"
        setInput(transcript);
        
        // Auto-trigger analysis after brief delay (shows "Transcribing..." state)
        // This follows the design: text appears in input → POST /v1/execute auto-triggered
        setTimeout(() => {
          // Phase 13.1: In continuous mode, keep listening
          const isContinuous = recognitionRef.current?.continuous || false;
          if (!isContinuous) {
            setVoiceState("idle");
            setIsListening(false);
          } else {
            // Continuous mode: keep listening, just reset voice state
            setVoiceState("listening");
          }
          
          // Auto-trigger analysis if text is not empty
          // Use setTimeout to ensure React has updated the input state
          if (transcript) {
            // Wait for React to update input state, then call handleAnalyze
            // Use ref to get latest handleAnalyze function
            setTimeout(() => {
              if (handleAnalyzeRef.current) {
                handleAnalyzeRef.current();
              }
            }, 150); // Slightly longer delay to ensure state update
          }
        }, 500);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setVoiceState("idle");
        setIsListening(false);
        recognitionRunningRef.current = false; // Track actual running state
        
        // Don't show error for common non-critical errors - voice is optional
        if (event.error === "not-allowed") {
          setError("Microphone permission denied. Please allow microphone access and try again.");
        } else if (event.error === "network") {
          // Network error - voice input requires internet connection
          console.warn("Speech recognition requires internet connection. Voice input temporarily unavailable. You can still type your intent.");
          // Don't set error state - allow user to continue with typing
          // Voice input is optional, so this shouldn't block the user
        } else if (event.error === "no-speech") {
          // No speech detected - user might have clicked by accident, silently reset
          console.log("No speech detected - voice input cancelled");
          // Don't show error for this - it's expected behavior
        } else if (event.error === "aborted") {
          // Recognition was aborted - silently reset
          console.log("Speech recognition aborted");
          // Don't show error for this - it's expected behavior
        } else {
          // Other errors - show but don't block
          console.warn(`Speech recognition failed: ${event.error}. You can still type your intent.`);
          // Only show error for unexpected errors, and make it non-blocking
          setError(`Voice input unavailable (${event.error}). You can type your intent instead.`);
        }
      };

      recognition.onend = () => {
        console.log("Speech recognition ended");
        // Phase 13.1: In continuous mode, restart automatically
        const savedMode = localStorage.getItem("aiAgentMode") === "true";
        const wasListening = isListening;
        
        if (!savedMode || !wasListening) {
          // Normal mode or user stopped - reset state
          recognitionRunningRef.current = false; // Track actual running state
          setIsListening((prev) => {
            if (prev) {
              setVoiceState("idle");
              return false;
            }
            return prev;
          });
        } else {
          // Continuous mode and still listening - restart automatically
          // Note: recognitionRunningRef will be set to true again in onstart
          console.log("[Speech Recognition] Continuous mode - restarting...");
          try {
            // Small delay before restart to avoid rapid restarts
            setTimeout(() => {
              if (recognitionRef.current && isListening && !recognitionRunningRef.current) {
                recognitionRef.current.start();
              }
            }, 100);
          } catch (e) {
            // If restart fails (e.g., already started), that's OK
            console.log("[Speech Recognition] Restart skipped:", e.message);
            recognitionRunningRef.current = false; // Reset if restart failed
          }
        }
      };

      recognitionRef.current = recognition;
      console.log("✅ Speech Recognition initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Speech Recognition:", error);
      recognitionRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors during cleanup
        }
        recognitionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize once on mount only - handleAnalyze will be available via closure

  // Phase 2: Load general knowledge-based insights and legal references on mount (before intent)
  useEffect(() => {
    const loadGeneralInsights = async () => {
      try {
        // Only load if we don't already have insights (to avoid overwriting intent-specific ones)
        if (ragResponse || explainabilityResult) {
          return;
        }

        // Load general RAG insights for real estate
        try {
          const generalIntent = {
            type: "BUY_PROPERTY",
            extractedInfo: {},
            payload: { location: "General", budget: 0 },
            id: "general-insights"
          };
          const country = "IN"; // Default to India
          const generalRagResult = await queryRAG(generalIntent, country);
          if (generalRagResult) {
            setRagResponse(generalRagResult);
            console.log("[General Insights] Loaded general knowledge-based insights");
          }
        } catch (ragErr) {
          console.warn("[General Insights] Could not load general RAG insights:", ragErr);
          // Non-blocking - continue even if RAG fails
        }

        // Load general legal references
        try {
          const generalIntent = {
            type: "BUY_PROPERTY",
            extractedInfo: {},
            payload: {},
            id: "general-legal"
          };
          const generalCompliance = {
            decision: "ALLOW",
            reason: "General compliance information",
            confidence: "MEDIUM"
          };
          const generalExplainability = await getExplainability(
            generalIntent,
            generalCompliance,
            null,
            []
          );
          if (generalExplainability) {
            setExplainabilityResult(generalExplainability);
            console.log("[General Insights] Loaded general legal references");
          } else {
            // Explainability not available - use fallback
            setExplainabilityResult({
              explanation: "General legal references are available through the Compliance Engine.",
              legalReferences: [],
              confidence: 0.5,
            });
            // Also create a ragResponse fallback so Knowledge-Based Insights show
            setRagResponse({
              summary: "General real estate knowledge and legal references are available. Use the Compliance Engine for specific regulatory information.",
              market_context: {
                location_insights: "Market insights vary by location. Check local regulations and market trends.",
                price_trends: "Price trends depend on location, property type, and market conditions.",
                market_conditions: "Market conditions change frequently. Consult local real estate experts."
              },
              risk_signals: [],
              valuation_hint: {},
              sources: [],
              confidence: 0.5
            });
            console.log("[General Insights] Using fallback legal references and RAG response (Explainability Engine not available)");
          }
        } catch (explainErr) {
          // Non-blocking - use fallback
          setExplainabilityResult({
            explanation: "General legal references are available through the Compliance Engine.",
            legalReferences: [],
            confidence: 0.5,
          });
          // Also create a ragResponse fallback so Knowledge-Based Insights show
          setRagResponse({
            summary: "General real estate knowledge and legal references are available. Use the Compliance Engine for specific regulatory information.",
            market_context: {
              location_insights: "Market insights vary by location. Check local regulations and market trends.",
              price_trends: "Price trends depend on location, property type, and market conditions.",
              market_conditions: "Market conditions change frequently. Consult local real estate experts."
            },
            risk_signals: [],
            valuation_hint: {},
            sources: [],
            confidence: 0.5
          });
          console.log("[General Insights] Using fallback legal references and RAG response (Explainability Engine error)");
        }
      } catch (err) {
        console.warn("[General Insights] Error loading general insights:", err);
        // Non-blocking - don't show errors to user
      }
    };

    // Load general insights after a short delay to let component mount
    const timer = setTimeout(() => {
      loadGeneralInsights();
    }, 500);

    return () => clearTimeout(timer);
  }, []); // Run once on mount

  // Phase 5.4: Check for resume on mount
  useEffect(() => {
    const checkForResume = async () => {
      try {
        // Check if keycloak is available and token is parsed
        if (!keycloak || !keycloak.tokenParsed) {
          console.warn("Keycloak token not available, skipping resume check");
          setResumeLoading(false);
          return;
        }

        const tokenParsed = keycloak.tokenParsed;
        const actorId = tokenParsed?.sub || "unknown-user";
        const tenantId = tokenParsed?.realm || "intent-platform";

        try {
          const resumeResponse = await checkResume(actorId, tenantId);
          setResumeData(resumeResponse);

          if (resumeResponse && resumeResponse.resumable && resumeResponse.hasOpenIntent) {
            // Auto-load resumed intent
            setResult(resumeResponse.intent);
            setDecisions(resumeResponse.decisions || []);
            setActions(resumeResponse.actions || []);
            setLifecycleState(resumeResponse.lifecycleState);
            setInput(resumeResponse.intent?.payload?.originalText || "");

                  // If compliance was already checked, we need to restore it
                  // For now, we'll re-check compliance if needed
                  if (resumeResponse.intent && resumeResponse.lifecycleState !== "CREATED") {
                    try {
                      const complianceResult = await checkCompliance(resumeResponse.intent);
                      setCompliance(complianceResult);

                      // Phase 11: Evaluate Risk + Explainability for resumed intent
                      if (complianceResult.decision === "ALLOW") {
                        try {
                          const riskEvaluation = await evaluateRisk(
                            resumeResponse.intent,
                            complianceResult,
                            resumeResponse.decisions || []
                          );
                          if (riskEvaluation) {
                            setRiskResult(riskEvaluation);

                            // Get Explainability
                            try {
                              const explainabilityResponse = await getExplainability(
                                resumeResponse.intent,
                                complianceResult,
                                riskEvaluation,
                                resumeResponse.decisions || []
                              );
                              if (explainabilityResponse) {
                                setExplainabilityResult(explainabilityResponse);
                              }
                            } catch (explainErr) {
                              console.error("Explainability engine error on resume:", explainErr);
                            }
                          }
                        } catch (riskErr) {
                          console.error("Risk engine error on resume:", riskErr);
                        }
                      } else {
                        // Even if DENIED, get explainability
                        try {
                          const explainabilityResponse = await getExplainability(
                            resumeResponse.intent,
                            complianceResult,
                            null,
                            resumeResponse.decisions || []
                          );
                          if (explainabilityResponse) {
                            setExplainabilityResult(explainabilityResponse);
                          }
                        } catch (explainErr) {
                          console.error("Explainability engine error on resume:", explainErr);
                        }
                      }
                    } catch (err) {
                      console.error("Error restoring compliance:", err);
                    }
                  }
          }
        } catch (apiErr) {
          // Silently handle - engines not running is expected in dev
          console.warn("Resume API call failed (this is OK if Decision Engine is not running):", apiErr.message);
          // Set default resume data - no error shown to user
          setResumeData({ hasOpenIntent: false, resumable: false });
          // Don't set error state - this is expected if engines aren't running
        }
      } catch (err) {
        // Silently handle - don't show error if engines aren't running
        console.warn("Resume check error (engines may not be running):", err.message);
        // Don't block UI if resume fails - user can start new intent
        setResumeData({ hasOpenIntent: false, resumable: false });
        // Don't set error state - engines not running is expected
      } finally {
        setResumeLoading(false);
      }
    };

    checkForResume();
  }, []);

  // Phase 3: Watch for Intent Completion - Email Trigger 9
  useEffect(() => {
    if (lifecycleState === "COMPLETED" && result && decisions.length > 0 && actions.length > 0) {
      const userEmail = keycloak.tokenParsed?.email || keycloak.tokenParsed?.preferred_username || null;
      if (userEmail && !intentCompletedEmailSentRef.current) {
        // Check if all actions are completed
        const allActionsCompleted = actions.every(a => 
          a.outcome === "COMPLETED" || a.outcome === "CONFIRMED"
        );
        
        if (allActionsCompleted) {
          intentCompletedEmailSentRef.current = true; // Mark as sent
          sendIntentCompletedEmail({
            userEmail,
            intent: result,
            decisions,
            actions,
            intentId: result.id || "unknown",
          }).catch((emailErr) => {
            console.warn("[Email] Failed to send intent completed email:", emailErr);
            intentCompletedEmailSentRef.current = false; // Reset on error to allow retry
          });
        }
      }
    } else if (lifecycleState !== "COMPLETED") {
      // Reset flag when intent is no longer completed (new intent started)
      intentCompletedEmailSentRef.current = false;
    }
  }, [lifecycleState, result, decisions, actions]); // Only trigger when these change

  // When lifecycle is DECISIONS_MADE and actions are empty, fetch actions once (fallback if handleDecisionSelect didn't)
  useEffect(() => {
    if (
      lifecycleState !== "DECISIONS_MADE" ||
      !result?.id ||
      actions.length > 0 ||
      !decisions?.length
    ) return;
    const fetchKey = `${result.id}:DECISIONS_MADE`;
    if (actionsFetchedForRef.current.has(fetchKey)) return;
    actionsFetchedForRef.current.add(fetchKey);
    getActions(result, decisions, lifecycleState, [])
      .then((actionResult) => {
        if (actionResult?.actions?.length > 0) {
          setActions(actionResult.actions);
          if (actionResult.nextLifecycleState) setLifecycleState(actionResult.nextLifecycleState);
        }
      })
      .catch((err) => {
        console.warn("[Actions] Fallback fetch after DECISIONS_MADE failed:", err);
        actionsFetchedForRef.current.delete(fetchKey);
      });
  }, [lifecycleState, result, decisions, actions.length]);

  // Phase 5.4: Handle decision selection
  const handleDecisionSelect = async (decisionId, optionId, confirm = false) => {
    setLoading(true);
    setError(null);
    try {
      const tokenParsed = keycloak.tokenParsed;
      const userId = tokenParsed?.sub || "unknown-user";

      const response = await selectDecision(decisionId, optionId, userId, confirm);

      // Backend may return flat { decisionId, selectedOptionId, evolutionState }; normalize to full decision object
      const existingDecision = decisions.find((d) => (d.decisionId || d.id) === decisionId);
      const decisionFromResponse = response.decision ?? {
        ...existingDecision,
        decisionId: response.decisionId ?? decisionId,
        selectedOptionId: response.selectedOptionId ?? optionId,
        evolutionState: response.evolutionState ?? "SELECTED",
        type: existingDecision?.type,
        options: existingDecision?.options,
      };
      const effectiveDecision = { ...existingDecision, ...decisionFromResponse };

      // Treat SELECTED or CONFIRMED as "confirmed" for UI (backend returns SELECTED)
      const isDecisionConfirmed = (effectiveDecision.evolutionState === "CONFIRMED" || effectiveDecision.evolutionState === "SELECTED");

      // Phase 2: Add decision confirmation message to chat
      if (isDecisionConfirmed && addChatMessageRef.current) {
        const decisionType = effectiveDecision.type || "Decision";
        const selectedOption = effectiveDecision.options?.find(opt => opt.id === (effectiveDecision.selectedOptionId || optionId)) ||
                              effectiveDecision.options?.[0] ||
                              { label: optionId };
        const optionLabel = selectedOption?.label || selectedOption?.name || optionId;
        
        addChatMessageRef.current({
          text: `✅ Decision confirmed: ${decisionType} → ${optionLabel}`,
          type: "decision_confirmed",
          timestamp: new Date().toLocaleString()
        });
      }

      // Update decisions state ONCE with all changes (decision update + unlocked decisions)
      let updatedDecisionsList = [];
      setDecisions((prev) => {
        // Update the selected decision
        const updatedDecisions = prev.map((d) => (d.decisionId === decisionId || d.id === decisionId ? effectiveDecision : d));
        
        // Add unlocked decisions (deduplicate by decisionId)
        if (response.unlockedDecisions && response.unlockedDecisions.length > 0) {
          const existingIds = new Set(updatedDecisions.map((d) => d.decisionId));
          const newDecisions = response.unlockedDecisions.filter(
            (d) => !existingIds.has(d.decisionId)
          );
          updatedDecisions.push(...newDecisions);
          
          // Phase 2: Add message about unlocked decisions (defer to avoid render warning)
          if (addChatMessageRef.current && newDecisions.length > 0) {
            setTimeout(() => {
              if (addChatMessageRef.current) {
                addChatMessageRef.current({
                  text: `🔓 ${newDecisions.length} new decision${newDecisions.length > 1 ? "s" : ""} unlocked. Please review.`,
                  type: "decisions_unlocked",
                  timestamp: new Date().toLocaleString()
                });
              }
            }, 0);
          }
        }
        
        updatedDecisionsList = updatedDecisions; // Store for use outside callback
        
        // Determine lifecycle state from decision states (SELECTED counts as confirmed)
        const pendingDecisions = updatedDecisions.filter((d) => d.evolutionState === "PENDING");
        const confirmedDecisions = updatedDecisions.filter((d) => d.evolutionState === "CONFIRMED" || d.evolutionState === "SELECTED");
        
        if (pendingDecisions.length === 0 && confirmedDecisions.length > 0) {
          setLifecycleState("DECISIONS_MADE");
        } else if (pendingDecisions.length > 0) {
          setLifecycleState("AWAITING_DECISIONS");
        }
        
        return updatedDecisions;
      });

      // Compute merged decisions synchronously (don't rely on setDecisions callback - it may run async)
      const mergedDecisions = decisions.map((d) => (d.decisionId === decisionId || d.id === decisionId ? effectiveDecision : d));

      // Phase 3: Email Trigger 4 - Decision Confirmed (Individual)
      if (isDecisionConfirmed) {
        const userEmail = keycloak.tokenParsed?.email || keycloak.tokenParsed?.preferred_username || null;
        if (userEmail) {
          sendDecisionConfirmedEmail({
            userEmail,
            decision: effectiveDecision,
            decisions: mergedDecisions,
            intentId: result?.id || "unknown",
          }).catch((emailErr) => {
            console.warn("[Email] Failed to send decision confirmed email:", emailErr);
          });
        }
        // Agent Panel: when user selects an agent, create request so it appears on agent dashboard in real time
        const decisionType = (effectiveDecision.type || "").toUpperCase();
        const isAgentSelection = decisionType === "AGENT_SELECTION" || decisionType === "SELECT_AGENT";
        if (isAgentSelection && result) {
          const agentId = effectiveDecision.selectedOptionId || optionId;
          if (agentId) {
            createAgentRequest({
              agentId,
              userId: tokenParsed?.sub || "unknown-user",
              intentId: result.id || "unknown",
              userDetails: {
                whatUserWants: result.type || "BUY_PROPERTY",
                problemDescription: result.text || result.originalText || "",
                priority: riskResult?.level || "MEDIUM",
                category: result.type,
                payload: result.payload || {},
                extractedInfo: result.extractedInfo || {},
                complianceStatus: compliance?.decision,
              },
              userEmail: userEmail || "",
            }).catch((err) => {
              console.warn("[Agent Request] Create failed (non-blocking):", err?.message || err);
            });
          }
        }
      }

      // Fetch actions when all decisions are confirmed (use merged list so we don't rely on async setState)
      const decisionsToUse = mergedDecisions;
      const pendingDecisions = decisionsToUse.filter((d) => d.evolutionState === "PENDING");
      const confirmedDecisions = decisionsToUse.filter((d) => d.evolutionState === "CONFIRMED" || d.evolutionState === "SELECTED");
      const currentLifecycleState = (pendingDecisions.length === 0 && confirmedDecisions.length > 0)
        ? "DECISIONS_MADE"
        : lifecycleState;
      
      // ✅ CRITICAL: Only fetch actions if lifecycle state changed OR we don't have actions
      // This prevents regeneration when clicking decisions multiple times
      const lifecycleChanged = currentLifecycleState !== lifecycleState;
      const intentId = result?.id || "unknown";
      
      // Create unique key for this intent + lifecycle state combination
      const fetchKey = `${intentId}:${currentLifecycleState}`;
      
      // Check if we've already fetched for this exact combination
      // OR if we already have actions in state (prevent regeneration)
      const alreadyFetched = actionsFetchedForRef.current.has(fetchKey);
      const hasActions = actions.length > 0;
      
      const shouldFetchActions = 
        !alreadyFetched && !hasActions && (
          (response.unlockedActions && response.unlockedActions.length > 0) ||
          (isDecisionConfirmed && lifecycleChanged && currentLifecycleState === "DECISIONS_MADE") ||
          (isDecisionConfirmed && currentLifecycleState === "DECISIONS_MADE")
        );

      if (shouldFetchActions) {
        // ✅ CRITICAL: Mark as fetched BEFORE calling getActions to prevent race conditions
        actionsFetchedForRef.current.add(fetchKey);
        
        try {
          console.log("[Decision Select] Fetching actions, lifecycleState:", currentLifecycleState, "decisions:", decisionsToUse.length, "existingActions:", actions.length, "fetchKey:", fetchKey);
          const actionResult = await getActions(
            result,
            decisionsToUse,
            currentLifecycleState,
            actions  // ✅ Always pass existing actions to prevent regeneration
          );
          console.log("[Decision Select] Actions received:", actionResult.actions?.length || 0);
          
          // Only update if we got actions back
          if (actionResult.actions && actionResult.actions.length > 0) {
            setActions(actionResult.actions);
          } else if (actionResult.actions && actionResult.actions.length === 0 && actions.length > 0) {
            // If engine returns empty but we had actions, keep existing (might be temporary)
            console.warn("[Decision Select] Engine returned empty actions, keeping existing");
          } else {
            // Only clear if we explicitly got empty array and had none before
          setActions(actionResult.actions || []);
          }
          
          if (actionResult.nextLifecycleState) {
            setLifecycleState(actionResult.nextLifecycleState);
          }
        } catch (actionErr) {
          console.error("[Decision Select] Action engine error:", actionErr);
          actionsFetchedForRef.current.delete(fetchKey);
          if (actions.length === 0) {
            console.warn("[Decision Select] No actions available, keeping empty state");
          }
        }
      } else {
        if (alreadyFetched) {
          console.log("[Decision Select] Skipping action fetch - already fetched for:", fetchKey);
        } else if (hasActions) {
          console.log("[Decision Select] Skipping action fetch - actions already exist:", actions.length);
        } else {
          console.log("[Decision Select] Skipping action fetch - conditions not met");
        }
      }

      // Email Automation: Send initial confirmation email when all 4 decisions are confirmed
      // Agent, Lender, Property, Down Payment
      if (confirm && isDecisionConfirmed) {
        const updatedDecisionsForEmail = mergedDecisions;
        
        if (areAllDecisionsConfirmed(updatedDecisionsForEmail)) {
          const decisionValues = extractDecisionValues(updatedDecisionsForEmail);
          const userEmail = keycloak.tokenParsed?.email || keycloak.tokenParsed?.preferred_username || null;
          
          if (userEmail) {
            sendInitialConfirmationEmail({
              userEmail,
              agent: decisionValues.agent,
              lender: decisionValues.lender,
              property: decisionValues.property,
              downPayment: decisionValues.downPayment,
              intentId: result?.id || "unknown",
            }).catch((emailErr) => {
              // Non-blocking - log but don't fail the decision
              console.warn("[Email] Failed to send initial confirmation:", emailErr);
            });
          }
        }
      }
    } catch (err) {
      setError(err.message || "Failed to select decision");
      console.error("Decision selection error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Confirm all decisions sequentially so each setDecisions sees the previous update
  const handleConfirmAll = async (list) => {
    if (!list?.length) return;
    for (const { decisionId, optionId } of list) {
      await handleDecisionSelect(decisionId, optionId, true);
    }
  };

  // Phase 5.4: Handle decision change (with reason)
  const handleDecisionChangeClick = (decision, newOptionId) => {
    const decisionState = decision.originalDecision?.evolutionState || decision.originalDecision?.state || decision.evolutionState;
    
    // For pending decisions, allow changing the option (user can then accept the new option)
    // For confirmed or selected decisions, open change modal (reason required for CONFIRMED/SELECTED when using change API)
    if (decisionState === "PENDING" || !decisionState) {
      setDecisionToChange(decision);
      setNewOptionForChange(newOptionId || null);
      setChangeReason("");
      setError(null);
      setShowChangeModal(true);
    } else if (decisionState === "CONFIRMED" || decisionState === "SELECTED") {
      setDecisionToChange(decision);
      setNewOptionForChange(newOptionId || null);
      setChangeReason("");
      setError(null);
      setShowChangeModal(true);
    } else {
      setError(`Cannot change decision. Invalid state: ${decisionState || "UNKNOWN"}`);
      console.warn("Attempted to change decision in invalid state:", decisionState, decision);
      return;
    }
  };

  const handleDecisionChangeConfirm = async () => {
    if (!newOptionForChange) {
      setError("Please select a new option");
      return;
    }

    // Check decision state
    const decisionState = decisionToChange.originalDecision?.evolutionState || 
                         decisionToChange.originalDecision?.state ||
                         decisionToChange.evolutionState;

    // For pending decisions, just accept the new option directly (no changeDecision API call needed)
    if (decisionState === "PENDING" || !decisionState) {
      setLoading(true);
      setError(null);
      try {
        const tokenParsed = keycloak.tokenParsed;
        const userId = tokenParsed?.sub || "unknown-user";
        
        // Extract decisionId from the decision object
        const decisionId = decisionToChange.decisionId || decisionToChange.originalDecision?.decisionId || decisionToChange.originalDecision?.id;
        
        // For pending decisions, just accept the newly selected option
        await handleDecisionSelect(decisionId, newOptionForChange, true);
        
        setShowChangeModal(false);
        setChangeReason("");
        setDecisionToChange(null);
        setNewOptionForChange(null);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to update decision");
        console.error("Decision update error:", err);
      } finally {
        setLoading(false);
      }
      return;
    }

    // For confirmed/selected decisions, require reason and use changeDecision API
    if (!changeReason.trim()) {
      setError("Change reason is required for confirmed decisions");
      return;
    }
    
    if (decisionState !== "CONFIRMED" && decisionState !== "SELECTED") {
      const errorMsg = `Cannot change decision. Decision must be CONFIRMED or SELECTED. Current state: ${decisionState || "UNKNOWN"}.`;
      setError(errorMsg);
      console.error("Decision change validation failed:", {
        decisionState,
        originalDecision: decisionToChange.originalDecision,
        decisionToChange
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const tokenParsed = keycloak.tokenParsed;
      const userId = tokenParsed?.sub || "unknown-user";

      // Extract decisionId from the decision object
      const decisionId = decisionToChange.decisionId || decisionToChange.originalDecision?.decisionId || decisionToChange.originalDecision?.id;

      const response = await changeDecision(
        decisionId,
        newOptionForChange,
        changeReason,
        userId
      );

      // Update the decision
      // Update the changed decision in state and lifecycle (don't regenerate all decisions)
      setDecisions((prev) => {
        const updatedDecisions = prev.map((d) =>
          d.decisionId === decisionToChange.decisionId ? response.decision : d
        );
        
        // Update lifecycle state based on updated decisions
        const pendingDecisions = updatedDecisions.filter((d) => d.evolutionState === "PENDING");
        const confirmedDecisions = updatedDecisions.filter((d) => d.evolutionState === "CONFIRMED");
        
        if (pendingDecisions.length === 0 && confirmedDecisions.length > 0) {
          setLifecycleState("DECISIONS_MADE");
        } else if (pendingDecisions.length > 0) {
          setLifecycleState("AWAITING_DECISIONS");
        }
        
        return updatedDecisions;
      });

      // Don't regenerate decisions after change - just update the changed one
      // Actions will be refreshed automatically if lifecycle state changes

      // Phase 3: Email Trigger 6 - Decision Changed
      const userEmail = keycloak.tokenParsed?.email || keycloak.tokenParsed?.preferred_username || null;
      if (userEmail && newOptionForChange) {
        const newOption = decisionToChange.options?.find(opt => opt.id === newOptionForChange) || 
                         decisionToChange.originalDecision?.options?.find(opt => opt.id === newOptionForChange);
        sendDecisionChangedEmail({
          userEmail,
          decision: response.decision,
          newOption,
          reason: changeReason,
          intentId: result?.id || "unknown",
        }).catch((emailErr) => {
          console.warn("[Email] Failed to send decision changed email:", emailErr);
        });
      }

      setShowChangeModal(false);
      setChangeReason("");
      setDecisionToChange(null);
      setNewOptionForChange(null);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to change decision");
      console.error("Decision change error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Phase 5.4: Handle action outcome
  const handleActionOutcomeClick = (action, outcome) => {
    setActionForOutcome(action);
    setOutcomeType(outcome);
    setOutcomeReason("");
    setScheduledFor("");
    setShowActionModal(true);
  };

  const handleActionOutcomeConfirm = async () => {
    if (!actionForOutcome) {
      setError("No action selected. Please close and try again.");
      return;
    }
    // Validate required fields based on outcome type
    if (
      (outcomeType === "FAILED" || outcomeType === "BLOCKED" || outcomeType === "RESCHEDULED") &&
      !outcomeReason.trim()
    ) {
      setError(`${outcomeType} requires a reason`);
      return;
    }

    if (outcomeType === "RESCHEDULED" && !scheduledFor) {
      setError("RESCHEDULED requires a scheduled date");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const tokenParsed = keycloak.tokenParsed;
      const userId = tokenParsed?.sub || "unknown-user";

      // Get actionId - could be actionId or id field
      const actionId = actionForOutcome.actionId || actionForOutcome.id;
      if (!actionId) {
        throw new Error("Action ID not found in action object");
      }
      
      console.log("[Action Outcome] Updating action:", {
        actionId,
        outcome: outcomeType,
        actionObject: actionForOutcome
      });

      const response = await updateActionOutcome(
        actionId,
        outcomeType,
        userId,
        outcomeReason || null,
        scheduledFor || null
      );

      // Update the action: backend may return response.action or a different shape; fallback to merging outcome into current action
      const updatedAction = response?.action ?? {
        ...actionForOutcome,
        actionId: actionForOutcome.actionId || actionForOutcome.id,
        id: actionForOutcome.id || actionForOutcome.actionId,
        outcome: outcomeType,
        description: actionForOutcome.description,
      };
      console.log("[Action Outcome] Action updated:", {
        actionId: updatedAction?.actionId ?? updatedAction?.id ?? actionId,
        outcome: updatedAction?.outcome ?? outcomeType,
        description: updatedAction?.description,
      });
      
      // Update the action in state immediately
      setActions((prev) => {
        const updated = prev.map((a) => {
          const aId = a.actionId || a.id;
          return (aId === actionId) ? updatedAction : a;
        });
        console.log("[Action Outcome] Actions state updated:", updated.length, "actions");
        return updated;
      });

      // Email Automation: Send email immediately when action status changes
      // "Prathi dhaniki atlane povali" - Every single one should send mail
      const userEmail = keycloak.tokenParsed?.email || keycloak.tokenParsed?.preferred_username || null;
      if (userEmail) {
        sendActionStatusEmail({
          userEmail,
          action: updatedAction,
          status: outcomeType,
          reason: outcomeReason || null,
          scheduledFor: scheduledFor || null,
          intentId: result?.id || "unknown",
        }).catch((emailErr) => {
          // Non-blocking - log but don't fail the action update
          console.warn("[Email] Failed to send action status email:", emailErr);
        });
      }

      // ❌ DO NOT call getActions() after updateActionOutcome - it regenerates actions!
      // Action Engine handles sequential unlocking internally via updateActionOutcome response
      // If response.nextActions exists, add them directly without calling /execute
      
      // Handle newly unlocked actions (for any outcome type)
      if (response?.nextActions && response.nextActions.length > 0) {
        console.log("[Action Flow] Adding newly unlocked actions from response:", response.nextActions.length);
        setActions((prev) => {
          const existingIds = new Set(prev.map(a => a.actionId || a.id));
          const newActions = response.nextActions.filter(a => 
            !existingIds.has(a?.actionId || a?.id)
          );
          return [...prev, ...newActions];
        });
      }
      
      // Update lifecycle state if provided by Action Engine
      if (response?.intentStatus) {
        setLifecycleState(response.intentStatus);
      }
      
      // Phase 3: Email Trigger 9 - Intent Completed (when lifecycle becomes COMPLETED)
      if (response?.intentStatus === "COMPLETED") {
        const userEmail = keycloak.tokenParsed?.email || keycloak.tokenParsed?.preferred_username || null;
        if (userEmail && result) {
          const effectiveActionId = updatedAction?.actionId ?? updatedAction?.id ?? actionId;
          sendIntentCompletedEmail({
            userEmail,
            intent: result,
            decisions,
            actions: actions.map(a => (a.actionId || a.id) === effectiveActionId ? updatedAction : a),
            intentId: result.id || "unknown",
          }).catch((emailErr) => {
            console.warn("[Email] Failed to send intent completed email:", emailErr);
          });
        }
      }

      setShowActionModal(false);
      setOutcomeReason("");
      setScheduledFor("");
      setActionForOutcome(null);
      setOutcomeType(null);
    } catch (err) {
      // ✅ FIXED: Remove retry logic - if action not found, show error and ask user to refresh
      // DO NOT auto-refetch or retry - this causes regeneration
      if (err.message && err.message.includes("not found")) {
        setError("This action is no longer valid. The action list may have been updated. Please refresh the page to see the latest actions.");
        console.error("[Action Outcome] Action not found - user must refresh page:", err.message);
      } else {
      setError(err.message || "Failed to update action outcome");
      console.error("Action outcome error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Phase 5.4: Handle start new intent (dismiss resume); save current session to history first
  const handleStartNew = () => {
    if (result) {
      setIntentHistory((prev) => {
        const entry = {
          intent: result,
          compliance,
          decisions,
          actions,
          lifecycleState,
          ragResponse,
          createdAt: new Date().toISOString(),
        };
        const next = [entry, ...prev].slice(0, 50);
        return next;
      });
    }
    setResult(null);
    setCompliance(null);
    setDecisions([]);
    setActions([]);
    setLifecycleState(null);
    setResumeData(null);
    setRagResponse(null);
    setInput("");
    setError(null);
    setRiskResult(null);
    setExplainabilityResult(null);
    setEvidenceList([]);
  };

  // Restore a session from History so user can view or change it
  const handleSelectFromHistory = useCallback((entry) => {
    if (!entry?.intent) return;
    setResult(entry.intent);
    setCompliance(entry.compliance ?? null);
    setDecisions(entry.decisions ?? []);
    setActions(entry.actions ?? []);
    setLifecycleState(entry.lifecycleState ?? null);
    setRagResponse(entry.ragResponse ?? null);
    const intent = entry.intent;
    setInput(intent?.payload?.originalText || intent?.text || "");
    setError(null);
  }, []);

  // Remove one entry from history (persistence is synced via useEffect)
  const handleDeleteFromHistory = useCallback((entry) => {
    setIntentHistory((prev) => prev.filter((e) => (e.createdAt !== entry.createdAt) || (e.intent?.id !== entry.intent?.id)));
  }, []);

  // Phase 12: Fetch evidence for Audit Trail
  const fetchEvidence = async (intentId) => {
    if (!intentId) return;

    setEvidenceLoading(true);
    try {
      const evidence = await getEvidenceByIntent(intentId);
      setEvidenceList(evidence || []);
    } catch (error) {
      console.warn("Evidence retrieval failed (non-blocking):", error);
      // Non-blocking - don't show error to user
      setEvidenceList([]);
    } finally {
      setEvidenceLoading(false);
    }
  };

  // Voice Input: Handle mic button click
  const handleVoiceClick = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition not available in this browser");
      return;
    }

    // Check both React state and actual recognition state
    const isActuallyRunning = recognitionRunningRef.current || isListening;
    
    if (isActuallyRunning) {
      // Stop listening
      try {
        recognitionRef.current.stop();
        recognitionRunningRef.current = false; // Update ref immediately
        setVoiceState("idle");
        setIsListening(false);
      } catch (e) {
        console.error("Error stopping recognition:", e);
        recognitionRunningRef.current = false; // Reset on error
      }
    } else {
      // Start listening - only if not already running
      if (recognitionRunningRef.current) {
        console.log("[Voice Input] Recognition already running, skipping start");
        return;
      }
      
      try {
        setError(null);
        
        // Phase 13.1: Update continuous mode based on AI Agent Mode
        const savedMode = localStorage.getItem("aiAgentMode") === "true";
        recognitionRef.current.continuous = savedMode;
        console.log("[Voice Input] Starting listening, continuous:", savedMode);
        
        recognitionRef.current.start();
        // Note: recognitionRunningRef will be set to true in onstart handler
      } catch (e) {
        console.error("Error starting recognition:", e);
        recognitionRunningRef.current = false; // Reset on error
        if (e.message && e.message.includes("already started")) {
          // Recognition already running - this shouldn't happen with our check, but handle gracefully
          console.log("[Voice Input] Recognition was already started, resetting state");
          recognitionRunningRef.current = true; // Sync state
          setIsListening(true);
          setVoiceState("listening");
        } else {
          setError("Failed to start voice input. Please check microphone permissions.");
        }
      }
    }
  };

  // Chat Message Handler - Processes decision confirmations from chat
  // AI recommends, Human decides - all decisions must come through chat
  const handleChatMessage = useCallback(async (message) => {
    if (!message || !message.trim() || !decisions || decisions.length === 0) return;
    
    const msg = message.trim().toLowerCase();
    const tokenParsed = keycloak.tokenParsed;
    const userId = tokenParsed?.sub || "unknown-user";
    const userName = tokenParsed?.name || tokenParsed?.preferred_username || "User";
    
    // Parse decision confirmation patterns
    // Examples: "I accept Agent A", "I want Agent B", "Change to Agent B", "I'll go with Property 3"
    const acceptPattern = /(?:accept|choose|select|go with|take|want|pick)\s+(.+)/i;
    const changePattern = /(?:change|switch|update|use|select)\s+(?:to|with)?\s*(.+)/i;
    
    let matchedDecision = null;
    let matchedOption = null;
    
    // Try to match against decision options
    for (const decision of decisions) {
      if (decision.evolutionState === "CONFIRMED") continue; // Skip already confirmed
      
      if (!decision.options || decision.options.length === 0) continue;
      
      for (const option of decision.options) {
        const optionLabel = (option.label || option.id || "").toLowerCase();
        const optionId = option.id;
        
        // Check if message mentions this option
        if (msg.includes(optionLabel) || msg.includes(optionId.toLowerCase())) {
          matchedDecision = decision;
          matchedOption = option;
          break;
        }
      }
      
      if (matchedDecision) break;
    }
    
    // If we found a match, confirm the decision
    if (matchedDecision && matchedOption) {
      try {
        // Update decision with human confirmation (confirm=true means human decision)
        await handleDecisionSelect(matchedDecision.decisionId || matchedDecision.id, matchedOption.id, true);
        
        // Update decision metadata to track who decided and how
        setDecisions(prev => prev.map(d => {
          if (d.decisionId === matchedDecision.decisionId || d.id === matchedDecision.id) {
            return {
              ...d,
              decidedBy: userName,
              decisionMethod: "chat",
              decisionTimestamp: new Date().toISOString(),
            };
          }
          return d;
        }));
        
        console.log(`[Chat Decision] User ${userName} confirmed decision via chat: ${matchedDecision.type} → ${matchedOption.label || matchedOption.id}`);
      } catch (err) {
        console.error("[Chat Decision] Error confirming decision:", err);
        setError("Failed to confirm decision. Please try again.");
      }
    } else {
      // No decision match - could be a question or other message
      // For now, just log it (could add AI response here later)
      console.log("[Chat] Message received but no decision match:", message);
    }
  }, [decisions, handleDecisionSelect]);

  // Main UI - Living Space Layout (PHASE 1: UI Integration)
  // Always use LivingSpaceLayout - it handles loading, empty, and active states
  // All engines remain unchanged - only UI wrapper replaced
  // Handler to switch between multiple intents
  const handleSwitchIntent = useCallback((index) => {
    if (multipleIntents.length > 0 && index >= 0 && index < multipleIntents.length) {
      setActiveIntentIndex(index);
      const selectedIntent = multipleIntents[index];
      setResult(selectedIntent.intent);
      setCompliance(selectedIntent.compliance);
      setDecisions(selectedIntent.decisions);
      setActions(selectedIntent.actions);
      setLifecycleState(selectedIntent.lifecycleState);
      setRiskResult(selectedIntent.riskResult);
      setRagResponse(selectedIntent.ragResponse);
      
      // Update action fetch tracking for this intent
      actionsFetchedForRef.current.clear();
      if (selectedIntent.lifecycleState === "DECISIONS_MADE" || selectedIntent.lifecycleState === "ACTIONS_IN_PROGRESS") {
        const fetchKey = `${selectedIntent.intent.id}:${selectedIntent.lifecycleState}`;
        actionsFetchedForRef.current.add(fetchKey);
      }
      
      // Add chat message about switching
      if (addChatMessageRef.current) {
        const parsed = selectedIntent.parsedInfo;
        addChatMessageRef.current({
          text: `Switched to Intent ${index + 1}: ${parsed.intentType} in ${parsed.location}`,
          type: "system",
          timestamp: new Date().toLocaleString()
        });
      }
    }
  }, [multipleIntents]);

  // Sir integration: Buyer vs Investor routing, refinement, loan, ROI, Trust Receipt
  const routeModelVal = useMemo(() => routeModel(input, result), [input, result]);
  const confidence = useMemo(() => (result ? calibrateConfidence(result) : 0), [result]);
  const refinementPrompt = useMemo(() => (result ? getRefinementPrompt(result) : null), [result]);
  const loanOptions = useMemo(() => (result ? matchBanks(result) : []), [result]);
  const roiData = useMemo(
    () => (result && routeModelVal === "investor" ? calculateROI(result) : null),
    [result, routeModelVal]
  );
  const trustReceipt = useMemo(
    () =>
      result
        ? generateTrustReceipt(result, compliance, {
            loans: loanOptions,
            roi: roiData,
            routeModel: routeModelVal,
          })
        : null,
    [result, compliance, loanOptions, roiData, routeModelVal]
  );

  return (
    <>
      {/* Multi-Intent Tab Switcher */}
      {multipleIntents.length > 1 && (
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          backgroundColor: "#FFFFFF",
          borderBottom: "2px solid #DDE1E3",
          padding: "12px 20px",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontWeight: 600, color: "#51697A", marginRight: "8px", alignSelf: "center" }}>
            Multiple Intents ({multipleIntents.length}):
          </div>
          {multipleIntents.map((intentData, index) => {
            const parsed = intentData.parsedInfo;
            const isActive = index === activeIntentIndex;
            const intentTypeLabel = parsed.intentType === "BUY_PROPERTY" ? "Buy" : 
                                   parsed.intentType === "SELL_PROPERTY" ? "Sell" : 
                                   parsed.intentType === "RENT_PROPERTY" ? "Rent" : "Property";
            const budgetText = parsed.budget ? `₹${(parsed.budget / 100000).toFixed(0)}L` : "";
            
            return (
              <button
                key={index}
                onClick={() => handleSwitchIntent(index)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: isActive ? "#003152" : "#F4FCFD",
                  color: isActive ? "#FFFFFF" : "#003152",
                  border: `1px solid ${isActive ? "#003152" : "#DDE1E3"}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "13px",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap"
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "#DDE1E3";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "#F4FCFD";
                  }
                }}
              >
                {index + 1}. {intentTypeLabel} {parsed.location}{budgetText ? ` (${budgetText})` : ""}
              </button>
            );
          })}
        </div>
      )}
      
      <LivingSpaceLayout
        // Engine Data (unchanged)
        result={result}
        compliance={compliance}
        decisions={decisions}
        actions={actions}
        evidenceList={evidenceList}
        ragResponse={ragResponse}
        explainabilityResult={explainabilityResult} // Phase 2: Add explainability for legal references
        
        // Engine Handlers (unchanged)
        onAnalyze={handleAnalyze}
        onDecisionSelect={(decisionId, optionId, confirm) => handleDecisionSelect(decisionId, optionId, confirm)}
        onConfirmAll={handleConfirmAll}
        onActionOutcome={(action, outcome) => handleActionOutcomeClick(action, outcome)}
        onDecisionChangeClick={handleDecisionChangeClick}
        onVoiceClick={handleVoiceClick}
        onChatMessage={handleChatMessage} // NEW: Chat-driven decision confirmations
        onAddChatMessage={addChatMessageRef} // Phase 2: Ref for adding system messages
        
        // UI State
        input={input}
        setInput={setInput}
        loading={loading}
        error={error}
        // Sir integration: refinement, loan, ROI, route, Trust Receipt, confidence
        refinementPrompt={refinementPrompt}
        loanOptions={loanOptions}
        roi={roiData}
        routeModel={routeModelVal}
        trustReceipt={trustReceipt}
        confidence={confidence}
        intentHistory={intentHistory}
        onSelectFromHistory={handleSelectFromHistory}
        onDeleteFromHistory={handleDeleteFromHistory}
        onStartNew={handleStartNew}
      />

        {/* Phase 5.4: Decision Change Modal */}
        {showChangeModal && decisionToChange && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowChangeModal(false)}
          >
            <div
              style={{
                backgroundColor: "#F4FCFD",
                padding: 30,
                borderRadius: 12,
                border: "1px solid #DDE1E3",
                width: 500,
                maxWidth: "90%",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0, color: "#003152" }}>Change Decision</h3>
              {(() => {
                const decisionState = decisionToChange?.originalDecision?.evolutionState || decisionToChange?.originalDecision?.state;
                const isPending = decisionState === "PENDING" || !decisionState;
                return (
                  <>
              <p style={{ color: "#51697A", marginBottom: 20 }}>
                      {isPending 
                        ? "Select a different option. You can then accept this new option."
                        : "Select a new option and provide a reason for changing this confirmed decision."}
                    </p>
                    
                    {/* New Option Selection */}
                    {decisionToChange?.originalDecision?.options && decisionToChange.originalDecision.options.length > 0 && (
                      <div style={{ marginBottom: 15 }}>
                        <label style={{ display: "block", marginBottom: 8, fontWeight: 700, color: "#003152" }}>
                          Select New Option (Required):
                        </label>
                        <select
                          value={newOptionForChange || ""}
                          onChange={(e) => setNewOptionForChange(e.target.value)}
                          style={{
                            width: "100%",
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #DDE1E3",
                            fontSize: 14,
                            background: "#FFFFFF",
                            color: "#003152",
                          }}
                        >
                          <option value="">-- Select an option --</option>
                          {decisionToChange.originalDecision.options.map((opt) => {
                            const isCurrent = opt.id === decisionToChange.selectedOption?.id || opt.id === decisionToChange.option?.id;
                            return (
                              <option key={opt.id} value={opt.id}>
                                {opt.label || opt.id} {isCurrent ? "(Current)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    {/* Reason field - only required for confirmed decisions */}
                    {!isPending && (
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 700, color: "#003152" }}>
                  Reason for Change (Required):
                </label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Please explain why you are changing this decision..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #DDE1E3",
                    fontSize: 14,
                    background: "#FFFFFF",
                    color: "#003152",
                  }}
                />
              </div>
                    )}
                  </>
                );
              })()}
              
              {error && (
                <div style={{
                  marginBottom: 15,
                  padding: 10,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid #EF4444",
                  borderRadius: 8,
                  color: "#DC2626",
                  fontSize: 14
                }}>
                  {error}
                </div>
              )}
              {(() => {
                const decisionState = decisionToChange?.originalDecision?.evolutionState || decisionToChange?.originalDecision?.state;
                const isPending = decisionState === "PENDING" || !decisionState;
                const isValid = isPending 
                  ? newOptionForChange && !loading
                  : changeReason.trim() && newOptionForChange && !loading;
                const isDisabled = isPending
                  ? !newOptionForChange || loading
                  : !changeReason.trim() || !newOptionForChange || loading;
                
                return (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => {
                    setShowChangeModal(false);
                    setChangeReason("");
                        setNewOptionForChange(null);
                        setError(null);
                  }}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#FFFFFF",
                    color: "#003152",
                    border: "1px solid #003152",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#003152";
                    e.currentTarget.style.color = "#FFFFFF";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                    e.currentTarget.style.color = "#003152";
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecisionChangeConfirm}
                      disabled={isDisabled}
                  style={{
                    padding: "10px 20px",
                        backgroundColor: isValid ? "#003152" : "#9CA3AF",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                        cursor: isValid ? "pointer" : "not-allowed",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                        if (isValid) {
                      e.currentTarget.style.backgroundColor = "#000000";
                    }
                  }}
                  onMouseLeave={(e) => {
                        if (isValid) {
                      e.currentTarget.style.backgroundColor = "#003152";
                    }
                  }}
                >
                      {isPending ? "Select & Accept" : "Confirm Change"}
                </button>
              </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Phase 5.4: Action Outcome Modal */}
        {showActionModal && actionForOutcome && outcomeType && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowActionModal(false)}
          >
            <div
              style={{
                backgroundColor: "#F4FCFD",
                padding: 30,
                borderRadius: 12,
                border: "1px solid #DDE1E3",
                width: 500,
                maxWidth: "90%",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0, color: "#003152" }}>Update Action Outcome</h3>
              <p style={{ color: "#51697A", marginBottom: 20 }}>
                Action: <strong style={{ color: "#003152" }}>{actionForOutcome.description}</strong>
              </p>
              <p style={{ color: "#51697A", marginBottom: 20 }}>
                Outcome: <strong style={{ color: "#003152" }}>{outcomeType}</strong>
              </p>

              {(outcomeType === "FAILED" ||
                outcomeType === "BLOCKED" ||
                outcomeType === "RESCHEDULED") && (
                <div style={{ marginBottom: 15 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700, color: "#003152" }}>
                    Reason (Required):
                  </label>
                  <textarea
                    value={outcomeReason}
                    onChange={(e) => setOutcomeReason(e.target.value)}
                    placeholder="Please explain why..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 8,
                      border: "1px solid #DDE1E3",
                      fontSize: 14,
                      background: "#FFFFFF",
                      color: "#003152",
                    }}
                  />
                </div>
              )}

              {outcomeType === "RESCHEDULED" && (
                <div style={{ marginBottom: 15 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700, color: "#003152" }}>
                    Scheduled For (Required):
                  </label>
                  <input
                    type="date"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 8,
                      border: "1px solid #DDE1E3",
                      fontSize: 14,
                      background: "#FFFFFF",
                      color: "#003152",
                    }}
                  />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setOutcomeReason("");
                    setScheduledFor("");
                  }}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#FFFFFF",
                    color: "#003152",
                    border: "1px solid #003152",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#003152";
                    e.currentTarget.style.color = "#FFFFFF";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                    e.currentTarget.style.color = "#003152";
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleActionOutcomeConfirm}
                  disabled={
                    loading ||
                    ((outcomeType === "FAILED" ||
                      outcomeType === "BLOCKED" ||
                      outcomeType === "RESCHEDULED") &&
                      !outcomeReason.trim()) ||
                    (outcomeType === "RESCHEDULED" && !scheduledFor)
                  }
                  style={{
                    padding: "10px 20px",
                    backgroundColor:
                      !loading &&
                      !(
                        ((outcomeType === "FAILED" ||
                          outcomeType === "BLOCKED" ||
                          outcomeType === "RESCHEDULED") &&
                          !outcomeReason.trim()) ||
                        (outcomeType === "RESCHEDULED" && !scheduledFor)
                      )
                        ? "#003152"
                        : "#9CA3AF",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    cursor:
                      !loading &&
                      !(
                        ((outcomeType === "FAILED" ||
                          outcomeType === "BLOCKED" ||
                          outcomeType === "RESCHEDULED") &&
                          !outcomeReason.trim()) ||
                        (outcomeType === "RESCHEDULED" && !scheduledFor)
                      )
                        ? "pointer"
                        : "not-allowed",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    if (
                      !loading &&
                      !(
                        ((outcomeType === "FAILED" ||
                          outcomeType === "BLOCKED" ||
                          outcomeType === "RESCHEDULED") &&
                          !outcomeReason.trim()) ||
                        (outcomeType === "RESCHEDULED" && !scheduledFor)
                      )
                    ) {
                      e.currentTarget.style.backgroundColor = "#000000";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (
                      !loading &&
                      !(
                        ((outcomeType === "FAILED" ||
                          outcomeType === "BLOCKED" ||
                          outcomeType === "RESCHEDULED") &&
                          !outcomeReason.trim()) ||
                        (outcomeType === "RESCHEDULED" && !scheduledFor)
                      )
                    ) {
                      e.currentTarget.style.backgroundColor = "#003152";
                    }
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}

