-- Draft schema for the training logger. Not yet applied to Supabase.
-- Incorporates: session_log (one row per set), append-only working_loads
-- (real changelog, not update-in-place), rep_max_prs as its own append-only
-- table with e1RM derived rather than cached, PR traceability back to the
-- source set, and the RPE / tolerance-band rules as decided.

-- ============================================================
-- Identity boundary: pseudonymous actor vs real identity
-- ============================================================

create table athletes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
-- Everything below references athletes.id, never anything identifying.

create table athlete_identity (
  athlete_id uuid primary key references athletes(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
-- Supabase Auth is provisioned but has zero users so far, so this maps a
-- pseudonymous athlete_id to auth.users rather than duplicating email/name --
-- auth.users already owns that data. Logging tables reference athlete_id,
-- never auth_user_id directly, so the pseudonymous ID space stays distinct
-- from the real-identity one even though both are backed by Supabase Auth.
-- Deleting this row unlinks history from identity without touching it;
-- cascading from athletes deletes everything. Which one "delete my account"
-- means is a product decision, not a schema one.

-- ============================================================
-- Exercises
-- ============================================================

create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  resistance_profile text not null check (
    resistance_profile in ('free_weight', 'cable', 'plate_loaded', 'selectorized', 'bodyweight')
  ),
  primary_muscle_group text not null,
  created_at timestamptz not null default now()
);
-- One row per movement (back squat, not split by bar position), per the
-- exercise-identity decision. resistance_profile gates whether e1RM applies.

-- ============================================================
-- Sessions (session-level fields need a home; implied by the spec's
-- "session-level:" fields but not explicitly modeled as a table)
-- ============================================================

create table sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  date date not null,
  bodyweight numeric,
  pre_notes text,
  post_notes text,
  perceived_session_quality smallint check (perceived_session_quality between 1 and 5),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Session log: one row per set
-- ============================================================

create table session_log (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  set_index smallint not null,
  set_type text not null check (set_type in ('working', 'warmup', 'backoff', 'failure')),
  weight numeric not null,
  reps smallint not null,
  rpe smallint check (rpe between 1 and 10),
  prescribed_weight numeric,
  prescribed_reps smallint,
  -- deviation_flag: what the three-button prompt resolved to, if it fired.
  -- Null when the set was within tolerance, over-prescribed, or a warmup/backoff
  -- (per the tolerance-band decision: those never trigger the prompt).
  deviation_flag text check (deviation_flag in ('deliberate', 'hard_set', 'other')),
  timestamp timestamptz not null default now()
);

create index on session_log (session_id);
create index on session_log (exercise_id, timestamp);

-- RPE-required rule ("last set of type working or failure; failure auto-fills
-- RPE 10") is an application-layer rule at write time, not a DB constraint --
-- the column stays nullable so warmups/backoffs are never forced to have one.

-- Weight units: no unit field yet. Needs a decision -- per-athlete preference,
-- or stored per-row. Left out of this draft rather than guessed.

-- ============================================================
-- Rep-max PRs: append-only, one row per PR event at a given (exercise, reps).
-- Current PR at N reps = latest row for that pair. best_e1rm is NOT a stored
-- field -- it's max(computed e1RM) over this table, computed on read (view
-- below), so there's no second copy of the same fact to keep in sync.
-- ============================================================

create table rep_max_prs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  reps smallint not null,
  weight numeric not null,
  rpe smallint check (rpe between 1 and 10),
  source_set_id uuid not null references session_log(id),
  achieved_at timestamptz not null default now()
);

create index on rep_max_prs (athlete_id, exercise_id, reps, achieved_at desc);

-- e1RM (Epley) computed on read, only meaningful where resistance_profile
-- makes it applicable (free_weight, plate_loaded -- cable/selectorized/
-- bodyweight resistance curves don't support it cleanly).
create view rep_max_prs_with_e1rm as
select
  p.*,
  case
    when e.resistance_profile in ('free_weight', 'plate_loaded')
      then p.weight * (1 + p.reps / 30.0)
    else null
  end as estimated_1rm
from rep_max_prs p
join exercises e on e.id = p.exercise_id;

-- ============================================================
-- Working loads: append-only, current state = latest row per
-- (athlete, exercise). This is the actual changelog fix -- update-in-place
-- was the original bug (no history survives an UPDATE).
-- ============================================================

create table working_loads (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  target_rep_range text not null,
  current_working_weight numeric not null,
  consecutive_successes smallint not null default 0,
  consecutive_failures smallint not null default 0,
  last_deload_date date,
  -- Why this row exists, i.e. why the value changed from the previous one.
  -- Minimal bookkeeping, not a narrative field: an append-only table without
  -- this is unreadable history (you can see weight moved, not why).
  change_reason text not null check (
    change_reason in ('initial', 'progression', 'deload', 'manual_override')
  ),
  created_at timestamptz not null default now()
);

create index on working_loads (athlete_id, exercise_id, created_at desc);

-- "Current" working load per exercise = latest row.
create view current_working_loads as
select distinct on (athlete_id, exercise_id) *
from working_loads
order by athlete_id, exercise_id, created_at desc;

-- Counter semantics (per the deviation_flag decision):
--   in-tolerance or over-prescribed set -> consecutive_successes += 1, consecutive_failures = 0
--   deviation_flag = 'deliberate' or 'other' -> neither counter moves
--   deviation_flag = 'hard_set' -> consecutive_failures += 1, consecutive_successes = 0
-- Deload trigger: consecutive_failures >= 3 surfaces a *suggested* deload to
-- the athlete (not automatic). Confirming it inserts a new working_loads row
-- with change_reason = 'deload', consecutive_failures reset to 0, and
-- last_deload_date set. The trigger should not re-fire until at least one
-- session has been logged after last_deload_date, to avoid thrashing.

-- ============================================================
-- Active context
-- ============================================================

create table soreness_reports (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  muscle_group text not null,
  soreness_level smallint not null check (soreness_level between 0 and 3),
  reported_at timestamptz not null default now()
);

create index on soreness_reports (athlete_id, muscle_group, reported_at desc);
-- "Current" soreness = latest report per (athlete, muscle_group). Whether it
-- decays/expires without a new report (a 5-day-old "3" still reads as "3"
-- otherwise) is unresolved -- flagging again, not deciding it here.

create table muscle_group_activity (
  athlete_id uuid not null references athletes(id) on delete cascade,
  muscle_group text not null,
  last_trained_at timestamptz not null,
  primary key (athlete_id, muscle_group)
);
-- Renamed from "days_since_last_trained" -- what's actually stored is a
-- timestamp; "days since" is computed on read, matching the decay-on-read
-- approach rather than contradicting it. Updated on write whenever a session
-- includes an exercise mapped to that muscle group.

create table injury_flags (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  body_part text not null,
  severity smallint not null check (severity between 1 and 3),
  flagged_at timestamptz not null default now(),
  resolved_at timestamptz
);
-- active = resolved_at is null, rather than a separate boolean that could
-- drift out of sync with the date.

-- fatigue_signal: not modeled yet. Open question -- is it a directly
-- self-reported value (its own table, like soreness), or a derived signal
-- computed from recent session_log (RPE trend, failure ratio)? Those are two
-- different schemas, so left out until that's decided rather than guessed.

-- ============================================================
-- Row Level Security
--
-- This is real training/health data (injuries, soreness, session notes),
-- and the project's own privacy stance is explicit about it. Every table
-- below is locked to "an athlete can only touch their own rows," resolved
-- via athlete_identity mapping auth.uid() -> athlete_id. exercises is
-- shared reference data: readable by any authenticated client, writable
-- only server-side (service_role bypasses RLS entirely, so no policy is
-- needed for that -- only the client-facing roles need locking down).
--
-- session_log, rep_max_prs, and working_loads are append-only by design
-- (the whole point of fixing the earlier changelog bug), so they get
-- select+insert policies only -- no update, no delete. That makes "history
-- is immutable" a database guarantee, not just an app-layer convention.
-- ============================================================

alter table athletes enable row level security;
alter table athlete_identity enable row level security;
alter table exercises enable row level security;
alter table sessions enable row level security;
alter table session_log enable row level security;
alter table rep_max_prs enable row level security;
alter table working_loads enable row level security;
alter table soreness_reports enable row level security;
alter table muscle_group_activity enable row level security;
alter table injury_flags enable row level security;

-- athletes / athlete_identity: read-only to the owning user. Rows are
-- created server-side (service_role) at signup, not by the client, so
-- there's no client insert policy for either.

create policy "read own athlete row"
on athletes for select
using (id in (select athlete_id from athlete_identity where auth_user_id = auth.uid()));

create policy "read own identity mapping"
on athlete_identity for select
using (auth_user_id = auth.uid());

-- exercises: shared reference data, readable by any signed-in client,
-- writes reserved for the server (no insert/update/delete policy here).

create policy "authenticated users can read exercises"
on exercises for select
using (auth.role() = 'authenticated');

-- sessions: fully owned by the athlete, mutable (session notes/quality can
-- reasonably be edited after the fact).

create policy "manage own sessions"
on sessions for all
using (athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid()))
with check (athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid()));

-- session_log: append-only. No session_id-less rows exist, so ownership is
-- resolved by joining through sessions.

create policy "read own session_log rows"
on session_log for select
using (
  session_id in (
    select id from sessions
    where athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid())
  )
);

create policy "insert own session_log rows"
on session_log for insert
with check (
  session_id in (
    select id from sessions
    where athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid())
  )
);

-- rep_max_prs: append-only, direct athlete_id.

create policy "read own rep_max_prs"
on rep_max_prs for select
using (athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid()));

create policy "insert own rep_max_prs"
on rep_max_prs for insert
with check (athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid()));

-- working_loads: append-only, direct athlete_id.

create policy "read own working_loads"
on working_loads for select
using (athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid()));

create policy "insert own working_loads"
on working_loads for insert
with check (athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid()));

-- soreness_reports: append-only in practice (a new report, not an edit to
-- an old one), same select+insert shape.

create policy "read own soreness_reports"
on soreness_reports for select
using (athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid()));

create policy "insert own soreness_reports"
on soreness_reports for insert
with check (athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid()));

-- muscle_group_activity: genuinely mutable (upserted last_trained_at per
-- muscle group), so it gets the full "manage own rows" policy.

create policy "manage own muscle_group_activity"
on muscle_group_activity for all
using (athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid()))
with check (athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid()));

-- injury_flags: mutable (resolved_at gets set later), full "manage own rows".

create policy "manage own injury_flags"
on injury_flags for all
using (athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid()))
with check (athlete_id in (select athlete_id from athlete_identity where auth_user_id = auth.uid()));
