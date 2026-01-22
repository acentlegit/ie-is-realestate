/**
 * Compliance Engine - Rule-Based Implementation
 * 
 * This engine evaluates compliance rules and acts as a hard gate.
 * If any blocking rule fails, the pipeline stops.
 * 
 * Rules:
 * 1. Citizenship/Eligibility
 * 2. Zoning Validation
 * 3. Land Existence/GPS
 */

import { BaseEvent, EventType } from './orchestration';

/**
 * Rule Types
 */
export type RuleType = 
  | "CITIZENSHIP"
  | "ZONING"
  | "GPS";

/**
 * Rule IDs
 */
export type RuleId = 
  | "FOREIGN_NATIONAL_LAND_RESTRICTION"
  | "ZONING_VALIDATION"
  | "LAND_EXISTENCE_GPS_VALIDATION";

/**
 * Rule Check Result
 */
export interface RuleCheckResult {
  ruleId: RuleId;
  type: RuleType;
  status: "PASS" | "FAIL";
  blocking: boolean;
  reason: string;
  details: Record<string, any>;
}

/**
 * Compliance Engine Input
 */
export interface ComplianceEngineInput {
  intentId: string;
  tenantId: string;
  actorId: string;
  intentType: string;
  location: string;
  budget?: number;
  area?: string;
  propertyId?: string;
  gpsCoordinates?: {
    lat: number;
    lng: number;
  };
  actorCitizenship?: "CITIZEN" | "RESIDENT" | "FOREIGN";
  intendedUse?: "RESIDENTIAL" | "COMMERCIAL" | "MIXED";
}

/**
 * Compliance Engine Output
 */
export interface ComplianceEngineOutput {
  intentId: string;
  engine: "COMPLIANCE_ENGINE";
  decision: "ALLOW" | "DENY";
  status: "PASSED" | "FAILED";
  confidence: number;
  blocking: boolean;
  reason: string;
  checks: RuleCheckResult[];
  timestamp: string;
}

/**
 * Mock Citizenship Rules
 */
const citizenshipRules = {
  "IN": {
    restrictedStates: ["Andhra Pradesh", "Telangana"], // Mock restriction
    restrictedLandTypes: ["AGRICULTURAL"]
  },
  "US": {
    restrictedStates: [],
    restrictedLandTypes: []
  }
};

/**
 * Rule 1: Citizenship / Eligibility Check
 */
async function checkCitizenshipRule(
  input: ComplianceEngineInput
): Promise<RuleCheckResult> {
  const ruleId: RuleId = "FOREIGN_NATIONAL_LAND_RESTRICTION";
  
  // Determine country from location
  const country = input.location.includes("India") ? "IN" : 
                   input.location.includes("US") || input.location.includes("United States") ? "US" : "IN";
  
  // Extract state (mock parsing)
  const stateMatch = input.location.match(/(\w+\s*\w+)\s*(?:State|Province|,)/i);
  const state = stateMatch ? stateMatch[1] : "Unknown";
  
  // Get citizenship (default to CITIZEN if not provided)
  const citizenship = input.actorCitizenship || "CITIZEN";
  
  // Mock rule logic
  const rules = citizenshipRules[country as keyof typeof citizenshipRules] || citizenshipRules.IN;
  
  if (citizenship === "FOREIGN" && rules.restrictedStates.includes(state)) {
    return {
      ruleId,
      type: "CITIZENSHIP",
      status: "FAIL",
      blocking: true,
      reason: `Foreign nationals are restricted from purchasing ${rules.restrictedLandTypes.join(", ")} land in ${state}`,
      details: {
        citizenship,
        restrictionType: rules.restrictedLandTypes[0] || "NONE",
        state,
        country
      }
    };
  }
  
  return {
    ruleId,
    type: "CITIZENSHIP",
    status: "PASS",
    blocking: true,
    reason: "Citizenship eligibility check passed",
    details: {
      citizenship,
      state,
      country,
      restrictionType: "NONE"
    }
  };
}

/**
 * Mock Zoning API
 */
async function mockZoningAPI(location: string): Promise<{
  zoneType: string;
  restricted: boolean;
  allowedUses: string[];
  source: string;
}> {
  // Mock: Extract city from location
  const cityMatch = location.match(/(\w+),/);
  const city = cityMatch ? cityMatch[1] : "Unknown";
  
  // Mock zoning data
  if (city.toLowerCase().includes("vizag") || city.toLowerCase().includes("visakhapatnam")) {
    return {
      zoneType: "RESIDENTIAL",
      restricted: false,
      allowedUses: ["RESIDENTIAL", "COMMERCIAL"],
      source: "CITY_PLANNING_DEPARTMENT"
    };
  }
  
  // Default: Residential allowed
  return {
    zoneType: "RESIDENTIAL",
    restricted: false,
    allowedUses: ["RESIDENTIAL"],
    source: "CITY_PLANNING_DEPARTMENT"
  };
}

/**
 * Rule 2: Zoning Validation
 */
async function checkZoningRule(
  input: ComplianceEngineInput
): Promise<RuleCheckResult> {
  const ruleId: RuleId = "ZONING_VALIDATION";
  
  const intendedUse = input.intendedUse || "RESIDENTIAL";
  
  // Mock API call
  const zoningData = await mockZoningAPI(input.location);
  
  // Check if intended use is allowed
  if (!zoningData.allowedUses.includes(intendedUse)) {
    return {
      ruleId,
      type: "ZONING",
      status: "FAIL",
      blocking: true,
      reason: `Property is zoned as ${zoningData.zoneType}, cannot be used for ${intendedUse} purposes`,
      details: {
        zoneType: zoningData.zoneType,
        intendedUse,
        allowedUses: zoningData.allowedUses,
        city: input.location.split(",")[0],
        source: zoningData.source
      }
    };
  }
  
  if (zoningData.restricted) {
    return {
      ruleId,
      type: "ZONING",
      status: "FAIL",
      blocking: true,
      reason: "Property is in a restricted zone",
      details: {
        zoneType: zoningData.zoneType,
        restricted: true,
        source: zoningData.source
      }
    };
  }
  
  return {
    ruleId,
    type: "ZONING",
    status: "PASS",
    blocking: true,
    reason: "Zoning validation passed",
    details: {
      zoneType: zoningData.zoneType,
      intendedUse,
      allowedUses: zoningData.allowedUses,
      source: zoningData.source
    }
  };
}

/**
 * Mock GPS Validation
 */
async function mockGPSValidation(coordinates?: { lat: number; lng: number }): Promise<{
  isWater: boolean;
  isRestrictedZone: boolean;
  isValidLand: boolean;
  landType: string;
  source: string;
}> {
  // Mock: If no coordinates provided, assume valid
  if (!coordinates) {
    return {
      isWater: false,
      isRestrictedZone: false,
      isValidLand: true,
      landType: "RESIDENTIAL",
      source: "SATELLITE_IMAGERY"
    };
  }
  
  // Mock: Check if coordinates are valid (basic sanity check)
  const { lat, lng } = coordinates;
  
  // Mock: Water body check (example: coordinates near water)
  const isWater = false; // Mock: assume not water
  
  // Mock: Restricted zone check (example: military, forest)
  const isRestrictedZone = false; // Mock: assume not restricted
  
  // Mock: Valid land check
  const isValidLand = lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  
  return {
    isWater,
    isRestrictedZone,
    isValidLand,
    landType: "RESIDENTIAL",
    source: "SATELLITE_IMAGERY"
  };
}

/**
 * Rule 3: Land Existence / GPS Validation
 */
async function checkGPSRule(
  input: ComplianceEngineInput
): Promise<RuleCheckResult> {
  const ruleId: RuleId = "LAND_EXISTENCE_GPS_VALIDATION";
  
  // Mock GPS validation
  const gpsData = await mockGPSValidation(input.gpsCoordinates);
  
  if (gpsData.isWater) {
    return {
      ruleId,
      type: "GPS",
      status: "FAIL",
      blocking: true,
      reason: "Property location is in a water body",
      details: {
        isWater: true,
        isRestrictedZone: gpsData.isRestrictedZone,
        isValidLand: false,
        coordinates: input.gpsCoordinates,
        source: gpsData.source
      }
    };
  }
  
  if (gpsData.isRestrictedZone) {
    return {
      ruleId,
      type: "GPS",
      status: "FAIL",
      blocking: true,
      reason: "Property location is in a restricted zone (military, forest, etc.)",
      details: {
        isWater: false,
        isRestrictedZone: true,
        isValidLand: false,
        coordinates: input.gpsCoordinates,
        source: gpsData.source
      }
    };
  }
  
  if (!gpsData.isValidLand) {
    return {
      ruleId,
      type: "GPS",
      status: "FAIL",
      blocking: true,
      reason: "Invalid GPS coordinates",
      details: {
        isWater: false,
        isRestrictedZone: false,
        isValidLand: false,
        coordinates: input.gpsCoordinates,
        source: gpsData.source
      }
    };
  }
  
  return {
    ruleId,
    type: "GPS",
    status: "PASS",
    blocking: true,
    reason: "Land existence and GPS validation passed",
    details: {
      isWater: false,
      isRestrictedZone: false,
      isValidLand: true,
      landType: gpsData.landType,
      coordinates: input.gpsCoordinates,
      source: gpsData.source
    }
  };
}

/**
 * Compliance Engine - Main Function
 */
export async function evaluateCompliance(
  input: ComplianceEngineInput
): Promise<ComplianceEngineOutput> {
  const timestamp = new Date().toISOString();
  
  // Run all rule checks
  const checks: RuleCheckResult[] = await Promise.all([
    checkCitizenshipRule(input),
    checkZoningRule(input),
    checkGPSRule(input)
  ]);
  
  // Determine overall decision
  const allPassed = checks.every(check => check.status === "PASS");
  const blockingFailures = checks.filter(
    check => check.status === "FAIL" && check.blocking
  );
  
  if (allPassed) {
    return {
      intentId: input.intentId,
      engine: "COMPLIANCE_ENGINE",
      decision: "ALLOW",
      status: "PASSED",
      confidence: 1.0,
      blocking: false,
      reason: "All compliance checks passed",
      checks,
      timestamp
    };
  } else {
    // Find first blocking failure
    const firstFailure = blockingFailures[0] || checks.find(check => check.status === "FAIL");
    
    return {
      intentId: input.intentId,
      engine: "COMPLIANCE_ENGINE",
      decision: "DENY",
      status: "FAILED",
      confidence: 0.0,
      blocking: true,
      reason: firstFailure?.reason || "Compliance check failed",
      checks,
      timestamp
    };
  }
}

/**
 * Generate Evidence Events for Compliance
 */
export function generateComplianceEvents(
  input: ComplianceEngineInput,
  output: ComplianceEngineOutput
): BaseEvent[] {
  const events: BaseEvent[] = [];
  
  // Event 1: Compliance Started
  events.push({
    eventType: "COMPLIANCE_STARTED" as EventType,
    intentId: input.intentId,
    timestamp: output.timestamp,
    engine: "COMPLIANCE_ENGINE",
    actorId: input.actorId,
    tenantId: input.tenantId,
    payload: {
      rulesToCheck: [
        "FOREIGN_NATIONAL_LAND_RESTRICTION",
        "ZONING_VALIDATION",
        "LAND_EXISTENCE_GPS_VALIDATION"
      ]
    }
  });
  
  // Event 2: Each Rule Checked
  output.checks.forEach(check => {
    events.push({
      eventType: "COMPLIANCE_RULE_CHECKED" as EventType,
      intentId: input.intentId,
      timestamp: output.timestamp,
      engine: "COMPLIANCE_ENGINE",
      actorId: input.actorId,
      tenantId: input.tenantId,
      payload: {
        ruleId: check.ruleId,
        status: check.status,
        blocking: check.blocking,
        details: check.details
      }
    });
  });
  
  // Event 3: Compliance Result
  events.push({
    eventType: "COMPLIANCE_RESULT" as EventType,
    intentId: input.intentId,
    timestamp: output.timestamp,
    engine: "COMPLIANCE_ENGINE",
    actorId: input.actorId,
    tenantId: input.tenantId,
    payload: {
      decision: output.decision,
      status: output.status,
      checks: output.checks.map(check => ({
        ruleId: check.ruleId,
        status: check.status
      })),
      reason: output.reason
    },
    reason: output.reason,
    confidence: output.confidence >= 0.7 ? "HIGH" : output.confidence >= 0.4 ? "MEDIUM" : "LOW"
  });
  
  return events;
}
