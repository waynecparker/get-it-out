-- Checkpoint 5 correction: drop the safety_events audit table entirely.
-- It only ever existed to record that the safety-support panel fired,
-- but that's still safety-risk metadata about a possibly-unsaved
-- conversation — an unsaved conversation must leave nothing behind, so
-- there is no safe way to keep this table. Nothing else references it.

drop table if exists public.safety_events;
drop type if exists public.safety_risk_type;
