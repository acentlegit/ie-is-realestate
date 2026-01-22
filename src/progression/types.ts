/**
 * Intent Progression Tree Types
 * 
 * Defines the data model for the growing entity tree on the left panel.
 * 
 * Key Principles:
 * - Tree only grows (immutable progression)
 * - One entity = one node (no duplicates)
 * - Each node has contextual actions (chat, documents, actions)
 * - Tree reflects intent state, not UI state
 */

/**
 * Entity Types in Real Estate Intent
 */
export type EntityType = 
  | "BUYER"           // The user (always present)
  | "AGENT"           // Selected real estate agent
  | "BANK"            // Selected lender/bank
  | "PROPERTY"        // Selected property
  | "LAWYER"          // Legal advisor (optional)
  | "INSPECTOR"       // Property inspector (optional)
  | "INSURANCE";      // Insurance provider (optional)

/**
 * Entity Status
 */
export type EntityStatus = 
  | "PENDING"         // Entity not yet selected
  | "SELECTED"        // Entity selected but not confirmed
  | "CONFIRMED"       // Entity confirmed (locked)
  | "ACTIVE"          // Entity actively involved
  | "COMPLETED";      // Entity's role completed

/**
 * Entity Node
 * 
 * Represents a single entity in the progression tree
 */
export interface EntityNode {
  id: string;                    // Unique entity ID
  type: EntityType;              // Entity type
  name: string;                  // Display name
  status: EntityStatus;          // Current status
  selectedAt?: string;           // ISO timestamp when selected
  confirmedAt?: string;          // ISO timestamp when confirmed
  metadata: Record<string, any>; // Entity-specific data
  
  // Contextual actions available for this entity
  actions: {
    chat: boolean;               // Can chat with this entity
    documents: boolean;          // Can upload/view documents
    videoCall: boolean;          // Can initiate video call
    actions: boolean;            // Can view entity-specific actions
  };
  
  // Children (for hierarchical relationships)
  children?: EntityNode[];
}

/**
 * Progression Tree State
 * 
 * The complete state of the intent progression
 */
export interface ProgressionTree {
  intentId: string;              // Intent ID this tree belongs to
  rootEntity: EntityNode;        // Buyer (always root)
  entities: EntityNode[];        // All entities (flat list for easy lookup)
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  version: number;                // Version for conflict resolution
}

/**
 * Entity Selection Event
 * 
 * Fired when an entity is selected via decision
 */
export interface EntitySelectionEvent {
  intentId: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  decisionId: string;            // Decision that triggered selection
  timestamp: string;
  metadata: Record<string, any>;
}

/**
 * Entity Confirmation Event
 * 
 * Fired when an entity is confirmed
 */
export interface EntityConfirmationEvent {
  intentId: string;
  entityId: string;
  timestamp: string;
  confirmedBy: string;           // User ID
}

/**
 * Entity Action Event
 * 
 * Fired when user interacts with entity (chat, documents, etc.)
 */
export interface EntityActionEvent {
  intentId: string;
  entityId: string;
  actionType: "chat" | "documents" | "videoCall" | "actions";
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Progression Tree Builder
 * 
 * Helper to build progression tree from decisions
 */
export class ProgressionTreeBuilder {
  private tree: ProgressionTree;

  constructor(intentId: string, buyerName: string) {
    this.tree = {
      intentId,
      rootEntity: {
        id: `buyer_${intentId}`,
        type: "BUYER",
        name: buyerName,
        status: "ACTIVE",
        metadata: {},
        actions: {
          chat: false,
          documents: true,
          videoCall: false,
          actions: false,
        },
      },
      entities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  /**
   * Add entity from decision
   */
  addEntityFromDecision(
    decisionId: string,
    entityType: EntityType,
    entityId: string,
    entityName: string,
    metadata: Record<string, any> = {}
  ): EntitySelectionEvent {
    // Check if entity already exists
    const existing = this.tree.entities.find(e => e.id === entityId);
    if (existing) {
      // Update status if needed
      if (existing.status === "PENDING") {
        existing.status = "SELECTED";
        existing.selectedAt = new Date().toISOString();
        existing.metadata = { ...existing.metadata, ...metadata };
      }
      return {
        intentId: this.tree.intentId,
        entityType,
        entityId,
        entityName,
        decisionId,
        timestamp: new Date().toISOString(),
        metadata,
      };
    }

    // Create new entity node
    const entity: EntityNode = {
      id: entityId,
      type: entityType,
      name: entityName,
      status: "SELECTED",
      selectedAt: new Date().toISOString(),
      metadata,
      actions: this.getDefaultActions(entityType),
    };

    this.tree.entities.push(entity);
    this.tree.updatedAt = new Date().toISOString();
    this.tree.version++;

    return {
      intentId: this.tree.intentId,
      entityType,
      entityId,
      entityName,
      decisionId,
      timestamp: new Date().toISOString(),
      metadata,
    };
  }

  /**
   * Confirm entity
   */
  confirmEntity(entityId: string, confirmedBy: string): EntityConfirmationEvent {
    const entity = this.tree.entities.find(e => e.id === entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    entity.status = "CONFIRMED";
    entity.confirmedAt = new Date().toISOString();
    this.tree.updatedAt = new Date().toISOString();
    this.tree.version++;

    return {
      intentId: this.tree.intentId,
      entityId,
      timestamp: new Date().toISOString(),
      confirmedBy,
    };
  }

  /**
   * Get default actions for entity type
   */
  private getDefaultActions(entityType: EntityType): EntityNode["actions"] {
    switch (entityType) {
      case "AGENT":
        return {
          chat: true,
          documents: true,
          videoCall: true,
          actions: true,
        };
      case "BANK":
        return {
          chat: true,
          documents: true,
          videoCall: false,
          actions: true,
        };
      case "PROPERTY":
        return {
          chat: false,
          documents: true,
          videoCall: false,
          actions: true,
        };
      default:
        return {
          chat: false,
          documents: false,
          videoCall: false,
          actions: false,
        };
    }
  }

  /**
   * Build final tree
   */
  build(): ProgressionTree {
    return { ...this.tree };
  }

  /**
   * Get tree as hierarchical structure
   */
  getHierarchicalTree(): EntityNode {
    const root = { ...this.tree.rootEntity };
    root.children = this.tree.entities.filter(e => e.status !== "PENDING");
    return root;
  }
}
