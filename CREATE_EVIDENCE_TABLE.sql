-- Evidence Table Migration
-- Run this SQL in any PostgreSQL client (pgAdmin, DBeaver, or via Node.js)

CREATE TABLE IF NOT EXISTS evidence (
  evidence_id VARCHAR(36) PRIMARY KEY,
  intent_id VARCHAR(36) NOT NULL,
  engine VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  actor_id VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  hash VARCHAR(64) NOT NULL,
  previous_hash VARCHAR(64),
  reason TEXT,
  confidence VARCHAR(20),
  metadata JSONB,
  CONSTRAINT evidence_id_format CHECK (evidence_id ~ '^evt-[a-f0-9-]+$')
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_evidence_intent_id ON evidence(intent_id);
CREATE INDEX IF NOT EXISTS idx_evidence_engine ON evidence(engine);
CREATE INDEX IF NOT EXISTS idx_evidence_event_type ON evidence(event_type);
CREATE INDEX IF NOT EXISTS idx_evidence_timestamp ON evidence(timestamp);
CREATE INDEX IF NOT EXISTS idx_evidence_hash ON evidence(hash);
CREATE INDEX IF NOT EXISTS idx_evidence_previous_hash ON evidence(previous_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_intent_timestamp ON evidence(intent_id, timestamp);

-- Comments
COMMENT ON TABLE evidence IS 'Immutable evidence records for court-defensible audit trails';
COMMENT ON COLUMN evidence.evidence_id IS 'Unique evidence identifier (UUID format: evt-...)';
COMMENT ON COLUMN evidence.intent_id IS 'Parent intent ID';
COMMENT ON COLUMN evidence.engine IS 'Source engine (e.g., COMPLIANCE_ENGINE, RISK_ENGINE)';
COMMENT ON COLUMN evidence.event_type IS 'Event type (e.g., COMPLIANCE_DECISION, RISK_EVALUATION)';
COMMENT ON COLUMN evidence.hash IS 'SHA-256 hash of evidence content for integrity verification';
COMMENT ON COLUMN evidence.previous_hash IS 'Hash of previous evidence for chaining (tamper detection)';
COMMENT ON COLUMN evidence.payload IS 'Engine-specific payload (JSONB)';

-- Verify table was created
SELECT 'Evidence table created successfully!' as status;
