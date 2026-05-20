-- Fuzzy search: pg_trgm extension + GIN indexes on repositories
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS repositories_full_name_trgm_idx
  ON repositories USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS repositories_description_trgm_idx
  ON repositories USING gin (description gin_trgm_ops);
