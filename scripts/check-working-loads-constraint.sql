select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'working_loads'::regclass
  and contype = 'c';
