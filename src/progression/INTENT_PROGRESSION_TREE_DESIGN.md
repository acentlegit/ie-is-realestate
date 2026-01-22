# Intent Progression Tree Design

## Overview

The Intent Progression Tree is a **live, growing entity graph** displayed on the left panel. It shows all entities (Agent, Bank, Property, etc.) involved in an intent as decisions are made.

## Key Principles

### ✅ Tree Only Grows (Immutable Progression)

- Once an entity is added, it never disappears
- Tree reflects intent state, not UI state
- Historical progression is preserved

### ✅ One Entity = One Node

- No duplicate entities
- Each entity has unique ID
- Entity selection updates existing node (if present)

### ✅ Contextual Actions

- Each entity has available actions (chat, documents, video call)
- Actions are entity-type specific
- Clicking entity opens contextual panel

### ✅ Decision-Driven Growth

- Tree grows when decisions are made
- Entity selection from decision → tree node
- Entity confirmation → node status update

## Data Model

### Entity Types

```typescript
type EntityType = 
  | "BUYER"      // Always root
  | "AGENT"      // Selected agent
  | "BANK"       // Selected lender
  | "PROPERTY"   // Selected property
  | "LAWYER"     // Optional
  | "INSPECTOR"  // Optional
  | "INSURANCE"; // Optional
```

### Entity Status

```typescript
type EntityStatus = 
  | "PENDING"    // Not yet selected
  | "SELECTED"  // Selected but not confirmed
  | "CONFIRMED" // Confirmed (locked)
  | "ACTIVE"    // Actively involved
  | "COMPLETED"; // Role completed
```

### Entity Node Structure

```typescript
interface EntityNode {
  id: string;
  type: EntityType;
  name: string;
  status: EntityStatus;
  selectedAt?: string;
  confirmedAt?: string;
  metadata: Record<string, any>;
  
  actions: {
    chat: boolean;
    documents: boolean;
    videoCall: boolean;
    actions: boolean;
  };
  
  children?: EntityNode[];
}
```

## State Transitions

### Entity Selection Flow

```
Decision Made (SELECT_AGENT)
  ↓
Extract Selected Option
  ↓
Create/Update Entity Node
  ↓
Add to Progression Tree
  ↓
Emit EntitySelectionEvent
  ↓
Update UI (Left Panel)
```

### Entity Confirmation Flow

```
Decision Confirmed
  ↓
Find Entity in Tree
  ↓
Update Status: SELECTED → CONFIRMED
  ↓
Emit EntityConfirmationEvent
  ↓
Update UI (Visual indicator)
```

## UI Structure

### Left Panel Layout

```
┌─────────────────────────┐
│ Intent Progression      │
│                         │
│ 🧑 Buyer (You)          │
│   ├─ 🧑‍💼 Agent B [CONFIRMED] │
│   │   ├─ 💬 Chat        │
│   │   ├─ 📄 Docs        │
│   │   └─ 📹 Call        │
│   │                     │
│   ├─ 🏦 Bank A [SELECTED]│
│   │   ├─ 💬 Chat        │
│   │   └─ 📄 Docs        │
│   │                     │
│   └─ 🏠 Property 1 [SELECTED]│
│       └─ 📄 Docs        │
└─────────────────────────┘
```

### Visual Indicators

- **Status Badge**: Color-coded (Green=Confirmed, Blue=Selected, Gray=Pending)
- **Expand/Collapse**: ▼ for expanded, ▶ for collapsed
- **Quick Actions**: Buttons for chat, docs, call (when expanded)

## Integration Points

### 1. Decision Engine Integration

```typescript
// When decision is made
const decision = {
  decisionType: "SELECT_AGENT",
  selectedOptionId: "agent_123",
  // ...
};

// Extract entity
const entityType = getEntityTypeFromDecision(decision.decisionType);
const selectedOption = decision.options.find(opt => opt.id === decision.selectedOptionId);

// Add to tree
progressionTree.addEntityFromDecision(
  decision.decisionId,
  entityType,
  `agent_${selectedOption.id}`,
  selectedOption.label,
  { ...selectedOption }
);
```

### 2. Evidence Engine Integration

```typescript
// When entity action is triggered
const event: EntityActionEvent = {
  intentId,
  entityId: "agent_123",
  actionType: "chat",
  timestamp: new Date().toISOString(),
};

// Emit to evidence engine
evidenceEngine.record({
  eventType: "ENTITY_ACTION",
  payload: event,
});
```

### 3. Backend Event Hooks

```typescript
// Backend should listen for:
- ENTITY_SELECTED
- ENTITY_CONFIRMED
- ENTITY_ACTION

// And persist to:
- progression_tree table
- evidence/audit trail
```

## Example Progression

### Step 1: Intent Created

```
🧑 Buyer (You)
```

### Step 2: Agent Selected

```
🧑 Buyer (You)
  └─ 🧑‍💼 Agent B [SELECTED]
```

### Step 3: Agent Confirmed

```
🧑 Buyer (You)
  └─ 🧑‍💼 Agent B [CONFIRMED]
      ├─ 💬 Chat
      ├─ 📄 Docs
      └─ 📹 Call
```

### Step 4: Bank Selected

```
🧑 Buyer (You)
  ├─ 🧑‍💼 Agent B [CONFIRMED]
  │   ├─ 💬 Chat
  │   ├─ 📄 Docs
  │   └─ 📹 Call
  │
  └─ 🏦 Bank A [SELECTED]
      ├─ 💬 Chat
      └─ 📄 Docs
```

### Step 5: Property Selected

```
🧑 Buyer (You)
  ├─ 🧑‍💼 Agent B [CONFIRMED]
  ├─ 🏦 Bank A [CONFIRMED]
  └─ 🏠 Property 1 [SELECTED]
      └─ 📄 Docs
```

## Backend Schema (Future)

```sql
CREATE TABLE progression_tree (
  id UUID PRIMARY KEY,
  intent_id UUID NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  selected_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(intent_id, entity_id)
);

CREATE INDEX idx_progression_intent ON progression_tree(intent_id);
CREATE INDEX idx_progression_entity ON progression_tree(entity_id);
```

## Next Steps

1. ✅ Data model defined
2. ✅ UI component created
3. ✅ State management hook
4. ⏳ Integrate with Intent.jsx
5. ⏳ Backend event hooks
6. ⏳ Chat/Documents panels (future)

---

**Status**: Core design complete. Ready for integration with Intent screen.
