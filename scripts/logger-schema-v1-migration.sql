-- v1 additions to the logger schema. Not yet applied. Purely additive:
-- new column, new column, widened check constraint. Nothing dropped or
-- renamed, so this is safe to run against the existing tables as-is.

-- Weight unit, detected client-side from locale on first use and persisted
-- here so it never flips if the athlete's locale changes later (e.g. travel).
alter table athletes
  add column weight_unit text not null default 'lb' check (weight_unit in ('lb', 'kg'));

-- Self-reported per-session fatigue (tap-in, same posture as soreness).
-- Resolves the schema-design-time open question: derived vs self-reported.
-- Decided: self-reported, session-scoped.
alter table sessions
  add column fatigue_signal smallint check (fatigue_signal between 0 and 3);

-- working_loads rows now get written every session a tracked exercise is
-- touched (to keep consecutive_successes/failures current), not only when
-- current_working_weight actually changes. 'counter_update' represents that
-- case -- weight unchanged, only the counters moved.
alter table working_loads drop constraint working_loads_change_reason_check;
alter table working_loads
  add constraint working_loads_change_reason_check check (
    change_reason in ('initial', 'progression', 'deload', 'manual_override', 'counter_update')
  );
