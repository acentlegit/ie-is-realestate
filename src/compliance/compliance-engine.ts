/**
 * Compliance Engine - Rule-Based Framework
 * 
 * Implements 3 concrete compliance rules:
 * 1. Citizenship / Eligibility
 * 2. Zoning Validation
 * 3. Land Existence / GPS Sanity
 * 
 * All rules are blocking - any failure stops the pipeline.
 */

export type ComplianceDecision = "ALLOW" | "DENY";
export type ComplianceStatus = "PASSED" | "FAILED";
export type RuleStatus = "PASS" | "FAIL";

export type Citizenship = "IN" | "US" | "OTHER";
export type ResidencyStatus = "CITIZEN" | "RESIDENT" | "NON_RESIDENT";
export type PropertyType = "RESIDENTIAL" | "COMMERCIAL" | "AGRICULTURAL";
export type LandType = "WATER_BODY" | "RESTRICTED_AREA" | "VALID_LAND";

/**
 * Compliance Rule IDs
 */
export enum ComplianceRuleId {
  FOREIGN_NATIONAL_LAND_RESTRICTION = "FOREIGN_NATIONAL_LAND_RESTRICTION",
  ZONING_COMPLIANCE_CHECK = "ZONING_COMPLIANCE_CHECK",
  LAND_EXISTENCE_VALIDATION = "LAND_EXISTENCE_VALIDATION",
}

/**
 * Compliance Check Result
 */
export interface ComplianceCheck {
  ruleId: ComplianceRuleId;
  type: "CITIZENSHIP" | "ZONING" | "GPS";
  status: RuleStatus;
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
  metadata?: {
    citizenship?: Citizenship;
    residencyStatus?: ResidencyStatus;
    gpsCoordinates?: {
      latitude: number;
      longitude: number;
    };
    propertyType?: PropertyType;
    intendedUse?: "RESIDENCE" | "INVESTMENT" | "COMMERCIAL";
  };
}

/**
 * Compliance Engine Output
 */
export interface ComplianceEngineOutput {
  intentId: string;
  engine: "COMPLIANCE_ENGINE";
  decision: ComplianceDecision;
  status: ComplianceStatus;
  confidence: number;
  blocking: boolean;
  reason: string;
  checks: ComplianceCheck[];
  timestamp: string;
}

/**
 * Rule 1: Citizenship / Eligibility Check
 */
export class CitizenshipRule {
  static check(input: ComplianceEngineInput): ComplianceCheck {
    const citizenship = input.metadata?.citizenship || "IN";
    const residencyStatus = input.metadata?.residencyStatus || "CITIZEN";
    const location = input.location.toLowerCase();
    const isIndia = location.includes("india") || location.includes("vizag") || location.includes("andhra");

    // Rule: Foreign nationals cannot purchase agricultural land in India
    if (isIndia && citizenship === "OTHER" && input.metadata?.propertyType === "AGRICULTURAL") {
      return {
        ruleId: ComplianceRuleId.FOREIGN_NATIONAL_LAND_RESTRICTION,
        type: "CITIZENSHIP",
        status: "FAIL",
        blocking: true,
        reason: "Foreign nationals cannot purchase agricultural land in India",
        details: {
          citizenship,
          residencyStatus,
          restriction: "AGRICULTURAL_LAND",
          allowed: false,
        },
      };
    }

    // Rule: Indian citizens can purchase any property
    if (isIndia && citizenship === "IN") {
      return {
        ruleId: ComplianceRuleId.FOREIGN_NATIONAL_LAND_RESTRICTION,
        type: "CITIZENSHIP",
        status: "PASS",
        blocking: true,
        reason: "Indian citizen - eligible for all property types",
        details: {
          citizenship,
          residencyStatus,
          allowed: true,
        },
      };
    }

    // Rule: US citizens can purchase residential property (not agricultural) in India
    if (isIndia && citizenship === "US" && input.metadata?.propertyType !== "AGRICULTURAL") {
      return {
        ruleId: ComplianceRuleId.FOREIGN_NATIONAL_LAND_RESTRICTION,
        type: "CITIZENSHIP",
        status: "PASS",
        blocking: true,
        reason: "US citizen - eligible for residential property in India",
        details: {
          citizenship,
          residencyStatus,
          allowed: true,
        },
      };
    }

    // Rule: All nationalities can purchase in US
    if (location.includes("us") || location.includes("austin") || location.includes("texas")) {
      return {
        ruleId: ComplianceRuleId.FOREIGN_NATIONAL_LAND_RESTRICTION,
        type: "CITIZENSHIP",
        status: "PASS",
        blocking: true,
        reason: "All nationalities can purchase residential property in US",
        details: {
          citizenship,
          residencyStatus,
          allowed: true,
        },
      };
    }

    // Default: Pass for other cases
    return {
      ruleId: ComplianceRuleId.FOREIGN_NATIONAL_LAND_RESTRICTION,
      type: "CITIZENSHIP",
      status: "PASS",
      blocking: true,
      reason: "Citizenship check passed",
      details: {
        citizenship,
        residencyStatus,
        allowed: true,
      },
    };
  }
}

/**
 * Rule 2: Zoning Compliance Check
 */
export class ZoningRule {
  static check(input: ComplianceEngineInput): ComplianceCheck {
    const location = input.location.toLowerCase();
    const propertyType = input.metadata?.propertyType || "RESIDENTIAL";
    const intendedUse = input.metadata?.intendedUse || "RESIDENCE";

    // Mock: Residential zones allow residence and investment, block commercial
    if (propertyType === "RESIDENTIAL") {
      if (intendedUse === "COMMERCIAL") {
        return {
          ruleId: ComplianceRuleId.ZONING_COMPLIANCE_CHECK,
          type: "ZONING",
          status: "FAIL",
          blocking: true,
          reason: "Property is zoned for residential use only. Commercial use not allowed.",
          details: {
            zone: "RESIDENTIAL",
            allowedUse: ["RESIDENCE", "INVESTMENT"],
            restrictedUse: ["COMMERCIAL", "INDUSTRIAL"],
            intendedUse,
          },
        };
      }

      return {
        ruleId: ComplianceRuleId.ZONING_COMPLIANCE_CHECK,
        type: "ZONING",
        status: "PASS",
        blocking: true,
        reason: "Residential zone - allows residence and investment",
        details: {
          zone: "RESIDENTIAL",
          allowedUse: ["RESIDENCE", "INVESTMENT"],
          intendedUse,
        },
      };
    }

    // Mock: Commercial zones allow commercial use
    if (propertyType === "COMMERCIAL") {
      return {
        ruleId: ComplianceRuleId.ZONING_COMPLIANCE_CHECK,
        type: "ZONING",
        status: "PASS",
        blocking: true,
        reason: "Commercial zone - allows commercial use",
        details: {
          zone: "COMMERCIAL",
          allowedUse: ["COMMERCIAL", "INVESTMENT"],
          intendedUse,
        },
      };
    }

    // Mock: Agricultural zones require citizenship check (handled by Rule 1)
    if (propertyType === "AGRICULTURAL") {
      return {
        ruleId: ComplianceRuleId.ZONING_COMPLIANCE_CHECK,
        type: "ZONING",
        status: "PASS",
        blocking: true,
        reason: "Agricultural zone - citizenship check applies",
        details: {
          zone: "AGRICULTURAL",
          allowedUse: ["AGRICULTURAL"],
          intendedUse,
        },
      };
    }

    // Default: Pass
    return {
      ruleId: ComplianceRuleId.ZONING_COMPLIANCE_CHECK,
      type: "ZONING",
      status: "PASS",
      blocking: true,
      reason: "Zoning check passed",
      details: {
        zone: propertyType,
        intendedUse,
      },
    };
  }
}

/**
 * Rule 3: Land Existence / GPS Sanity Check
 */
export class LandExistenceRule {
  static check(input: ComplianceEngineInput): ComplianceCheck {
    const gpsCoordinates = input.metadata?.gpsCoordinates;
    const location = input.location.toLowerCase();

    // Mock: Check if coordinates are valid
    if (!gpsCoordinates) {
      // If no GPS provided, assume valid (for demo)
      return {
        ruleId: ComplianceRuleId.LAND_EXISTENCE_VALIDATION,
        type: "GPS",
        status: "PASS",
        blocking: true,
        reason: "GPS coordinates not provided - assuming valid land",
        details: {
          landType: "VALID_LAND",
          gpsValid: false,
          exists: true,
        },
      };
    }

    const { latitude, longitude } = gpsCoordinates;

    // Mock: Validate GPS coordinates are within reasonable bounds
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return {
        ruleId: ComplianceRuleId.LAND_EXISTENCE_VALIDATION,
        type: "GPS",
        status: "FAIL",
        blocking: true,
        reason: "Invalid GPS coordinates",
        details: {
          landType: "INVALID",
          gpsValid: false,
          exists: false,
          latitude,
          longitude,
        },
      };
    }

    // Mock: Check for water bodies (example: Bay of Bengal near Vizag)
    // Vizag coordinates: ~17.6868, 83.2185
    // Mock: If coordinates are in water body area, fail
    if (location.includes("vizag") || location.includes("visakhapatnam")) {
      // Mock: Check if coordinates are in Bay of Bengal (water body)
      // In real implementation, this would call a GIS API
      if (longitude > 83.5 && latitude < 17.5) {
        return {
          ruleId: ComplianceRuleId.LAND_EXISTENCE_VALIDATION,
          type: "GPS",
          status: "FAIL",
          blocking: true,
          reason: "Property location is in a restricted zone (water body)",
          details: {
            landType: "WATER_BODY",
            gpsValid: true,
            exists: false,
            latitude,
            longitude,
          },
        };
      }
    }

    // Mock: Check for protected/reserved areas (example)
    // In real implementation, this would call a government API
    if (latitude === 17.6868 && longitude === 83.2185) {
      // This is a valid Vizag coordinate - pass
      return {
        ruleId: ComplianceRuleId.LAND_EXISTENCE_VALIDATION,
        type: "GPS",
        status: "PASS",
        blocking: true,
        reason: "Valid land coordinates - not water or restricted area",
        details: {
          landType: "VALID_LAND",
          gpsValid: true,
          exists: true,
          latitude,
          longitude,
        },
      };
    }

    // Default: Pass for valid coordinates
    return {
      ruleId: ComplianceRuleId.LAND_EXISTENCE_VALIDATION,
      type: "GPS",
      status: "PASS",
      blocking: true,
      reason: "Valid land coordinates",
      details: {
        landType: "VALID_LAND",
        gpsValid: true,
        exists: true,
        latitude,
        longitude,
      },
    };
  }
}

/**
 * Compliance Engine
 * 
 * Executes all compliance rules in order.
 * Any failure stops the pipeline.
 */
export class ComplianceEngine {
  /**
   * Execute compliance checks
   */
  static execute(input: ComplianceEngineInput): ComplianceEngineOutput {
    const checks: ComplianceCheck[] = [];
    let decision: ComplianceDecision = "ALLOW";
    let status: ComplianceStatus = "PASSED";
    let reason = "All compliance checks passed";

    // Rule 1: Citizenship Check
    const citizenshipCheck = CitizenshipRule.check(input);
    checks.push(citizenshipCheck);
    if (citizenshipCheck.status === "FAIL") {
      decision = "DENY";
      status = "FAILED";
      reason = citizenshipCheck.reason;
    }

    // Rule 2: Zoning Check (only if citizenship passed)
    if (citizenshipCheck.status === "PASS") {
      const zoningCheck = ZoningRule.check(input);
      checks.push(zoningCheck);
      if (zoningCheck.status === "FAIL") {
        decision = "DENY";
        status = "FAILED";
        reason = zoningCheck.reason;
      }
    }

    // Rule 3: Land Existence Check (only if previous checks passed)
    if (checks.every(c => c.status === "PASS")) {
      const landCheck = LandExistenceRule.check(input);
      checks.push(landCheck);
      if (landCheck.status === "FAIL") {
        decision = "DENY";
        status = "FAILED";
        reason = landCheck.reason;
      }
    }

    // Calculate confidence based on checks passed
    const passedCount = checks.filter(c => c.status === "PASS").length;
    const totalCount = checks.length;
    const confidence = totalCount > 0 ? passedCount / totalCount : 0.0;

    return {
      intentId: input.intentId,
      engine: "COMPLIANCE_ENGINE",
      decision,
      status,
      confidence,
      blocking: true,
      reason,
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get evidence events for compliance checks
   */
  static getEvidenceEvents(
    input: ComplianceEngineInput,
    output: ComplianceEngineOutput
  ): Array<{
    eventType: string;
    intentId: string;
    timestamp: string;
    engine: string;
    payload: Record<string, any>;
  }> {
    const events = [];

    // Event 1: Compliance Started
    events.push({
      eventType: "COMPLIANCE_STARTED",
      intentId: input.intentId,
      timestamp: output.timestamp,
      engine: "COMPLIANCE_ENGINE",
      payload: {
        intentType: input.intentType,
        location: input.location,
      },
    });

    // Event 2: Each Rule Checked
    output.checks.forEach((check) => {
      events.push({
        eventType: "COMPLIANCE_RULE_CHECKED",
        intentId: input.intentId,
        timestamp: output.timestamp,
        engine: "COMPLIANCE_ENGINE",
        payload: {
          ruleId: check.ruleId,
          type: check.type,
          status: check.status,
          blocking: check.blocking,
          reason: check.reason,
        },
      });
    });

    // Event 3: Compliance Result
    events.push({
      eventType: "COMPLIANCE_RESULT",
      intentId: input.intentId,
      timestamp: output.timestamp,
      engine: "COMPLIANCE_ENGINE",
      payload: {
        decision: output.decision,
        status: output.status,
        checksCount: output.checks.length,
        passedCount: output.checks.filter((c) => c.status === "PASS").length,
        failedCount: output.checks.filter((c) => c.status === "FAIL").length,
        reason: output.reason,
      },
    });

    return events;
  }
}
