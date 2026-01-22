/**
 * Progression Tree Hook
 * 
 * Manages progression tree state and syncs with decisions
 */

import { useState, useEffect, useCallback } from "react";
import {
  ProgressionTree,
  EntityNode,
  EntityType,
  ProgressionTreeBuilder,
  EntitySelectionEvent,
  EntityConfirmationEvent,
  EntityActionEvent,
} from "./types";

interface UseProgressionTreeOptions {
  intentId: string;
  buyerName: string;
  decisions: any[]; // Decisions from intent engine
}

export function useProgressionTree({
  intentId,
  buyerName,
  decisions,
}: UseProgressionTreeOptions) {
  const [tree, setTree] = useState<ProgressionTree | null>(null);
  const [hierarchicalTree, setHierarchicalTree] = useState<EntityNode | null>(null);

  // Map decision types to entity types
  const getEntityTypeFromDecision = (decisionType: string): EntityType | null => {
    const mapping: Record<string, EntityType> = {
      SELECT_AGENT: "AGENT",
      SELECT_LENDER: "BANK",
      SELECT_BANK: "BANK",
      SELECT_PROPERTY: "PROPERTY",
      SELECT_LAWYER: "LAWYER",
      SELECT_INSPECTOR: "INSPECTOR",
      SELECT_INSURANCE: "INSURANCE",
    };
    return mapping[decisionType] || null;
  };

  // Build tree from decisions
  const buildTreeFromDecisions = useCallback(() => {
    if (!intentId || !buyerName) {
      // Return empty tree structure
      setTree(null);
      setHierarchicalTree(null);
      return;
    }

    const builder = new ProgressionTreeBuilder(intentId, buyerName);

    // Process decisions to extract entities
    decisions.forEach((decision) => {
      const entityType = getEntityTypeFromDecision(decision.decisionType || decision.type);
      if (!entityType) return;

      // Find selected option
      const selectedOption = decision.options?.find(
        (opt: any) => opt.id === decision.selectedOptionId
      );

      if (selectedOption) {
        const entityId = `${entityType.toLowerCase()}_${selectedOption.id}`;
        const entityName = selectedOption.label || selectedOption.name || "Unknown";

        builder.addEntityFromDecision(
          decision.decisionId || decision.id,
          entityType,
          entityId,
          entityName,
          {
            decisionId: decision.decisionId || decision.id,
            optionId: selectedOption.id,
            ...selectedOption,
          }
        );

        // If decision is confirmed, confirm the entity
        if (decision.status === "CONFIRMED" || decision.isConfirmed) {
          builder.confirmEntity(entityId, "system"); // TODO: Get actual user ID
        }
      }
    });

    const builtTree = builder.build();
    setTree(builtTree);
    setHierarchicalTree(builder.getHierarchicalTree());
  }, [intentId, buyerName, decisions]);

  // Rebuild tree when decisions change
  useEffect(() => {
    buildTreeFromDecisions();
  }, [buildTreeFromDecisions]);

  // Handle entity action
  const handleEntityAction = useCallback(
    (event: EntityActionEvent) => {
      // Emit event to evidence engine
      // TODO: Integrate with evidence engine
      console.log("[ProgressionTree] Entity action:", event);

      // For now, just log
      // In production, this would:
      // 1. Emit evidence event
      // 2. Open appropriate UI (chat, documents, etc.)
      // 3. Track in audit trail
    },
    [intentId]
  );

  // Always return valid structure, even if tree is null
  return {
    tree: tree || null,
    hierarchicalTree: hierarchicalTree || null,
    handleEntityAction,
    rebuildTree: buildTreeFromDecisions,
  };
}
