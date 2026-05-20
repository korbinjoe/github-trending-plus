-- Fuzzy search: pg_trgm extension + GIN indexes on repositories
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS repositories_full_name_trgm_idx
  ON repositories USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS repositories_description_trgm_idx
  ON repositories USING gin (description gin_trgm_ops);

-- Expression indexes: search uses lower() — without these, similarity/ILIKE seq-scan.
CREATE INDEX IF NOT EXISTS repositories_full_name_lower_trgm_idx
  ON repositories USING gin (lower(full_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS repositories_description_lower_trgm_idx
  ON repositories USING gin (lower(coalesce(description, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ranking_runs_completed_lookup_idx
  ON ranking_runs (period, view, status, completed_at DESC NULLS LAST);
