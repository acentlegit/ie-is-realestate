/**
 * Intent Screen with Living Space UI
 * Intent-driven: Create Intent → Show Living Space
 * Uses existing Intent/Decision/Compliance/Evidence engines
 */

import { useState, useEffect } from "react";
import {
  analyzeIntent,
  checkResume,
} from "../api/intentApi";
import keycloak from "../auth/keycloakAuth";
import IntentCreation from "../components/IntentCreation";
import LivingSpace from "./LivingSpace";

export default function IntentLivingSpace() {
  const [currentIntent, setCurrentIntent] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(true);

  const userId = keycloak.tokenParsed?.preferred_username || "user1";
  const tenantId = "intent-platform";

  // Check for existing intent (resume)
  useEffect(() => {
    checkForResume();
  }, []);

  async function checkForResume() {
    try {
      const resume = await checkResume(userId, tenantId);
      if (resume?.hasOpenIntent && resume?.intent) {
        setCurrentIntent(resume.intent);
      }
    } catch (err) {
      console.warn("[Resume] Check failed (non-blocking):", err.message);
    } finally {
      setResumeLoading(false);
    }
  }

  // 🔹 STEP 3: Conditional rendering - Intent Creation OR Living Space
  if (resumeLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!currentIntent) {
    return (
      <IntentCreation
        onIntentCreated={(intent) => {
          setCurrentIntent(intent);
        }}
      />
    );
  }

  return (
    <LivingSpace
      intent={currentIntent}
      onIntentUpdate={(updatedIntent) => {
        setCurrentIntent(updatedIntent);
      }}
    />
  );
}
