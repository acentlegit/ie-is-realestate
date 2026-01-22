/**
 * Engine Orchestration Types
 * 
 * Defines the JSON contracts and event types for engine-to-engine communication.
 * 
 * This ensures:
 * - Deterministic handoffs
 * - Type safety
 * - Immutable contracts
 */

/**
 * Engine Types
 */
export type EngineType = 
  | "INTENT_ENGINE"
  | "COMPLIANCE_ENGINE"
  | "DECISION_ENGINE"
  | "ACTION_ENGINE"
  | "RISK_ENGINE"
  | "EXPLAINABILITY_ENGINE"
  | "RAG_ADAPTER"
  | "EVIDENCE_ENGINE"
  | "PROGRESSION_TREE";

/**
 * Lifecycle States
 */
export type LifecycleState = 
  | "INTENT_RECEIVED"
  | "INTENT_PARSED"
  | "COMPLIANCE_CHECKING"
  | "INTENT_BLOCKED"
  | "AWAITING_DECISIONS"
  | "DECISIONS_MADE"
  | "ACTIONS_IN_PROGRESS"
  | "ACTIONS_COMPLETED";

/**
 * Compliance Decision
 */
export type ComplianceDecision = "ALLOW" | "DENY";
export type ComplianceStatus = "PASSED" | "FAILED";

/**
 * JSON Contract: Intent Engine Output
 */
export interface IntentEngineOutput {
  id: string;
  type: string;
  tenantId: string;
  actorId: string;
  extractedInfo: Record<string, any>;
  subIntents: string[];
  industry: string;
  confidence: number;
  createdAt: string;
}

/**
 * JSON Contract: Compliance Engine Input
 */
export interface ComplianceEngineInput {
  intentId: string;
  tenantId: string;
  actorId: string;
  intentType: string;
  location: string;
  budget: number;
  area?: string;
  propertyId?: string;
}

/**
 * JSON Contract: Compliance Engine Output
 */
export interface ComplianceEngineOutput {
  intentId: string;
  engine: "COMPLIANCE_ENGINE";
  decision: ComplianceDecision;
  status: ComplianceStatus;
  confidence: number;
  blocking: boolean;
  reason: string;
  checks: Array<{
    type: "ZONING" | "BUDGET" | "REGULATORY" | "CITIZENSHIP" | "GPS";
    status: "PASS" | "FAIL";
    details: string;
  }>;
  timestamp: string;
}

/**
 * JSON Contract: Decision Engine Input
 */
export interface DecisionEngineInput {
  intentId: string;
  intent: IntentEngineOutput;
  complianceStatus: ComplianceDecision;
  complianceResult: ComplianceEngineOutput;
  existingDecisions?: any[];
}

/**
 * JSON Contract: Decision Engine Output
 */
export interface DecisionEngineOutput {
  intentId: string;
  engine: "DECISION_ENGINE";
  decisions: Array<{
    decisionId: string;
    decisionType: string;
    status: "PENDING" | "SELECTED" | "CONFIRMED" | "CHANGED";
    options: Array<{
      id: string;
      label: string;
      description: string;
      recommended: boolean;
    }>;
    selectedOptionId: string | null;
    isConfirmed: boolean;
  }>;
  lifecycleState: LifecycleState;
  timestamp: string;
}

/**
 * JSON Contract: Action Engine Input
 */
export interface ActionEngineInput {
  intentId: string;
  intent: IntentEngineOutput;
  decisions: any[];
  lifecycleState: LifecycleState;
  existingActions?: any[];
}

/**
 * JSON Contract: Action Engine Output
 */
export interface ActionEngineOutput {
  intentId: string;
  engine: "ACTION_ENGINE";
  actions: Array<{
    actionId: string;
    description: string;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
    outcome: "COMPLETED" | "FAILED" | "RESCHEDULED" | "SKIPPED" | null;
    guidance: string;
    dependsOn?: string[];
    entityId?: string;
  }>;
  nextLifecycleState: LifecycleState;
  timestamp: string;
}

/**
 * Event Types (for Evidence Engine)
 */
export type EventType = 
  | "INTENT_RECEIVED"
  | "INTENT_PARSED"
  | "COMPLIANCE_STARTED"
  | "COMPLIANCE_RESULT"
  | "DECISIONS_GENERATED"
  | "DECISION_SELECTED"
  | "DECISION_CONFIRMED"
  | "DECISION_CHANGED"
  | "ACTIONS_GENERATED"
  | "ACTION_COMPLETED"
  | "ACTION_FAILED"
  | "RAG_QUERY_EXECUTED"
  | "RAG_ADVISORY_LOW_CONFIDENCE"
  | "ENTITY_SELECTED"
  | "ENTITY_CONFIRMED"
  | "ENTITY_ACTION";

/**
 * Base Event Structure
 */
export interface BaseEvent {
  eventType: EventType;
  intentId: string;
  timestamp: string;
  engine: EngineType;
  actorId: string;
  tenantId: string;
  payload: Record<string, any>;
  reason?: string;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Orchestration Flow Validator
 * 
 * Ensures engines are called in correct order
 */
export class OrchestrationValidator {
  private static readonly VALID_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
    INTENT_RECEIVED: ["INTENT_PARSED"],
    INTENT_PARSED: ["COMPLIANCE_CHECKING"],
    COMPLIANCE_CHECKING: ["INTENT_BLOCKED", "AWAITING_DECISIONS"],
    INTENT_BLOCKED: [], // Terminal
    AWAITING_DECISIONS: ["DECISIONS_MADE"],
    DECISIONS_MADE: ["ACTIONS_IN_PROGRESS"],
    ACTIONS_IN_PROGRESS: ["ACTIONS_COMPLETED"],
    ACTIONS_COMPLETED: [], // Terminal
  };

  /**
   * Validate state transition
   */
  static validateTransition(from: LifecycleState, to: LifecycleState): boolean {
    const allowed = this.VALID_TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  /**
   * Get next valid states
   */
  static getNextValidStates(current: LifecycleState): LifecycleState[] {
    return this.VALID_TRANSITIONS[current] || [];
  }
}

/**
 * Engine Orchestration Helper
 * 
 * Provides utilities for engine coordination
 */
export class EngineOrchestrator {
  /**
   * Check if compliance allows progression
   */
  static canProceedToDecisions(complianceResult: ComplianceEngineOutput): boolean {
    return complianceResult.decision === "ALLOW" && !complianceResult.blocking;
  }

  /**
   * Check if decisions allow actions
   */
  static canProceedToActions(lifecycleState: LifecycleState): boolean {
    return lifecycleState === "DECISIONS_MADE" || lifecycleState === "ACTIONS_IN_PROGRESS";
  }

  /**
   * Check if RAG should be used (confidence threshold)
   */
  static shouldUseRAG(ragResponse: any): boolean {
    return ragResponse?.confidence >= 0.7;
  }

  /**
   * Validate JSON contract
   */
  static validateContract<T>(data: any, requiredFields: (keyof T)[]): data is T {
    return requiredFields.every(field => field in data);
  }
}
