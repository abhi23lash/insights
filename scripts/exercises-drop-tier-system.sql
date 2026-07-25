-- Reverts the tier/confidence/rationale columns added in
-- exercises-catalog-migration.sql. No data was ever written to them (the
-- catalog seed hadn't run yet), so this drops cleanly with nothing lost.
-- movement_pattern, loading_type, is_unilateral, aliases, and
-- secondary_muscles are kept -- those are descriptive/behavioral metadata,
-- not the rejected evidence-tier classification.

alter table exercises drop constraint exercises_rationale_requires_modest_confidence;
alter table exercises drop constraint exercises_confidence_requires_prescribe_tier;

alter table exercises
  drop column prescribe_rationale,
  drop column prescribe_confidence,
  drop column tier;
