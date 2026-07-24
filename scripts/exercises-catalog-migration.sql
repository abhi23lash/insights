-- Extends `exercises` for the v1 catalog. Purely additive: new nullable
-- columns, nothing dropped or renamed. Existing 9 seeded rows keep working;
-- the catalog seed script (separate) will backfill them along with the
-- full curated list.

alter table exercises
  add column aliases text[] not null default '{}',
  add column movement_pattern text check (
    movement_pattern in (
      'squat', 'hinge', 'horizontal_push', 'vertical_push',
      'horizontal_pull', 'vertical_pull', 'isolation'
    )
  ),
  add column secondary_muscles text[] not null default '{}',
  -- Distinct from resistance_profile: resistance_profile describes the
  -- equipment/resistance curve (free weight, cable, ...); loading_type
  -- describes how the logged numbers should be interpreted -- whether
  -- e1RM applies at all, and which direction counts as "better" (assisted
  -- inverts: less assistance = harder = better).
  add column loading_type text check (
    loading_type in (
      'external_weight', 'bodyweight', 'bodyweight_plus', 'assisted', 'time', 'distance'
    )
  ),
  add column is_unilateral boolean not null default false,
  add column tier text check (tier in ('prescribe', 'log_only')),
  add column prescribe_confidence text check (prescribe_confidence in ('strong', 'modest')),
  -- Only populated for prescribe_confidence = 'modest'. Explicitly a grading
  -- queue, not a citation -- these are UNGRADED mechanical/evidence arguments,
  -- not EQS-scored knowledge_entries.
  add column prescribe_rationale text;

-- prescribe_confidence only makes sense when tier = 'prescribe'; a log_only
-- exercise has no prescribe confidence at all.
alter table exercises
  add constraint exercises_confidence_requires_prescribe_tier check (
    prescribe_confidence is null or tier = 'prescribe'
  );

-- prescribe_rationale is only for the 'modest' grading queue, never for
-- 'strong' entries (which don't need a hedge) or log_only entries (which
-- aren't prescribed at all).
alter table exercises
  add constraint exercises_rationale_requires_modest_confidence check (
    prescribe_rationale is null or prescribe_confidence = 'modest'
  );
