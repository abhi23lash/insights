-- Adds citation data to knowledge_entries. Purely additive: new nullable
-- column, nothing dropped or renamed. This data exists in the local
-- data/knowledge-entries/*.json files and was never migrated when the
-- original sync script was written -- that's the actual root cause of
-- citations reading as "a moderate-quality trial" instead of naming the
-- study, the app never had the author/year data to cite in the first place.

alter table knowledge_entries
  add column sources jsonb not null default '[]';
