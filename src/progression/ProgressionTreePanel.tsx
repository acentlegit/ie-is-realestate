/**
 * Intent Progression Tree Panel
 * 
 * Left panel component that displays the growing entity tree.
 * 
 * Features:
 * - Shows entities as they are selected
 * - Click to open contextual actions (chat, documents, etc.)
 * - Visual progression indicator
 * - Immutable tree (only grows)
 */

import { useState } from "react";
import { EntityNode, EntityType, EntityActionEvent } from "./types";

interface ProgressionTreePanelProps {
  tree: EntityNode; // Root entity with children
  onEntityAction: (event: EntityActionEvent) => void;
  intentId: string;
}

export default function ProgressionTreePanel({
  tree,
  onEntityAction,
  intentId,
}: ProgressionTreePanelProps) {
  if (!tree || !tree.id) {
    return null; // Don't render if no tree
  }

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([tree.id]));

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleEntityClick = (entity: EntityNode, actionType: "chat" | "documents" | "videoCall" | "actions") => {
    if (!entity.actions[actionType]) {
      return; // Action not available
    }

    onEntityAction({
      intentId,
      entityId: entity.id,
      actionType,
      timestamp: new Date().toISOString(),
    });
  };

  const getEntityIcon = (type: EntityType): string => {
    switch (type) {
      case "BUYER":
        return "🧑";
      case "AGENT":
        return "🧑‍💼";
      case "BANK":
        return "🏦";
      case "PROPERTY":
        return "🏠";
      case "LAWYER":
        return "⚖️";
      case "INSPECTOR":
        return "🔍";
      case "INSURANCE":
        return "🛡️";
      default:
        return "📋";
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "CONFIRMED":
        return "#16A34A"; // Green
      case "SELECTED":
        return "#2563EB"; // Blue
      case "ACTIVE":
        return "#111827"; // Black
      case "PENDING":
        return "#6B7280"; // Gray
      default:
        return "#6B7280";
    }
  };

  const renderEntityNode = (entity: EntityNode, level: number = 0): JSX.Element => {
    const isExpanded = expandedNodes.has(entity.id);
    const hasChildren = entity.children && entity.children.length > 0;

    return (
      <div key={entity.id} style={{ marginLeft: level * 20 }}>
        {/* Entity Node */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 12px",
            borderRadius: 6,
            marginBottom: 4,
            backgroundColor: entity.status === "CONFIRMED" ? "#F1F3F5" : "transparent",
            border: `1px solid ${getStatusColor(entity.status)}`,
            cursor: "pointer",
          }}
          onClick={() => {
            if (hasChildren) {
              toggleNode(entity.id);
            }
            // Default action: open actions panel
            handleEntityClick(entity, "actions");
          }}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren && (
            <span style={{ marginRight: 8, fontSize: 12, color: "#6B7280" }}>
              {isExpanded ? "▼" : "▶"}
            </span>
          )}

          {/* Entity Icon */}
          <span style={{ marginRight: 8, fontSize: 16 }}>
            {getEntityIcon(entity.type)}
          </span>

          {/* Entity Name */}
          <span
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: entity.status === "CONFIRMED" ? 600 : 400,
              color: "#111827",
            }}
          >
            {entity.name}
          </span>

          {/* Status Badge */}
          <span
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 4,
              backgroundColor: getStatusColor(entity.status),
              color: "#FFFFFF",
              marginLeft: 8,
            }}
          >
            {entity.status}
          </span>
        </div>

        {/* Quick Actions (when expanded) */}
        {isExpanded && (
          <div style={{ marginLeft: 20, marginBottom: 8 }}>
            {entity.actions.chat && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEntityClick(entity, "chat");
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #D1D5DB",
                  borderRadius: 4,
                  cursor: "pointer",
                  marginRight: 4,
                  color: "#111827",
                }}
              >
                💬 Chat
              </button>
            )}
            {entity.actions.documents && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEntityClick(entity, "documents");
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #D1D5DB",
                  borderRadius: 4,
                  cursor: "pointer",
                  marginRight: 4,
                  color: "#111827",
                }}
              >
                📄 Docs
              </button>
            )}
            {entity.actions.videoCall && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEntityClick(entity, "videoCall");
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #D1D5DB",
                  borderRadius: 4,
                  cursor: "pointer",
                  marginRight: 4,
                  color: "#111827",
                }}
              >
                📹 Call
              </button>
            )}
          </div>
        )}

        {/* Children */}
        {isExpanded && hasChildren && (
          <div style={{ marginTop: 4 }}>
            {entity.children!.map((child) => renderEntityNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        width: 280,
        background: "#FAFBFC",
        borderRight: "1px solid #D1D5DB",
        padding: "20px 16px",
        height: "100vh",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "#111827",
            marginBottom: 8,
          }}
        >
          Intent Progression
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "#6B7280",
          }}
        >
          Entities involved in this intent
        </p>
      </div>

      {/* Tree */}
      <div>{renderEntityNode(tree)}</div>

      {/* Empty State */}
      {(!tree.children || tree.children.length === 0) && (
        <div
          style={{
            padding: 20,
            textAlign: "center",
            color: "#6B7280",
            fontSize: 12,
            fontStyle: "italic",
          }}
        >
          No entities selected yet.
          <br />
          Entities will appear here as decisions are made.
        </div>
      )}
    </div>
  );
}
