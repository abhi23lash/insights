-- Low-risk fix: create or replace view, no data touched. Updates e1RM
-- eligibility to use loading_type (added for the catalog) instead of the
-- older resistance_profile-based gate, per the reconciliation earlier --
-- loading_type is the more precise signal (handles bodyweight_plus/assisted/
-- time/distance correctly, resistance_profile doesn't distinguish those).

create or replace view rep_max_prs_with_e1rm as
select
  p.*,
  case
    when e.loading_type = 'external_weight' then p.weight * (1 + p.reps / 30.0)
    else null
  end as estimated_1rm
from rep_max_prs p
join exercises e on e.id = p.exercise_id;
