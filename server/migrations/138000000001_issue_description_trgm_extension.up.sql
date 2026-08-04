-- The recovered trigram index retained its original 139 position while the
-- extension migration landed later in the merged history. Install the
-- extension immediately before that concurrent index on fresh databases.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
