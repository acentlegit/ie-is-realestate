-- Fix Evidence ID Column Length
-- The evidence_id column is too small for "evt-" prefix + UUID format
-- Run this SQL to fix the column sizes

-- Connect to intent_platform database first, then run:

ALTER TABLE evidence 
  ALTER COLUMN evidence_id TYPE VARCHAR(50),
  ALTER COLUMN intent_id TYPE VARCHAR(50);

-- Verify the change
\d evidence
