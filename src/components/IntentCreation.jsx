/**
 * Intent Creation UI - First step before Living Space appears
 * Uses existing analyzeIntent API from intentApi.js
 */

import { useState } from "react";
import { analyzeIntent } from "../api/intentApi";
import keycloak from "../auth/keycloakAuth";

export default function IntentCreation({ onIntentCreated }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateIntent = async () => {
    if (!input.trim()) {
      setError("Please enter your intent");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use existing analyzeIntent API
      const intent = await analyzeIntent({
        intentType: "BUY_PROPERTY", // Real estate intent
        payload: {
          text: input,
          location: "", // Will be extracted by Intent Engine
          budget: null,
          area: null,
        },
        tenantId: "intent-platform",
        actorId: keycloak.tokenParsed?.preferred_username || "user1",
      });

      // Intent created - trigger Living Space
      onIntentCreated(intent);
    } catch (err) {
      setError(err.message || "Failed to create intent");
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "40px",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: "16px",
        padding: "40px",
        maxWidth: "600px",
        width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <h1 style={{
          fontSize: "32px",
          fontWeight: "bold",
          marginBottom: "12px",
          color: "#1a1a1a",
        }}>
          Create Your Intent
        </h1>
        <p style={{
          fontSize: "16px",
          color: "#666",
          marginBottom: "32px",
        }}>
          Tell us what you want to do. For example: "I want to buy a property in Vizag under ₹50 lakhs"
        </p>

        <div style={{ marginBottom: "24px" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your intent here..."
            style={{
              width: "100%",
              minHeight: "120px",
              padding: "16px",
              fontSize: "16px",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              fontFamily: "inherit",
              resize: "vertical",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                handleCreateIntent();
              }
            }}
          />
        </div>

        {error && (
          <div style={{
            padding: "12px",
            background: "#fee",
            color: "#c33",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleCreateIntent}
          disabled={loading || !input.trim()}
          style={{
            width: "100%",
            padding: "16px",
            fontSize: "18px",
            fontWeight: "bold",
            background: loading ? "#ccc" : "#667eea",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Creating Intent..." : "Create Intent"}
        </button>

        <p style={{
          fontSize: "12px",
          color: "#999",
          marginTop: "16px",
          textAlign: "center",
        }}>
          Press Ctrl+Enter to submit
        </p>
      </div>
    </div>
  );
}
