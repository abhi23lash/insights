select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relname in (
  'athletes', 'athlete_identity', 'exercises', 'sessions', 'session_log',
  'rep_max_prs', 'working_loads', 'soreness_reports', 'muscle_group_activity', 'injury_flags'
)
order by relname;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
