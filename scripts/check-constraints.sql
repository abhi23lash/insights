select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'knowledge_entries'::regclass
  and contype = 'c';
